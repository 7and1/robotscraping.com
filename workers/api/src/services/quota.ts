import { sha256 } from '../lib/crypto';

export type QuotaTier = 'anonymous' | 'github' | 'pro';

export const DAILY_LIMITS: Record<QuotaTier, number | null> = {
  anonymous: 5,
  github: 50,
  pro: 1000,
};

export function resolveTier(raw?: string | null): QuotaTier {
  const normalized = (raw || '').toLowerCase();
  if (normalized === 'pro' || normalized === 'paid') return 'pro';
  if (normalized === 'anonymous' || normalized === 'free') return 'anonymous';
  return 'github';
}

export function getDayKey(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export async function createAnonScope(
  ip: string | null,
  userAgent?: string | null,
): Promise<string> {
  const input = `${ip ?? 'unknown'}:${userAgent ?? ''}`;
  const hash = await sha256(input);
  return `anon:${hash.slice(0, 32)}`;
}

export async function getUsageCount(db: D1Database, scope: string, day: string): Promise<number> {
  const id = `${scope}:${day}`;
  const entry = await db
    .prepare('SELECT count FROM daily_usage WHERE id = ?')
    .bind(id)
    .first<{ count: number }>();

  return entry?.count ?? 0;
}

export async function getRemainingForScope(
  db: D1Database,
  scope: string,
  limit: number | null,
  day: string,
): Promise<number | null> {
  if (limit === null) return null;
  const count = await getUsageCount(db, scope, day);
  return Math.max(0, limit - count);
}

export async function incrementUsage(
  db: D1Database,
  scope: string,
  amount: number,
  limit: number | null,
  day: string,
  now: number = Date.now(),
): Promise<{ allowed: boolean; remaining: number | null; count: number | null }> {
  if (limit === null) {
    return { allowed: true, remaining: null, count: null };
  }

  if (amount <= 0) {
    return { allowed: true, remaining: limit, count: 0 };
  }

  const id = `${scope}:${day}`;

  const result = await db
    .prepare(
      `INSERT INTO daily_usage (id, scope, day, count, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         count = CASE
           WHEN daily_usage.count + 1 <= ? THEN daily_usage.count + 1
           ELSE daily_usage.count
         END,
         updated_at = ?
       RETURNING count`,
    )
    .bind(id, scope, day, now, now, limit, now)
    .first<{ count: number }>();

  if (!result) {
    return { allowed: false, remaining: 0, count: 0 };
  }

  const isNew = result.count === 1;
  const actualCount = result.count;

  return {
    allowed: true,
    remaining: Math.max(0, limit - actualCount),
    count: actualCount,
  };
}
