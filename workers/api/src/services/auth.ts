import { generateRandomToken, sha256 } from '../lib/crypto';
import {
  DAILY_LIMITS,
  type QuotaTier,
  getDayKey,
  getRemainingForScope,
  incrementUsage,
  resolveTier,
} from './quota';

export interface ApiKeyResult {
  ok: boolean;
  apiKeyId?: string | null;
  userId?: string | null;
  tier?: QuotaTier;
  remainingCredits?: number | null;
  errorCode?: 'missing' | 'invalid' | 'inactive' | 'insufficient_credits';
}

export interface VerifyKeyResult {
  ok: boolean;
  apiKeyId?: string | null;
  userId?: string | null;
  tier?: QuotaTier;
  remainingCredits?: number | null;
  errorCode?: 'missing' | 'invalid' | 'inactive';
}

export interface UserRecord {
  id: string;
  github_id: string;
  github_login: string;
  github_name?: string | null;
  github_email?: string | null;
  github_avatar_url?: string | null;
  tier: string;
  created_at: number;
  last_login_at?: number | null;
}

export interface ApiKeyRecord {
  id: string;
  user_id: string | null;
  key_prefix: string | null;
  name: string | null;
  tier: string | null;
  is_active: number;
  last_used_at?: number | null;
  created_at: number;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: number;
  expires_at: number;
  initial_key?: string | null;
  initial_key_expires_at?: number | null;
  initial_key_consumed?: number | null;
}

const INITIAL_KEY_TTL_MS = 5 * 60 * 1000;

function normalizeTier(raw?: string | null): QuotaTier {
  return resolveTier(raw ?? undefined);
}

export function getDailyLimitForTier(tier: QuotaTier): number | null {
  return DAILY_LIMITS[tier] ?? null;
}

export async function upsertUser(
  db: D1Database,
  params: {
    githubId: string;
    githubLogin: string;
    githubName?: string | null;
    githubEmail?: string | null;
    githubAvatarUrl?: string | null;
  },
): Promise<UserRecord> {
  const now = Date.now();
  const id = crypto.randomUUID();
  const result = await db
    .prepare(
      `INSERT INTO users (
        id,
        github_id,
        github_login,
        github_name,
        github_email,
        github_avatar_url,
        tier,
        created_at,
        last_login_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (github_id) DO UPDATE SET
        github_login = excluded.github_login,
        github_name = excluded.github_name,
        github_email = excluded.github_email,
        github_avatar_url = excluded.github_avatar_url,
        last_login_at = excluded.last_login_at
      RETURNING id, github_id, github_login, github_name, github_email, github_avatar_url, tier, created_at, last_login_at`,
    )
    .bind(
      id,
      params.githubId,
      params.githubLogin,
      params.githubName ?? null,
      params.githubEmail ?? null,
      params.githubAvatarUrl ?? null,
      'github',
      now,
      now,
    )
    .first<UserRecord>();

  if (!result) {
    throw new Error('Failed to upsert user');
  }

  return result;
}

export async function createOAuthState(db: D1Database, ttlMs: number): Promise<string> {
  const state = generateRandomToken(16);
  const stateHash = await sha256(state);
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO oauth_states (id, state_hash, created_at, expires_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), stateHash, now, now + ttlMs)
    .run();
  return state;
}

export async function consumeOAuthState(db: D1Database, state: string): Promise<boolean> {
  const stateHash = await sha256(state);
  const entry = await db
    .prepare('SELECT id, expires_at FROM oauth_states WHERE state_hash = ?')
    .bind(stateHash)
    .first<{ id: string; expires_at: number }>();

  if (!entry) return false;
  if (Date.now() > entry.expires_at) {
    await db.prepare('DELETE FROM oauth_states WHERE id = ?').bind(entry.id).run();
    return false;
  }

  await db.prepare('DELETE FROM oauth_states WHERE id = ?').bind(entry.id).run();
  return true;
}

