import { sha256 } from '../lib/crypto';

export interface ApiKeyResult {
  ok: boolean;
  apiKeyId?: string | null;
  remainingCredits?: number | null;
  errorCode?: 'missing' | 'invalid' | 'inactive' | 'insufficient_credits';
}

export interface VerifyKeyResult {
  ok: boolean;
  apiKeyId?: string | null;
  remainingCredits?: number | null;
  errorCode?: 'missing' | 'invalid' | 'inactive';
}

export async function consumeApiKey(
  db: D1Database,
  apiKey: string | null,
  now: number,
): Promise<ApiKeyResult> {
  if (!apiKey) {
    return { ok: false, errorCode: 'missing' };
  }

  const keyHash = await sha256(apiKey);

  // Use RETURNING clause to get updated values in a single query
  const result = await db
    .prepare(
      `UPDATE api_keys
       SET remaining_credits = remaining_credits - 1, last_used_at = ?
       WHERE key_hash = ? AND is_active = 1 AND remaining_credits > 0
       RETURNING id, remaining_credits`,
    )
    .bind(now, keyHash)
    .first<{ id: string; remaining_credits: number }>();

  if (result) {
    return {
      ok: true,
      apiKeyId: result.id,
      remainingCredits: result.remaining_credits,
    };
  }

  // Key didn't match update conditions - check reason
  const record = await db
    .prepare('SELECT id, remaining_credits, is_active FROM api_keys WHERE key_hash = ?')
    .bind(keyHash)
    .first<{ id: string; remaining_credits: number; is_active: number }>();

  if (!record) {
    return { ok: false, errorCode: 'invalid' };
  }
  if (!record.is_active) {
    return { ok: false, errorCode: 'inactive' };
  }
  return {
    ok: false,
    errorCode: 'insufficient_credits',
    remainingCredits: record.remaining_credits,
  };
}

export async function verifyApiKey(
  db: D1Database,
  apiKey: string | null,
): Promise<VerifyKeyResult> {
  if (!apiKey) {
    return { ok: false, errorCode: 'missing' };
  }

  const keyHash = await sha256(apiKey);
  const record = await db
    .prepare('SELECT id, remaining_credits, is_active FROM api_keys WHERE key_hash = ?')
    .bind(keyHash)
    .first<{ id: string; remaining_credits: number; is_active: number }>();

  if (!record) {
    return { ok: false, errorCode: 'invalid' };
  }
  if (!record.is_active) {
    return { ok: false, errorCode: 'inactive' };
  }

  return {
    ok: true,
    apiKeyId: record.id,
    remainingCredits: record.remaining_credits,
  };
}

export async function consumeApiKeyById(
  db: D1Database,
  apiKeyId: string | null,
  now: number,
): Promise<ApiKeyResult> {
  if (!apiKeyId) {
    return { ok: false, errorCode: 'invalid' };
  }

  // Use RETURNING clause to get updated values in a single query
  const result = await db
    .prepare(
      `UPDATE api_keys
       SET remaining_credits = remaining_credits - 1, last_used_at = ?
       WHERE id = ? AND is_active = 1 AND remaining_credits > 0
       RETURNING id, remaining_credits`,
    )
    .bind(now, apiKeyId)
    .first<{ id: string; remaining_credits: number }>();

  if (result) {
    return {
      ok: true,
      apiKeyId: result.id,
      remainingCredits: result.remaining_credits,
    };
  }

  // Key didn't match update conditions - check reason
  const record = await db
    .prepare('SELECT id, remaining_credits, is_active FROM api_keys WHERE id = ?')
    .bind(apiKeyId)
    .first<{ id: string; remaining_credits: number; is_active: number }>();

  if (!record) {
    return { ok: false, errorCode: 'invalid' };
  }
  if (!record.is_active) {
    return { ok: false, errorCode: 'inactive' };
  }
  return {
    ok: false,
    errorCode: 'insufficient_credits',
    remainingCredits: record.remaining_credits,
  };
}
