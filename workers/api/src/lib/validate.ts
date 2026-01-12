import type { ExtractRequest } from '../types';

const MAX_FIELDS = 50;
const MAX_INSTRUCTIONS = 2000;

export function parseExtractRequest(
  body: unknown,
): { ok: true; data: ExtractRequest } | { ok: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Body must be a JSON object.' };
  }

  const { url, fields, schema, instructions, format, options, async, webhook_url, webhook_secret } =
    body as ExtractRequest;
  if (!url || typeof url !== 'string') {
    return { ok: false, message: 'Missing or invalid url.' };
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, message: 'URL must use http or https.' };
    }
  } catch {
    return { ok: false, message: 'URL is not valid.' };
  }

  let normalizedFields: string[] | undefined = undefined;
  if (fields !== undefined) {
    if (!Array.isArray(fields)) {
      return { ok: false, message: 'fields must be an array of strings.' };
    }
    normalizedFields = fields
      .map((field) => (typeof field === 'string' ? field.trim() : ''))
      .filter(Boolean);
    if (normalizedFields.length === 0) {
      return { ok: false, message: 'fields must contain at least one entry.' };
    }
    if (normalizedFields.length > MAX_FIELDS) {
      return { ok: false, message: `fields cannot exceed ${MAX_FIELDS} entries.` };
    }
  }

  if (!schema && !normalizedFields) {
    return { ok: false, message: 'Provide fields or schema.' };
  }

  if (schema && typeof schema !== 'object') {
    return { ok: false, message: 'schema must be an object.' };
  }

  if (
    instructions &&
    (typeof instructions !== 'string' || instructions.length > MAX_INSTRUCTIONS)
  ) {
    return { ok: false, message: 'instructions must be a string (max 2000 chars).' };
  }

  if (async !== undefined && typeof async !== 'boolean') {
    return { ok: false, message: 'async must be a boolean.' };
  }

  if (webhook_url !== undefined) {
    if (typeof webhook_url !== 'string' || webhook_url.length < 8) {
      return { ok: false, message: 'webhook_url must be a valid URL string.' };
    }
    try {
      const hook = new URL(webhook_url);
      if (!['http:', 'https:'].includes(hook.protocol)) {
        return { ok: false, message: 'webhook_url must use http or https.' };
      }
    } catch {
      return { ok: false, message: 'webhook_url is not a valid URL.' };
    }
  }

  if (webhook_secret !== undefined && typeof webhook_secret !== 'string') {
    return { ok: false, message: 'webhook_secret must be a string.' };
  }

  if (format && format !== 'json') {
    return { ok: false, message: 'Only json format is supported.' };
  }

  if (options && typeof options !== 'object') {
    return { ok: false, message: 'options must be an object.' };
  }

  return {
    ok: true,
    data: {
      url,
      fields: normalizedFields,
      schema,
      instructions,
      async,
      webhook_url,
      webhook_secret,
      format: 'json',
      options,
    },
  };
}
