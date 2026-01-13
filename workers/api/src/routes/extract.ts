import { jsonResponse, textResponse, getCorsHeaders } from '../lib/http';
import { parseExtractRequest } from '../lib/validate';
import { sanitizeErrorMessage } from '../lib/security';
import { hashIdempotencyKey } from '../lib/crypto';
import { scrapePage } from '../services/browser';
import { extractWithLLM } from '../services/extract';
import { consumeApiKey, verifyApiKey } from '../services/auth';
import { logEvent, logRequest, storeArtifacts } from '../services/storage';
import { resolveAiConfig } from '../services/config';
import { createJob } from '../services/jobs';
import {
  computeCacheKey,
  getCacheEntry,
  getCacheSettings,
  loadCacheResult,
  markCacheHit,
  storeCacheEntry,
  storeCacheResult,
} from '../services/cache';
import {
  fetchProxyGridFallback,
  getProxyGridConfig,
  isProxyGridAllowed,
} from '../services/proxy-grid';
import type { Env, ExtractRequest, ExtractResponse, HandlerDeps, ScrapeResult } from '../types';

// Error documentation URLs
const ERROR_DOCS_URLS: Record<string, string> = {
  bad_request: 'https://robotscraping.com/docs/errors#bad_request',
  unauthorized: 'https://robotscraping.com/docs/errors#unauthorized',
  insufficient_credits: 'https://robotscraping.com/docs/errors#insufficient_credits',
  blocked: 'https://robotscraping.com/docs/errors#blocked',
  queue_unavailable: 'https://robotscraping.com/docs/errors#queue_unavailable',
  server_error: 'https://robotscraping.com/docs/errors#server_error',
  rate_limited: 'https://robotscraping.com/docs/errors#rate_limited',
};

// Error suggestions
const ERROR_SUGGESTIONS: Record<string, string[]> = {
  bad_request: ['Check the request body format', 'Verify required fields are present'],
  unauthorized: ['Provide a valid x-api-key header', 'Check your API key is active'],
  insufficient_credits: ['Top up your credits', 'Upgrade your plan'],
  blocked: ['Try with a different URL', 'Contact support if this persists'],
  queue_unavailable: ['Try again later', 'Contact support'],
  server_error: ['Try your request again', 'Contact support if issue persists'],
  rate_limited: ['Wait before making more requests', 'Upgrade your plan for higher limits'],
};

interface EnhancedErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    suggestion?: string;
    docs_url?: string;
    requestId?: string;
    retryable?: boolean;
  };
}

function createErrorResponse(
  code: string,
  message: string,
  status = 400,
  requestId?: string,
  additional?: Record<string, unknown>,
): Response {
  const errorBody: EnhancedErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(ERROR_SUGGESTIONS[code] && { suggestion: ERROR_SUGGESTIONS[code].join(' ') }),
      ...(ERROR_DOCS_URLS[code] && { docs_url: ERROR_DOCS_URLS[code] }),
      ...(requestId && { requestId }),
      retryable: ['server_error', 'queue_unavailable', 'rate_limited'].includes(code),
      ...additional,
    },
  };
  return jsonResponse(errorBody, status, {});
}

interface IdempotencyEntry {
  idempotency_key: string;
  request_hash: string;
  response_body: string;
  status_code: number;
  created_at: number;
  expires_at: number;
}

const IDEMPOTENCY_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

async function getIdempotentResponse(
  db: D1Database,
  idempotencyKey: string,
  requestHash: string,
): Promise<{ response: Response; entry: IdempotencyEntry } | null> {
  const entry = await db
    .prepare('SELECT * FROM idempotency_entries WHERE idempotency_key = ?')
    .bind(idempotencyKey)
    .first<IdempotencyEntry>();

  if (!entry) return null;

  // Verify request hash matches for security
  if (entry.request_hash !== requestHash) {
    return null;
  }

  // Check if expired
  if (Date.now() > entry.expires_at) {
    await db
      .prepare('DELETE FROM idempotency_entries WHERE idempotency_key = ?')
      .bind(idempotencyKey)
      .run();
    return null;
  }

  let responseBody: Record<string, unknown>;
  try {
    responseBody = JSON.parse(entry.response_body);
  } catch {
    return null;
  }

  return {
    response: jsonResponse(responseBody, entry.status_code, {
      'X-Idempotency-Key': idempotencyKey,
    }),
    entry,
  };
}

