import { jsonResponse, textResponse, getCorsHeaders } from './lib/http';
import { parseExtractRequest } from './lib/validate';
import { getClientIdentifier, RateLimiter } from './lib/rate-limit';
import { sanitizeErrorMessage } from './lib/security';
import { scrapePage } from './services/browser';
import { extractWithLLM } from './services/extract';
import { consumeApiKey, verifyApiKey } from './services/auth';
import { logEvent, logRequest, storeArtifacts } from './services/storage';
import { resolveAiConfig } from './services/config';
import { createJob, getJob, listJobs } from './services/jobs';
import {
  createSchedule,
  listSchedules,
  updateSchedule,
  computeNextRun,
  getSchedule,
} from './services/schedules';
import { sendWebhook } from './services/webhook';
import {
  computeCacheKey,
  getCacheEntry,
  getCacheSettings,
  loadCacheResult,
  markCacheHit,
  storeCacheEntry,
  storeCacheResult,
} from './services/cache';
import {
  fetchProxyGridFallback,
  getProxyGridConfig,
  isProxyGridAllowed,
} from './services/proxy-grid';
import { getRecentLogs, getUsageExport, getUsageSeries, getUsageSummary } from './services/usage';
import type { Env, ExtractResponse } from './types';

let rateLimiter = new RateLimiter();
let rateLimiterKey = 'default';

function getRateLimiter(env: Env): RateLimiter {
  const requests = Number(env.RATE_LIMIT_REQUESTS);
  const windowMs = Number(env.RATE_LIMIT_WINDOW_MS);
  const hasOverride =
    Number.isFinite(requests) && requests > 0 && Number.isFinite(windowMs) && windowMs > 0;
  const key = hasOverride ? `${requests}:${windowMs}` : 'default';

  if (key !== rateLimiterKey) {
    rateLimiter = new RateLimiter(
      hasOverride
        ? {
            default: { requests, windowMs },
            authenticated: { requests, windowMs },
          }
        : undefined,
    );
    rateLimiterKey = key;
  }

  return rateLimiter;
}

interface HandlerDeps {
  scrape?: typeof scrapePage;
  extract?: typeof extractWithLLM;
  now?: () => number;
  uuid?: () => string;
}

export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  deps: HandlerDeps = {},
): Promise<Response> {
  const corsHeaders = getCorsHeaders(env.CORS_ORIGIN);
  const url = new URL(request.url);
  const normalizedPath = normalizePath(url.pathname);
  const parts = normalizedPath.split('/').filter(Boolean);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestId = (deps.uuid ?? crypto.randomUUID)();

  if (request.method === 'GET' && normalizedPath === '/health') {
    return jsonResponse({ ok: true, service: 'robot-scraping-core', requestId }, 200, corsHeaders);
  }

  if (parts.length === 0) {
    return textResponse('Not Found', 404, corsHeaders);
  }

  const clientId = getClientIdentifier(request);
  const limiter = getRateLimiter(env);
  const rateLimitCheck = limiter.check(clientId, 'authenticated');
  const rateLimitHeaders = limiter.getRateLimitHeaders(clientId, 'authenticated');
  limiter.cleanup();

  if (!rateLimitCheck.allowed && env.RATE_LIMIT_ENABLED !== 'false') {
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'rate_limit_exceeded',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: new Date(rateLimitCheck.resetAt).toISOString(),
        },
      },
      429,
      { ...corsHeaders, ...rateLimitHeaders },
    );
  }

  const maxRequestSize = Number(env.MAX_REQUEST_SIZE_MB || 10) * 1024 * 1024;
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxRequestSize) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'payload_too_large',
          message: `Request body too large. Maximum size is ${env.MAX_REQUEST_SIZE_MB || 10}MB.`,
        },
      },
      413,
      corsHeaders,
    );
  }

  const response = await routeRequest(request, env, ctx, deps, corsHeaders, url, parts, requestId);

  const responseHeaders = new Headers(response.headers);
  if (env.ENABLE_RATE_LIMIT_HEADERS !== 'false') {
    responseHeaders.set('X-RateLimit-Limit', rateLimitHeaders['X-RateLimit-Limit']);
    responseHeaders.set('X-RateLimit-Remaining', rateLimitHeaders['X-RateLimit-Remaining']);
    responseHeaders.set('X-RateLimit-Reset', rateLimitHeaders['X-RateLimit-Reset']);
  }
  responseHeaders.set('X-Request-ID', requestId);

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

