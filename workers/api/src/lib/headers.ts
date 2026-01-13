/**
 * Header validation and sanitization for outbound requests
 * Prevents header injection and ensures only safe headers are forwarded
 */

// Headers that should never be allowed from user input
const FORBIDDEN_HEADERS = new Set([
  // Authorization headers
  'authorization',
  'proxy-authorization',
  // Authentication headers
  'www-authenticate',
  'proxy-authenticate',
  // Cookie management
  'cookie',
  'set-cookie',
  'cookie2',
  // Security headers
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-expose-headers',
  'access-control-max-age',
  'access-control-request-method',
  'access-control-request-headers',
  // Host override (security risk)
  'host',
  // Connection controls
  'connection',
  'keep-alive',
  'proxy-connection',
  'upgrade',
  // Transfer encoding (can be used for request smuggling)
  'transfer-encoding',
  'content-length',
  'te',
  // Forwarding headers
  'forwarded',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  // Cloudflare-specific
  'cf-connecting-ip',
  'cf-ray',
  'cf-visitor',
  'cf-ipcountry',
]);

// Headers that require special validation (allowed formats only)
const RESTRICTED_HEADERS = new Map([
  [
    'user-agent',
    {
      maxLength: 500,
      pattern: /^[\x20-\x7E]+$/,
      description: 'User-Agent',
    },
  ],
  [
    'referer',
    {
      mustBeUrl: true,
      maxLength: 2000,
      description: 'Referer',
    },
  ],
  [
    'accept',
    {
      maxLength: 500,
      pattern: /^[\x20-\x7E;,\/=()*\[\].\-+]+$/,
      description: 'Accept',
    },
  ],
  [
    'accept-language',
    {
      maxLength: 200,
      pattern: /^[a-zA-Z0-9,\-\s;=*]+$/,
      description: 'Accept-Language',
    },
  ],
  [
    'accept-encoding',
    {
      maxLength: 100,
      pattern: /^[a-zA-Z0-9,\s;]+$/,
      description: 'Accept-Encoding',
    },
  ],
]);

// Headers that are always safe to forward
const ALLOWED_HEADERS = new Set([
  'user-agent',
  'accept',
  'accept-language',
  'accept-encoding',
  'referer',
  'origin',
  'dnt',
  'from',
  'if-modified-since',
  'if-none-match',
  'if-range',
]);

export interface HeaderValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: Record<string, string>;
}

/**
 * Validates and sanitizes custom headers for outbound requests
 */
export function validateCustomHeaders(headers: Record<string, string>): HeaderValidationResult {
  const sanitized: Record<string, string> = {};
  const errors: string[] = [];

  const headerEntries = Object.entries(headers);
  if (headerEntries.length > 50) {
    return {
      valid: false,
      error: 'Maximum 50 custom headers allowed',
    };
  }

  for (const [key, value] of headerEntries) {
    const normalizedKey = key.toLowerCase().trim();

    // Check for forbidden headers
    if (FORBIDDEN_HEADERS.has(normalizedKey)) {
      errors.push(`Header '${key}' is not allowed`);
      continue;
    }

    // Validate header name format
    if (!/^[a-zA-Z0-9\-_]+$/.test(key)) {
      errors.push(`Invalid header name '${key}'`);
      continue;
    }

    // Check length limits
    if (key.length > 100 || value.length > 8192) {
      errors.push(`Header '${key}' exceeds size limits`);
      continue;
    }

    // Check restricted headers
    const restriction = RESTRICTED_HEADERS.get(normalizedKey);
    if (restriction) {
      const validation = validateRestrictedHeader(normalizedKey, value, restriction);
      if (!validation.valid) {
        errors.push(validation.error || `Invalid value for '${key}'`);
        continue;
      }
    } else if (!ALLOWED_HEADERS.has(normalizedKey)) {
      // Unknown headers are allowed but logged at debug level
      // This allows for custom headers that sites might require
    }

    // Header is valid, add to sanitized output
    sanitized[key] = value.trim();
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('; '),
    };
  }

  return { valid: true, sanitized };
}

function validateRestrictedHeader(
  name: string,
  value: string,
  restriction: {
    maxLength?: number;
    mustBeUrl?: boolean;
    pattern?: RegExp;
  },
): { valid: boolean; error?: string } {
  // Check max length
  if (restriction.maxLength && value.length > restriction.maxLength) {
    return {
      valid: false,
      error: `${restriction.description} exceeds maximum length of ${restriction.maxLength}`,
    };
  }

  // Check pattern
  if (restriction.pattern && !restriction.pattern.test(value)) {
    return {
      valid: false,
      error: `Invalid ${restriction.description} format`,
    };
  }

  // Check URL format
  if (restriction.mustBeUrl) {
    try {
      new URL(value);
    } catch {
      return {
        valid: false,
        error: `${restriction.description} must be a valid URL`,
      };
    }
  }

  return { valid: true };
}

/**
 * Builds the final headers object by merging defaults with sanitized custom headers
 */
export function buildRequestHeaders(
  customHeaders?: Record<string, string>,
): Record<string, string> {
  const defaults: Record<string, string> = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    DNT: '1',
  };

  if (!customHeaders) {
    return defaults;
  }

  const validation = validateCustomHeaders(customHeaders);
  if (!validation.valid) {
    return defaults;
  }

  // Merge defaults with custom headers (custom headers take precedence)
  return { ...defaults, ...validation.sanitized };
}
