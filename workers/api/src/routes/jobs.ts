import { jsonResponse, textResponse } from '../lib/http';
import { verifyApiKey } from '../services/auth';
import { getJob, listJobs } from '../services/jobs';
import type { Env, HandlerDeps } from '../types';

export async function handleJobs(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  parts: string[],
  url: URL,
): Promise<Response> {
  if (request.method !== 'GET') {
    return textResponse('Method Not Allowed', 405, corsHeaders);
  }

  const auth = await authorize(request, env);
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

  // List jobs
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

  // Get job result
  if (parts.length >= 3 && parts[2] === 'result') {
    return handleJobResult(env, corsHeaders, url, jobId, auth.apiKeyId);
  }

  // Get single job
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

async function handleJobResult(
  env: Env,
  corsHeaders: Record<string, string>,
  url: URL,
  jobId: string,
  apiKeyId: string | null | undefined,
): Promise<Response> {
  const job = await getJob(env.DB, jobId, apiKeyId ?? null);
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

async function authorize(
  request: Request,
  env: Env,
): Promise<
  { ok: true; apiKeyId?: string | null } | { ok: false; status: number; errorCode?: string }
> {
  const allowAnon = env.ALLOW_ANON === 'true';
  if (allowAnon) {
    return { ok: true, apiKeyId: null };
  }

  const apiKey = request.headers.get('x-api-key');
  const result = await verifyApiKey(env.DB, apiKey);

  if (!result.ok) {
    return { ok: false, status: 401, errorCode: result.errorCode };
  }

  return { ok: true, apiKeyId: result.apiKeyId ?? null };
}

function apiPrefix(pathname: string): string {
  return pathname.startsWith('/v1/') ? '/v1' : '';
}
