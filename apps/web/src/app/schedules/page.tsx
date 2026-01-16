'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, PauseCircle, PlayCircle, Send, Edit, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { ToastContainer } from '@/components/ui/toast';

interface ScheduleRecord {
  id: string;
  url: string;
  cron: string;
  webhook_url: string;
  webhook_secret?: string | null;
  is_active: number;
  next_run_at?: number | null;
  last_run_at?: number | null;
  fields_config?: string | null;
  schema_json?: string | null;
  instructions?: string | null;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
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

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRecord | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editFields, setEditFields] = useState('');
  const [editSchema, setEditSchema] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editWebhookUrl, setEditWebhookUrl] = useState('');
  const [editWebhookSecret, setEditWebhookSecret] = useState('');
  const [editCronMode, setEditCronMode] = useState(cronPresets[0].value);
  const [editCron, setEditCron] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState<ScheduleRecord | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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

  useEffect(() => {
    if (editCronMode !== 'custom') {
      setEditCron(editCronMode);
    }
  }, [editCronMode]);

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
      addToast('Schedule created successfully', 'success');
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
    addToast(`Schedule ${schedule.is_active === 1 ? 'paused' : 'activated'}`, 'success');
  };

  const openEditModal = (schedule: ScheduleRecord) => {
    setEditingSchedule(schedule);
    setEditUrl(schedule.url);
    setEditFields(schedule.fields_config || '');
    setEditSchema(schedule.schema_json || '');
    setEditInstructions(schedule.instructions || '');
    setEditWebhookUrl(schedule.webhook_url || '');
    setEditWebhookSecret(schedule.webhook_secret || '');
    setEditCron(schedule.cron);
    setEditCronMode(cronPresets.find((p) => p.value === schedule.cron)?.value || 'custom');
    setEditError('');
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingSchedule(null);
    setEditError('');
  };

  const saveEdit = async () => {
    if (!editingSchedule) return;

    setEditError('');
    setSaving(true);

    let parsedFields: string[] | undefined;
    let parsedSchema: Record<string, unknown> | undefined;

    if (editFields.trim()) {
      try {
        const candidate = JSON.parse(editFields);
        if (!Array.isArray(candidate)) {
          throw new Error('Fields must be JSON array');
        }
        parsedFields = candidate;
      } catch {
        setEditError('Fields must be a valid JSON array.');
        setSaving(false);
        return;
      }
    }

    if (editSchema.trim()) {
      try {
        const candidate = JSON.parse(editSchema);
        if (!candidate || typeof candidate !== 'object') {
          throw new Error('Schema must be JSON object');
        }
        parsedSchema = candidate as Record<string, unknown>;
      } catch {
        setEditError('Schema must be a valid JSON object.');
        setSaving(false);
        return;
      }
    }

    if (!parsedFields && !parsedSchema) {
      setEditError('Provide fields or a schema.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/schedules/${editingSchedule.id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          url: editUrl,
          ...(parsedFields ? { fields: parsedFields } : {}),
          ...(parsedSchema ? { schema: parsedSchema } : {}),
          ...(editInstructions.trim()
            ? { instructions: editInstructions.trim() }
            : { instructions: null }),
          cron: editCron,
          webhook_url: editWebhookUrl,
          webhook_secret: editWebhookSecret || null,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error?.message || 'Failed to update schedule.');
      }
      await loadSchedules();
      closeEditModal();
      addToast('Schedule updated successfully', 'success');
    } catch (err) {
      setEditError((err as Error).message);
    }
    setSaving(false);
  };

  const openDeleteConfirm = (schedule: ScheduleRecord) => {
    setDeletingSchedule(schedule);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingSchedule) return;

    try {
      const res = await fetch(`/api/schedules/${deletingSchedule.id}`, {
        method: 'DELETE',
        headers: {
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error?.message || 'Failed to delete schedule.');
      }
      setSchedules((prev) => prev.filter((s) => s.id !== deletingSchedule.id));
      addToast('Schedule deleted successfully', 'success');
    } catch (err) {
      addToast((err as Error).message, 'error');
    }
    setDeleteConfirmOpen(false);
    setDeletingSchedule(null);
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
      addToast('Webhook test sent successfully', 'success');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    loadSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main id="main-content" className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white">
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
              Back to home
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
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/50 truncate">{schedule.url}</p>
                    <p className="mt-2 text-sm font-semibold font-mono">{schedule.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <button
                      onClick={() => openEditModal(schedule)}
                      className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-cyan/50 hover:text-cyan"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(schedule)}
                      className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-laser/50 hover:text-laser"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
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

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        title="Edit Schedule"
        footer={
          <>
            <button
              onClick={closeEditModal}
              disabled={saving}
              className="rounded-xl border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:border-white/40 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="rounded-xl bg-neon px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-black disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          {editError && <p className="text-xs text-laser">{editError}</p>}
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/40 block mb-2">
              Target URL
            </label>
            <input
              value={editUrl}
              onChange={(event) => setEditUrl(event.target.value)}
              placeholder="Target URL"
              className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none focus:border-neon/70"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/40 block mb-2">
              Fields (JSON array)
            </label>
            <textarea
              value={editFields}
              onChange={(event) => setEditFields(event.target.value)}
              rows={3}
              placeholder='["price","title"]'
              className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-xs text-white outline-none focus:border-neon/70"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/40 block mb-2">
              Schema (JSON object)
            </label>
            <textarea
              value={editSchema}
              onChange={(event) => setEditSchema(event.target.value)}
              rows={3}
              placeholder='{"type":"object"}'
              className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-xs text-white outline-none focus:border-neon/70"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/40 block mb-2">
              Instructions
            </label>
            <textarea
              value={editInstructions}
              onChange={(event) => setEditInstructions(event.target.value)}
              rows={2}
              placeholder="Optional instructions"
              className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none focus:border-neon/70"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/40 block mb-2">
              Webhook URL
            </label>
            <input
              value={editWebhookUrl}
              onChange={(event) => setEditWebhookUrl(event.target.value)}
              placeholder="Webhook URL"
              className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none focus:border-neon/70"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/40 block mb-2">
              Webhook Secret
            </label>
            <input
              value={editWebhookSecret}
              onChange={(event) => setEditWebhookSecret(event.target.value)}
              placeholder="Webhook secret (optional)"
              className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none focus:border-neon/70"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1">
              <label className="text-xs uppercase tracking-[0.3em] text-white/40 block mb-2">
                Schedule
              </label>
              <select
                value={editCronMode}
                onChange={(event) => setEditCronMode(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-xs text-white"
              >
                {cronPresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs uppercase tracking-[0.3em] text-white/40 block mb-2">
                Cron Expression
              </label>
              <input
                value={editCron}
                onChange={(event) => setEditCron(event.target.value)}
                disabled={editCronMode !== 'custom'}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Schedule"
        message="Are you sure you want to delete this schedule? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </main>
  );
}
