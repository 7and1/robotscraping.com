import { jsonResponse, textResponse, getCorsHeaders } from './lib/http';
import { getClientIdentifier, RateLimiter } from './lib/rate-limit';
import {
  handleExtract,
  handleJobs,
  handleSchedules,
  handleUsage,
  handleWebhookTest,
  handleBatch,
  handleOpenApi,
} from './routes';
import type { Env, HandlerDeps } from './types';

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

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestId = (deps.uuid ?? crypto.randomUUID)();

  // Health check - no auth required
  if (request.method === 'GET' && normalizedPath === '/health') {
    return jsonResponse({ ok: true, service: 'robot-scraping-core', requestId }, 200, corsHeaders);
  }

  // OpenAPI spec - no auth required
  if (
    request.method === 'GET' &&
    (normalizedPath === '/openapi.json' || normalizedPath === '/docs')
  ) {
    return handleOpenApi(env, corsHeaders);
  }

  if (parts.length === 0) {
    return textResponse('Not Found', 404, corsHeaders);
  }

  // Rate limiting
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

  // Request size limit
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

  // Route to handler
  const response = await routeRequest(request, env, ctx, deps, corsHeaders, url, parts, requestId);

  // Add rate limit headers to response
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
    case 'batch':
      return handleBatch(request, env, corsHeaders, url, deps);
    default:
      return textResponse('Not Found', 404, corsHeaders);
  }
}

function normalizePath(pathname: string): string {
  return pathname.startsWith('/v1/') ? pathname.replace('/v1', '') : pathname;
}
