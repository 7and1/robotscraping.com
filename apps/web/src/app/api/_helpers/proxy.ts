export function getApiBase(): string | null {
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || null;
}

export async function proxyRequest(request: Request, path: string): Promise<Response> {
  const apiBase = getApiBase();
  if (!apiBase) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'config_error', message: 'API_URL is not configured.' },
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      },
    );
  }

  const endpoint = apiBase.replace(/\/$/, '') + path;
  const body =
    request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  const apiKey = request.headers.get('x-api-key');

  const upstream = await fetch(endpoint, {
    method: request.method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body,
  });

  const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
  const headers = new Headers({ 'content-type': contentType });
  const passthrough = [
    'x-request-id',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset',
    'x-cache-hit',
  ];
  for (const key of passthrough) {
    const value = upstream.headers.get(key);
    if (value) {
      headers.set(key, value);
    }
  }

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers,
  });
}
