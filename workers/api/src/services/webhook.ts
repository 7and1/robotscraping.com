import { deriveWebhookSignature, generateRandomToken, timingSafeEqual } from '../lib/crypto';
import { validateTargetUrl } from '../lib/ssrf';

export interface WebhookPayload {
  jobId: string;
  status: string;
  resultUrl?: string | null;
  resultPath?: string | null;
  data?: Record<string, unknown> | null;
  error?: string | null;
  meta?: Record<string, unknown>;
}

export interface WebhookResult {
  success: boolean;
  attempts: number;
  error?: string;
}

export interface DeadLetterEntry {
  jobId: string;
  targetUrl: string;
  payload: WebhookPayload;
  lastError: string;
  attempts: number;
  failedAt: number;
}

const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff: 1s, 2s, 4s, 8s, 16s
const MAX_RETRIES = RETRY_DELAYS_MS.length;
const WEBHOOK_TIMEOUT_MS = 30000; // 30 second timeout for webhook delivery

/**
 * Verify incoming webhook signature from a client
 */
export async function verifyIncomingWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature || signature.length !== 64) {
    return false; // SHA-256 hex is always 64 chars
  }
  const expected = await deriveWebhookSignature(payload, secret);
  return timingSafeEqual(expected, signature);
}

/**
 * Validate webhook URL before sending
 */
function validateWebhookTarget(url: string): { valid: boolean; error?: string } {
  const ssrfCheck = validateTargetUrl(url);
  if (!ssrfCheck.valid) {
    return { valid: false, error: ssrfCheck.reason };
  }

  // Additional webhook-specific checks
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Webhooks must use HTTPS for security' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  return { valid: true };
}

export async function sendWebhook(
  targetUrl: string,
  payload: WebhookPayload,
  secret: string,
): Promise<void> {
  const urlValidation = validateWebhookTarget(targetUrl);
  if (!urlValidation.valid) {
    throw new Error(`Invalid webhook URL: ${urlValidation.error}`);
  }

  const body = JSON.stringify(payload);
  const signature = await deriveWebhookSignature(body, secret);

  // Add timeout and security headers
  await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-robot-signature-256': signature,
      'x-robot-event': `job.${payload.status}`,
      'x-robot-timestamp': Date.now().toString(),
    },
    body,
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  });
}

export async function sendWebhookWithRetry(
  targetUrl: string,
  payload: WebhookPayload,
  secret: string,
  db?: D1Database,
): Promise<WebhookResult> {
  const urlValidation = validateWebhookTarget(targetUrl);
  if (!urlValidation.valid) {
    return { success: false, attempts: 0, error: `Invalid webhook URL: ${urlValidation.error}` };
  }

  const body = JSON.stringify(payload);
  const signature = await deriveWebhookSignature(body, secret);
  let lastError: string | undefined;
  let totalAttempts = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    totalAttempts = attempt + 1;
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-robot-signature-256': signature,
          'x-robot-event': `job.${payload.status}`,
          'x-robot-timestamp': Date.now().toString(),
          ...(attempt > 0 ? { 'x-webhook-retry-attempt': attempt.toString() } : {}),
        },
        body,
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });

      // Consider 2xx (200-299) and 3xx (300-399) as success
      if (response.status >= 200 && response.status < 400) {
        return { success: true, attempts: totalAttempts };
      }

      // Client errors (4xx) should not be retried
      if (response.status >= 400 && response.status < 500) {
        lastError = `Client error: ${response.status} ${response.statusText}`;
        break;
      }

      // Server errors (5xx) - retry with backoff
      lastError = `Server error: ${response.status} ${response.statusText}`;

      // Don't sleep after the last attempt
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS_MS[attempt]!);
      }
    } catch (error) {
      lastError = (error as Error).message;

      // Network errors - retry with backoff
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS_MS[attempt]!);
      }
    }
  }

  // All retries exhausted - log to dead letter queue if D1 is available
  if (db) {
    await logDeadLetter(db, {
      jobId: payload.jobId,
      targetUrl,
      payload,
      lastError: lastError ?? 'Unknown error',
      attempts: totalAttempts,
      failedAt: Date.now(),
    }).catch((err) => {
      console.error('Failed to log webhook to dead letter queue:', err);
    });
  }

  return { success: false, attempts: totalAttempts, error: lastError };
}

async function logDeadLetter(db: D1Database, entry: DeadLetterEntry): Promise<void> {
  await db
    .prepare(
      `INSERT INTO webhook_dead_letters (job_id, target_url, payload_json, error, attempts, failed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      entry.jobId,
      entry.targetUrl,
      JSON.stringify(entry.payload),
      entry.lastError,
      entry.attempts,
      entry.failedAt,
    )
    .run();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