async function routeRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  deps: HandlerDeps,
  corsHeaders: Record<string, string>,
  url: URL,
  parts: string[],
  requestId: string,
): Promise<Response> {
  switch (parts[0]) {
    case 'extract':
      return handleExtract(request, env, ctx, deps, corsHeaders, url, requestId);
    case 'jobs':
      return handleJobs(request, env, corsHeaders, parts, url);
    case 'schedules':
      return handleSchedules(request, env, corsHeaders, parts, deps);
    case 'webhook':
      return handleWebhookTest(request, env, corsHeaders, parts);
    case 'usage':
      return handleUsage(request, env, corsHeaders, url, parts);
    default:
      return textResponse('Not Found', 404, corsHeaders);
  }
}

function normalizePath(pathname: string): string {
  return pathname.startsWith('/v1/') ? pathname.replace('/v1', '') : pathname;
}

async function handleExtract(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  deps: HandlerDeps,
  corsHeaders: Record<string, string>,
  url: URL,
  requestId: string,
): Promise<Response> {
  if (request.method !== 'POST') {
    return textResponse('Method Not Allowed', 405, corsHeaders);
  }

  const body = await request.json().catch(() => null);
  const parsed = parseExtractRequest(body);
  if (!parsed.ok) {
    return jsonResponse(
      { success: false, error: { code: 'bad_request', message: parsed.message } },
      400,
      corsHeaders,
    );
  }

  const auth = await authorize(request, env, true, deps);
  if (!auth.ok) {
    return jsonResponse(
      {
        success: false,
        error: { code: auth.errorCode ?? 'unauthorized', message: 'API key required or invalid.' },
      },
      auth.status,
      corsHeaders,
    );
  }

  const startedAt = (deps.now ?? Date.now)();
  const prefix = apiPrefix(url.pathname);

  if (parsed.data.async) {
    const webhookUrl = parsed.data.webhook_url ?? null;
    const webhookSecret = parsed.data.webhook_secret ?? null;

    if (!env.TASK_QUEUE || typeof env.TASK_QUEUE.send !== 'function') {
      return jsonResponse(
        {
          success: false,
          error: { code: 'queue_unavailable', message: 'Queue binding is not configured.' },
        },
        503,
        corsHeaders,
      );
    }

    await createJob(env.DB, {
      id: requestId,
      apiKeyId: auth.apiKeyId ?? null,
      url: parsed.data.url,
      fields: parsed.data.fields,
      schema: parsed.data.schema,
      instructions: parsed.data.instructions,
      options: parsed.data.options,
      webhookUrl,
      webhookSecret,
      createdAt: startedAt,
    });

    await env.TASK_QUEUE.send({
      jobId: requestId,
      apiKeyId: auth.apiKeyId ?? null,
      url: parsed.data.url,
      fields: parsed.data.fields,
      schema: parsed.data.schema,
      instructions: parsed.data.instructions,
      webhookUrl,
      webhookSecret,
      options: parsed.data.options,
    });

    return jsonResponse(
      {
        success: true,
        job_id: requestId,
        status: 'queued',
        status_url: `${url.origin}${prefix}/jobs/${requestId}`,
        meta: {
          remainingCredits: auth.remainingCredits ?? null,
        },
      },
      202,
      corsHeaders,
    );
  }

  const extractor = deps.extract ?? extractWithLLM;
  const scraper = deps.scrape ?? scrapePage;
  const cacheSettings = getCacheSettings(env);
  const cacheKey = cacheSettings.enabled
    ? await computeCacheKey({
        url: parsed.data.url,
        fields: parsed.data.fields,
        schema: parsed.data.schema,
        instructions: parsed.data.instructions,
      })
    : null;

  if (cacheSettings.enabled && cacheKey) {
    const cached = await getCacheEntry(env.DB, cacheKey, startedAt);
    if (cached?.result_path) {
      const cachedData = await loadCacheResult(env.BUCKET, cached.result_path);
      if (cachedData) {
        const latencyMs = (deps.now ?? Date.now)() - startedAt;
        const responseBody: ExtractResponse = {
          success: true,
          data: cachedData,
          meta: {
            id: requestId,
            latencyMs,
            tokens: cached.token_usage ?? 0,
            blocked: false,
            contentChars: cached.content_chars ?? 0,
            remainingCredits: auth.remainingCredits ?? null,
            cache: {
              hit: true,
              ageMs: cached.created_at ? startedAt - cached.created_at : undefined,
            },
          },
        };

        ctx.waitUntil(markCacheHit(env.DB, cacheKey, (deps.now ?? Date.now)()));
        ctx.waitUntil(
          logEvent(env.DB, {
            id: crypto.randomUUID(),
            requestId,
            apiKeyId: auth.apiKeyId ?? null,
            eventType: 'cache_hit',
            message: 'Served response from cache.',
            metadata: { cacheKey },
            createdAt: (deps.now ?? Date.now)(),
          }),
        );
        ctx.waitUntil(
          logRequest(env.DB, {
            id: requestId,
            apiKeyId: auth.apiKeyId ?? null,
            url: parsed.data.url,
            fields: parsed.data.fields,
            schema: parsed.data.schema,
            tokenUsage: cached.token_usage ?? 0,
            latencyMs,
            status: 'cached',
            errorMessage: null,
            snapshotKey: null,
            contentKey: null,
            blocked: false,
            createdAt: (deps.now ?? Date.now)(),
          }),
        );

        return jsonResponse(responseBody, 200, { ...corsHeaders, 'X-Cache-Hit': 'true' });
      }
    }

    ctx.waitUntil(
      logEvent(env.DB, {
        id: crypto.randomUUID(),
        requestId,
        apiKeyId: auth.apiKeyId ?? null,
        eventType: 'cache_miss',
        message: 'Cache miss for extraction.',
        metadata: { cacheKey },
        createdAt: (deps.now ?? Date.now)(),
      }),
    );
  }

  const timeoutMs = parsed.data.options?.timeoutMs ?? Number(env.BROWSER_TIMEOUT_MS || 15000);
  const waitUntil = parsed.data.options?.waitUntil ?? 'domcontentloaded';
  const maxContentChars = Number(env.MAX_CONTENT_CHARS || 20000);
  const screenshotEnabled =
    typeof parsed.data.options?.screenshot === 'boolean'
      ? parsed.data.options?.screenshot
      : env.DEFAULT_SCREENSHOT === 'true';
  const storeContent =
    typeof parsed.data.options?.storeContent === 'boolean'
      ? parsed.data.options?.storeContent
      : env.STORE_CONTENT !== 'false';

  let scrapeResult;
  let extractResult;
  let errorMessage: string | null = null;

  try {
    scrapeResult = await scraper(env.MYBROWSER, parsed.data.url, {
      waitUntil,
      timeoutMs,
      screenshot: screenshotEnabled,
      maxContentChars,
    });

    if (scrapeResult.blocked) {
      const proxyConfig = getProxyGridConfig(env);
      if (isProxyGridAllowed(proxyConfig, auth.apiKeyId ?? null)) {
        try {
          const fallback = await fetchProxyGridFallback({
            config: proxyConfig,
            url: parsed.data.url,
            maxContentChars,
            screenshot: screenshotEnabled,
          });

          if (fallback?.result?.content) {
            scrapeResult = fallback.result;
            ctx.waitUntil(
              logEvent(env.DB, {
                id: crypto.randomUUID(),
                requestId,
                apiKeyId: auth.apiKeyId ?? null,
                eventType: 'proxy_grid_fallback',
                message: 'Proxy Grid fallback succeeded.',
                metadata: { provider: fallback.provider ?? null },
                createdAt: (deps.now ?? Date.now)(),
              }),
            );
          } else {
            ctx.waitUntil(
              logEvent(env.DB, {
                id: crypto.randomUUID(),
                requestId,
                apiKeyId: auth.apiKeyId ?? null,
                eventType: 'proxy_grid_fallback_failed',
                message: 'Proxy Grid fallback failed.',
                metadata: { provider: fallback?.provider ?? null },
                createdAt: (deps.now ?? Date.now)(),
              }),
            );
          }
        } catch (error) {
          ctx.waitUntil(
            logEvent(env.DB, {
              id: crypto.randomUUID(),
              requestId,
              apiKeyId: auth.apiKeyId ?? null,
              eventType: 'proxy_grid_error',
              message: (error as Error).message,
              createdAt: (deps.now ?? Date.now)(),
            }),
          );
        }
      }
    }

    if (scrapeResult.blocked) {
      const responseBody: ExtractResponse = {
        success: false,
        error: { code: 'blocked', message: 'Target site blocked the request.' },
        meta: {
          id: requestId,
          latencyMs: (deps.now ?? Date.now)() - startedAt,
          tokens: 0,
          blocked: true,
          contentChars: scrapeResult.content?.length ?? 0,
          remainingCredits: auth.remainingCredits ?? null,
        },
      };

      ctx.waitUntil(
        logRequest(env.DB, {
          id: requestId,
          apiKeyId: auth.apiKeyId ?? null,
          url: parsed.data.url,
          fields: parsed.data.fields,
          schema: parsed.data.schema,
          tokenUsage: 0,
          latencyMs: responseBody.meta.latencyMs,
          status: 'blocked',
          errorMessage: 'blocked',
          snapshotKey: null,
          contentKey: null,
          blocked: true,
          createdAt: (deps.now ?? Date.now)(),
        }),
      );

      return jsonResponse(responseBody, 403, corsHeaders);
    }

    const { provider, model, apiKey, baseUrl } = resolveAiConfig(env);

    extractResult = await extractor({
      provider,
      model,
      apiKey,
      baseUrl,
      content: scrapeResult.content,
      fields: parsed.data.fields,
      schema: parsed.data.schema,
      instructions: parsed.data.instructions,
    });

    const latencyMs = (deps.now ?? Date.now)() - startedAt;
    const responseBody: ExtractResponse = {
      success: true,
      data: extractResult.data,
      meta: {
        id: requestId,
        latencyMs,
        tokens: extractResult.usage,
        blocked: false,
        contentChars: scrapeResult.content?.length ?? 0,
        remainingCredits: auth.remainingCredits ?? null,
      },
    };

    ctx.waitUntil(
      (async () => {
        let snapshotKey: string | null = null;
        let contentKey: string | null = null;
        try {
          const stored = await storeArtifacts({
            bucket: env.BUCKET,
            id: requestId,
            screenshot: scrapeResult?.screenshot,
            screenshotType: scrapeResult?.screenshotType,
            content: storeContent ? scrapeResult?.content : undefined,
            storeContent,
          });
          snapshotKey = stored?.snapshotKey ?? null;
          contentKey = stored?.contentKey ?? null;
        } catch {
          snapshotKey = null;
          contentKey = null;
        }

        if (cacheSettings.enabled && cacheKey) {
          try {
            const resultPath = await storeCacheResult(env.BUCKET, cacheKey, extractResult.data);
            await storeCacheEntry(env.DB, {
              key: cacheKey,
              url: parsed.data.url,
              fields: parsed.data.fields,
              schema: parsed.data.schema,
              instructions: parsed.data.instructions,
              resultPath,
              tokenUsage: extractResult.usage,
              contentChars: scrapeResult.content?.length ?? 0,
              createdAt: (deps.now ?? Date.now)(),
              expiresAt: (deps.now ?? Date.now)() + cacheSettings.ttlMs,
            });
            await logEvent(env.DB, {
              id: crypto.randomUUID(),
              requestId,
              apiKeyId: auth.apiKeyId ?? null,
              eventType: 'cache_store',
              message: 'Stored extraction response in cache.',
              metadata: { cacheKey, ttlMs: cacheSettings.ttlMs },
              createdAt: (deps.now ?? Date.now)(),
            });
          } catch (error) {
            await logEvent(env.DB, {
              id: crypto.randomUUID(),
              requestId,
              apiKeyId: auth.apiKeyId ?? null,
              eventType: 'cache_store_failed',
              message: (error as Error).message,
              metadata: { cacheKey },
              createdAt: (deps.now ?? Date.now)(),
            });
          }
        }

        await logRequest(env.DB, {
          id: requestId,
          apiKeyId: auth.apiKeyId ?? null,
          url: parsed.data.url,
          fields: parsed.data.fields,
          schema: parsed.data.schema,
          tokenUsage: extractResult?.usage ?? 0,
          latencyMs,
          status: 'success',
          errorMessage: null,
          snapshotKey,
          contentKey,
          blocked: false,
          createdAt: (deps.now ?? Date.now)(),
        });
      })(),
    );

    return jsonResponse(responseBody, 200, corsHeaders);
  } catch (error) {
    errorMessage = sanitizeErrorMessage((error as Error).message);
    const latencyMs = (deps.now ?? Date.now)() - startedAt;
    const responseBody: ExtractResponse = {
      success: false,
      error: { code: 'server_error', message: 'Extraction failed.' },
      meta: {
        id: requestId,
        latencyMs,
        tokens: extractResult?.usage ?? 0,
        blocked: false,
        contentChars: scrapeResult?.content?.length ?? 0,
        remainingCredits: auth.remainingCredits ?? null,
      },
    };

    ctx.waitUntil(
      logRequest(env.DB, {
        id: requestId,
        apiKeyId: auth.apiKeyId ?? null,
        url: parsed.data.url,
        fields: parsed.data.fields,
        schema: parsed.data.schema,
        tokenUsage: extractResult?.usage ?? 0,
        latencyMs,
        status: 'error',
        errorMessage,
        snapshotKey: null,
        contentKey: null,
        blocked: false,
        createdAt: (deps.now ?? Date.now)(),
      }),
    );

    return jsonResponse(responseBody, 500, corsHeaders);
  }
}

