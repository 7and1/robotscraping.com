import { jsonResponse, textResponse } from '../lib/http';
import { parseExtractRequest } from '../lib/validate';
import { consumeApiKey, verifyApiKey } from '../services/auth';
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

  // Create jobs for each URL using D1 batch statements
  const jobIds: string[] = [];
  const prefix = apiPrefix(url.pathname);
  const now = deps.now ? deps.now() : Date.now();

  // Prepare all job insert statements for batch execution
  const jobStatements: D1PreparedStatement[] = [];
  const queueMessages: Array<{
    jobId: string;
    apiKeyId: string | null;
    url: string;
    fields?: string[];
    schema?: Record<string, unknown>;
    instructions?: string;
    webhookUrl?: string | null;
    webhookSecret?: string | null;
    options?: ExtractRequest['options'];
  }> = [];

  for (const targetUrl of urls) {
    const jobId = crypto.randomUUID();
    jobIds.push(jobId);

    // Build insert statement for this job
    jobStatements.push(
      env.DB.prepare(
        'INSERT INTO jobs (id, api_key_id, url, status, fields_requested, schema_json, instructions, options_json, webhook_url, webhook_secret, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(
        jobId,
        auth.apiKeyId ?? null,
        targetUrl,
        'queued',
        fields ? JSON.stringify(fields) : null,
        schema ? JSON.stringify(schema) : null,
        instructions ?? null,
        options ? JSON.stringify(options) : null,
        webhookUrl ?? null,
        webhookSecret ?? null,
        now,
      ),
    );

    // Prepare queue message for later sending
    queueMessages.push({
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
  }

  // Execute all job inserts in a single D1 batch operation
  try {
    await env.DB.batch(jobStatements);
  } catch (error) {
    console.error('Failed to create batch jobs:', error);
    return jsonResponse(
      {
        success: false,
        error: { code: 'internal_error', message: 'Failed to create batch jobs.' },
      },
      500,
      corsHeaders,
    );
  }

  // Send all messages to the task queue
  for (const message of queueMessages) {
    await env.TASK_QUEUE.send(message);
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
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return { ok: false, status: 401, errorCode: 'missing' };
  }

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
  const consumeResult = await consumeApiKey(
    env.DB,
    apiKey,
    deps.now ? deps.now() : Date.now(),
    requestCount,
  );
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
