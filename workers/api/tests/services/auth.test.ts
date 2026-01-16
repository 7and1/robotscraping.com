import { describe, it, expect, vi, beforeEach } from 'vitest';
import { consumeApiKey, verifyApiKey, consumeApiKeyById } from '../../src/services/auth';

const incrementUsage = vi.fn();
const getRemainingForScope = vi.fn();

vi.mock('../../src/lib/crypto', () => ({
  sha256: async () => 'hash',
  generateRandomToken: () => 'token',
}));

vi.mock('../../src/services/quota', () => ({
  DAILY_LIMITS: { anonymous: 5, github: 50, pro: 1000 },
  resolveTier: (raw: string | null | undefined) => (raw === 'pro' ? 'pro' : 'github'),
  getDayKey: () => '2026-01-15',
  incrementUsage: (...args: unknown[]) => incrementUsage(...args),
  getRemainingForScope: (...args: unknown[]) => getRemainingForScope(...args),
}));

function createDbMock(record: any) {
  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn(() => ({
        first: vi.fn().mockResolvedValue(sql.includes('FROM api_keys') ? record : null),
        run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
      })),
    })),
  } as unknown as D1Database;
}

function createDbMockWithSql(sqlMap: Record<string, unknown>) {
  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn(() => ({
        first: vi.fn().mockResolvedValue(sqlMap[sql] ?? null),
        run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
      })),
    })),
  } as unknown as D1Database;
}

describe('consumeApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    incrementUsage.mockReset();
    getRemainingForScope.mockReset();
  });

  it('rejects missing API key', async () => {
    const mockDb = {} as unknown as D1Database;
    const result = await consumeApiKey(mockDb, null, Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('missing');
  });

  it('rejects invalid API key', async () => {
    const mockDb = createDbMock(null);
    const result = await consumeApiKey(mockDb, 'invalid-key', Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('invalid');
  });

  it('rejects inactive API key', async () => {
    const mockDb = createDbMock({ id: 'key-123', user_id: 'user-1', is_active: 0, tier: 'github' });
    const result = await consumeApiKey(mockDb, 'inactive-key', Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('inactive');
  });

  it('rejects when daily quota is exceeded', async () => {
    incrementUsage.mockResolvedValue({ allowed: false, remaining: 0, count: 50 });
    const mockDb = createDbMock({ id: 'key-123', user_id: 'user-1', is_active: 1, tier: 'github' });
    const result = await consumeApiKey(mockDb, 'valid-key', Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('insufficient_credits');
    expect(result.remainingCredits).toBe(0);
  });

  it('consumes a request and returns remaining quota', async () => {
    incrementUsage.mockResolvedValue({ allowed: true, remaining: 42, count: 8 });
    const mockDb = createDbMock({ id: 'key-123', user_id: 'user-1', is_active: 1, tier: 'github' });
    const result = await consumeApiKey(mockDb, 'valid-key', Date.now());
    expect(result.ok).toBe(true);
    expect(result.apiKeyId).toBe('key-123');
    expect(result.remainingCredits).toBe(42);
  });
});

describe('verifyApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRemainingForScope.mockReset();
  });

  it('rejects missing API key', async () => {
    const mockDb = {} as unknown as D1Database;
    const result = await verifyApiKey(mockDb, null);
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('missing');
  });

  it('rejects invalid API key', async () => {
    const mockDb = createDbMock(null);
    const result = await verifyApiKey(mockDb, 'invalid-key');
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('invalid');
  });

  it('rejects inactive API key', async () => {
    const mockDb = createDbMock({ id: 'key-123', user_id: 'user-1', is_active: 0, tier: 'github' });
    const result = await verifyApiKey(mockDb, 'inactive-key');
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('inactive');
  });

  it('returns remaining quota for valid API key', async () => {
    getRemainingForScope.mockResolvedValue(12);
    const mockDb = createDbMock({ id: 'key-123', user_id: 'user-1', is_active: 1, tier: 'github' });
    const result = await verifyApiKey(mockDb, 'valid-key');
    expect(result.ok).toBe(true);
    expect(result.apiKeyId).toBe('key-123');
    expect(result.remainingCredits).toBe(12);
  });
});

describe('consumeApiKeyById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    incrementUsage.mockReset();
  });

  it('rejects missing API key ID', async () => {
    const mockDb = {} as unknown as D1Database;
    const result = await consumeApiKeyById(mockDb, null, Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('invalid');
  });

  it('rejects invalid API key ID', async () => {
    const sql = 'SELECT id, user_id, is_active, tier FROM api_keys WHERE id = ?';
    const mockDb = createDbMockWithSql({ [sql]: null });
    const result = await consumeApiKeyById(mockDb, 'unknown', Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('invalid');
  });

  it('rejects inactive API key by ID', async () => {
    const sql = 'SELECT id, user_id, is_active, tier FROM api_keys WHERE id = ?';
    const mockDb = createDbMockWithSql({
      [sql]: { id: 'key-123', user_id: 'user-1', is_active: 0, tier: 'github' },
    });
    const result = await consumeApiKeyById(mockDb, 'key-123', Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('inactive');
  });

  it('rejects when quota exceeded by ID', async () => {
    incrementUsage.mockResolvedValue({ allowed: false, remaining: 0, count: 50 });
    const sql = 'SELECT id, user_id, is_active, tier FROM api_keys WHERE id = ?';
    const mockDb = createDbMockWithSql({
      [sql]: { id: 'key-123', user_id: 'user-1', is_active: 1, tier: 'github' },
    });
    const result = await consumeApiKeyById(mockDb, 'key-123', Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('insufficient_credits');
  });

  it('consumes by ID and returns remaining quota', async () => {
    incrementUsage.mockResolvedValue({ allowed: true, remaining: 7, count: 43 });
    const sql = 'SELECT id, user_id, is_active, tier FROM api_keys WHERE id = ?';
    const mockDb = createDbMockWithSql({
      [sql]: { id: 'key-123', user_id: 'user-1', is_active: 1, tier: 'github' },
    });
    const result = await consumeApiKeyById(mockDb, 'key-123', Date.now());
    expect(result.ok).toBe(true);
    expect(result.remainingCredits).toBe(7);
  });
});
