import { sha256 } from '../lib/crypto';

export interface CacheKeyInput {
  url: string;
  fields?: string[];
  schema?: Record<string, unknown>;
  instructions?: string;
}

export interface CacheRecord {
  cache_key: string;
  url: string | null;
  fields_json?: string | null;
  schema_json?: string | null;
  instructions?: string | null;
  result_path?: string | null;
  token_usage?: number | null;
  content_chars?: number | null;
  hit_count?: number | null;
  created_at: number;
  expires_at: number;
  last_hit_at?: number | null;
}

interface CacheSettings {
  enabled: boolean;
  ttlMs: number;
}

export function getCacheSettings(env: {
  CACHE_ENABLED?: string;
  CACHE_TTL_MS?: string;
}): CacheSettings {
  const enabled = env.CACHE_ENABLED !== 'false';
  const ttlMs = Number(env.CACHE_TTL_MS || 900000);
  return {
    enabled,
    ttlMs: Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 900000,
  };
}

export async function computeCacheKey(input: CacheKeyInput): Promise<string> {
  const normalizedFields = input.fields
    ? [...new Set(input.fields.map((field) => field.trim()).filter(Boolean))].sort()
    : undefined;
  const payload = {
    url: input.url,
    fields: normalizedFields ?? null,
    schema: input.schema ?? null,
    instructions: input.instructions?.trim() || null,
  };
  return sha256(stableStringify(payload));
}

export async function getCacheEntry(
  db: D1Database,
  key: string,
  now: number,
): Promise<CacheRecord | null> {
  const record = await db
    .prepare('SELECT * FROM cache_entries WHERE cache_key = ? AND expires_at > ?')
    .bind(key, now)
    .first();
  return (record as CacheRecord) ?? null;
}

export async function markCacheHit(db: D1Database, key: string, now: number): Promise<void> {
  await db
    .prepare(
      'UPDATE cache_entries SET hit_count = COALESCE(hit_count, 0) + 1, last_hit_at = ? WHERE cache_key = ?',
    )
    .bind(now, key)
    .run();
}

export async function storeCacheEntry(
  db: D1Database,
  params: {
    key: string;
    url: string;
    fields?: string[];
    schema?: Record<string, unknown>;
    instructions?: string;
    resultPath: string;
    tokenUsage: number;
    contentChars: number;
    createdAt: number;
    expiresAt: number;
  },
): Promise<void> {
  await db
    .prepare(
      'INSERT OR REPLACE INTO cache_entries (cache_key, url, fields_json, schema_json, instructions, result_path, token_usage, content_chars, hit_count, created_at, expires_at, last_hit_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT hit_count FROM cache_entries WHERE cache_key = ?), 0), ?, ?, ?)',
    )
    .bind(
      params.key,
      params.url,
      params.fields ? JSON.stringify(params.fields) : null,
      params.schema ? JSON.stringify(params.schema) : null,
      params.instructions ?? null,
      params.resultPath,
      params.tokenUsage,
      params.contentChars,
      params.key,
      params.createdAt,
      params.expiresAt,
      params.createdAt,
    )
    .run();
}

export async function deleteCacheEntry(db: D1Database, key: string): Promise<void> {
  await db.prepare('DELETE FROM cache_entries WHERE cache_key = ?').bind(key).run();
}

export async function loadCacheResult(
  bucket: R2Bucket,
  resultPath: string,
): Promise<Record<string, unknown> | null> {
  const object = await bucket.get(resultPath);
  if (!object) {
    return null;
  }
  const text = await object.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function storeCacheResult(
  bucket: R2Bucket,
  key: string,
  data: Record<string, unknown>,
): Promise<string> {
  const resultPath = `cache/${key}.json`;
  await bucket.put(resultPath, JSON.stringify(data, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
  return resultPath;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = sortKeys(val);
      return acc;
    }, {});
  }
  return value;
}
