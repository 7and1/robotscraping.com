import type { ExtractRequest } from '../types';

export interface LogParams {
  id: string;
  apiKeyId: string | null;
  url: string;
  fields?: string[];
  schema?: Record<string, unknown>;
  tokenUsage: number;
  latencyMs: number;
  status: 'success' | 'error' | 'blocked' | 'cached';
  errorMessage?: string | null;
  snapshotKey?: string | null;
  contentKey?: string | null;
  blocked: boolean;
  createdAt: number;
}

export interface EventLogParams {
  id: string;
  requestId?: string | null;
  apiKeyId?: string | null;
  eventType: string;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: number;
}

export async function storeArtifacts(options: {
  bucket: R2Bucket;
  id: string;
  screenshot?: ArrayBuffer;
  screenshotType?: string;
  content?: string;
  storeContent: boolean;
}): Promise<{ snapshotKey?: string; contentKey?: string } | null> {
  const { bucket, id, screenshot, screenshotType, content, storeContent } = options;
  const resolvedType = screenshotType || 'image/webp';
  const snapshotExt =
    resolvedType === 'image/png' ? 'png' : resolvedType === 'image/jpeg' ? 'jpg' : 'webp';
  const snapshotKey = screenshot ? `logs/${id}.${snapshotExt}` : undefined;
  const contentKey = storeContent && content ? `logs/${id}.txt` : undefined;

  const tasks: Promise<unknown>[] = [];
  if (snapshotKey && screenshot) {
    tasks.push(
      bucket.put(snapshotKey, screenshot, { httpMetadata: { contentType: resolvedType } }),
    );
  }
  if (contentKey && content) {
    tasks.push(
      bucket.put(contentKey, content, {
        httpMetadata: { contentType: 'text/plain; charset=utf-8' },
      }),
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  await Promise.all(tasks);
  return { snapshotKey, contentKey };
}

export async function logRequest(db: D1Database, params: LogParams): Promise<void> {
  await db
    .prepare(
      'INSERT INTO scrape_logs (id, api_key_id, url, fields_requested, schema_json, token_usage, latency_ms, status, error, snapshot_key, content_key, blocked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      params.id,
      params.apiKeyId,
      params.url,
      params.fields ? JSON.stringify(params.fields) : null,
      params.schema ? JSON.stringify(params.schema) : null,
      params.tokenUsage,
      params.latencyMs,
      params.status,
      params.errorMessage ?? null,
      params.snapshotKey ?? null,
      params.contentKey ?? null,
      params.blocked ? 1 : 0,
      params.createdAt,
    )
    .run();
}

export async function logEvent(db: D1Database, params: EventLogParams): Promise<void> {
  await db
    .prepare(
      'INSERT INTO event_logs (id, request_id, api_key_id, event_type, message, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      params.id,
      params.requestId ?? null,
      params.apiKeyId ?? null,
      params.eventType,
      params.message ?? null,
      params.metadata ? JSON.stringify(params.metadata) : null,
      params.createdAt,
    )
    .run();
}

export async function storeJobResult(options: {
  bucket: R2Bucket;
  id: string;
  data: Record<string, unknown>;
}): Promise<{ resultKey: string }> {
  const resultKey = `results/${options.id}.json`;
  await options.bucket.put(resultKey, JSON.stringify(options.data, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
  return { resultKey };
}
