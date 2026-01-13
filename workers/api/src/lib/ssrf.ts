/**
 * SSRF (Server-Side Request Forgery) Protection
 * Validates that target URLs do not point to internal/private resources
 */

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// Private IP ranges that should be blocked
const PRIVATE_IP_PATTERNS = [
  // IPv4 loopback
  /^127\./,
  /^0\.0\.0\.0$/,

  // IPv4 private ranges
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16

  // Link-local
  /^169\.254\./, // 169.254.0.0/16 (includes metadata service)
];

// IPv6 private patterns (checked on normalized hostname without brackets)
const IPV6_PRIVATE_PATTERNS = [
  /^::1$/, // loopback
  /^::$/, // unspecified
  /^fe80:/i, // fe80::/10 (link-local)
  /^fc00:/i, // fc00::/7 (unique local)
  /^fd/i, // fd00::/8
  /^2001:db8:/i, // documentation prefix
];

// Metadata service endpoints that should never be reachable
const METADATA_ENDPOINTS = [
  '169.254.169.254', // AWS/GCP/Azure metadata
  'metadata.google.internal', // GCP
  '169.254.169.254.latest.meta-data', // AWS
];

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Validates a target URL to prevent SSRF attacks
 * @param url - The URL to validate
 * @returns ValidationResult indicating if the URL is safe
 */
export function validateTargetUrl(url: string): ValidationResult {
  try {
    const parsed = new URL(url);

    // Validate protocol
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return {
        valid: false,
        reason: `Protocol '${parsed.protocol}' is not allowed. Only http and https are permitted.`,
      };
    }

    // Check for metadata service endpoints
    if (METADATA_ENDPOINTS.some((endpoint) => parsed.hostname === endpoint)) {
      return {
        valid: false,
        reason: 'Access to cloud metadata services is not allowed.',
      };
    }

    // Check for private IP patterns in hostname
    if (isPrivateIp(parsed.hostname)) {
      return {
        valid: false,
        reason: 'Access to private IP addresses is not allowed.',
      };
    }

    // Check for localhost variations
    if (isLocalhost(parsed.hostname)) {
      return {
        valid: false,
        reason: 'Access to localhost is not allowed.',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: `Invalid URL format: ${(error as Error).message}`,
    };
  }
}

/**
 * Checks if a hostname matches a private IP address
 */
function isPrivateIp(hostname: string): boolean {
  let host = hostname;

  // Remove IPv6 brackets if present (e.g., [::1] -> ::1)
  // But only if the entire hostname is wrapped in brackets
  if (host.startsWith('[') && host.includes(']')) {
    const closingBracket = host.indexOf(']');
    const portSep = host.indexOf(':', closingBracket);
    // Extract just the IPv6 address within brackets
    host = host.slice(1, closingBracket);
  } else if (host.includes(':')) {
    // Remove port portion for IPv4:host
    const lastColon = host.lastIndexOf(':');
    const potentialPort = host.slice(lastColon + 1);
    // If it looks like a port number, remove it
    if (/^\d+$/.test(potentialPort)) {
      host = host.slice(0, lastColon);
    }
  }

  // Check IPv4 patterns
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(host)) {
      return true;
    }
  }

  // Check IPv6 private patterns
  for (const pattern of IPV6_PRIVATE_PATTERNS) {
    if (pattern.test(host)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a hostname is a localhost variation
 */
function isLocalhost(hostname: string): boolean {
  const variations = [
    'localhost',
    'localhost.localdomain',
    'ip6-localhost',
    'ip6-loopback',
    'localhost6',
    'localhost6.localdomain6',
  ];

  let normalized = hostname.toLowerCase();

  // Remove port if present (but be careful with IPv6)
  if (!normalized.startsWith('[')) {
    // For non-IPv6, simple split works
    normalized = normalized.split(':')[0];
  } else {
    // For IPv6 in brackets, extract the address
    const closingBracket = normalized.indexOf(']');
    normalized = normalized.slice(1, closingBracket);
  }

  return variations.includes(normalized);
}

/**
 * Extracts hostname from a URL safely
 * Returns null if the URL is invalid
 */
export function safeGetHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Validates an IPv4 address string format
 */
export function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
  });
}

/**
 * Checks if an IP address is in a CIDR range
 * Supports IPv4 only for common private ranges
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
  const [network, prefixLength] = cidr.split('/');
  const prefix = parseInt(prefixLength || '32', 10);

  const ipNum = ipToNumber(ip);
  const networkNum = ipToNumber(network);
  if (ipNum === null || networkNum === null) return false;

  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (networkNum & mask);
}

function ipToNumber(ip: string): number | null {
  if (!isValidIPv4(ip)) return null;

  const parts = ip.split('.').map((p) => parseInt(p, 10));
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}
