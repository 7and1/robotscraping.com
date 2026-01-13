import { describe, it, expect, vi, beforeEach } from 'vitest';
import { consumeApiKey, verifyApiKey, consumeApiKeyById } from '../../src/services/auth';

describe('consumeApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject missing API key', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn(),
    } as unknown as D1Database;

    const result = await consumeApiKey(mockDb, null, Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('missing');
  });

  it('should reject invalid API key', async () => {
    const mockFirst = vi.fn().mockResolvedValue(null);
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await consumeApiKey(mockDb, 'invalid-key', Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('invalid');
  });

  it('should reject inactive API key', async () => {
    const mockFirst = vi
      .fn()
      .mockResolvedValueOnce(null) // UPDATE returns no changes
      .mockResolvedValueOnce({ id: 'key-123', remaining_credits: 100, is_active: 0 });
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await consumeApiKey(mockDb, 'inactive-key', Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('inactive');
  });

  it('should reject API key with insufficient credits', async () => {
    const mockFirst = vi
      .fn()
      .mockResolvedValueOnce(null) // UPDATE returns no changes
      .mockResolvedValueOnce({ id: 'key-123', remaining_credits: 0, is_active: 1 });
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await consumeApiKey(mockDb, 'no-credits-key', Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('insufficient_credits');
    expect(result.remainingCredits).toBe(0);
  });

  it('should successfully consume a credit', async () => {
    const mockFirst = vi.fn().mockResolvedValue({ id: 'key-123', remaining_credits: 99 });
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await consumeApiKey(mockDb, 'valid-key', Date.now());
    expect(result.ok).toBe(true);
    expect(result.apiKeyId).toBe('key-123');
    expect(result.remainingCredits).toBe(99);
  });
});

describe('verifyApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject missing API key', async () => {
    const mockDb = {} as unknown as D1Database;
    const result = await verifyApiKey(mockDb, null);
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('missing');
  });

  it('should reject invalid API key', async () => {
    const mockFirst = vi.fn().mockResolvedValue(null);
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await verifyApiKey(mockDb, 'invalid-key');
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('invalid');
  });

  it('should reject inactive API key', async () => {
    const mockFirst = vi
      .fn()
      .mockResolvedValue({ id: 'key-123', remaining_credits: 100, is_active: 0 });
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await verifyApiKey(mockDb, 'inactive-key');
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('inactive');
  });

  it('should verify valid active API key', async () => {
    const mockFirst = vi
      .fn()
      .mockResolvedValue({ id: 'key-123', remaining_credits: 50, is_active: 1 });
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await verifyApiKey(mockDb, 'valid-key');
    expect(result.ok).toBe(true);
    expect(result.apiKeyId).toBe('key-123');
    expect(result.remainingCredits).toBe(50);
  });

  it('should verify API key without consuming credits', async () => {
    const mockFirst = vi
      .fn()
      .mockResolvedValue({ id: 'key-123', remaining_credits: 10, is_active: 1 });
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const firstVerify = await verifyApiKey(mockDb, 'valid-key');
    expect(firstVerify.remainingCredits).toBe(10);

    const secondVerify = await verifyApiKey(mockDb, 'valid-key');
    expect(secondVerify.remainingCredits).toBe(10);
  });
});

describe('consumeApiKeyById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject missing API key ID', async () => {
    const mockDb = {} as unknown as D1Database;
    const result = await consumeApiKeyById(mockDb, null, Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('invalid');
  });

  it('should reject invalid API key ID', async () => {
    const mockFirst = vi
      .fn()
      .mockResolvedValueOnce(null) // UPDATE returns no changes
      .mockResolvedValueOnce(null); // SELECT also returns null
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await consumeApiKeyById(mockDb, 'nonexistent-id', Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('invalid');
  });

  it('should reject inactive API key by ID', async () => {
    const mockFirst = vi
      .fn()
      .mockResolvedValueOnce(null) // UPDATE returns no changes
      .mockResolvedValueOnce({ id: 'key-123', remaining_credits: 100, is_active: 0 });
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await consumeApiKeyById(mockDb, 'key-123', Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('inactive');
  });

  it('should successfully consume credit by ID', async () => {
    const mockFirst = vi.fn().mockResolvedValue({ id: 'key-123', remaining_credits: 24 });
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await consumeApiKeyById(mockDb, 'key-123', Date.now());
    expect(result.ok).toBe(true);
    expect(result.remainingCredits).toBe(24);
  });

  it('should handle insufficient credits by ID', async () => {
    const mockFirst = vi
      .fn()
      .mockResolvedValueOnce(null) // UPDATE returns no changes
      .mockResolvedValueOnce({ id: 'key-123', remaining_credits: 0, is_active: 1 });
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await consumeApiKeyById(mockDb, 'key-123', Date.now());
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('insufficient_credits');
    expect(result.remainingCredits).toBe(0);
  });
});