async function storeIdempotentResponse(
  db: D1Database,
  idempotencyKey: string,
  requestHash: string,
  responseBody: Record<string, unknown>,
  statusCode: number,
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO idempotency_entries (idempotency_key, request_hash, response_body, status_code, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      idempotencyKey,
      requestHash,
      JSON.stringify(responseBody),
      statusCode,
      now,
      now + IDEMPOTENCY_TTL_MS,
    )
    .run();
}

function hashRequestBody(body: unknown): string {
  const str = JSON.stringify(body);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export async function handleExtract(
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
    return createErrorResponse('bad_request', parsed.message, 400, requestId);
  }

  const extractRequest = parsed.data;

  // Check for idempotency key
  const idempotencyKey = request.headers.get('x-idempotency-key');
  if (idempotencyKey) {
    if (idempotencyKey.length > 255) {
      return createErrorResponse(
        'bad_request',
        'Idempotency key must be 255 characters or less.',
        400,
        requestId,
      );
    }

    const requestHash = hashRequestBody(body);
    const cachedResponse = await getIdempotentResponse(env.DB, idempotencyKey, requestHash);
    if (cachedResponse) {
      const response = cachedResponse.response;
      ctx.waitUntil(
        logEvent(env.DB, {
          id: crypto.randomUUID(),
          requestId,
          apiKeyId: null,
          eventType: 'idempotency_hit',
          message: 'Returned cached response for idempotency key.',
          metadata: { idempotencyKey },
          createdAt: (deps.now ?? Date.now)(),
        }),
      );
      return new Response(response.body, {
        status: response.status,
        headers: { ...response.headers, ...corsHeaders },
      });
    }
  }

  const auth = await authorize(request, env, true, deps);
  if (!auth.ok) {
    return createErrorResponse(
      auth.errorCode ?? 'unauthorized',
      'API key required or invalid.',
      auth.status,
      requestId,
    );
  }

  const startedAt = (deps.now ?? Date.now)();
  const prefix = apiPrefix(url.pathname);

  if (extractRequest.async) {
    return handleAsyncExtract(
      env,
      corsHeaders,
      url,
      requestId,
      extractRequest,
      auth,
      startedAt,
      prefix,
      idempotencyKey,
      body,
    );
  }

  return handleSyncExtract(
    env,
    ctx,
    deps,
    corsHeaders,
    requestId,
    extractRequest,
    auth,
    startedAt,
    idempotencyKey,
    body,
  );
}

async function handleAsyncExtract(
  env: Env,
  corsHeaders: Record<string, string>,
  url: URL,
  requestId: string,
  extractRequest: ExtractRequest,
  auth: { apiKeyId?: string | null; remainingCredits?: number | null },
  startedAt: number,
  prefix: string,
  idempotencyKey: string | null,
  body: unknown,
): Promise<Response> {
  const webhookUrl = extractRequest.webhook_url ?? null;
  const webhookSecret = extractRequest.webhook_secret ?? null;

  if (!env.TASK_QUEUE || typeof env.TASK_QUEUE.send !== 'function') {
    const errorResponse = createErrorResponse(
      'queue_unavailable',
      'Queue binding is not configured.',
      503,
      requestId,
    );
    if (idempotencyKey) {
      await storeIdempotentResponse(
        env.DB,
        idempotencyKey,
        hashRequestBody(body),
        await errorResponse.json(),
        503,
      );
    }
    return errorResponse;
  }

  await createJob(env.DB, {
    id: requestId,
    apiKeyId: auth.apiKeyId ?? null,
    url: extractRequest.url,
    fields: extractRequest.fields,
    schema: extractRequest.schema,
    instructions: extractRequest.instructions,
    options: extractRequest.options,
    webhookUrl,
    webhookSecret,
    createdAt: startedAt,
  });

  await env.TASK_QUEUE.send({
    jobId: requestId,
    apiKeyId: auth.apiKeyId ?? null,
    url: extractRequest.url,
    fields: extractRequest.fields,
    schema: extractRequest.schema,
    instructions: extractRequest.instructions,
    webhookUrl,
    webhookSecret,
    options: extractRequest.options,
  });

  const responseBody = {
    success: true,
    job_id: requestId,
    status: 'queued',
    status_url: `${url.origin}${prefix}/jobs/${requestId}`,
    meta: {
      remainingCredits: auth.remainingCredits ?? null,
    },
  };

  if (idempotencyKey) {
    await storeIdempotentResponse(env.DB, idempotencyKey, hashRequestBody(body), responseBody, 202);
  }

  return jsonResponse(responseBody, 202, corsHeaders);
}

