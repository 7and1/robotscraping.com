import { describe, it, expect } from 'vitest';
import { handleRequest } from '../src/handler';
import type { Env } from '../src/types';

function createEnv(): Env {
  return {
    MYBROWSER: {},
    DB: {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ meta: { changes: 1 } }),
          first: async () => ({ count: 1 }),
        }),
      }),
    } as unknown as D1Database,
    BUCKET: {
      put: async () => undefined,
    } as unknown as R2Bucket,
    TASK_QUEUE: {
      send: async () => undefined,
    } as unknown as Queue,
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'gpt-4o-mini',
    AI_PROVIDER: 'openai',
    CORS_ORIGIN: '*',
    DEFAULT_SCREENSHOT: 'false',
    STORE_CONTENT: 'false',
    ALLOW_ANON: 'true',
    WEBHOOK_SECRET: 'test-secret',
  };
}

function createCtx() {
  return {
    waitUntil: (_promise: Promise<unknown>) => undefined,
  } as ExecutionContext;
}

describe('handleRequest', () => {
  it('returns extracted data on success', async () => {
    const env = createEnv();
    const req = new Request('https://api.test/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com',
        fields: ['title'],
      }),
    });

    const res = await handleRequest(req, env, createCtx(), {
      scrape: async () => ({
        content: 'Example title: RobotScraping',
        blocked: false,
      }),
      extract: async () => ({
        data: { title: 'RobotScraping' },
        usage: 10,
        raw: '{"title":"RobotScraping"}',
      }),
      uuid: () => '11111111-1111-4111-8111-111111111111',
      now: () => 1000,
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('RobotScraping');
    expect(json.meta.id).toBeDefined();
    expect(json.meta.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('queues async job requests', async () => {
    const env = createEnv();
    let sent = false;
    env.TASK_QUEUE = {
      send: async () => {
        sent = true;
      },
    } as unknown as Queue;

    const req = new Request('https://api.test/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com',
        fields: ['title'],
        async: true,
      }),
    });

    const res = await handleRequest(req, env, createCtx(), {
      uuid: () => '22222222-2222-4222-8222-222222222222',
      now: () => 1000,
    });

    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.job_id).toBeDefined();
    expect(json.job_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(sent).toBe(true);
  });

  it('returns blocked when target blocks', async () => {
    const env = createEnv();
    const req = new Request('https://api.test/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com',
        fields: ['title'],
      }),
    });

    const res = await handleRequest(req, env, createCtx(), {
      scrape: async () => ({
        content: 'Access denied',
        blocked: true,
      }),
      extract: async () => ({
        data: {},
        usage: 0,
        raw: '{}',
      }),
      uuid: () => '33333333-3333-4333-8333-333333333333',
      now: () => 1000,
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('blocked');
  });
});
