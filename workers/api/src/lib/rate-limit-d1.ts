/**
 * D1-backed persistent rate limiting
 * Uses atomic UPSERT for distributed rate limiting across worker instances
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

// Table initialization SQL
export const CREATE_RATE_LIMITS_TABLE = `
  CREATE TABLE IF NOT EXISTS rate_limits (
    client_id TEXT PRIMARY KEY,
    request_count INTEGER NOT NULL DEFAULT 1,
    window_end INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON rate_limits(window_end);
`;

const WINDOW_MS = 60000; // 60 seconds

const DEFAULT_LIMITS: Record<string, number> = {
  default: 60, // 60 requests per minute for anonymous
  authenticated: 1000, // 1000 requests per minute for authenticated users
};

type RateLimitTier = keyof typeof DEFAULT_LIMITS;

/**
 * Check rate limit using atomic UPSERT
 * This ensures thread-safe operations across multiple worker instances
 *
 * @param db - D1 database instance
 * @param clientId - Unique client identifier
 * @param isAuthenticated - Whether the client is authenticated
 * @returns RateLimitResult with allowance status and metadata
 */
export async function checkRateLimit(
  db: D1Database,
  clientId: string,
  isAuthenticated: boolean = false,
): Promise<RateLimitResult> {
  const tier: RateLimitTier = isAuthenticated ? 'authenticated' : 'default';
  const limit = DEFAULT_LIMITS[tier];
  const now = Date.now();
  const windowEnd = now + WINDOW_MS;

  // Use UPSERT (INSERT ... ON CONFLICT) for atomic increment-or-create
  // SQLite's UPSERT ensures atomicity without race conditions
  const stmt = db
    .prepare(
      `
    INSERT INTO rate_limits (client_id, request_count, window_end, created_at, updated_at)
    VALUES (?, 1, ?, ?, ?)
    ON CONFLICT (client_id) DO UPDATE SET
      request_count = CASE
        WHEN window_end <= ? THEN 1
        ELSE request_count + 1
      END,
      window_end = CASE
        WHEN window_end <= ? THEN ?
        ELSE window_end
      END,
      updated_at = ?
    RETURNING request_count, window_end
  `,
    )
    .bind(
      clientId,
      windowEnd,
      now,
      now,
      // For UPDATE: current time for expiry check
      now,
      // New window_end if expired
      now,
      windowEnd,
      // Updated at timestamp
      now,
    );

  const result = await stmt.first<{ request_count: number; window_end: number }>();

  if (!result) {
    // Fallback: should not happen with RETURNING, but handle gracefully
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: windowEnd,
      limit,
    };
  }

  const { request_count: count, window_end: resetAt } = result;

  // Re-check limit after atomic increment (in case window expired during check)
  const currentWindowEnd = result.window_end;
  const isExpired = now > currentWindowEnd;

  return {
    allowed: isExpired || count <= limit,
    remaining: Math.max(0, limit - (isExpired ? 1 : count)),
    resetAt: isExpired ? windowEnd : resetAt,
    limit,
  };
}

/**
 * Get current rate limit status without incrementing counter
 */
export async function getRateLimitStatus(
  db: D1Database,
  clientId: string,
  isAuthenticated: boolean = false,
): Promise<RateLimitResult> {
  const tier: RateLimitTier = isAuthenticated ? 'authenticated' : 'default';
  const limit = DEFAULT_LIMITS[tier];
  const now = Date.now();

  const entry = await db
    .prepare('SELECT request_count, window_end FROM rate_limits WHERE client_id = ?')
    .bind(clientId)
    .first<{ request_count: number; window_end: number }>();

  if (!entry) {
    return {
      allowed: true,
      remaining: limit,
      resetAt: now + WINDOW_MS,
      limit,
    };
  }

  const isExpired = now > entry.window_end;
  const effectiveCount = isExpired ? 0 : entry.request_count;

  return {
    allowed: effectiveCount < limit,
    remaining: Math.max(0, limit - effectiveCount),
    resetAt: isExpired ? now + WINDOW_MS : entry.window_end,
    limit,
  };
}

/**
 * Reset rate limit for a specific client
 */
export async function resetRateLimit(db: D1Database, clientId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM rate_limits WHERE client_id = ?')
    .bind(clientId)
    .run();

  return (result.meta.changes ?? 0) > 0;
}

/**
 * Clean up expired rate limit entries
 * Should be called periodically to maintain table size
 */
export async function cleanupExpiredRateLimits(db: D1Database, batchSize = 100): Promise<number> {
  const now = Date.now();

  const result = await db
    .prepare('DELETE FROM rate_limits WHERE window_end < ? LIMIT ?')
    .bind(now, batchSize)
    .run();

  return result.meta.changes ?? 0;
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    'Retry-After': Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000)).toString(),
  };
}

/**
 * Create a client identifier from request context
 */
export function createClientId(
  apiKeyId: string | null,
  ip: string | null,
  userAgent?: string,
): string {
  if (apiKeyId) {
    return `key:${apiKeyId}`;
  }
  if (ip) {
    // Hash IP for privacy (simple hash for identification, not cryptographic)
    const hashInput = `${ip}:${userAgent || ''}`;
    return `ip:${simpleHash(hashInput)}`;
  }
  return `anon:${crypto.randomUUID()}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
