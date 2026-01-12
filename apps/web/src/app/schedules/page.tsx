'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, PauseCircle, PlayCircle, Send } from 'lucide-react';
import clsx from 'clsx';

interface ScheduleRecord {
  id: string;
  url: string;
  cron: string;
  webhook_url: string;
  is_active: number;
  next_run_at?: number | null;
  last_run_at?: number | null;
  fields_config?: string | null;
}

const cronPresets = [
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily 09:00 UTC', value: '0 9 * * *' },
  { label: 'Weekly Mon 09:00 UTC', value: '0 9 * * 1' },
  { label: 'Custom', value: 'custom' },
];

export default function SchedulesPage() {
  const [apiKey, setApiKey] = useState('');
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [url, setUrl] = useState('');
  const [fields, setFields] = useState('["price", "title"]');
  const [schema, setSchema] = useState('');
  const [instructions, setInstructions] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [scheduleWebhookSecret, setScheduleWebhookSecret] = useState('');
  const [cronMode, setCronMode] = useState(cronPresets[0].value);
  const [cron, setCron] = useState(cronPresets[0].value);
  const [webhookTestUrl, setWebhookTestUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (cronMode !== 'custom') {
      setCron(cronMode);
    }
  }, [cronMode]);

  const loadSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/schedules?limit=50', {
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error?.message || 'Failed to load schedules.');
      }
      setSchedules(payload.data || []);
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  };

  const createSchedule = async () => {
    setError('');
    let parsedFields: string[] | undefined;
    let parsedSchema: Record<string, unknown> | undefined;
    if (fields.trim()) {
      try {
        const candidate = JSON.parse(fields);
        if (!Array.isArray(candidate)) {
          throw new Error('Fields must be JSON array');
        }
        parsedFields = candidate;
      } catch {
        setError('Fields must be a valid JSON array.');
        return;
      }
    }

    if (schema.trim()) {
      try {
        const candidate = JSON.parse(schema);
        if (!candidate || typeof candidate !== 'object') {
          throw new Error('Schema must be JSON object');
        }
        parsedSchema = candidate as Record<string, unknown>;
      } catch {
        setError('Schema must be a valid JSON object.');
        return;
      }
    }

    if (!parsedFields && !parsedSchema) {
      setError('Provide fields or a schema.');
      return;
    }

    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          url,
          ...(parsedFields ? { fields: parsedFields } : {}),
          ...(parsedSchema ? { schema: parsedSchema } : {}),
          ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
          cron,
          webhook_url: webhookUrl,
          ...(scheduleWebhookSecret.trim() ? { webhook_secret: scheduleWebhookSecret.trim() } : {}),
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error?.message || 'Failed to create schedule.');
      }
      await loadSchedules();
      setUrl('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleSchedule = async (schedule: ScheduleRecord) => {
    await fetch(`/api/schedules/${schedule.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body: JSON.stringify({ is_active: schedule.is_active === 1 ? false : true }),
    });
    await loadSchedules();
  };

  const testWebhook = async () => {
    setError('');
    try {
      const res = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify({ url: webhookTestUrl, secret: webhookSecret || undefined }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error?.message || 'Webhook test failed.');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    loadSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
              <CalendarClock className="h-4 w-4 text-neon" />
              Schedule Engine
            </div>
            <h1 className="mt-3 text-3xl font-semibold">Recurring extraction automations</h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/60">
            <Link className="transition hover:text-neon" href="/">
              ← Back to home
            </Link>
            <Link className="transition hover:text-neon" href="/usage">
              Usage
            </Link>
          </div>
        </header>

        <section className="glass rounded-2xl p-6">
          <div className="flex flex-wrap gap-4">
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="x-api-key"
              className="flex-1 rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none"
            />
            <button
              onClick={loadSchedules}
              className={clsx(
                'rounded-xl border border-white/20 px-4 py-3 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:border-neon/60 hover:text-neon',
                loading && 'opacity-60',
              )}
            >
              Refresh
            </button>
          </div>
          {error && <p className="mt-3 text-xs text-laser">{error}</p>}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-lg font-semibold">Create schedule</h2>
            <div className="space-y-4 text-sm">
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="Target URL"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none"
              />
              <textarea
                value={fields}
                onChange={(event) => setFields(event.target.value)}
                rows={4}
                placeholder='["price","title"] (optional if schema)'
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-xs text-white outline-none"
              />
              <textarea
                value={schema}
                onChange={(event) => setSchema(event.target.value)}
                rows={4}
                placeholder='{"type":"object","properties":{"price":{"type":"string"}}}'
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-xs text-white outline-none"
              />
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={3}
                placeholder="Optional instructions"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none"
              />
              <input
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
                placeholder="Webhook URL"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none"
              />
              <input
                value={scheduleWebhookSecret}
                onChange={(event) => setScheduleWebhookSecret(event.target.value)}
                placeholder="Webhook secret (optional)"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none"
              />
              <div className="flex flex-wrap gap-3">
                <select
                  value={cronMode}
                  onChange={(event) => setCronMode(event.target.value)}
                  className="flex-1 rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-xs text-white"
                >
                  {cronPresets.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <input
                  value={cron}
                  onChange={(event) => setCron(event.target.value)}
                  disabled={cronMode !== 'custom'}
                  className="flex-1 rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none disabled:opacity-60"
                />
              </div>
              <p className="text-[11px] text-white/40">Cron expressions are evaluated in UTC.</p>
              <button
                onClick={createSchedule}
                className="rounded-xl bg-neon px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-black"
              >
                Create schedule
              </button>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-lg font-semibold">Webhook debugger</h2>
            <div className="space-y-4 text-sm">
              <input
                value={webhookTestUrl}
                onChange={(event) => setWebhookTestUrl(event.target.value)}
                placeholder="Webhook URL"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none"
              />
              <input
                value={webhookSecret}
                onChange={(event) => setWebhookSecret(event.target.value)}
                placeholder="Optional secret"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none"
              />
              <button
                onClick={testWebhook}
                className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:border-neon/60 hover:text-neon"
              >
                <Send className="h-4 w-4" />
                Send test
              </button>
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Active schedules</h2>
          <div className="space-y-3">
            {schedules.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/50">
                No schedules yet. Create one above.
              </div>
            )}
            {schedules.map((schedule) => (
              <div key={schedule.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-white/50">{schedule.url}</p>
                    <p className="mt-2 text-sm font-semibold">{schedule.id}</p>
                  </div>
                  <button
                    onClick={() => toggleSchedule(schedule)}
                    className={clsx(
                      'flex items-center gap-2 rounded-full border px-3 py-2 text-xs uppercase tracking-[0.2em] transition',
                      schedule.is_active === 1
                        ? 'border-neon/50 text-neon'
                        : 'border-white/20 text-white/50',
                    )}
                  >
                    {schedule.is_active === 1 ? (
                      <PlayCircle className="h-4 w-4" />
                    ) : (
                      <PauseCircle className="h-4 w-4" />
                    )}
                    {schedule.is_active === 1 ? 'Active' : 'Paused'}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/50">
                  <span>Cron: {schedule.cron}</span>
                  {schedule.next_run_at ? (
                    <span>Next: {new Date(schedule.next_run_at).toLocaleString()}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