async function handleJobs(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  parts: string[],
  url: URL,
): Promise<Response> {
  if (request.method !== 'GET') {
    return textResponse('Method Not Allowed', 405, corsHeaders);
  }

  const auth = await authorize(request, env, false);
  if (!auth.ok) {
    return jsonResponse(
      {
        success: false,
        error: { code: auth.errorCode ?? 'unauthorized', message: 'Unauthorized.' },
      },
      auth.status,
      corsHeaders,
    );
  }

  if (parts.length === 1) {
    const limit = Number(url.searchParams.get('limit') || 20);
    const status = url.searchParams.get('status') || undefined;
    const jobs = await listJobs(env.DB, {
      apiKeyId: auth.apiKeyId ?? null,
      limit: Number.isFinite(limit) ? limit : 20,
      status,
    });

    const prefix = apiPrefix(url.pathname);
    return jsonResponse(
      {
        success: true,
        data: jobs.map((job) => ({
          ...job,
          result_url: job.result_path ? `${url.origin}${prefix}/jobs/${job.id}/result` : null,
        })),
      },
      200,
      corsHeaders,
    );
  }

  const jobId = parts[1];
  if (!jobId) {
    return jsonResponse(
      { success: false, error: { code: 'bad_request', message: 'Missing job id.' } },
      400,
      corsHeaders,
    );
  }

  if (parts.length >= 3 && parts[2] === 'result') {
    const job = await getJob(env.DB, jobId, auth.apiKeyId ?? null);
    if (!job) {
      return jsonResponse(
        { success: false, error: { code: 'not_found', message: 'Job not found.' } },
        404,
        corsHeaders,
      );
    }

    if (job.status !== 'completed' || !job.result_path) {
      return jsonResponse(
        { success: false, error: { code: 'not_ready', message: 'Job is not completed yet.' } },
        409,
        corsHeaders,
      );
    }

    const object = await env.BUCKET.get(job.result_path);
    if (!object) {
      return jsonResponse(
        { success: false, error: { code: 'not_found', message: 'Result not found.' } },
        404,
        corsHeaders,
      );
    }

    return new Response(object.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': object.httpMetadata?.contentType || 'application/json; charset=utf-8',
      },
    });
  }

  const job = await getJob(env.DB, jobId, auth.apiKeyId ?? null);
  if (!job) {
    return jsonResponse(
      { success: false, error: { code: 'not_found', message: 'Job not found.' } },
      404,
      corsHeaders,
    );
  }

  return jsonResponse(
    {
      success: true,
      data: {
        ...job,
        result_url: job.result_path
          ? `${url.origin}${apiPrefix(url.pathname)}/jobs/${job.id}/result`
          : null,
      },
    },
    200,
    corsHeaders,
  );
}

