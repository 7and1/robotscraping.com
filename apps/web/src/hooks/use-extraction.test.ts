import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExtraction } from './use-extraction';

// Mock fetch
global.fetch = vi.fn();

describe('useExtraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useExtraction());

    expect(result.current.url).toBe('https://example.com/product/123');
    expect(result.current.fields).toBe(
      JSON.stringify(['product_name', 'price', 'rating', 'description'], null, 2),
    );
    expect(result.current.schema).toBe('');
    expect(result.current.instructions).toBe('');
    expect(result.current.apiKey).toBe('');
    expect(result.current.webhookUrl).toBe('');
    expect(result.current.asyncMode).toBe(false);
    expect(result.current.screenshot).toBe(false);
    expect(result.current.storeContent).toBe(true);
    expect(result.current.waitUntil).toBe('domcontentloaded');
    expect(result.current.timeoutMs).toBe(15000);
    expect(result.current.result).toBe('');
    expect(result.current.meta).toBeNull();
    expect(result.current.error).toBe('');
    expect(result.current.loading).toBe(false);
  });

  it('should update url', () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setUrl('https://example.com/test');
    });

    expect(result.current.url).toBe('https://example.com/test');
  });

  it('should update fields', () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setFields('["title", "description"]');
    });

    expect(result.current.fields).toBe('["title", "description"]');
  });

  it('should update schema', () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setSchema('{"type": "object"}');
    });

    expect(result.current.schema).toBe('{"type": "object"}');
  });

  it('should update instructions', () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setInstructions('Extract all product data');
    });

    expect(result.current.instructions).toBe('Extract all product data');
  });

  it('should update apiKey', () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setApiKey('sk-test-key');
    });

    expect(result.current.apiKey).toBe('sk-test-key');
  });

  it('should update webhookUrl', () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setWebhookUrl('https://webhook.example.com/hook');
    });

    expect(result.current.webhookUrl).toBe('https://webhook.example.com/hook');
  });

  it('should update asyncMode', () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setAsyncMode(true);
    });

    expect(result.current.asyncMode).toBe(true);
  });

  it('should update screenshot', () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setScreenshot(true);
    });

    expect(result.current.screenshot).toBe(true);
  });

  it('should update storeContent', () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setStoreContent(false);
    });

    expect(result.current.storeContent).toBe(false);
  });

  it('should update waitUntil', () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setWaitUntil('networkidle0');
    });

    expect(result.current.waitUntil).toBe('networkidle0');
  });

  it('should update timeoutMs', () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setTimeoutMs(30000);
    });

    expect(result.current.timeoutMs).toBe(30000);
  });

  it('should handle successful extraction', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        'x-request-id': 'req-123',
        'x-cache-hit': 'false',
      }),
      json: async () => ({
        success: true,
        data: { title: 'Product', price: 99.99 },
        meta: { id: 'job-456', latencyMs: 1500, tokens: 200 },
      }),
    } as Response);

    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.handleScrape();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.result).toBeTruthy();
    expect(result.current.meta).toEqual({
      id: 'job-456',
      latency: 1500,
      tokens: 200,
      requestId: 'req-123',
      cacheHit: false,
    });
  });

  it('should handle API error', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      headers: new Headers(),
      json: async () => ({
        success: false,
        error: { code: 'invalid_api_key', message: 'Invalid API key' },
      }),
    } as Response);

    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.handleScrape();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Invalid API key');
  });

  it('should handle network error', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.handleScrape();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Network error. Please try again.');
  });

  it('should validate fields JSON format', async () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setFields('not valid json');
    });

    await act(async () => {
      await result.current.handleScrape();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Fields must be a valid JSON array.');
  });

  it('should validate schema JSON format', async () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setFields('[]');
      result.current.setSchema('not valid json');
    });

    await act(async () => {
      await result.current.handleScrape();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Schema must be a valid JSON object.');
  });

  it('should require fields or schema', async () => {
    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setFields('[]');
    });

    await act(async () => {
      await result.current.handleScrape();
    });

    // Empty array after trimming results in no fields or schema
    // This triggers the API validation error which gets shown
    expect(result.current.error).toBeTruthy();
  });

  it('should handle successful async extraction', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        'x-request-id': 'req-async',
      }),
      json: async () => ({
        success: true,
        job_id: 'job-async-123',
        status: 'processing',
      }),
    } as Response);

    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setAsyncMode(true);
    });

    await act(async () => {
      await result.current.handleScrape();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.meta).toEqual({
      id: 'job-async-123',
      status: 'processing',
      requestId: 'req-async',
      cacheHit: false,
    });
  });

  it('should send API key header when provided', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      json: async () => ({ success: true, data: {}, meta: {} }),
    } as Response);

    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setApiKey('sk-test-key');
    });

    await act(async () => {
      await result.current.handleScrape();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'sk-test-key',
        }),
      }),
    );
  });

  it('should include webhook_url in request when set', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      json: async () => ({ success: true, data: {}, meta: {} }),
    } as Response);

    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setWebhookUrl('https://webhook.example.com/hook');
    });

    await act(async () => {
      await result.current.handleScrape();
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs![1]!.body as string);
    expect(body.webhook_url).toBe('https://webhook.example.com/hook');
  });

  it('should include options in request when non-default', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      json: async () => ({ success: true, data: {}, meta: {} }),
    } as Response);

    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setScreenshot(true);
      result.current.setWaitUntil('networkidle0');
      result.current.setTimeoutMs(30000);
    });

    await act(async () => {
      await result.current.handleScrape();
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs![1]!.body as string);
    expect(body.options).toEqual({
      screenshot: true,
      waitUntil: 'networkidle0',
      timeoutMs: 30000,
    });
  });

  it('should include storeContent false in options', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      json: async () => ({ success: true, data: {}, meta: {} }),
    } as Response);

    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setStoreContent(false);
    });

    await act(async () => {
      await result.current.handleScrape();
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs![1]!.body as string);
    expect(body.options).toEqual({
      storeContent: false,
    });
  });

  it('should include instructions in request when set', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      json: async () => ({ success: true, data: {}, meta: {} }),
    } as Response);

    const { result } = renderHook(() => useExtraction());

    act(() => {
      result.current.setInstructions('Extract product details');
    });

    await act(async () => {
      await result.current.handleScrape();
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs![1]!.body as string);
    expect(body.instructions).toBe('Extract product details');
  });
});
