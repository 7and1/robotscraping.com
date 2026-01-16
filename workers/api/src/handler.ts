import { jsonResponse, textResponse, getCorsHeaders } from './lib/http';
import {
  getClientIdentifier,
  RateLimiter,
  checkRateLimit,
  getD1RateLimitHeaders,
  createClientId,
} from './lib/rate-limit';
import {
  handleExtract,
  handleJobs,
  handleSchedules,
  handleUsage,
  handleWebhookTest,
  handleBatch,
  handleAuth,
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

/**
 * Get security headers to add to all responses
 */
function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

/**
 * Rate limit check result
 */
interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Perform rate limit check using either D1 or in-memory limiter
 */
async function performRateLimitCheck(
  request: Request,
  env: Env,
): Promise<{ result: RateLimitCheckResult; headers: Record<string, string> }> {
  const isAuthenticated = !!request.headers.get('x-api-key');
  const useD1RateLimit = env.USE_D1_RATE_LIMIT === 'true';

  if (useD1RateLimit) {
    // Use D1-backed distributed rate limiting
    const ip = request.headers.get('cf-connecting-ip');
    const userAgent = request.headers.get('user-agent') || undefined;
    const clientId = createClientId(null, ip, userAgent);

    const result = await checkRateLimit(env.DB, clientId, isAuthenticated);
    const headers = getD1RateLimitHeaders(result);

    return { result, headers };
  }

  // Use in-memory rate limiting (fallback)
  const clientId = getClientIdentifier(request);
  const limiter = getRateLimiter(env);
  const tier = isAuthenticated ? 'authenticated' : 'default';
  const check = limiter.check(clientId, tier);
  const headers = limiter.getRateLimitHeaders(clientId, tier);
  limiter.cleanup();

  return {
    result: {
      allowed: check.allowed,
      remaining: check.remaining,
      resetAt: check.resetAt,
      limit: Number(headers['X-RateLimit-Limit']),
    },
    headers,
  };
}

export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  deps: HandlerDeps = {},
): Promise<Response> {
  const corsHeaders = getCorsHeaders(env.CORS_ORIGIN);
  const securityHeaders = getSecurityHeaders();
  const url = new URL(request.url);
  const normalizedPath = normalizePath(url.pathname);
  const parts = normalizedPath.split('/').filter(Boolean);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders, ...securityHeaders },
    });
  }

  const requestId = crypto.randomUUID();

  // Health check - no auth required
  if (request.method === 'GET' && normalizedPath === '/health') {
    return jsonResponse({ ok: true, service: 'robot-scraping-core', requestId }, 200, {
      ...corsHeaders,
      ...securityHeaders,
    });
  }

  // OpenAPI spec - no auth required
  if (
    request.method === 'GET' &&
    (normalizedPath === '/openapi.json' || normalizedPath === '/docs')
  ) {
    return handleOpenApi(env, { ...corsHeaders, ...securityHeaders });
  }

  if (parts.length === 0) {
    return textResponse('Not Found', 404, { ...corsHeaders, ...securityHeaders });
  }

  // Rate limiting (skip if disabled)
  if (env.RATE_LIMIT_ENABLED !== 'false') {
    const { result: rateLimitCheck, headers: rateLimitHeaders } = await performRateLimitCheck(
      request,
      env,
    );

    if (!rateLimitCheck.allowed) {
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
        { ...corsHeaders, ...securityHeaders, ...rateLimitHeaders },
      );
    }

    // Store rate limit headers to add to successful responses
    (env as Env & { _rateLimitHeaders?: Record<string, string> })._rateLimitHeaders =
      rateLimitHeaders;
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
      { ...corsHeaders, ...securityHeaders },
    );
  }

  // Route to handler
  const response = await routeRequest(
    request,
    env,
    ctx,
    deps,
    corsHeaders,
    securityHeaders,
    url,
    parts,
    requestId,
  );

  return response;
}

async function routeRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  deps: HandlerDeps,
  corsHeaders: Record<string, string>,
  securityHeaders: Record<string, string>,
  url: URL,
  parts: string[],
  requestId: string,
): Promise<Response> {
  // Merge headers for all responses
  const baseHeaders = { ...corsHeaders, ...securityHeaders };

  switch (parts[0]) {
    case 'extract':
      return handleExtract(request, env, ctx, deps, baseHeaders, url, requestId);
    case 'jobs':
      return handleJobs(request, env, baseHeaders, parts, url);
    case 'schedules':
      return handleSchedules(request, env, baseHeaders, parts, deps);
    case 'webhook':
      return handleWebhookTest(request, env, baseHeaders, parts);
    case 'usage':
      return handleUsage(request, env, baseHeaders, url, parts);
    case 'batch':
      return handleBatch(request, env, baseHeaders, url, deps);
    case 'auth':
      return handleAuth(request, env, baseHeaders, parts, url);
    default:
      return textResponse('Not Found', 404, baseHeaders);
  }
}

function normalizePath(pathname: string): string {
  return pathname.startsWith('/v1/') ? pathname.replace('/v1', '') : pathname;
}
