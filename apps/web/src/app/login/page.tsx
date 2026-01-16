'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Copy, ExternalLink, KeyRound, LogOut, RefreshCw, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

interface AuthUser {
  id: string;
  github_login: string;
  github_name?: string | null;
  github_email?: string | null;
  github_avatar_url?: string | null;
  tier: string;
  created_at: number;
}

interface AuthKey {
  id: string;
  key_prefix: string | null;
  name: string | null;
  tier: string;
  is_active: boolean;
  last_used_at?: number | null;
  created_at: number;
  plaintext?: string;
}

interface AuthState {
  user: AuthUser;
  keys: AuthKey[];
  initialKey?: string | null;
  quota?: { limit: number | null; period: string; tier: string };
}

const errorMessages: Record<string, string> = {
  oauth_failed: 'GitHub authentication failed. Please try again.',
  oauth_denied: 'GitHub access was denied. Authorization is required to continue.',
  session_expired: 'Your session has expired. Please sign in again.',
};

function LoginContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const errorMessage = errorParam ? errorMessages[errorParam] || 'Authentication error.' : '';

  const apiBase = useMemo(() => {
    const envBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
    return envBase || 'https://api.robotscraping.com';
  }, []);

  const loginUrl = `${apiBase}/auth/github`;

  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(errorMessage);
  const [copySuccess, setCopySuccess] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [regeneratingKeyId, setRegeneratingKeyId] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const fetchAuth = useCallback(
    async (path: string, options?: RequestInit) => {
      return fetch(`${apiBase}${path}`, {
        credentials: 'include',
        ...options,
      });
    },
    [apiBase],
  );

  const loadAuthState = useCallback(async () => {
    setLoading(true);
    if (!errorMessage) {
      setError('');
    }
    try {
      const [meRes, keysRes] = await Promise.all([fetchAuth('/auth/me'), fetchAuth('/auth/keys')]);

      if (!meRes.ok) {
        const payload = await meRes.json().catch(() => null);
        throw new Error(payload?.error?.message || 'Please sign in.');
      }

      const mePayload = await meRes.json();
      const keysPayload = await keysRes.json();

      setAuthState({
        user: mePayload?.data?.user,
        keys: keysPayload?.data?.keys || [],
        initialKey: keysPayload?.data?.initial_key || null,
        quota: keysPayload?.data?.quota || mePayload?.data?.quota,
      });
      if (keysPayload?.data?.initial_key) {
        setNewKey(keysPayload.data.initial_key);
      }
    } catch (err) {
      setAuthState(null);
      setError(errorMessage || (err as Error).message || 'Unable to load session.');
    } finally {
      setLoading(false);
    }
  }, [fetchAuth, errorMessage]);

  useEffect(() => {
    loadAuthState();
  }, [loadAuthState]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopySuccess('Copied to clipboard');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch {
      setCopySuccess('Copy failed');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const handleSaveToBrowser = (value: string) => {
    if (!value) return;
    window.localStorage.setItem('robot_api_key', value);
    setCopySuccess('Saved to browser');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const handleCreateKey = async () => {
    setCreatingKey(true);
    setError('');
    try {
      const res = await fetchAuth('/auth/keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Secondary Key' }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error?.message || 'Unable to create API key.');
      }
      const payload = await res.json();
      const plaintext = payload?.data?.plaintext as string | undefined;
      if (plaintext) {
        setNewKey(plaintext);
      }
      await loadAuthState();
    } catch (err) {
      setError((err as Error).message || 'Unable to create API key.');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRegenerateKey = async (keyId: string) => {
    setRegeneratingKeyId(keyId);
    setError('');
    try {
      const res = await fetchAuth(`/auth/keys/${keyId}/regenerate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error?.message || 'Unable to regenerate API key.');
      }
      const payload = await res.json();
      const plaintext = payload?.data?.plaintext as string | undefined;
      if (plaintext) {
        setNewKey(plaintext);
        setVisibleKeys((prev) => new Set(prev).add('new'));
      }
      await loadAuthState();
    } catch (err) {
      setError((err as Error).message || 'Unable to regenerate API key.');
    } finally {
      setRegeneratingKeyId(null);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const handleLogout = async () => {
    setError('');
    try {
      await fetchAuth('/auth/logout', { method: 'POST' });
      setAuthState(null);
    } catch (err) {
      setError((err as Error).message || 'Unable to log out.');
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.4em] text-white/50">Account</div>
            <h1 className="mt-3 text-3xl font-semibold">RobotScraping login</h1>
            <p className="mt-2 text-sm text-white/60">
              Sign in with GitHub to unlock 50 requests per day, manage API keys, and track usage.
            </p>
          </div>
          <div className="text-xs text-white/60">
            <Link className="transition hover:text-neon" href="/">
              Back to home
            </Link>
          </div>
        </header>

        {error && (
          <div className="glass rounded-2xl border border-laser/40 px-6 py-4 text-sm text-laser">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass rounded-2xl p-8">
            {loading ? (
              <div className="animate-pulse space-y-4 text-white/60">
                <div className="h-4 w-32 rounded bg-white/10" />
                <div className="h-8 w-48 rounded bg-white/10" />
                <div className="h-4 w-full rounded bg-white/10" />
              </div>
            ) : authState ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  {authState.user.github_avatar_url ? (
                    <img
                      src={authState.user.github_avatar_url}
                      alt={authState.user.github_login}
                      className="h-14 w-14 rounded-full border border-white/20"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 text-lg">
                      <KeyRound className="h-6 w-6 text-neon" />
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {authState.user.github_name || authState.user.github_login}
                    </p>
                    <p className="text-xs text-white/60">@{authState.user.github_login}</p>
                    {authState.user.github_email && (
                      <p className="text-xs text-white/50">{authState.user.github_email}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white/70">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="uppercase tracking-[0.3em] text-white/40">Plan</span>
                    <span className="text-neon">{authState.user.tier}</span>
                  </div>
                  {authState.quota && (
                    <p className="mt-2">
                      {authState.quota.limit ?? 'Unlimited'} requests per {authState.quota.period}.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-neon/60 hover:text-neon"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                  <button
                    onClick={loadAuthState}
                    className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-neon/60 hover:text-neon"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-neon/30 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-neon">
                  GitHub OAuth
                </div>
                <h2 className="text-2xl font-semibold">Sign in with GitHub</h2>
                <p className="text-sm text-white/60">
                  Get a personal API key, 50 requests per day, and a shareable usage dashboard. No
                  Stripe required.
                </p>
                <a
                  href={loginUrl}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neon px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5"
                >
                  Continue with GitHub
                  <ExternalLink className="h-4 w-4" />
                </a>
                <div className="text-xs text-white/50">
                  By signing in you agree to our{' '}
                  <Link href="/terms" className="text-white/70 underline underline-offset-2">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-white/70 underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  .
                </div>
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">API keys</h3>
                <p className="text-xs text-white/60">
                  Copy and store your key. For security, full keys are shown once.
                </p>
              </div>
              {authState && (
                <button
                  onClick={handleCreateKey}
                  disabled={creatingKey}
                  className={clsx(
                    'rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:border-neon/60 hover:text-neon',
                    creatingKey && 'opacity-60',
                  )}
                >
                  New key
                </button>
              )}
            </div>

            {copySuccess && (
              <div className="mt-4 flex items-center gap-2 text-xs text-neon">
                <Check className="h-4 w-4" />
                {copySuccess}
              </div>
            )}

            {!authState && (
              <div className="mt-6 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/60">
                Sign in to view and create API keys.
              </div>
            )}

            {authState && (
              <div className="mt-6 space-y-4">
                {newKey && (
                  <div className="rounded-xl border border-neon/40 bg-black/60 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-[0.3em] text-white/40">
                        New key
                      </div>
                      <button
                        onClick={() => toggleKeyVisibility('new')}
                        className="text-xs text-white/50 hover:text-neon transition"
                      >
                        {visibleKeys.has('new') ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="mt-2 break-all font-mono text-neon">
                      {visibleKeys.has('new')
                        ? newKey
                        : `${newKey.slice(0, 12)}${'*'.repeat(Math.min(28, newKey.length - 12))}`}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                      <button
                        onClick={() => handleCopy(newKey)}
                        className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-neon/60 hover:text-neon"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                      <button
                        onClick={() => handleSaveToBrowser(newKey)}
                        className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-neon/60 hover:text-neon"
                      >
                        Save to browser
                      </button>
                    </div>
                  </div>
                )}

                {authState.keys.length === 0 && !newKey && (
                  <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/60">
                    No API keys yet. Create one to get started.
                  </div>
                )}

                {authState.keys.map((key) => (
                  <div key={key.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">
                            {key.name || 'API Key'}
                          </p>
                          {!key.is_active && (
                            <span className="rounded-full border border-laser/40 bg-laser/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-laser">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-white/50">
                          Prefix: <span className="font-mono">{key.key_prefix || '—'}</span>
                        </p>
                        <div className="mt-3 text-xs text-white/50">
                          Created {new Date(key.created_at).toLocaleDateString()} ·{' '}
                          {key.last_used_at
                            ? `Last used ${new Date(key.last_used_at).toLocaleDateString()}`
                            : 'Not used yet'}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleCopy(key.plaintext || key.key_prefix || '')}
                          className="flex items-center gap-1.5 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs text-white/70 transition hover:border-neon/60 hover:text-neon"
                          title="Copy key prefix"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </button>
                        <button
                          onClick={() => handleRegenerateKey(key.id)}
                          disabled={regeneratingKeyId === key.id}
                          className={clsx(
                            'flex items-center gap-1.5 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs text-white/70 transition hover:border-laser/60 hover:text-laser',
                            regeneratingKeyId === key.id && 'opacity-60 cursor-wait',
                          )}
                          title="Regenerate key"
                        >
                          <RefreshCw
                            className={clsx(
                              'h-3 w-3',
                              regeneratingKeyId === key.id && 'animate-spin',
                            )}
                          />
                          Regenerate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white">
          <div className="mx-auto flex max-w-5xl flex-col gap-10">
            <div className="animate-pulse space-y-4 text-white/60">
              <div className="h-8 w-48 rounded bg-white/10" />
              <div className="h-4 w-32 rounded bg-white/10" />
            </div>
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
