import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractWithLLM } from '../../src/services/extract';
import { safeJsonParse } from '../../src/lib/parse';

// Mock global fetch for Anthropic
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock openai module - needs to be hoisted
const mockCreate = vi.fn();
vi.mock('openai', () => ({
  default: class MockOpenAI {
    constructor() {
      // Mock constructor
    }
    get chat() {
      return {
        completions: {
          create: mockCreate,
        },
      };
    }
  },
}));

describe('extractWithLLM - OpenAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract data using OpenAI provider', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"data":{"title":"Product","price":99.99}}' } }],
      usage: { total_tokens: 150 },
    });

    const result = await extractWithLLM({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      content: '<html><title>Product</title><price>99.99</price></html>',
      fields: ['title', 'price'],
    });

    // The LLM returns { "data": { "title": ..., "price": ... } }
    // safeJsonParse returns the whole object, so result.data = { data: { title, price } }
    expect(result.data).toEqual({ data: { title: 'Product', price: 99.99 } });
    expect(result.usage).toBe(150);
  });

  it('should handle OpenAI errors gracefully', async () => {
    mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

    await expect(
      extractWithLLM({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        content: 'test content',
        fields: ['title'],
      }),
    ).rejects.toThrow('API rate limit exceeded');
  });

  it('should handle empty OpenAI response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
      usage: { total_tokens: 50 },
    });

    const result = await extractWithLLM({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      content: 'test content',
      fields: ['title'],
    });

    expect(result.data).toEqual({});
  });

  it('should handle response with markdown code blocks', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '```json\n{"data":{"field":"value"}}\n```' } }],
      usage: { total_tokens: 100 },
    });

    const result = await extractWithLLM({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      content: 'test',
      fields: ['field'],
    });

    expect(result.data).toEqual({ data: { field: 'value' } });
  });

  it('should handle response with extra text before/after JSON', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Here is the result: {"data":{"field":"value"}}. Hope that helps!',
          },
        },
      ],
      usage: { total_tokens: 100 },
    });

    const result = await extractWithLLM({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      content: 'test',
      fields: ['field'],
    });

    expect(result.data).toEqual({ data: { field: 'value' } });
  });

  it('should handle zero usage token response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"data":{}}' } }],
      usage: undefined,
    });

    const result = await extractWithLLM({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      content: 'test',
      fields: ['field'],
    });

    expect(result.usage).toBe(0);
  });

  it('should use custom baseUrl for OpenAI', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"data":{"field":"value"}}' } }],
      usage: { total_tokens: 100 },
    });

    await extractWithLLM({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      baseUrl: 'https://custom-proxy.com/v1',
      content: 'test',
      fields: ['field'],
    });

    // Verify the OpenAI client was called
    expect(mockCreate).toHaveBeenCalled();
  });
});

describe('extractWithLLM - Anthropic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract data using Anthropic provider', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: '{"data":{"title":"Product","description":"A great product"}}',
          },
        ],
        usage: { input_tokens: 80, output_tokens: 40 },
      }),
    } as Response);

    const result = await extractWithLLM({
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      apiKey: 'test-key',
      content: '<html><title>Product</title><p>A great product</p></html>',
      fields: ['title', 'description'],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-key',
          'anthropic-version': '2023-06-01',
        }),
      }),
    );
    // Note: result.data contains the full parsed JSON which has a "data" wrapper
    expect(result.data).toEqual({ data: { title: 'Product', description: 'A great product' } });
    expect(result.usage).toBe(120); // 80 + 40
  });

  it('should handle Anthropic API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    } as Response);

    await expect(
      extractWithLLM({
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        apiKey: 'invalid-key',
        content: 'test',
        fields: ['title'],
      }),
    ).rejects.toThrow('Anthropic error');
  });

  it('should handle malformed Anthropic response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'not valid json' }],
      }),
    } as Response);

    const result = await extractWithLLM({
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      apiKey: 'test-key',
      content: 'test',
      fields: ['title'],
    });

    expect(result.data).toEqual({});
  });

  it('should include custom instructions in prompt', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '{"data":{"extracted":true}}' }],
        usage: { input_tokens: 100, output_tokens: 20 },
      }),
    } as Response);

    await extractWithLLM({
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      apiKey: 'test-key',
      content: 'test content',
      fields: ['extracted'],
      instructions: 'Only extract if value is explicitly stated',
    });

    const callArgs = mockFetch.mock.calls[0];
    // fetch(url, init) - so callArgs[0] is url, callArgs[1] is init object
    const body = JSON.parse(callArgs![1]!.body as string);
    expect(body.system).toContain('Only extract if value is explicitly stated');
  });
});

describe('extractWithLLM - integration tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should build correct system prompt with fields', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"data":{}}' } }],
      usage: { total_tokens: 50 },
    });

    await extractWithLLM({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      content: 'content',
      fields: ['title', 'price'],
    });

    const createCall = mockCreate.mock.calls[0];
    const messages = createCall[0].messages;
    expect(messages[0].content).toContain('Target fields:');
  });

  it('should build correct system prompt with schema', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"data":{}}' } }],
      usage: { total_tokens: 50 },
    });

    const schema = { type: 'object', properties: { title: { type: 'string' } } };

    await extractWithLLM({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      content: 'content',
      schema,
    });

    const createCall = mockCreate.mock.calls[0];
    const messages = createCall[0].messages;
    expect(messages[0].content).toContain('JSON schema:');
  });

  it('should build correct system prompt with custom instructions', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"data":{}}' } }],
      usage: { total_tokens: 50 },
    });

    await extractWithLLM({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      content: 'content',
      fields: ['title'],
      instructions: 'Extract only the main title',
    });

    const createCall = mockCreate.mock.calls[0];
    const messages = createCall[0].messages;
    expect(messages[0].content).toContain('User instructions: Extract only the main title');
  });
});

describe('safeJsonParse', () => {
  it('should parse valid JSON', () => {
    expect(safeJsonParse('{"key":"value"}')).toEqual({ data: { key: 'value' } });
  });

  it('should handle empty string', () => {
    expect(safeJsonParse('')).toEqual({ data: {} });
  });

  it('should strip markdown code blocks', () => {
    expect(safeJsonParse('```json\n{"key":"value"}\n```')).toEqual({
      data: { key: 'value' },
    });
  });

  it('should extract JSON from text with extra content', () => {
    expect(safeJsonParse('Some text {"key":"value"} more text')).toEqual({
      data: { key: 'value' },
    });
  });

  it('should return empty object on parse error with no JSON', () => {
    const result = safeJsonParse('not json at all');
    expect(result.data).toEqual({});
    expect(result.error).toBeDefined();
  });

  it('should handle JSON with data property (returns nested data)', () => {
    // safeJsonParse returns the whole parsed object as data, not nested
    const result = safeJsonParse('{"data":{"title":"Product"}}');
    expect(result.data).toEqual({ data: { title: 'Product' } });
  });
});
