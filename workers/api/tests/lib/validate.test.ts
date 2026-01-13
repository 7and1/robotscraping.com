import { describe, it, expect } from 'vitest';
import { parseExtractRequest } from '../../src/lib/validate';
import { isValidUrl, validateWebhookUrl } from '../../src/lib/security';

describe('parseExtractRequest', () => {
  it('should accept valid request with fields', () => {
    const body = {
      url: 'https://example.com',
      fields: ['title', 'price'],
    };
    const result = parseExtractRequest(body);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toBe('https://example.com');
      expect(result.data.fields).toEqual(['title', 'price']);
    }
  });

  it('should accept valid request with schema', () => {
    const body = {
      url: 'https://example.com',
      schema: { type: 'object', properties: { title: { type: 'string' } } },
    };
    const result = parseExtractRequest(body);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toBe('https://example.com');
      expect(result.data.schema).toEqual({
        type: 'object',
        properties: { title: { type: 'string' } },
      });
    }
  });

  it('should reject missing body', () => {
    const result = parseExtractRequest(null);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('field');
  });

  it('should reject non-object body', () => {
    const result = parseExtractRequest('invalid');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('field');
  });

  it('should reject missing url', () => {
    const result = parseExtractRequest({});
    expect(result.ok).toBe(false);
    expect(result.message).toContain('url');
  });

  it('should reject invalid url', () => {
    const result = parseExtractRequest({ url: 'not-a-url' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('url');
  });

  it('should reject non-http protocols', () => {
    const result = parseExtractRequest({ url: 'ftp://example.com', fields: ['title'] });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('http or https');
  });

  it('should reject non-array fields', () => {
    const result = parseExtractRequest({ url: 'https://example.com', fields: 'not-an-array' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('fields');
  });

  it('should reject request without fields or schema', () => {
    const result = parseExtractRequest({ url: 'https://example.com' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Either fields or schema');
  });

  it('should trim and filter whitespace fields', () => {
    const body = {
      url: 'https://example.com',
      fields: [' title ', '  price  ', '', '   '],
    };
    const result = parseExtractRequest(body);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.fields).toEqual(['title', 'price']);
    }
  });

  it('should reject fields exceeding max count', () => {
    const fields = Array.from({ length: 51 }, (_, i) => `field${i}`);
    const result = parseExtractRequest({ url: 'https://example.com', fields });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Too big');
  });

  it('should reject invalid webhook_url', () => {
    const result = parseExtractRequest({
      url: 'https://example.com',
      fields: ['title'],
      webhook_url: 'not-a-url',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('webhook_url');
  });

  it('should reject webhook_url with invalid protocol', () => {
    const result = parseExtractRequest({
      url: 'https://example.com',
      fields: ['title'],
      webhook_url: 'ftp://webhook.example.com',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('webhook_url');
  });

  it('should accept valid webhook_url', () => {
    const result = parseExtractRequest({
      url: 'https://example.com',
      fields: ['title'],
      webhook_url: 'https://webhook.example.com/hook',
    });
    expect(result.ok).toBe(true);
  });

  it('should reject webhook_url pointing to localhost', () => {
    const result = parseExtractRequest({
      url: 'https://example.com',
      fields: ['title'],
      webhook_url: 'http://localhost:3000/hook',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('private');
  });

  it('should reject webhook_url pointing to private IP', () => {
    const result = parseExtractRequest({
      url: 'https://example.com',
      fields: ['title'],
      webhook_url: 'http://192.168.1.1/hook',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('private');
  });

  it('should reject webhook_secret below min length', () => {
    const result = parseExtractRequest({
      url: 'https://example.com',
      fields: ['title'],
      webhook_secret: 'short',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('webhook_secret');
  });

  it('should accept valid webhook_secret', () => {
    const result = parseExtractRequest({
      url: 'https://example.com',
      fields: ['title'],
      webhook_secret: 'a'.repeat(16),
    });
    expect(result.ok).toBe(true);
  });

  it('should accept instructions within limit', () => {
    const instructions = 'x'.repeat(5000);
    const result = parseExtractRequest({
      url: 'https://example.com',
      fields: ['title'],
      instructions,
    });
    expect(result.ok).toBe(true);
  });

  it('should reject instructions exceeding max length', () => {
    const instructions = 'x'.repeat(5001);
    const result = parseExtractRequest({
      url: 'https://example.com',
      fields: ['title'],
      instructions,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('instructions');
  });

  it('should accept valid async flag', () => {
    const result = parseExtractRequest({
      url: 'https://example.com',
      fields: ['title'],
      async: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.async).toBe(true);
    }
  });

  it('should accept valid options', () => {
    const result = parseExtractRequest({
      url: 'https://example.com',
      fields: ['title'],
      options: { screenshot: true, timeoutMs: 30000 },
    });
    expect(result.ok).toBe(true);
  });

  it('should reject options with invalid timeoutMs', () => {
    const result = parseExtractRequest({
      url: 'https://example.com',
      fields: ['title'],
      options: { timeoutMs: 100 }, // Below min of 1000
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('timeoutMs');
  });

  it('should reject invalid waitUntil value', () => {
    const result = parseExtractRequest({
      url: 'https://example.com',
      fields: ['title'],
      options: { waitUntil: 'invalid' as any },
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('waitUntil');
  });
});

describe('isValidUrl', () => {
  it('should accept valid HTTP URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('should accept valid HTTPS URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('should reject invalid protocol', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });

  it('should reject invalid URL', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
  });

  it('should accept custom allowed protocols', () => {
    expect(isValidUrl('ftp://example.com', ['ftp:', 'http:'])).toBe(true);
  });

  it('should reject empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });
});

describe('validateWebhookUrl (from security.ts)', () => {
  it('should accept valid HTTPS URLs', () => {
    expect(validateWebhookUrl('https://webhook.example.com/hook')).toBe(true);
  });

  it('should reject HTTP URLs', () => {
    expect(validateWebhookUrl('http://webhook.example.com/hook')).toBe(false);
  });

  it('should reject invalid URLs', () => {
    expect(validateWebhookUrl('not-a-url')).toBe(false);
  });

  it('should reject URLs without hostname', () => {
    expect(validateWebhookUrl('https://')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(validateWebhookUrl('')).toBe(false);
  });
});
