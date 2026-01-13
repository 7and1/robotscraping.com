import { describe, it, expect } from 'vitest';
import { validateTargetUrl } from '../../src/lib/ssrf';

describe('validateTargetUrl', () => {
  it('should accept valid https URLs', () => {
    expect(validateTargetUrl('https://example.com')).toEqual({ valid: true });
  });

  it('should accept valid http URLs', () => {
    expect(validateTargetUrl('http://example.com')).toEqual({ valid: true });
  });

  it('should reject localhost', () => {
    const result = validateTargetUrl('http://localhost');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('localhost');
  });

  it('should reject 127.0.0.1', () => {
    const result = validateTargetUrl('http://127.0.0.1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('private');
  });

  it('should reject private IPs - 192.168 range', () => {
    const result = validateTargetUrl('http://192.168.1.1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('private');
  });

  it('should reject private IPs - 10.0.0.0 range', () => {
    const result = validateTargetUrl('http://10.0.0.1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('private');
  });

  it('should reject private IPs - 172.16-31 range', () => {
    const result = validateTargetUrl('http://172.16.0.1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('private');
  });

  it('should reject metadata service 169.254.169.254', () => {
    const result = validateTargetUrl('http://169.254.169.254');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('metadata');
  });

  it('should reject metadata service 169.254.16.0/20 range', () => {
    const result = validateTargetUrl('http://169.254.16.1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('private');
  });

  it('should reject invalid protocols - file://', () => {
    const result = validateTargetUrl('file:///etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Protocol');
  });

  it('should reject invalid protocols - ftp://', () => {
    const result = validateTargetUrl('ftp://example.com');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Protocol');
  });

  it('should reject invalid protocols - data://', () => {
    const result = validateTargetUrl('data:text/html,<script>alert(1)</script>');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Protocol');
  });

  it('should accept valid URLs with paths', () => {
    expect(validateTargetUrl('https://example.com/path/to/page')).toEqual({ valid: true });
  });

  it('should accept valid URLs with query params', () => {
    expect(validateTargetUrl('https://example.com?query=param')).toEqual({ valid: true });
  });

  it('should accept valid URLs with port', () => {
    expect(validateTargetUrl('https://example.com:8443')).toEqual({ valid: true });
  });

  it('should accept valid URLs with fragments', () => {
    expect(validateTargetUrl('https://example.com#section')).toEqual({ valid: true });
  });

  it('should reject malformed URLs', () => {
    const result = validateTargetUrl('not-a-url');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid URL');
  });

  it('should reject empty string', () => {
    const result = validateTargetUrl('');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid URL');
  });

  it('should accept IPv6 public addresses', () => {
    expect(validateTargetUrl('http://[2001:4860:4860::8888]')).toEqual({ valid: true });
  });

  // NOTE: IPv6 addresses with brackets are actually being blocked correctly
  // The code strips brackets and checks against patterns like /^::1$/, /^fe80:/i, etc.
  it('should reject IPv6 loopback ::1', () => {
    const result = validateTargetUrl('http://[::1]');
    // After stripping brackets, ::1 matches the /^::1$/ pattern
    expect(result.valid).toBe(false);
  });

  it('should reject IPv6 link-local fe80', () => {
    const result = validateTargetUrl('http://[fe80::1]');
    // After stripping brackets, fe80::1 matches /^fe80:/i pattern
    expect(result.valid).toBe(false);
  });

  it('should reject IPv6 unique local fc00', () => {
    const result = validateTargetUrl('http://[fc00::1]');
    // After stripping brackets, fc00::1 matches /^fc00:/i pattern
    expect(result.valid).toBe(false);
  });

  it('should reject IPv6 unique local fd00', () => {
    const result = validateTargetUrl('http://[fd00::1]');
    // After stripping brackets, fd00::1 matches /^fd/i pattern
    expect(result.valid).toBe(false);
  });

  it('should accept public IPv4 addresses', () => {
    expect(validateTargetUrl('http://8.8.8.8')).toEqual({ valid: true });
  });

  it('should accept international domain names', () => {
    expect(validateTargetUrl('https://example.jp')).toEqual({ valid: true });
  });

  it('should reject GCP metadata service hostname', () => {
    const result = validateTargetUrl('http://metadata.google.internal');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('metadata');
  });

  it('should reject 0.0.0.0', () => {
    const result = validateTargetUrl('http://0.0.0.0');
    expect(result.valid).toBe(false);
  });

  it('should reject localhost.localdomain', () => {
    const result = validateTargetUrl('http://localhost.localdomain');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('localhost');
  });
});
