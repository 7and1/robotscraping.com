import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendWebhook, sendWebhookWithRetry, type WebhookPayload } from '../../src/services/webhook';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

afterEach(() => {
  mockFetch.mockReset();
});

describe('sendWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send webhook with signature', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const payload: WebhookPayload = {
      jobId: 'job-123',
      status: 'completed',
      data: { title: 'Product', price: 99.99 },
    };

    await sendWebhook('https://webhook.example.com/hook', payload, 'secret-key');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0]!;
    expect(callArgs[0]).toBe('https://webhook.example.com/hook');
    expect(callArgs[1]).toMatchObject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-robot-event': 'job.completed',
      },
    });
    expect(callArgs[1]!.headers['x-robot-signature-256']).toBeDefined();
    expect(typeof callArgs[1]!.headers['x-robot-signature-256']).toBe('string');
    expect(callArgs[1]!.headers['x-robot-signature-256'].length).toBeGreaterThan(0);
  });

  it('should include all payload data in body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const payload: WebhookPayload = {
      jobId: 'job-456',
      status: 'failed',
      error: 'Timeout waiting for selector',
      meta: { retryCount: 3, attempt: 1 },
    };

    await sendWebhook('https://webhook.example.com/hook', payload, 'secret');

    const callArgs = mockFetch.mock.calls[0]!;
    // Body is in the init object as RequestInit.body
    const body = JSON.parse(callArgs[1]!.body as string);
    expect(body).toEqual(payload);
  });

  it('should generate consistent signature for same payload', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);

    const payload: WebhookPayload = { jobId: 'job-789', status: 'completed' };

    await sendWebhook('https://example.com/hook', payload, 'my-secret');
    const firstSignature = mockFetch.mock.calls[0]![1]!.headers['x-robot-signature-256'];

    await sendWebhook('https://example.com/hook', payload, 'my-secret');
    const secondSignature = mockFetch.mock.calls[1]![1]!.headers['x-robot-signature-256'];

    expect(firstSignature).toBe(secondSignature);
  });

  it('should generate different signatures for different secrets', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);

    const payload: WebhookPayload = { jobId: 'job-abc', status: 'completed' };

    await sendWebhook('https://example.com/hook', payload, 'secret-one');
    const firstSignature = mockFetch.mock.calls[0]![1]!.headers['x-robot-signature-256'];

    await sendWebhook('https://example.com/hook', payload, 'secret-two');
    const secondSignature = mockFetch.mock.calls[1]![1]!.headers['x-robot-signature-256'];

    expect(firstSignature).not.toBe(secondSignature);
  });

  it('should set correct event header for success status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const payload: WebhookPayload = { jobId: 'job-123', status: 'completed' };

    await sendWebhook('https://example.com/hook', payload, 'secret');

    expect(mockFetch.mock.calls[0]![1]!.headers['x-robot-event']).toBe('job.completed');
  });

  it('should set correct event header for failed status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const payload: WebhookPayload = { jobId: 'job-123', status: 'failed', error: 'Error' };

    await sendWebhook('https://example.com/hook', payload, 'secret');

    expect(mockFetch.mock.calls[0]![1]!.headers['x-robot-event']).toBe('job.failed');
  });

  it('should set correct event header for processing status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const payload: WebhookPayload = { jobId: 'job-123', status: 'processing' };

    await sendWebhook('https://example.com/hook', payload, 'secret');

    expect(mockFetch.mock.calls[0]![1]!.headers['x-robot-event']).toBe('job.processing');
  });

  it('should send webhook with resultUrl', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const payload: WebhookPayload = {
      jobId: 'job-123',
      status: 'completed',
      resultUrl: 'https://storage.example.com/results/job-123.json',
    };

    await sendWebhook('https://example.com/hook', payload, 'secret');

    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
    expect(body.resultUrl).toBe('https://storage.example.com/results/job-123.json');
  });

  it('should send webhook with resultPath', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const payload: WebhookPayload = {
      jobId: 'job-123',
      status: 'completed',
      resultPath: 'results/job-123.json',
    };

    await sendWebhook('https://example.com/hook', payload, 'secret');

    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
    expect(body.resultPath).toBe('results/job-123.json');
  });

  it('should handle special characters in payload', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const payload: WebhookPayload = {
      jobId: 'job-123',
      status: 'completed',
      data: {
        description: 'Product with "quotes" and \'apostrophes\'',
        emoji: '',
        unicode: 'Unicode: ',
      },
    };

    await sendWebhook('https://example.com/hook', payload, 'secret');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
    expect(body.data.description).toContain('quotes');
  });

  it('should send minimal payload for failed job', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const payload: WebhookPayload = {
      jobId: 'job-xyz',
      status: 'failed',
      error: 'Target blocked by robots.txt',
    };

    await sendWebhook('https://example.com/hook', payload, 'secret');

    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
    expect(body).toEqual(payload);
  });
});

describe('sendWebhookWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should succeed on first attempt', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    const payload: WebhookPayload = { jobId: 'job-123', status: 'completed' };

    const result = await sendWebhookWithRetry('https://example.com/hook', payload, 'secret');

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should not retry on 4xx errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    const payload: WebhookPayload = { jobId: 'job-123', status: 'completed' };

    const result = await sendWebhookWithRetry('https://example.com/hook', payload, 'secret');

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.error).toContain('Client error');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
