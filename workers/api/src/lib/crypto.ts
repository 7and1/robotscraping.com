export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a cryptographically random string for secrets/tokens
 * @param length - Length of the output string (default 32)
 * @returns Hex-encoded random string
 */
export function generateRandomToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Use for comparing HMAC signatures, API keys, etc.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i]! ^ bBytes[i]!;
  }
  return result === 0;
}

/**
 * Hash idempotency key using proper crypto (not simple hash)
 */
export async function hashIdempotencyKey(key: string, body: unknown): Promise<string> {
  const bodyStr = JSON.stringify(body);
  const combined = `${key}:${bodyStr}`;
  return await sha256(combined);
}

/**
 * Derive webhook signature from payload and secret
 */
export async function deriveWebhookSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify webhook signature with timing-safe comparison
 */
export async function verifyWebhookSignature(
  payload: string,
  secret: string,
  expectedSignature: string,
): Promise<boolean> {
  const computed = await deriveWebhookSignature(payload, secret);
  return timingSafeEqual(computed, expectedSignature);
}