async function handleSyncExtract(
  env: Env,
  ctx: ExecutionContext,
  deps: HandlerDeps,
  corsHeaders: Record<string, string>,
  requestId: string,
  extractRequest: ExtractRequest,
  auth: { apiKeyId?: string | null; remainingCredits?: number | null },
  startedAt: number,
  idempotencyKey: string | null,
  body: unknown,
): Promise<Response> {
  const extractor = deps.extract ?? extractWithLLM;
  const scraper = deps.scrape ?? scrapePage;
  const cacheSettings = getCacheSettings(env);
  const cacheKey = cacheSettings.enabled
    ? await computeCacheKey({
        url: extractRequest.url,
        fields: extractRequest.fields,
        schema: extractRequest.schema,
        instructions: extractRequest.instructions,
      })
    : null;

  // Check cache first
  if (cacheSettings.enabled && cacheKey) {
    const cachedResponse = await tryServeFromCache(
      env,
      ctx,
      deps,
      corsHeaders,
      requestId,
      cacheKey,
      auth,
      startedAt,
      extractRequest,
    );
    if (cachedResponse) return cachedResponse;

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

  const timeoutMs = extractRequest.options?.timeoutMs ?? Number(env.BROWSER_TIMEOUT_MS || 15000);
  const waitUntil = extractRequest.options?.waitUntil ?? 'domcontentloaded';
  const maxContentChars = Number(env.MAX_CONTENT_CHARS || 20000);
  const screenshotEnabled =
    typeof extractRequest.options?.screenshot === 'boolean'
      ? extractRequest.options?.screenshot
      : env.DEFAULT_SCREENSHOT === 'true';
  const storeContent =
    typeof extractRequest.options?.storeContent === 'boolean'
      ? extractRequest.options?.storeContent
      : env.STORE_CONTENT !== 'false';

  let scrapeResult: ScrapeResult | null = null;
  let extractResult: { data: Record<string, unknown>; usage: number; raw: string } | null = null;
  let errorMessage: string | null = null;

  try {
    scrapeResult = await scraper(env.MYBROWSER, extractRequest.url, {
      waitUntil,
      timeoutMs,
      screenshot: screenshotEnabled,
      maxContentChars,
    });

    if (scrapeResult.blocked) {
      scrapeResult = await tryProxyGridFallback(
        env,
        ctx,
        deps,
        requestId,
        auth,
        extractRequest,
        scrapeResult,
        screenshotEnabled,
        maxContentChars,
      );
    }

    if (scrapeResult.blocked) {
      return handleBlockedResponse(
        env,
        ctx,
        deps,
        corsHeaders,
        requestId,
        auth,
        extractRequest,
        scrapeResult,
        startedAt,
      );
    }

    const { provider, model, apiKey, baseUrl } = resolveAiConfig(env);

    extractResult = await extractor({
      provider,
      model,
      apiKey,
      baseUrl,
      content: scrapeResult.content,
      fields: extractRequest.fields,
      schema: extractRequest.schema,
      instructions: extractRequest.instructions,
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

    if (idempotencyKey) {
      ctx.waitUntil(
        storeIdempotentResponse(
          env.DB,
          idempotencyKey,
          hashRequestBody(body),
          responseBody as unknown as Record<string, unknown>,
          200,
        ),
      );
    }

    ctx.waitUntil(
      storeExtractResult(
        env,
        deps,
        requestId,
        auth,
        extractRequest,
        cacheSettings,
        cacheKey,
        scrapeResult,
        extractResult,
        latencyMs,
        storeContent,
      ),
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

    if (idempotencyKey) {
      ctx.waitUntil(
        storeIdempotentResponse(
          env.DB,
          idempotencyKey,
          hashRequestBody(body),
          responseBody as unknown as Record<string, unknown>,
          500,
        ),
      );
    }

    ctx.waitUntil(
      logRequest(env.DB, {
        id: requestId,
        apiKeyId: auth.apiKeyId ?? null,
        url: extractRequest.url,
        fields: extractRequest.fields,
        schema: extractRequest.schema,
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

async function tryServeFromCache(
  env: Env,
  ctx: ExecutionContext,
  deps: HandlerDeps,
  corsHeaders: Record<string, string>,
  requestId: string,
  cacheKey: string,
  auth: { apiKeyId?: string | null; remainingCredits?: number | null },
  startedAt: number,
  extractRequest: ExtractRequest,
): Promise<Response | null> {
  const cached = await getCacheEntry(env.DB, cacheKey, startedAt);
  if (!cached?.result_path) return null;

  const cachedData = await loadCacheResult(env.BUCKET, cached.result_path);
  if (!cachedData) return null;

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
      url: extractRequest.url,
      fields: extractRequest.fields,
      schema: extractRequest.schema,
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

async function tryProxyGridFallback(
  env: Env,
  ctx: ExecutionContext,
  deps: HandlerDeps,
  requestId: string,
  auth: { apiKeyId?: string | null },
  extractRequest: ExtractRequest,
  scrapeResult: ScrapeResult,
  screenshotEnabled: boolean,
  maxContentChars: number,
): Promise<ScrapeResult> {
  const proxyConfig = getProxyGridConfig(env);
  if (!isProxyGridAllowed(proxyConfig, auth.apiKeyId ?? null)) {
    return scrapeResult;
  }

  try {
    const fallback = await fetchProxyGridFallback({
      config: proxyConfig,
      url: extractRequest.url,
      maxContentChars,
      screenshot: screenshotEnabled,
    });

    if (fallback?.result?.content) {
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
      return fallback.result as ScrapeResult;
    }

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

  return scrapeResult;
}

function handleBlockedResponse(
  env: Env,
  ctx: ExecutionContext,
  deps: HandlerDeps,
  corsHeaders: Record<string, string>,
  requestId: string,
  auth: { apiKeyId?: string | null; remainingCredits?: number | null },
  extractRequest: ExtractRequest,
  scrapeResult: ScrapeResult,
  startedAt: number,
): Response {
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
      url: extractRequest.url,
      fields: extractRequest.fields,
      schema: extractRequest.schema,
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

async function storeExtractResult(
  env: Env,
  deps: HandlerDeps,
  requestId: string,
  auth: { apiKeyId?: string | null },
  extractRequest: ExtractRequest,
  cacheSettings: { enabled: boolean; ttlMs: number },
  cacheKey: string | null,
  scrapeResult: ScrapeResult,
  extractResult: { data: Record<string, unknown>; usage: number },
  latencyMs: number,
  storeContent: boolean,
): Promise<void> {
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
        url: extractRequest.url,
        fields: extractRequest.fields,
        schema: extractRequest.schema,
        instructions: extractRequest.instructions,
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
    url: extractRequest.url,
    fields: extractRequest.fields,
    schema: extractRequest.schema,
    tokenUsage: extractResult?.usage ?? 0,
    latencyMs,
    status: 'success',
    errorMessage: null,
    snapshotKey,
    contentKey,
    blocked: false,
    createdAt: (deps.now ?? Date.now)(),
  });
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

function apiPrefix(pathname: string): string {
  return pathname.startsWith('/v1/') ? '/v1' : '';
}
