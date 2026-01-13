export interface UsageSummary {
  total: number;
  success: number;
  cached: number;
  blocked: number;
  failed: number;
  tokens: number;
  avgLatencyMs: number;
}

export interface UsageSeriesEntry {
  day: string;
  total: number;
  tokens: number;
  avgLatencyMs: number;
}

export interface UsageLogEntry {
  id: string;
  url: string;
  status: string;
  token_usage: number | null;
  latency_ms: number | null;
  created_at: number;
}

export async function getUsageSummary(
  db: D1Database,
  params: { apiKeyId?: string | null; from: number; to: number },
): Promise<UsageSummary> {
  const { apiKeyId, from, to } = params;
  const values = apiKeyId ? [apiKeyId, from, to] : [from, to];
  const where = apiKeyId
    ? 'WHERE api_key_id = ? AND created_at BETWEEN ? AND ?'
    : 'WHERE created_at BETWEEN ? AND ?';
  const statement = db.prepare(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status IN ('success','cached') THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 'cached' THEN 1 ELSE 0 END) as cached,
      SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
      SUM(CASE WHEN status IN ('error','failed') THEN 1 ELSE 0 END) as failed,
      SUM(token_usage) as tokens,
      AVG(latency_ms) as avg_latency
     FROM scrape_logs ${where}`,
  );

  // Use Reflect.apply to avoid 'Illegal invocation' error
  const bound = Reflect.apply(statement.bind, statement, values);
  const record = (await bound.first()) as {
    total?: number;
    success?: number;
    cached?: number;
    blocked?: number;
    failed?: number;
    tokens?: number;
    avg_latency?: number;
  } | null;

  return {
    total: record?.total ?? 0,
    success: record?.success ?? 0,
    cached: record?.cached ?? 0,
    blocked: record?.blocked ?? 0,
    failed: record?.failed ?? 0,
    tokens: record?.tokens ?? 0,
    avgLatencyMs: record?.avg_latency ? Math.round(record.avg_latency) : 0,
  };
}

export async function getUsageSeries(
  db: D1Database,
  params: { apiKeyId?: string | null; from: number; to: number },
): Promise<UsageSeriesEntry[]> {
  const { apiKeyId, from, to } = params;
  const values = apiKeyId ? [apiKeyId, from, to] : [from, to];
  const where = apiKeyId
    ? 'WHERE api_key_id = ? AND created_at BETWEEN ? AND ?'
    : 'WHERE created_at BETWEEN ? AND ?';
  const statement = db.prepare(
    `SELECT
      strftime('%Y-%m-%d', datetime(created_at / 1000, 'unixepoch')) as day,
      COUNT(*) as total,
      SUM(token_usage) as tokens,
      AVG(latency_ms) as avg_latency
     FROM scrape_logs ${where}
     GROUP BY day
     ORDER BY day DESC
     LIMIT 30`,
  );

  // Use Reflect.apply to avoid 'Illegal invocation' error
  const bound = Reflect.apply(statement.bind, statement, values);
  const result = await bound.all();
  return (result.results as UsageSeriesEntry[]) ?? [];
}

export async function getRecentLogs(
  db: D1Database,
  params: { apiKeyId?: string | null; from: number; to: number; limit?: number },
): Promise<UsageLogEntry[]> {
  const { apiKeyId, from, to, limit = 50 } = params;
  const capped = Math.max(1, Math.min(limit, 100));
  const values = apiKeyId ? [apiKeyId, from, to] : [from, to];
  const where = apiKeyId
    ? 'WHERE api_key_id = ? AND created_at BETWEEN ? AND ?'
    : 'WHERE created_at BETWEEN ? AND ?';
  const statement = db.prepare(
    `SELECT id, url, status, token_usage, latency_ms, created_at FROM scrape_logs ${where} ORDER BY created_at DESC LIMIT ${capped}`,
  );

  // Use Reflect.apply to avoid 'Illegal invocation' error
  const bound = Reflect.apply(statement.bind, statement, values);
  const result = await bound.all();
  return (result.results as UsageLogEntry[]) ?? [];
}

export async function getUsageExport(
  db: D1Database,
  params: { apiKeyId?: string | null; from: number; to: number; limit: number },
): Promise<UsageLogEntry[]> {
  const { apiKeyId, from, to, limit } = params;
  const capped = Math.max(1, Math.min(limit, 5000));
  const values = apiKeyId ? [apiKeyId, from, to] : [from, to];
  const where = apiKeyId
    ? 'WHERE api_key_id = ? AND created_at BETWEEN ? AND ?'
    : 'WHERE created_at BETWEEN ? AND ?';
  const statement = db.prepare(
    `SELECT id, url, status, token_usage, latency_ms, created_at FROM scrape_logs ${where} ORDER BY created_at DESC LIMIT ${capped}`,
  );

  // Use Reflect.apply to avoid 'Illegal invocation' error
  const bound = Reflect.apply(statement.bind, statement, values);
  const result = await bound.all();
  return (result.results as UsageLogEntry[]) ?? [];
}