function apiPrefix(pathname: string): string {
  return pathname.startsWith('/v1/') ? '/v1' : '';
}

async function handleSchedules(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  parts: string[],
  deps: HandlerDeps,
): Promise<Response> {
  const auth = await authorize(request, env, false, deps);
  if (!auth.ok) {
    return jsonResponse(
      {
        success: false,
        error: { code: auth.errorCode ?? 'unauthorized', message: 'Unauthorized.' },
      },
      auth.status,
      corsHeaders,
    );
  }

  if (request.method === 'GET' && parts.length === 1) {
    const limit = Number(new URL(request.url).searchParams.get('limit') || 50);
    const schedules = await listSchedules(env.DB, {
      apiKeyId: auth.apiKeyId ?? null,
      limit: Number.isFinite(limit) ? limit : 50,
    });
    return jsonResponse({ success: true, data: schedules }, 200, corsHeaders);
  }

  if (request.method === 'POST' && parts.length === 1) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonResponse(
        { success: false, error: { code: 'bad_request', message: 'Body must be JSON.' } },
        400,
        corsHeaders,
      );
    }

    const { url, fields, schema, instructions, cron, webhook_url, webhook_secret } = body as {
      url?: string;
      fields?: string[];
      schema?: Record<string, unknown>;
      instructions?: string;
      cron?: string;
      webhook_url?: string;
      webhook_secret?: string;
    };

    if (!url || typeof url !== 'string') {
      return jsonResponse(
        { success: false, error: { code: 'bad_request', message: 'Missing url.' } },
        400,
        corsHeaders,
      );
    }

    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return jsonResponse(
        { success: false, error: { code: 'bad_request', message: 'Invalid url.' } },
        400,
        corsHeaders,
      );
    }

    if (!fields && !schema) {
      return jsonResponse(
        { success: false, error: { code: 'bad_request', message: 'Provide fields or schema.' } },
        400,
        corsHeaders,
      );
    }

    if (fields && (!Array.isArray(fields) || fields.length === 0)) {
      return jsonResponse(
        { success: false, error: { code: 'bad_request', message: 'fields must be a JSON array.' } },
        400,
        corsHeaders,
      );
    }

    if (!cron || typeof cron !== 'string') {
      return jsonResponse(
        { success: false, error: { code: 'bad_request', message: 'Missing cron.' } },
        400,
        corsHeaders,
      );
    }

    if (!webhook_url || typeof webhook_url !== 'string') {
      return jsonResponse(
        { success: false, error: { code: 'bad_request', message: 'Missing webhook_url.' } },
        400,
        corsHeaders,
      );
    }

    try {
      await computeNextRun(cron, Date.now());
    } catch (error) {
      return jsonResponse(
        {
          success: false,
          error: { code: 'bad_request', message: `Invalid cron: ${(error as Error).message}` },
        },
        400,
        corsHeaders,
      );
    }

    const scheduleId = crypto.randomUUID();
    await createSchedule(env.DB, {
      id: scheduleId,
      apiKeyId: auth.apiKeyId ?? null,
      url,
      fields,
      schema,
      instructions,
      cron,
      webhookUrl: webhook_url,
      webhookSecret: webhook_secret ?? null,
      createdAt: Date.now(),
    });

    return jsonResponse(
      {
        success: true,
        schedule_id: scheduleId,
        status: 'active',
      },
      201,
      corsHeaders,
    );
  }

  if (request.method === 'PATCH' && parts.length === 2) {
    const scheduleId = parts[1];
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonResponse(
        { success: false, error: { code: 'bad_request', message: 'Body must be JSON.' } },
        400,
        corsHeaders,
      );
    }

    const { is_active, cron, webhook_url, webhook_secret, fields, schema, instructions } = body as {
      is_active?: boolean;
      cron?: string;
      webhook_url?: string;
      webhook_secret?: string;
      fields?: string[];
      schema?: Record<string, unknown>;
      instructions?: string;
    };

    const schedule = await getSchedule(env.DB, scheduleId, auth.apiKeyId ?? null);
    if (!schedule) {
      return jsonResponse(
        { success: false, error: { code: 'not_found', message: 'Schedule not found.' } },
        404,
        corsHeaders,
      );
    }

    if (fields && (!Array.isArray(fields) || fields.length === 0)) {
      return jsonResponse(
        { success: false, error: { code: 'bad_request', message: 'fields must be a JSON array.' } },
        400,
        corsHeaders,
      );
    }

    if (schema && typeof schema !== 'object') {
      return jsonResponse(
        { success: false, error: { code: 'bad_request', message: 'schema must be an object.' } },
        400,
        corsHeaders,
      );
    }

    if (webhook_url) {
      try {
        const parsedUrl = new URL(webhook_url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('Invalid protocol');
        }
      } catch {
        return jsonResponse(
          { success: false, error: { code: 'bad_request', message: 'Invalid webhook_url.' } },
          400,
          corsHeaders,
        );
      }
    }

    let nextRunAt: number | null | undefined;
    const now = Date.now();
    const willBeActive = typeof is_active === 'boolean' ? is_active : schedule.is_active === 1;
    if (cron) {
      try {
        const computed = await computeNextRun(cron, now);
        if (willBeActive) {
          nextRunAt = computed;
        } else if (typeof is_active === 'boolean' && !is_active) {
          nextRunAt = null;
        }
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            error: { code: 'bad_request', message: `Invalid cron: ${(error as Error).message}` },
          },
          400,
          corsHeaders,
        );
      }
    } else if (typeof is_active === 'boolean') {
      if (is_active) {
        try {
          nextRunAt = await computeNextRun(schedule.cron, now);
        } catch (error) {
          return jsonResponse(
            {
              success: false,
              error: {
                code: 'bad_request',
                message: `Invalid cron: ${(error as Error).message}`,
              },
            },
            400,
            corsHeaders,
          );
        }
      } else {
        nextRunAt = null;
      }
    }

    await updateSchedule(env.DB, {
      id: scheduleId,
      apiKeyId: auth.apiKeyId ?? null,
      isActive: typeof is_active === 'boolean' ? is_active : undefined,
      cron,
      webhookUrl: webhook_url,
      webhookSecret: webhook_secret ?? undefined,
      fields,
      schema,
      instructions,
      nextRunAt,
    });

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return textResponse('Method Not Allowed', 405, corsHeaders);
}

