'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { RefreshCw, Search, TerminalSquare, Copy } from 'lucide-react';
import clsx from 'clsx';

interface JobRecord {
  id: string;
  url: string;
  status: string;
  created_at: number;
  completed_at?: number | null;
  result_url?: string | null;
  error_msg?: string | null;
  token_usage?: number | null;
  latency_ms?: number | null;
}

const statusStyles: Record<string, string> = {
  queued: 'text-yellow-400 border-yellow-500/40',
  processing: 'text-cyan border-cyan/40',
  completed: 'text-neon border-neon/40',
  failed: 'text-laser border-laser/40',
  blocked: 'text-orange-400 border-orange-500/40',
};

export default function JobsPage() {
  const [apiKey, setApiKey] = useState('');
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [selected, setSelected] = useState<JobRecord | null>(null);
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedResult, setCopiedResult] = useState(false);

  const resultPreRef = useRef<HTMLPreElement>(null);

  const copyResult = useCallback(async () => {
    if (!result || result.startsWith('//')) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 2000);
    } catch {
      // Silently fail if clipboard is not available
    }
  }, [result]);

  useEffect(() => {
    const stored = window.localStorage.getItem('robot_api_key');
    if (stored) {
      setApiKey(stored);
    }
  }, []);

  useEffect(() => {
    if (apiKey) {
      window.localStorage.setItem('robot_api_key', apiKey);
    }
  }, [apiKey]);

  const loadJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/jobs?limit=25', {
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error?.message || 'Failed to load jobs.');
      }
      setJobs(payload.data || []);
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  };

  const loadResult = useCallback(
    async (job: JobRecord) => {
      setSelected(job);
      setResult('');
      setCopiedResult(false);
      if (!job.result_url) {
        setResult('// Result not available yet.');
        return;
      }

      try {
        const res = await fetch(`/api/jobs/${job.id}/result`, {
          headers: apiKey ? { 'x-api-key': apiKey } : {},
        });
        const text = await res.text();
        setResult(text);
      } catch (err) {
        setResult('// Failed to fetch result.');
      }
    },
    [apiKey],
  );

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main id="main-content" className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
              <TerminalSquare className="h-4 w-4 text-neon" aria-hidden="true" />
              Job Monitor
            </div>
            <h1 className="mt-3 text-3xl font-semibold">Asynchronous extraction pipeline</h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/60">
            <Link
              className="transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
              href="/"
            >
              Back to home
            </Link>
            <Link
              className="transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
              href="/usage"
            >
              Usage
            </Link>
          </div>
        </header>

        <section className="glass rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/15 bg-black/40 px-4 py-3">
              <Search className="h-4 w-4 text-white/40" aria-hidden="true" />
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="x-api-key"
                className="flex-1 bg-transparent text-xs text-white outline-none focus:ring-1 focus:ring-neon/30 rounded"
              />
            </div>
            <button
              onClick={loadJobs}
              className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:border-neon/60 hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50"
            >
              <RefreshCw
                className={clsx('h-4 w-4', loading && 'animate-spin')}
                aria-hidden="true"
              />
              Refresh
            </button>
          </div>
          {error && <p className="mt-3 text-xs text-laser">{error}</p>}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-lg font-semibold">Latest jobs</h2>
            <div className="space-y-3">
              {jobs.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/50">
                  No jobs yet. Run an async extraction to populate the queue.
                </div>
              )}
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => loadResult(job)}
                  className={clsx(
                    'w-full rounded-xl border bg-black/40 p-4 text-left transition hover:border-neon/60',
                    selected?.id === job.id ? 'border-neon/70' : 'border-white/10',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-white/50">{job.url}</p>
                      <p className="mt-2 text-sm font-semibold">{job.id}</p>
                    </div>
                    <span
                      className={clsx(
                        'rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]',
                        statusStyles[job.status] || 'border-white/20 text-white/60',
                      )}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/50">
                    <span>Created: {new Date(job.created_at).toLocaleString()}</span>
                    {job.token_usage ? <span>Tokens: {job.token_usage}</span> : null}
                  </div>
                  {job.error_msg && <p className="mt-2 text-xs text-laser">{job.error_msg}</p>}
                </button>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Result preview</h2>
              {result && !result.startsWith('//') && (
                <button
                  onClick={copyResult}
                  aria-label={
                    copiedResult ? 'Result copied to clipboard' : 'Copy result to clipboard'
                  }
                  className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-white/70 transition hover:border-neon/70 hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {copiedResult ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
            <pre
              ref={resultPreRef}
              className="min-h-[420px] max-h-[500px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-neon/80"
              tabIndex={0}
              aria-live="polite"
              aria-label="Job result JSON"
            >
              {result || '// Select a job to view its result.'}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
