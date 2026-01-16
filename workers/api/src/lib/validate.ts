import { z } from 'zod';
import { ExtractRequestSchema } from '../schemas/extract.schema';
import type { ExtractRequest } from '../types';
import { validateCustomHeaders } from './headers';
import { validateTargetUrl } from './ssrf';

// SSRF protection patterns for webhook URLs
const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
];

const LOCALHOST_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'localhost6',
  'localhost6.localdomain6',
];

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().split(':')[0];

  if (LOCALHOST_HOSTNAMES.includes(normalized)) {
    return true;
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}

function validateWebhookUrl(url: string): { ok: true } | { ok: false; message: string } {
  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, message: 'webhook_url must use http or https.' };
    }

    if (isPrivateHostname(parsed.hostname)) {
      return {
        ok: false,
        message: 'webhook_url cannot point to private IP addresses or localhost.',
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: 'webhook_url is not a valid URL.' };
  }
}

function validateCookies(
  cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>,
): { ok: true } | { ok: false; message: string } {
  if (!cookies) return { ok: true };

  if (cookies.length > 50) {
    return { ok: false, message: 'Maximum 50 cookies allowed.' };
  }

  for (const cookie of cookies) {
    // Validate cookie name
    if (!cookie.name || cookie.name.length > 200) {
      return { ok: false, message: 'Cookie name must be 1-200 characters.' };
    }

    // Validate cookie value
    if (cookie.value.length > 4096) {
      return { ok: false, message: 'Cookie value cannot exceed 4096 characters.' };
    }

    // Validate domain if provided
    if (cookie.domain) {
      try {
        // Domain validation (can be a partial domain like .example.com)
        const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
        if (!/^[a-zA-Z0-9][a-zA-Z0-9\-_.]*[a-zA-Z0-9]$/.test(domain)) {
          return { ok: false, message: 'Invalid cookie domain format.' };
        }
      } catch {
        return { ok: false, message: 'Invalid cookie domain.' };
      }
    }

    // Validate path if provided
    if (cookie.path && !cookie.path.startsWith('/')) {
      return { ok: false, message: 'Cookie path must start with /.' };
    }
  }

  return { ok: true };
}

export function parseExtractRequest(
  body: unknown,
): { ok: true; data: ExtractRequest } | { ok: false; message: string } {
  const result = ExtractRequestSchema.safeParse(body);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'field';
      return `${path}: ${issue.message}`;
    });
    return { ok: false, message: errors.join(', ') };
  }

  // Validate target URL for SSRF protection
  const targetUrlValidation = validateTargetUrl(result.data.url);
  if (!targetUrlValidation.valid) {
    return { ok: false, message: `url: ${targetUrlValidation.reason}` };
  }

  // Additional webhook SSRF protection
  if (result.data.webhook_url) {
    const webhookValidation = validateWebhookUrl(result.data.webhook_url);
    if (!webhookValidation.ok) {
      return webhookValidation;
    }
  }

  // Validate custom headers if provided
  if (result.data.options?.headers) {
    const headerValidation = validateCustomHeaders(result.data.options.headers);
    if (!headerValidation.valid) {
      return { ok: false, message: headerValidation.error || 'Invalid headers.' };
    }
  }

  // Validate cookies if provided
  if (result.data.options?.cookies) {
    const cookieValidation = validateCookies(result.data.options.cookies);
    if (!cookieValidation.ok) {
      return cookieValidation;
    }
  }

  // Normalize fields (trim and filter empty)
  const data = { ...result.data };
  if (data.fields) {
    data.fields = data.fields.map((field) => field.trim()).filter(Boolean);
  }

  return { ok: true, data };
}

export function parseWebhookTest(
  body: unknown,
): { ok: true; data: { url: string; secret?: string } } | { ok: false; message: string } {
  const schema = z.object({
    url: z.string().url('Invalid webhook URL'),
    secret: z.string().min(16).max(256).optional(),
  });

  const result = schema.safeParse(body);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => issue.message);
    return { ok: false, message: errors.join(', ') };
  }

  // Additional webhook SSRF protection
  const webhookValidation = validateWebhookUrl(result.data.url);
  if (!webhookValidation.ok) {
    return webhookValidation;
  }

  return { ok: true, data: result.data };
}

export function parseScheduleCreate(
  body: unknown,
):
  | { ok: true; data: z.infer<typeof import('../schemas/schedule.schema').ScheduleCreateSchema> }
  | { ok: false; message: string } {
  const { ScheduleCreateSchema } = require('../schemas/schedule.schema');
  const result = ScheduleCreateSchema.safeParse(body);

  if (!result.success) {
    const errors = result.error.issues.map((issue: z.ZodIssue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'field';
      return `${path}: ${issue.message}`;
    });
    return { ok: false, message: errors.join(', ') };
  }

  // Additional webhook SSRF protection
  const webhookValidation = validateWebhookUrl(result.data.webhook_url);
  if (!webhookValidation.ok) {
    return webhookValidation as { ok: false; message: string };
  }

  return { ok: true, data: result.data };
}

export function parseScheduleUpdate(
  body: unknown,
):
  | { ok: true; data: z.infer<typeof import('../schemas/schedule.schema').ScheduleUpdateSchema> }
  | { ok: false; message: string } {
  const { ScheduleUpdateSchema } = require('../schemas/schedule.schema');
  const result = ScheduleUpdateSchema.safeParse(body);

  if (!result.success) {
    const errors = result.error.issues.map((issue: z.ZodIssue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'field';
      return `${path}: ${issue.message}`;
    });
    return { ok: false, message: errors.join(', ') };
  }

  // Additional webhook SSRF protection if webhook_url is being updated
  if (result.data.webhook_url) {
    const webhookValidation = validateWebhookUrl(result.data.webhook_url);
    if (!webhookValidation.ok) {
      return webhookValidation as { ok: false; message: string };
    }
  }

  return { ok: true, data: result.data };
}