export async function createSession(
  db: D1Database,
  userId: string,
  options: { ttlMs: number; initialKey?: string | null } = { ttlMs: 7 * 24 * 60 * 60 * 1000 },
): Promise<{ token: string; expiresAt: number }> {
  const token = generateRandomToken(32);
  const tokenHash = await sha256(token);
  const now = Date.now();
  const expiresAt = now + options.ttlMs;
  const initialKey = options.initialKey ?? null;
  const initialKeyExpiresAt = initialKey ? now + INITIAL_KEY_TTL_MS : null;

  await db
    .prepare(
      `INSERT INTO auth_sessions (
        id,
        user_id,
        token_hash,
        created_at,
        expires_at,
        initial_key,
        initial_key_expires_at,
        initial_key_consumed
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    )
    .bind(crypto.randomUUID(), userId, tokenHash, now, expiresAt, initialKey, initialKeyExpiresAt)
    .run();

  return { token, expiresAt };
}

export async function clearSession(db: D1Database, token: string | null): Promise<void> {
  if (!token) return;
  const tokenHash = await sha256(token);
  await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).run();
}

export async function getUserBySession(
  db: D1Database,
  token: string | null,
): Promise<UserRecord | null> {
  if (!token) return null;
  const tokenHash = await sha256(token);
  const session = await db
    .prepare('SELECT user_id, expires_at FROM auth_sessions WHERE token_hash = ?')
    .bind(tokenHash)
    .first<{ user_id: string; expires_at: number }>();

  if (!session) return null;
  if (Date.now() > session.expires_at) {
    await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).run();
    return null;
  }

  const user = await db
    .prepare(
      `SELECT id, github_id, github_login, github_name, github_email, github_avatar_url, tier, created_at, last_login_at
       FROM users WHERE id = ?`,
    )
    .bind(session.user_id)
    .first<UserRecord>();

  return user ?? null;
}

export async function popInitialKey(db: D1Database, token: string | null): Promise<string | null> {
  if (!token) return null;
  const tokenHash = await sha256(token);
  const session = await db
    .prepare(
      `SELECT id, initial_key, initial_key_expires_at, initial_key_consumed
       FROM auth_sessions WHERE token_hash = ?`,
    )
    .bind(tokenHash)
    .first<{
      id: string;
      initial_key: string | null;
      initial_key_expires_at: number | null;
      initial_key_consumed: number | null;
    }>();

  if (!session?.initial_key) return null;
  if (session.initial_key_consumed) return null;
  if (session.initial_key_expires_at && Date.now() > session.initial_key_expires_at) {
    await db
      .prepare('UPDATE auth_sessions SET initial_key = NULL WHERE id = ?')
      .bind(session.id)
      .run();
    return null;
  }

  await db
    .prepare('UPDATE auth_sessions SET initial_key_consumed = 1 WHERE id = ?')
    .bind(session.id)
    .run();

  return session.initial_key;
}

export async function listKeys(db: D1Database, userId: string): Promise<ApiKeyRecord[]> {
  const result = await db
    .prepare(
      `SELECT id, user_id, key_prefix, name, tier, is_active, last_used_at, created_at
       FROM api_keys
       WHERE user_id = ?
       ORDER BY created_at DESC`,
    )
    .bind(userId)
    .all<ApiKeyRecord>();

  return result?.results ?? [];
}

export async function createApiKey(
  db: D1Database,
  userId: string,
  name: string | null,
  tier: QuotaTier,
): Promise<{ key: ApiKeyRecord; plaintext: string }> {
  const plaintext = `rs_${generateRandomToken(24)}`;
  const keyHash = await sha256(plaintext);
  const keyPrefix = plaintext.slice(0, 10);
  const now = Date.now();
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO api_keys (
        id,
        user_id,
        key_hash,
        key_prefix,
        name,
        tier,
        remaining_credits,
        is_active,
        created_at,
        last_used_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NULL)`,
    )
    .bind(id, userId, keyHash, keyPrefix, name, tier, 0, now)
    .run();

  return {
    key: {
      id,
      user_id: userId,
      key_prefix: keyPrefix,
      name,
      tier,
      is_active: 1,
      created_at: now,
      last_used_at: null,
    },
    plaintext,
  };
}

