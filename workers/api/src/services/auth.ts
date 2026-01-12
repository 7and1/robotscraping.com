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
  const update = await db
    .prepare(
      'UPDATE api_keys SET remaining_credits = remaining_credits - 1, last_used_at = ? WHERE key_hash = ? AND is_active = 1 AND remaining_credits > 0',
    )
    .bind(now, keyHash)
    .run();

  if (update.meta.changes === 0) {
    const record = await db
      .prepare('SELECT id, remaining_credits, is_active FROM api_keys WHERE key_hash = ?')
      .bind(keyHash)
      .first();

    if (!record) {
      return { ok: false, errorCode: 'invalid' };
    }
    if (!record.is_active) {
      return { ok: false, errorCode: 'inactive' };
    }
    return {
      ok: false,
      errorCode: 'insufficient_credits',
      remainingCredits:
        typeof record.remaining_credits === 'number' ? record.remaining_credits : null,
    };
  }

  const updated = await db
    .prepare('SELECT id, remaining_credits FROM api_keys WHERE key_hash = ?')
    .bind(keyHash)
    .first();

  return {
    ok: true,
    apiKeyId: (updated?.id as string | undefined) ?? null,
    remainingCredits:
      typeof updated?.remaining_credits === 'number' ? (updated.remaining_credits as number) : null,
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
    .first();

  if (!record) {
    return { ok: false, errorCode: 'invalid' };
  }
  if (!record.is_active) {
    return { ok: false, errorCode: 'inactive' };
  }

  return {
    ok: true,
    apiKeyId: (record.id as string | undefined) ?? null,
    remainingCredits:
      typeof record.remaining_credits === 'number' ? (record.remaining_credits as number) : null,
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

  const update = await db
    .prepare(
      'UPDATE api_keys SET remaining_credits = remaining_credits - 1, last_used_at = ? WHERE id = ? AND is_active = 1 AND remaining_credits > 0',
    )
    .bind(now, apiKeyId)
    .run();

  if (update.meta.changes === 0) {
    const record = await db
      .prepare('SELECT id, remaining_credits, is_active FROM api_keys WHERE id = ?')
      .bind(apiKeyId)
      .first();

    if (!record) {
      return { ok: false, errorCode: 'invalid' };
    }
    if (!record.is_active) {
      return { ok: false, errorCode: 'inactive' };
    }
    return {
      ok: false,
      errorCode: 'insufficient_credits',
      remainingCredits:
        typeof record.remaining_credits === 'number' ? record.remaining_credits : null,
    };
  }

  const updated = await db
    .prepare('SELECT id, remaining_credits FROM api_keys WHERE id = ?')
    .bind(apiKeyId)
    .first();

  return {
    ok: true,
    apiKeyId: (updated?.id as string | undefined) ?? null,
    remainingCredits:
      typeof updated?.remaining_credits === 'number' ? (updated.remaining_credits as number) : null,
  };
}
