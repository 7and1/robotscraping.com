import { jsonResponse, textResponse } from '../lib/http';
import { parseExtractRequest } from '../lib/validate';
import { consumeApiKey, verifyApiKey } from '../services/auth';
import { createJob } from '../services/jobs';
import { logEvent } from '../services/storage';
import type { Env, ExtractRequest, HandlerDeps } from '../types';

const MAX_BATCH_SIZE = 50;
const DEFAULT_MAX_BATCH_SIZE = 10;

interface BatchExtractRequest {
  urls: string[];
  fields?: string[];
  schema?: Record<string, unknown>;
  instructions?: string;
  webhook_url?: string;
  webhook_secret?: string;
  options?: ExtractRequest['options'];
}

interface BatchExtractResponse {
  success: boolean;
  data?: {
    job_ids: string[];
    status_url: string;
    count: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function handleBatch(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  url: URL,
  deps: HandlerDeps = {},
): Promise<Response> {
  if (request.method !== 'POST') {
    return textResponse('Method Not Allowed', 405, corsHeaders);
  }

  const requestId = (deps.uuid ?? crypto.randomUUID)();

  // Parse request body
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return jsonResponse(
      {
        success: false,
        error: { code: 'bad_request', message: 'Invalid request body.' },
      },
      400,
      corsHeaders,
    );
  }

  // Validate URLs array
  const { urls } = body as { urls?: unknown };
  if (!Array.isArray(urls) || urls.length === 0) {
    return jsonResponse(
      {
        success: false,
        error: { code: 'bad_request', message: 'urls must be a non-empty array.' },
      },
      400,
      corsHeaders,
    );
  }

  // Check batch size limits
  const maxBatchSize = Number(env.MAX_BATCH_SIZE || DEFAULT_MAX_BATCH_SIZE);
  if (urls.length > Math.min(maxBatchSize, MAX_BATCH_SIZE)) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'bad_request',
          message: `Maximum batch size is ${Math.min(maxBatchSize, MAX_BATCH_SIZE)} URLs.`,
        },
      },
      400,
      corsHeaders,
    );
  }

  // Validate each URL
  for (const urlEntry of urls) {
    if (typeof urlEntry !== 'string' || !urlEntry.trim()) {
      return jsonResponse(
        {
          success: false,
          error: { code: 'bad_request', message: 'All URLs must be non-empty strings.' },
        },
        400,
        corsHeaders,
      );
    }
    try {
      const parsed = new URL(urlEntry);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return jsonResponse(
          {
            success: false,
            error: { code: 'bad_request', message: 'All URLs must use http or https protocol.' },
          },
          400,
          corsHeaders,
        );
      }
    } catch {
      return jsonResponse(
        {
          success: false,
          error: { code: 'bad_request', message: `Invalid URL: ${urlEntry}` },
        },
        400,
        corsHeaders,
      );
    }
  }

  // Authorize request (consume credits for batch)
  const auth = await authorize(request, env, urls.length, deps);
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

  // Check queue availability
  if (!env.TASK_QUEUE || typeof env.TASK_QUEUE.send !== 'function') {
    return jsonResponse(
      {
        success: false,
        error: { code: 'queue_unavailable', message: 'Queue service is not available.' },
      },
      503,
      corsHeaders,
    );
  }

  // Common fields for all jobs
  const commonFields = parseExtractRequest({
    fields: body.fields,
    schema: body.schema,
    instructions: body.instructions,
    webhook_url: body.webhook_url,
    webhook_secret: body.webhook_secret,
    options: body.options,
  });

  if (!commonFields.ok) {
    return jsonResponse(
      {
        success: false,
        error: { code: 'bad_request', message: commonFields.message },
      },
      400,
      corsHeaders,
    );
  }

  const { fields, schema, instructions, webhook_url, webhook_secret, options } = commonFields.data;
  const webhookUrl = webhook_url || null;
  const webhookSecret = webhook_secret || null;

  // Create jobs for each URL
  const jobIds: string[] = [];
  const prefix = apiPrefix(url.pathname);
  const now = deps.now ? deps.now() : Date.now();

  for (const targetUrl of urls) {
    const jobId = crypto.randomUUID();

    await createJob(env.DB, {
      id: jobId,
      apiKeyId: auth.apiKeyId ?? null,
      url: targetUrl,
      fields,
      schema,
      instructions,
      options,
      webhookUrl,
      webhookSecret,
      createdAt: now,
    });

    await env.TASK_QUEUE.send({
      jobId,
      apiKeyId: auth.apiKeyId ?? null,
      url: targetUrl,
      fields,
      schema,
      instructions,
      webhookUrl,
      webhookSecret,
      options,
    });

    jobIds.push(jobId);
  }

  // Log batch event
  await logEvent(env.DB, {
    id: crypto.randomUUID(),
    requestId,
    apiKeyId: auth.apiKeyId ?? null,
    eventType: 'batch_created',
    message: `Created batch of ${jobIds.length} jobs.`,
    metadata: { jobIds, count: jobIds.length },
    createdAt: now,
  }).catch((err) => {
    console.error('Failed to log batch event:', err);
  });

  const responseBody: BatchExtractResponse = {
    success: true,
    data: {
      job_ids: jobIds,
      status_url: `${url.origin}${prefix}/jobs`,
      count: jobIds.length,
    },
  };

  return jsonResponse(responseBody, 202, corsHeaders);
}

async function authorize(
  request: Request,
  env: Env,
  requestCount: number,
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

  // For batch requests, verify credits are sufficient
  const result = await verifyApiKey(env.DB, apiKey);
  if (!result.ok) {
    const status = result.errorCode === 'insufficient_credits' ? 402 : 401;
    return { ok: false, status, errorCode: result.errorCode };
  }

  // Check if sufficient credits for batch
  if (result.remainingCredits !== null && result.remainingCredits < requestCount) {
    return { ok: false, status: 402, errorCode: 'insufficient_credits' };
  }

  // Consume credits for batch
  const consumeResult = await consumeApiKey(env.DB, apiKey, deps.now ? deps.now() : Date.now());
  if (!consumeResult.ok) {
    return { ok: false, status: 401, errorCode: consumeResult.errorCode };
  }

  return {
    ok: true,
    apiKeyId: consumeResult.apiKeyId ?? null,
    remainingCredits: consumeResult.remainingCredits ?? null,
  };
}

function apiPrefix(pathname: string): string {
  return pathname.startsWith('/v1/') ? '/v1' : '';
}