export async function hasActiveKey(db: D1Database, userId: string): Promise<boolean> {
  const record = await db
    .prepare('SELECT id FROM api_keys WHERE user_id = ? AND is_active = 1 LIMIT 1')
    .bind(userId)
    .first<{ id: string }>();

  return Boolean(record?.id);
}

async function getKeyByHash(
  db: D1Database,
  apiKey: string,
): Promise<{
  id: string;
  user_id: string | null;
  is_active: number;
  tier: string | null;
} | null> {
  const keyHash = await sha256(apiKey);
  const record = await db
    .prepare('SELECT id, user_id, is_active, tier FROM api_keys WHERE key_hash = ?')
    .bind(keyHash)
    .first<{ id: string; user_id: string | null; is_active: number; tier: string | null }>();

  return record ?? null;
}

async function getKeyById(
  db: D1Database,
  apiKeyId: string,
): Promise<{
  id: string;
  user_id: string | null;
  is_active: number;
  tier: string | null;
} | null> {
  const record = await db
    .prepare('SELECT id, user_id, is_active, tier FROM api_keys WHERE id = ?')
    .bind(apiKeyId)
    .first<{ id: string; user_id: string | null; is_active: number; tier: string | null }>();

  return record ?? null;
}

async function updateLastUsed(db: D1Database, apiKeyId: string, now: number): Promise<void> {
  await db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').bind(now, apiKeyId).run();
}

export async function verifyApiKey(
  db: D1Database,
  apiKey: string | null,
): Promise<VerifyKeyResult> {
  if (!apiKey) {
    return { ok: false, errorCode: 'missing' };
  }

  const record = await getKeyByHash(db, apiKey);
  if (!record) {
    return { ok: false, errorCode: 'invalid' };
  }
  if (!record.is_active) {
    return { ok: false, errorCode: 'inactive' };
  }

  const tier = normalizeTier(record.tier);
  const limit = getDailyLimitForTier(tier);
  const day = getDayKey();
  const remainingCredits = await getRemainingForScope(db, `key:${record.id}`, limit, day);

  return {
    ok: true,
    apiKeyId: record.id,
    userId: record.user_id ?? null,
    tier,
    remainingCredits,
  };
}

export async function consumeApiKey(
  db: D1Database,
  apiKey: string | null,
  now: number,
  amount: number = 1,
): Promise<ApiKeyResult> {
  if (!apiKey) {
    return { ok: false, errorCode: 'missing' };
  }

  const record = await getKeyByHash(db, apiKey);
  if (!record) {
    return { ok: false, errorCode: 'invalid' };
  }
  if (!record.is_active) {
    return { ok: false, errorCode: 'inactive' };
  }

  const tier = normalizeTier(record.tier);
  const limit = getDailyLimitForTier(tier);
  const day = getDayKey(now);
  const usage = await incrementUsage(db, `key:${record.id}`, amount, limit, day, now);
  if (!usage.allowed) {
    return { ok: false, errorCode: 'insufficient_credits', remainingCredits: usage.remaining };
  }

  await updateLastUsed(db, record.id, now);

  return {
    ok: true,
    apiKeyId: record.id,
    userId: record.user_id ?? null,
    tier,
    remainingCredits: usage.remaining,
  };
}

export async function consumeApiKeyById(
  db: D1Database,
  apiKeyId: string | null,
  now: number,
  amount: number = 1,
): Promise<ApiKeyResult> {
  if (!apiKeyId) {
    return { ok: false, errorCode: 'invalid' };
  }

  const record = await getKeyById(db, apiKeyId);
  if (!record) {
    return { ok: false, errorCode: 'invalid' };
  }
  if (!record.is_active) {
    return { ok: false, errorCode: 'inactive' };
  }

  const tier = normalizeTier(record.tier);
  const limit = getDailyLimitForTier(tier);
  const day = getDayKey(now);
  const usage = await incrementUsage(db, `key:${record.id}`, amount, limit, day, now);
  if (!usage.allowed) {
    return { ok: false, errorCode: 'insufficient_credits', remainingCredits: usage.remaining };
  }

  await updateLastUsed(db, record.id, now);

  return {
    ok: true,
    apiKeyId: record.id,
    userId: record.user_id ?? null,
    tier,
    remainingCredits: usage.remaining,
  };
}