async function handleWebhookTest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  parts: string[],
): Promise<Response> {
  if (request.method !== 'POST' || parts.length !== 2 || parts[1] !== 'test') {
    return textResponse('Not Found', 404, corsHeaders);
  }

  const auth = await authorize(request, env, false);
  if (!auth.ok) {
    return jsonResponse(
      {
        success: false,
        error: { code: auth.errorCode ?? 'unauthorized', message: 'Unauthorized.' },
      },
      auth.status,
      corsHeaders,
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return jsonResponse(
      { success: false, error: { code: 'bad_request', message: 'Body must be JSON.' } },
      400,
      corsHeaders,
    );
  }

  const { url, secret } = body as { url?: string; secret?: string };
  if (!url) {
    return jsonResponse(
      { success: false, error: { code: 'bad_request', message: 'Missing url.' } },
      400,
      corsHeaders,
    );
  }

  await sendWebhook(
    url,
    {
      jobId: crypto.randomUUID(),
      status: 'completed',
      data: { message: 'Test webhook from RobotScraping.com' },
    },
    secret || env.WEBHOOK_SECRET || 'default-secret',
  );

  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function handleUsage(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  url: URL,
  parts: string[],
): Promise<Response> {
  if (parts.length > 1 && parts[1] === 'export') {
    return handleUsageExport(request, env, corsHeaders, url);
  }

  if (request.method !== 'GET') {
    return textResponse('Method Not Allowed', 405, corsHeaders);
  }

  const auth = await authorize(request, env, false);
  if (!auth.ok) {
    return jsonResponse(
      {
        success: false,
        error: { code: auth.errorCode ?? 'unauthorized', message: 'Unauthorized.' },
      },
      auth.status,
      corsHeaders,
    );
  }

  const { from, to } = resolveUsageRange(url);

  const [summary, series, recent] = await Promise.all([
    getUsageSummary(env.DB, { apiKeyId: auth.apiKeyId ?? null, from, to }),
    getUsageSeries(env.DB, { apiKeyId: auth.apiKeyId ?? null, from, to }),
    getRecentLogs(env.DB, { apiKeyId: auth.apiKeyId ?? null, from, to, limit: 50 }),
  ]);

  return jsonResponse(
    {
      success: true,
      data: {
        summary,
        series,
        recent,
        range: { from, to },
      },
    },
    200,
    corsHeaders,
  );
}

async function handleUsageExport(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  url: URL,
): Promise<Response> {
  if (request.method !== 'GET') {
    return textResponse('Method Not Allowed', 405, corsHeaders);
  }

  const auth = await authorize(request, env, false);
  if (!auth.ok) {
    return jsonResponse(
      {
        success: false,
        error: { code: auth.errorCode ?? 'unauthorized', message: 'Unauthorized.' },
      },
      auth.status,
      corsHeaders,
    );
  }

  const { from, to } = resolveUsageRange(url);
  const limitParam = Number(url.searchParams.get('limit') || '500');
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 5000)) : 500;
  const rows = await getUsageExport(env.DB, {
    apiKeyId: auth.apiKeyId ?? null,
    from,
    to,
    limit,
  });

  const header = ['id', 'url', 'status', 'token_usage', 'latency_ms', 'created_at'];
  const lines = [header.join(',')];
  for (const row of rows) {
    const createdAt = new Date(row.created_at).toISOString();
    lines.push(
      [
        csvEscape(row.id),
        csvEscape(row.url),
        csvEscape(row.status),
        csvEscape(row.token_usage ?? 0),
        csvEscape(row.latency_ms ?? 0),
        csvEscape(createdAt),
      ].join(','),
    );
  }

  const fileName = `usage_${from}_${to}.csv`;
  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      ...corsHeaders,
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename=\"${fileName}\"`,
    },
  });
}

