import { jsonResponse, textResponse } from '../lib/http';
import {
  createApiKey,
  createOAuthState,
  createSession,
  getDailyLimitForTier,
  getUserBySession,
  hasActiveKey,
  listKeys,
  popInitialKey,
  clearSession,
  upsertUser,
  consumeOAuthState,
} from '../services/auth';
import { resolveTier } from '../services/quota';
import type { Env } from '../types';

const DEFAULT_SCOPES = ['read:user', 'user:email'];

interface GitHubUser {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] || '') : null;
}

function getSessionCookieName(env: Env): string {
  return env.SESSION_COOKIE_NAME?.trim() || 'rs_session';
}

function getSessionTtlMs(env: Env): number {
  const hours = Number(env.SESSION_TTL_HOURS || '168');
  if (!Number.isFinite(hours) || hours <= 0) return 7 * 24 * 60 * 60 * 1000;
  return hours * 60 * 60 * 1000;
}

function buildSessionCookie(env: Env, token: string, maxAgeSeconds: number): string {
  const name = getSessionCookieName(env);
  const domain = env.SESSION_COOKIE_DOMAIN?.trim();
  const secure = env.SESSION_COOKIE_SECURE !== 'false';
  const parts = [`${name}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly'];

  if (domain) parts.push(`Domain=${domain}`);
  if (secure) parts.push('Secure');
  parts.push('SameSite=Lax');
  parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);

  return parts.join('; ');
}

function getAuthRedirect(env: Env): string {
  return env.AUTH_SUCCESS_REDIRECT?.trim() || 'https://robotscraping.com/login';
}

function getGitHubConfig(
  env: Env,
  origin: string,
): {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  scopes: string[];
  oauthUrl: string;
  apiUrl: string;
} {
  const clientId = env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth is not configured');
  }
  const redirectUrl = env.GITHUB_REDIRECT_URL?.trim() || `${origin}/auth/github/callback`;
  const scopes = env.GITHUB_SCOPES?.trim()
    ? env.GITHUB_SCOPES.split(',')
        .map((scope) => scope.trim())
        .filter(Boolean)
    : DEFAULT_SCOPES;
  return {
    clientId,
    clientSecret,
    redirectUrl,
    scopes,
    oauthUrl: 'https://github.com',
    apiUrl: 'https://api.github.com',
  };
}

async function fetchGitHubUser(token: string, apiUrl: string): Promise<GitHubUser> {
  const response = await fetch(`${apiUrl}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'robotscraping-api',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub user fetch failed (${response.status})`);
  }

  return (await response.json()) as GitHubUser;
}

async function fetchGitHubEmail(token: string, apiUrl: string): Promise<string | null> {
  const response = await fetch(`${apiUrl}/user/emails`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'robotscraping-api',
    },
  });

  if (!response.ok) {
    return null;
  }

  const emails = (await response.json()) as GitHubEmail[];
  if (!Array.isArray(emails) || emails.length === 0) return null;

  const primaryVerified = emails.find((email) => email.primary && email.verified);
  if (primaryVerified) return primaryVerified.email;
  const primary = emails.find((email) => email.primary);
  return primary?.email || emails[0]?.email || null;
}

export async function handleAuth(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  parts: string[],
  url: URL,
): Promise<Response> {
  if (parts.length < 2) {
    return textResponse('Not Found', 404, corsHeaders);
  }

  if (parts[1] === 'github' && parts[2] === 'callback') {
    return handleGitHubCallback(request, env, url);
  }

  switch (parts[1]) {
    case 'github':
      return handleGitHubLogin(request, env, url);
    case 'me':
      return handleAuthMe(request, env, corsHeaders);
    case 'keys':
      return handleAuthKeys(request, env, corsHeaders, parts.slice(2));
    case 'logout':
      return handleAuthLogout(request, env, corsHeaders);
    default:
      return textResponse('Not Found', 404, corsHeaders);
  }
}

async function handleGitHubLogin(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== 'GET') {
    return textResponse('Method Not Allowed', 405);
  }

  let config;
  try {
    config = getGitHubConfig(env, url.origin);
  } catch (error) {
    return jsonResponse(
      { success: false, error: { code: 'auth_disabled', message: (error as Error).message } },
      503,
    );
  }

  const state = await createOAuthState(env.DB, 10 * 60 * 1000);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUrl,
    scope: config.scopes.join(' '),
    state,
  });

  const authUrl = `${config.oauthUrl}/login/oauth/authorize?${params.toString()}`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      'Cache-Control': 'no-store',
    },
  });
}

async function handleGitHubCallback(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== 'GET') {
    return textResponse('Method Not Allowed', 405);
  }

  const redirectBase = getAuthRedirect(env);
  const error = url.searchParams.get('error');
  if (error) {
    const errorCode = error === 'access_denied' ? 'oauth_denied' : 'oauth_failed';
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${redirectBase}?error=${encodeURIComponent(errorCode)}`,
        'Cache-Control': 'no-store',
      },
    });
  }

  let config;
  try {
    config = getGitHubConfig(env, url.origin);
  } catch (error) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${redirectBase}?error=oauth_failed`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const code = url.searchParams.get('code')?.trim();
  const state = url.searchParams.get('state')?.trim();
  if (!code || !state) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${redirectBase}?error=oauth_failed`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const stateValid = await consumeOAuthState(env.DB, state);
  if (!stateValid) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${redirectBase}?error=oauth_failed`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const tokenResponse = await fetch(`${config.oauthUrl}/login/oauth/access_token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUrl,
    }),
  });

  if (!tokenResponse.ok) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${redirectBase}?error=oauth_failed`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenPayload.access_token) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${redirectBase}?error=oauth_failed`,
        'Cache-Control': 'no-store',
      },
    });
  }

  try {
    const [user, email] = await Promise.all([
      fetchGitHubUser(tokenPayload.access_token, config.apiUrl),
      fetchGitHubEmail(tokenPayload.access_token, config.apiUrl),
    ]);

    const stored = await upsertUser(env.DB, {
      githubId: String(user.id),
      githubLogin: user.login,
      githubName: user.name,
      githubEmail: email,
      githubAvatarUrl: user.avatar_url,
    });

    let initialKey: string | null = null;
    const hasKey = await hasActiveKey(env.DB, stored.id);
    if (!hasKey) {
      const tier = resolveTier(stored.tier);
      const created = await createApiKey(env.DB, stored.id, 'Default Key', tier);
      initialKey = created.plaintext;
    }

    const session = await createSession(env.DB, stored.id, {
      ttlMs: getSessionTtlMs(env),
      initialKey,
    });

    const cookie = buildSessionCookie(env, session.token, getSessionTtlMs(env) / 1000);

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectBase,
        'Cache-Control': 'no-store',
        'Set-Cookie': cookie,
      },
    });
  } catch {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${redirectBase}?error=oauth_failed`,
        'Cache-Control': 'no-store',
      },
    });
  }
}

async function handleAuthMe(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (request.method !== 'GET') {
    return textResponse('Method Not Allowed', 405, corsHeaders);
  }

  const token = getCookie(request, getSessionCookieName(env));
  const user = await getUserBySession(env.DB, token);
  if (!user) {
    return jsonResponse(
      { success: false, error: { code: 'unauthorized', message: 'Authentication required.' } },
      401,
      corsHeaders,
    );
  }

  const tier = resolveTier(user.tier);
  const limit = getDailyLimitForTier(tier);

  return jsonResponse(
    {
      success: true,
      data: {
        user: {
          id: user.id,
          github_login: user.github_login,
          github_name: user.github_name,
          github_email: user.github_email,
          github_avatar_url: user.github_avatar_url,
          tier,
          created_at: user.created_at,
        },
        quota: {
          limit,
          period: 'day',
          tier,
        },
      },
    },
    200,
    corsHeaders,
  );
}

async function handleAuthKeys(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  extraParts: string[],
): Promise<Response> {
  const token = getCookie(request, getSessionCookieName(env));
  const user = await getUserBySession(env.DB, token);
  if (!user) {
    return jsonResponse(
      { success: false, error: { code: 'unauthorized', message: 'Authentication required.' } },
      401,
      corsHeaders,
    );
  }

  if (extraParts.length > 0) {
    return textResponse('Not Found', 404, corsHeaders);
  }

  switch (request.method) {
    case 'GET': {
      const keys = await listKeys(env.DB, user.id);
      const initialKey = await popInitialKey(env.DB, token);
      const tier = resolveTier(user.tier);
      const limit = getDailyLimitForTier(tier);

      return jsonResponse(
        {
          success: true,
          data: {
            keys: keys.map((key) => ({
              id: key.id,
              key_prefix: key.key_prefix,
              name: key.name,
              tier: resolveTier(key.tier),
              is_active: Boolean(key.is_active),
              last_used_at: key.last_used_at,
              created_at: key.created_at,
            })),
            initial_key: initialKey,
            quota: {
              limit,
              period: 'day',
              tier,
            },
          },
        },
        200,
        corsHeaders,
      );
    }
    case 'POST': {
      const payload = await request.json().catch(() => ({}));
      const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
      const tier = resolveTier(user.tier);
      const created = await createApiKey(env.DB, user.id, name || 'API Key', tier);

      return jsonResponse(
        {
          success: true,
          data: {
            key: {
              id: created.key.id,
              key_prefix: created.key.key_prefix,
              name: created.key.name,
              tier: resolveTier(created.key.tier),
              is_active: true,
              created_at: created.key.created_at,
            },
            plaintext: created.plaintext,
          },
        },
        200,
        corsHeaders,
      );
    }
    default:
      return textResponse('Method Not Allowed', 405, corsHeaders);
  }
}

async function handleAuthLogout(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (request.method !== 'POST') {
    return textResponse('Method Not Allowed', 405, corsHeaders);
  }

  const token = getCookie(request, getSessionCookieName(env));
  await clearSession(env.DB, token);

  const cookie = buildSessionCookie(env, '', 0);

  return jsonResponse({ success: true }, 200, {
    ...corsHeaders,
    'Set-Cookie': cookie,
  });
}
