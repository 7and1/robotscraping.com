export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  strictTransportSecurity?: boolean;
  noSniff?: boolean;
  xssProtection?: boolean;
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';
}

const DEFAULT_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';";

export function getSecurityHeaders(config?: SecurityHeadersConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  if (config?.contentSecurityPolicy !== false) {
    headers['Content-Security-Policy'] = config?.contentSecurityPolicy || DEFAULT_CSP;
  }

  if (config?.frameOptions !== false) {
    headers['X-Frame-Options'] = config?.frameOptions || 'SAMEORIGIN';
  }

  if (config?.strictTransportSecurity !== false) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  if (config?.noSniff !== false) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  if (config?.xssProtection !== false) {
    headers['X-XSS-Protection'] = '1; mode=block';
  }

  headers['Referrer-Policy'] = config?.referrerPolicy || 'strict-origin-when-cross-origin';
  headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()';
  headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
  headers['Cross-Origin-Opener-Policy'] = 'same-origin';
  headers['Cross-Origin-Resource-Policy'] = 'same-site';

  return headers;
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeErrorMessage(error: string): string {
  return error
    .replace(/\/[a-zA-Z0-9_/-]+/g, '[REDACTED_PATH]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]')
    .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]');
}

export function isValidUrl(url: string, allowedProtocols: string[] = ['http:', 'https:']): boolean {
  try {
    const parsed = new URL(url);
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}
