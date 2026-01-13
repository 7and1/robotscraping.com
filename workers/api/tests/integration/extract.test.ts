import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRequest } from '../../src/handler';
import type { Env, HandlerDeps } from '../../src/types';

// Mock the crypto module
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-request-id',
  subtle: {
    importKey: async () => ({}),
    sign: async () => new Uint8Array(32),
  },
});

// Mock the crypto sha256 function
vi.mock('../../src/lib/crypto', () => ({
  sha256: async (key: string) => {
    if (key === 'test-api-key') return 'test-key-hash';
    return 'unknown-hash';
  },
}));

// Mock dependencies
const mockScrape = vi.fn();
const mockExtract = vi.fn();
const mockNow = vi.fn(() => 1_700_000_000_000);
const mockUuid = vi.fn(() => 'test-request-id');

// Mock D1 database helpers
const mockDbPrepare = vi.fn();
const mockDbBind = vi.fn();
const mockDbRun = vi.fn();
const mockDbFirst = vi.fn();

mockDbBind.mockReturnValue({ run: mockDbRun, first: mockDbFirst });
mockDbPrepare.mockReturnValue({ bind: mockDbBind });

const mockDb = {
  prepare: mockDbPrepare,
} as unknown as D1Database;

describe('POST /extract integration', () => {
  let env: Env;
  let ctx: ExecutionContext;
  let deps: HandlerDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScrape.mockReset();
    mockExtract.mockReset();
    mockDbRun.mockReset();
    mockDbFirst.mockReset();
    mockDbBind.mockReset();
    mockDbPrepare.mockReset();

    env = {
      MYBROWSER: {},
      DB: mockDb,
      BUCKET: {} as R2Bucket,
      TASK_QUEUE: {} as Queue,
      OPENAI_API_KEY: 'test-openai-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      AI_PROVIDER: 'openai',
      OPENAI_MODEL: 'gpt-4',
      CORS_ORIGIN: '*',
      ALLOW_ANON: 'false',
      RATE_LIMIT_ENABLED: 'false',
      CACHE_ENABLED: 'false',
    } as Env;

    ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as unknown as ExecutionContext;

    deps = {
      scrape: mockScrape,
      extract: mockExtract,
      now: mockNow,
      uuid: mockUuid,
    };

    // Default mock implementations
    mockScrape.mockResolvedValue({
      content: '<html><title>Test Page</title><p>Content here</p></html>',
      title: 'Test Page',
      description: 'A test page',
      blocked: false,
    });

    mockExtract.mockResolvedValue({
      data: { title: 'Test Page', content: 'Content here' },
      usage: 100,
      raw: '{"data":{"title":"Test Page","content":"Content here"}}',
    });

    // Default DB mock for successful auth
    mockDbRun.mockResolvedValue({ meta: { changes: 1 } });
    mockDbFirst.mockResolvedValue({
      id: 'key-123',
      remaining_credits: 99,
      is_active: 1,
    });
  });

  it('should handle health check endpoint', async () => {
    const request = new Request('https://api.example.com/health', {
      method: 'GET',
    });

    const response = await handleRequest(request, env, ctx, deps);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.service).toBe('robot-scraping-core');
  });

  it('should handle OPTIONS preflight request', async () => {
    const request = new Request('https://api.example.com/extract', {
      method: 'OPTIONS',
      headers: {
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

    const response = await handleRequest(request, env, ctx, deps);

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('should return 404 for unknown routes', async () => {
    const request = new Request('https://api.example.com/unknown', {
      method: 'GET',
    });

    const response = await handleRequest(request, env, ctx, deps);

    expect(response.status).toBe(404);
  });
});