function resolveUsageRange(url: URL): { from: number; to: number } {
  const now = Date.now();
  const fromRaw = url.searchParams.get('from');
  const toRaw = url.searchParams.get('to');
  const fromParam = fromRaw ? Number(fromRaw) : undefined;
  const toParam = toRaw ? Number(toRaw) : undefined;
  let from = typeof fromParam === 'number' && Number.isFinite(fromParam) ? fromParam : undefined;
  let to = typeof toParam === 'number' && Number.isFinite(toParam) ? toParam : undefined;

  if (!from || !to) {
    const range = url.searchParams.get('range') || '7d';
    const match = /^([0-9]{1,3})([hdw])$/.exec(range);
    let rangeMs = 7 * 24 * 60 * 60 * 1000;
    if (match) {
      const value = Number(match[1]);
      const unit = match[2];
      const multiplier =
        unit === 'h'
          ? 60 * 60 * 1000
          : unit === 'd'
            ? 24 * 60 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000;
      rangeMs = Math.min(value * multiplier, 90 * 24 * 60 * 60 * 1000);
    }
    to = now;
    from = now - rangeMs;
  }

  return { from, to };
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[\",\\n]/.test(str)) {
    return `"${str.replace(/\"/g, '""')}"`;
  }
  return str;
}

async function authorize(
  request: Request,
  env: Env,
  consumeCredits: boolean,
  deps: HandlerDeps = {},
): Promise<
  | { ok: true; apiKeyId?: string | null; remainingCredits?: number | null }
  | { ok: false; status: number; errorCode?: string }
> {
  const allowAnon = env.ALLOW_ANON === 'true';
  if (allowAnon) {
    return { ok: true, apiKeyId: null, remainingCredits: null };
  }

  const apiKey = request.headers.get('x-api-key');
  const result = consumeCredits
    ? await consumeApiKey(env.DB, apiKey, (deps.now ?? Date.now)())
    : await verifyApiKey(env.DB, apiKey);

  if (!result.ok) {
    const status = result.errorCode === 'insufficient_credits' ? 402 : 401;
    return { ok: false, status, errorCode: result.errorCode };
  }

  return {
    ok: true,
    apiKeyId: result.apiKeyId ?? null,
    remainingCredits: result.remainingCredits ?? null,
  };
}
