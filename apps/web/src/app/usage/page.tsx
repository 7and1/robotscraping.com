'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, BarChart3, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface UsageSummary {
  total: number;
  success: number;
  cached: number;
  blocked: number;
  failed: number;
  tokens: number;
  avgLatencyMs: number;
}

interface UsageSeriesEntry {
  day: string;
  total: number;
  tokens: number;
  avgLatencyMs: number;
}

interface UsageLogEntry {
  id: string;
  url: string;
  status: string;
  token_usage: number | null;
  latency_ms: number | null;
  created_at: number;
}

const ranges = [
  { label: 'Last 24h', value: '24h' },
  { label: 'Last 7d', value: '7d' },
  { label: 'Last 30d', value: '30d' },
];

export default function UsagePage() {
  const [apiKey, setApiKey] = useState('');
  const [range, setRange] = useState(ranges[1].value);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [series, setSeries] = useState<UsageSeriesEntry[]>([]);
  const [recent, setRecent] = useState<UsageLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

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

  const loadUsage = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/usage?range=${range}`, {
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error?.message || 'Failed to load usage.');
      }
      setSummary(payload?.data?.summary || null);
      setSeries(payload?.data?.series || []);
      setRecent(payload?.data?.recent || []);
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  };

  const downloadCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const res = await fetch(`/api/usage/export?range=${range}`, {
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to export CSV.');
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const contentDisposition = res.headers.get('content-disposition');
      const match = contentDisposition?.match(/filename=\"?([^\";]+)\"?/i);
      const filename = match?.[1] || `usage_${range}.csv`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
    setExporting(false);
  };

  useEffect(() => {
    loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const sparkSeries = [...series].reverse();
  const sparkValues = sparkSeries.map((entry) => entry.total);
  const sparklinePath = buildSparklinePath(sparkValues, 200, 48, 6);

  return (
    <main className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
              <Activity className="h-4 w-4 text-neon" />
              Usage Analytics
            </div>
            <h1 className="mt-3 text-3xl font-semibold">Extraction usage dashboard</h1>
            <p className="mt-2 text-sm text-white/60">
              Monitor volume, cache impact, and latency trends across recent requests.
            </p>
          </div>
          <div className="text-xs text-white/60">
            <Link className="transition hover:text-neon" href="/">
              ← Back to home
            </Link>
          </div>
        </header>

        <section className="glass rounded-2xl p-6">
          <div className="flex flex-wrap items-center gap-4">
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="x-api-key"
              className="flex-1 rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none"
            />
            <select
              value={range}
              onChange={(event) => setRange(event.target.value)}
              className="rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-xs text-white"
            >
              {ranges.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              onClick={loadUsage}
              className={clsx(
                'flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:border-neon/60 hover:text-neon',
                loading && 'opacity-60',
              )}
            >
              <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </button>
            <button
              onClick={downloadCsv}
              disabled={exporting}
              aria-busy={exporting}
              className={clsx(
                'flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:border-neon/60 hover:text-neon',
                exporting && 'opacity-60',
              )}
            >
              Download CSV
            </button>
          </div>
          {error && <p className="mt-3 text-xs text-laser">{error}</p>}
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total', value: summary?.total ?? 0 },
            { label: 'Success', value: summary?.success ?? 0 },
            { label: 'Cached', value: summary?.cached ?? 0 },
            { label: 'Blocked', value: summary?.blocked ?? 0 },
            { label: 'Failed', value: summary?.failed ?? 0 },
            { label: 'Tokens', value: summary?.tokens ?? 0 },
            { label: 'Avg latency (ms)', value: summary?.avgLatencyMs ?? 0 },
          ].map((item) => (
            <div key={item.label} className="glass rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
          <div className="glass rounded-2xl p-4 md:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Trend</p>
            {sparkValues.length >= 2 ? (
              <div className="mt-4 flex items-center justify-between gap-4">
                <svg width={200} height={48} viewBox="0 0 200 48" aria-hidden="true">
                  <path
                    d={sparklinePath}
                    fill="none"
                    stroke="rgba(124, 255, 178, 0.9)"
                    strokeWidth="2"
                  />
                </svg>
                <div className="text-xs text-white/70">
                  <div>Last: {sparkValues[sparkValues.length - 1]}</div>
                  <div>Days: {sparkValues.length}</div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-white/50">Not enough data yet.</p>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
              <BarChart3 className="h-4 w-4 text-neon" />
              Daily Trend
            </div>
            <div className="space-y-3">
              {series.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/50">
                  No usage data yet.
                </div>
              )}
              {series.map((entry) => (
                <div
                  key={entry.day}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-4 text-xs"
                >
                  <span className="text-white/70">{entry.day}</span>
                  <span>Total: {entry.total}</span>
                  <span>Tokens: {entry.tokens}</span>
                  <span>Avg latency: {Math.round(entry.avgLatencyMs || 0)} ms</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-lg font-semibold">Recent activity</h2>
            <div className="space-y-3">
              {recent.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/50">
                  No recent requests.
                </div>
              )}
              {recent.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs text-white/50">{entry.url}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/60">
                    <span>Status: {entry.status}</span>
                    <span>Tokens: {entry.token_usage ?? 0}</span>
                    <span>Latency: {entry.latency_ms ?? 0} ms</span>
                    <span>{new Date(entry.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function buildSparklinePath(
  values: number[],
  width: number,
  height: number,
  padding: number,
): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = (width - padding * 2) / Math.max(values.length - 1, 1);
  return values
    .map((value, index) => {
      const x = padding + index * step;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');
}
