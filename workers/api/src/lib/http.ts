import { getSecurityHeaders } from './security';

export function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigin = origin || '*';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, x-request-id',
    'Access-Control-Expose-Headers':
      'X-Request-ID, X-Cache-Hit, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset',
    'Access-Control-Max-Age': '86400',
  };
  if (allowedOrigin !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      ...getSecurityHeaders(),
      ...headers,
    },
  });
}

export function textResponse(
  body: string,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...getSecurityHeaders(),
      ...headers,
    },
  });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  requestId?: string,
  additional?: Record<string, unknown>,
): Response {
  return jsonResponse(
    {
      success: false,
      error: {
        code,
        message,
        ...(requestId && { requestId }),
        ...additional,
      },
    },
    status,
  );
}

export function withStandardHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return {
    ...getSecurityHeaders(),
    ...headers,
  };
}
