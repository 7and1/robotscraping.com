import type { JobRecord } from '../types';

export interface CreateJobInput {
  id: string;
  apiKeyId: string | null;
  url: string;
  fields?: string[];
  schema?: Record<string, unknown>;
  instructions?: string;
  options?: Record<string, unknown>;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  createdAt: number;
}

export async function createJob(db: D1Database, input: CreateJobInput): Promise<void> {
  await db
    .prepare(
      'INSERT INTO jobs (id, api_key_id, url, status, fields_requested, schema_json, instructions, options_json, webhook_url, webhook_secret, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      input.id,
      input.apiKeyId,
      input.url,
      'queued',
      input.fields ? JSON.stringify(input.fields) : null,
      input.schema ? JSON.stringify(input.schema) : null,
      input.instructions ?? null,
      input.options ? JSON.stringify(input.options) : null,
      input.webhookUrl ?? null,
      input.webhookSecret ?? null,
      input.createdAt,
    )
    .run();
}

export async function updateJobStatus(
  db: D1Database,
  params: {
    id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'blocked';
    startedAt?: number | null;
    completedAt?: number | null;
    resultPath?: string | null;
    errorMsg?: string | null;
    tokenUsage?: number | null;
    latencyMs?: number | null;
    blocked?: boolean;
  },
): Promise<void> {
  await db
    .prepare(
      'UPDATE jobs SET status = ?, started_at = COALESCE(?, started_at), completed_at = COALESCE(?, completed_at), result_path = ?, error_msg = ?, token_usage = ?, latency_ms = ?, blocked = ? WHERE id = ?',
    )
    .bind(
      params.status,
      params.startedAt ?? null,
      params.completedAt ?? null,
      params.resultPath ?? null,
      params.errorMsg ?? null,
      params.tokenUsage ?? null,
      params.latencyMs ?? null,
      params.blocked ? 1 : 0,
      params.id,
    )
    .run();
}

export async function getJob(
  db: D1Database,
  jobId: string,
  apiKeyId?: string | null,
): Promise<JobRecord | null> {
  const query = apiKeyId
    ? db.prepare('SELECT * FROM jobs WHERE id = ? AND api_key_id = ?').bind(jobId, apiKeyId)
    : db.prepare('SELECT * FROM jobs WHERE id = ?').bind(jobId);

  const record = await query.first();
  return (record as JobRecord) ?? null;
}

export async function listJobs(
  db: D1Database,
  params: { apiKeyId?: string | null; status?: string; limit: number },
): Promise<JobRecord[]> {
  const limit = Math.max(1, Math.min(params.limit, 100));
  const filters: string[] = [];
  const values: unknown[] = [];

  if (params.apiKeyId) {
    filters.push('api_key_id = ?');
    values.push(params.apiKeyId);
  }

  if (params.status) {
    filters.push('status = ?');
    values.push(params.status);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const statement = db.prepare(
    `SELECT * FROM jobs ${where} ORDER BY created_at DESC LIMIT ${limit}`,
  );

  // Use Reflect.apply to avoid 'Illegal invocation' error with spread
  const result =
    values.length > 0
      ? await Reflect.apply(statement.bind, statement, values).all()
      : await statement.all();
  return (result.results as JobRecord[]) ?? [];
}
