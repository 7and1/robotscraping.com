import { jsonResponse, textResponse } from '../lib/http';
import { verifyApiKey } from '../services/auth';
import { getRecentLogs, getUsageExport, getUsageSeries, getUsageSummary } from '../services/usage';
import type { Env } from '../types';

export async function handleUsage(
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
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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
