interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  default: { requests: 60, windowMs: 60000 },
  authenticated: { requests: 1000, windowMs: 60000 },
};

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private limits: Record<string, RateLimitConfig>;

  constructor(limits?: Partial<typeof DEFAULT_LIMITS>) {
    this.limits = {
      default: DEFAULT_LIMITS.default,
      authenticated: DEFAULT_LIMITS.authenticated,
      ...limits,
    } as Record<string, RateLimitConfig>;
  }

  check(
    identifier: string,
    tier: 'default' | 'authenticated' = 'default',
  ): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const config = this.limits[tier];
    const entry = this.store.get(identifier);

    if (!entry || now >= entry.resetAt) {
      const resetAt = now + config.windowMs;
      this.store.set(identifier, { count: 1, resetAt });
      return { allowed: true, remaining: config.requests - 1, resetAt };
    }

    if (entry.count >= config.requests) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, remaining: config.requests - entry.count, resetAt: entry.resetAt };
  }

  cleanup(now: number = Date.now()): void {
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  getRateLimitHeaders(
    identifier: string,
    tier: 'default' | 'authenticated' = 'default',
  ): {
    'X-RateLimit-Limit': string;
    'X-RateLimit-Remaining': string;
    'X-RateLimit-Reset': string;
  } {
    const config = this.limits[tier];
    const entry = this.store.get(identifier);
    const now = Date.now();

    if (!entry || now >= entry.resetAt) {
      return {
        'X-RateLimit-Limit': config.requests.toString(),
        'X-RateLimit-Remaining': config.requests.toString(),
        'X-RateLimit-Reset': (now + config.windowMs).toString(),
      };
    }

    return {
      'X-RateLimit-Limit': config.requests.toString(),
      'X-RateLimit-Remaining': Math.max(0, config.requests - entry.count).toString(),
      'X-RateLimit-Reset': entry.resetAt.toString(),
    };
  }
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('cf-connecting-ip');
  if (forwarded) return `ip:${forwarded}`;

  const apiKey = request.headers.get('x-api-key');
  if (apiKey) return `key:${apiKey.slice(0, 8)}`;

  return `anon:${crypto.randomUUID()}`;
}

// Re-export D1 rate limiting functions for convenience
export {
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  cleanupExpiredRateLimits,
  getRateLimitHeaders as getD1RateLimitHeaders,
  createClientId,
  type RateLimitResult,
  CREATE_RATE_LIMITS_TABLE,
} from './rate-limit-d1';
