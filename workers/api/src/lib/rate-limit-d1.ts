/**
 * D1-backed persistent rate limiting
 * Provides rate limiting that persists across worker instances
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

export interface RateLimitEntry {
  client_id: string;
  request_count: number;
  window_start: number;
  window_end: number;
  created_at: number;
  updated_at: number;
}

// Table initialization SQL
export const CREATE_RATE_LIMITS_TABLE = `
  CREATE TABLE IF NOT EXISTS rate_limits (
    client_id TEXT PRIMARY KEY,
    request_count INTEGER NOT NULL DEFAULT 0,
    window_start INTEGER NOT NULL,
    window_end INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON rate_limits(window_end);
`;

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  default: { requests: 60, windowMs: 60000 }, // 60 requests per minute
  authenticated: { requests: 1000, windowMs: 60000 }, // 1000 requests per minute
  premium: { requests: 5000, windowMs: 60000 }, // 5000 requests per minute
};

/**
 * Check rate limit from D1 database
 * @param db - D1 database instance
 * @param clientId - Unique client identifier (e.g., API key hash or IP)
 * @param tier - Rate limit tier
 * @returns RateLimitResult with allowance status and metadata
 */
export async function checkRateLimit(
  db: D1Database,
  clientId: string,
  tier: keyof typeof DEFAULT_LIMITS = 'default',
): Promise<RateLimitResult> {
  const config = DEFAULT_LIMITS[tier];
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const windowEnd = now + config.windowMs;

  // Get or create rate limit entry
  const existing = await db
    .prepare('SELECT * FROM rate_limits WHERE client_id = ?')
    .bind(clientId)
    .first<RateLimitEntry>();

  if (!existing) {
    // First request - create entry
    await db
      .prepare(
        `INSERT INTO rate_limits (client_id, request_count, window_start, window_end, created_at, updated_at)
         VALUES (?, 1, ?, ?, ?, ?)`,
      )
      .bind(clientId, now, windowEnd, now, now)
      .run();

    return {
      allowed: true,
      remaining: config.requests - 1,
      resetAt: windowEnd,
      limit: config.requests,
    };
  }

  // Check if window has expired
  if (now > existing.window_end) {
    // Reset window
    await db
      .prepare(
        `UPDATE rate_limits
         SET request_count = 1, window_start = ?, window_end = ?, updated_at = ?
         WHERE client_id = ?`,
      )
      .bind(now, windowEnd, now, clientId)
      .run();

    return {
      allowed: true,
      remaining: config.requests - 1,
      resetAt: windowEnd,
      limit: config.requests,
    };
  }

  // Check if limit exceeded
  if (existing.request_count >= config.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.window_end,
      limit: config.requests,
    };
  }

  // Increment counter
  const newCount = existing.request_count + 1;
  await db
    .prepare(
      `UPDATE rate_limits
       SET request_count = ?, updated_at = ?
       WHERE client_id = ?`,
    )
    .bind(newCount, now, clientId)
    .run();

  return {
    allowed: true,
    remaining: config.requests - newCount,
    resetAt: existing.window_end,
    limit: config.requests,
  };
}

/**
 * Reset rate limit for a client (admin function)
 * @param db - D1 database instance
 * @param clientId - Client identifier to reset
 */
export async function resetRateLimit(db: D1Database, clientId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM rate_limits WHERE client_id = ?')
    .bind(clientId)
    .run();

  return (result.meta.changes ?? 0) > 0;
}

/**
 * Get current rate limit status without incrementing
 * @param db - D1 database instance
 * @param clientId - Client identifier
 * @param tier - Rate limit tier
 */
export async function getRateLimitStatus(
  db: D1Database,
  clientId: string,
  tier: keyof typeof DEFAULT_LIMITS = 'default',
): Promise<RateLimitResult | null> {
  const config = DEFAULT_LIMITS[tier];
  const entry = await db
    .prepare('SELECT * FROM rate_limits WHERE client_id = ?')
    .bind(clientId)
    .first<RateLimitEntry>();

  if (!entry) {
    return {
      allowed: true,
      remaining: config.requests,
      resetAt: Date.now() + config.windowMs,
      limit: config.requests,
    };
  }

  return {
    allowed: entry.request_count < config.requests,
    remaining: Math.max(0, config.requests - entry.request_count),
    resetAt: entry.window_end,
    limit: config.requests,
  };
}

/**
 * Clean up expired rate limit entries
 * @param db - D1 database instance
 * @param batchSize - Number of entries to delete per batch
 */
export async function cleanupExpiredRateLimits(db: D1Database, batchSize = 100): Promise<number> {
  const now = Date.now();

  const result = await db
    .prepare(`DELETE FROM rate_limits WHERE window_end < ? LIMIT ?`)
    .bind(now, batchSize)
    .run();

  return result.meta.changes ?? 0;
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  };
}

/**
 * Determine client tier from API key
 */
export function getClientTier(apiKeyId: string | null): keyof typeof DEFAULT_LIMITS {
  // In a real implementation, you would check the API key's tier from the database
  // For now, return 'authenticated' if an API key is present
  return apiKeyId ? 'authenticated' : 'default';
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
    // Hash IP for privacy
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
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}
