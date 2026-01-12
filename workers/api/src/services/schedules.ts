import type { ScheduleRecord } from '../types';

// Dynamic import to avoid module load issues in Cloudflare Workers
async function getCronParser() {
  return (await import('cron-parser')).default;
}

export interface CreateScheduleInput {
  id: string;
  apiKeyId: string | null;
  url: string;
  fields?: string[];
  schema?: Record<string, unknown>;
  instructions?: string;
  cron: string;
  webhookUrl: string;
  webhookSecret?: string | null;
  createdAt: number;
}

export async function computeNextRun(cron: string, nowMs: number): Promise<number> {
  const cronParser = await getCronParser();
  const interval = cronParser.parseExpression(cron, {
    currentDate: new Date(nowMs),
    tz: 'UTC',
  });
  return interval.next().getTime();
}

export async function createSchedule(db: D1Database, input: CreateScheduleInput): Promise<void> {
  const nextRunAt = await computeNextRun(input.cron, input.createdAt);
  await db
    .prepare(
      'INSERT INTO schedules (id, api_key_id, url, fields_config, schema_json, instructions, cron, webhook_url, webhook_secret, is_active, next_run_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      input.id,
      input.apiKeyId,
      input.url,
      input.fields ? JSON.stringify(input.fields) : null,
      input.schema ? JSON.stringify(input.schema) : null,
      input.instructions ?? null,
      input.cron,
      input.webhookUrl,
      input.webhookSecret ?? null,
      1,
      nextRunAt,
      input.createdAt,
    )
    .run();
}

export async function listSchedules(
  db: D1Database,
  params: { apiKeyId?: string | null; limit: number },
): Promise<ScheduleRecord[]> {
  const limit = Math.max(1, Math.min(params.limit, 100));
  const where = params.apiKeyId ? 'WHERE api_key_id = ?' : '';
  const statement = db.prepare(
    `SELECT * FROM schedules ${where} ORDER BY created_at DESC LIMIT ${limit}`,
  );
  const result = params.apiKeyId
    ? await statement.bind(params.apiKeyId).all()
    : await statement.all();
  return (result.results as ScheduleRecord[]) ?? [];
}

export async function getSchedule(
  db: D1Database,
  scheduleId: string,
  apiKeyId?: string | null,
): Promise<ScheduleRecord | null> {
  const statement = apiKeyId
    ? db
        .prepare('SELECT * FROM schedules WHERE id = ? AND api_key_id = ?')
        .bind(scheduleId, apiKeyId)
    : db.prepare('SELECT * FROM schedules WHERE id = ?').bind(scheduleId);
  const record = await statement.first();
  return (record as ScheduleRecord) ?? null;
}

export async function getDueSchedules(
  db: D1Database,
  nowMs: number,
  limit = 25,
): Promise<ScheduleRecord[]> {
  const capped = Math.max(1, Math.min(limit, 100));
  const result = await db
    .prepare(
      'SELECT * FROM schedules WHERE is_active = 1 AND next_run_at IS NOT NULL AND next_run_at <= ? ORDER BY next_run_at ASC LIMIT ?',
    )
    .bind(nowMs, capped)
    .all();
  return (result.results as ScheduleRecord[]) ?? [];
}

export async function updateSchedule(
  db: D1Database,
  params: {
    id: string;
    apiKeyId?: string | null;
    isActive?: boolean;
    cron?: string;
    webhookUrl?: string;
    webhookSecret?: string | null;
    fields?: string[];
    schema?: Record<string, unknown>;
    instructions?: string;
    nextRunAt?: number | null;
    lastRunAt?: number | null;
  },
): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (params.isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(params.isActive ? 1 : 0);
  }
  if (params.cron) {
    updates.push('cron = ?');
    values.push(params.cron);
  }
  if (params.webhookUrl) {
    updates.push('webhook_url = ?');
    values.push(params.webhookUrl);
  }
  if (params.webhookSecret !== undefined) {
    updates.push('webhook_secret = ?');
    values.push(params.webhookSecret ?? null);
  }
  if (params.fields) {
    updates.push('fields_config = ?');
    values.push(JSON.stringify(params.fields));
  }
  if (params.schema) {
    updates.push('schema_json = ?');
    values.push(JSON.stringify(params.schema));
  }
  if (params.instructions !== undefined) {
    updates.push('instructions = ?');
    values.push(params.instructions ?? null);
  }
  if (params.nextRunAt !== undefined) {
    updates.push('next_run_at = ?');
    values.push(params.nextRunAt);
  }
  if (params.lastRunAt !== undefined) {
    updates.push('last_run_at = ?');
    values.push(params.lastRunAt);
  }

  if (updates.length === 0) {
    return;
  }

  const where = params.apiKeyId ? 'WHERE id = ? AND api_key_id = ?' : 'WHERE id = ?';
  const statement = db.prepare(`UPDATE schedules SET ${updates.join(', ')} ${where}`);
  if (params.apiKeyId) {
    values.push(params.id, params.apiKeyId);
  } else {
    values.push(params.id);
  }

  await statement.bind(...values).run();
}
