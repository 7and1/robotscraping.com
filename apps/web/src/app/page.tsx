'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Cpu, Loader2, Play, Radar, Sparkles, Shield, Zap, Globe } from 'lucide-react';
import clsx from 'clsx';

const defaultFields = ['product_name', 'price', 'rating', 'description'];
const defaultUrl = 'https://example.com/product/123';

export default function Home() {
  const [url, setUrl] = useState(defaultUrl);
  const [fields, setFields] = useState(JSON.stringify(defaultFields, null, 2));
  const [schema, setSchema] = useState('');
  const [instructions, setInstructions] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [asyncMode, setAsyncMode] = useState(false);
  const [screenshot, setScreenshot] = useState(false);
  const [storeContent, setStoreContent] = useState(true);
  const [waitUntil, setWaitUntil] = useState<'domcontentloaded' | 'networkidle0'>(
    'domcontentloaded',
  );
  const [timeoutMs, setTimeoutMs] = useState(15000);
  const [result, setResult] = useState<string>('');
  const [meta, setMeta] = useState<{
    id?: string;
    latency?: number;
    tokens?: number;
    status?: string;
    requestId?: string;
    cacheHit?: boolean;
  } | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const endpoint = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
    return base ? `${base}/extract` : '/api/scrape';
  }, []);

  const handleScrape = async () => {
    setLoading(true);
    setError('');
    setResult('');
    setMeta(null);

    let parsedFields: string[] | undefined;
    let parsedSchema: Record<string, unknown> | undefined;
    if (fields.trim()) {
      try {
        const candidate = JSON.parse(fields);
        if (!Array.isArray(candidate)) {
          throw new Error('Fields must be a JSON array.');
        }
        parsedFields = candidate;
      } catch (err) {
        setLoading(false);
        setError('Fields must be a valid JSON array.');
        return;
      }
    }

    if (schema.trim()) {
      try {
        const candidate = JSON.parse(schema);
        if (!candidate || typeof candidate !== 'object') {
          throw new Error('Schema must be a JSON object.');
        }
        parsedSchema = candidate as Record<string, unknown>;
      } catch (err) {
        setLoading(false);
        setError('Schema must be a valid JSON object.');
        return;
      }
    }

    if (!parsedFields && !parsedSchema) {
      setLoading(false);
      setError('Provide fields or a schema.');
      return;
    }

    try {
      const optionsPayload: Record<string, unknown> = {};
      if (screenshot) optionsPayload.screenshot = true;
      if (!storeContent) optionsPayload.storeContent = false;
      if (waitUntil !== 'domcontentloaded') optionsPayload.waitUntil = waitUntil;
      if (timeoutMs && timeoutMs !== 15000) optionsPayload.timeoutMs = timeoutMs;

      const requestBody = {
        url,
        ...(parsedFields ? { fields: parsedFields } : {}),
        ...(parsedSchema ? { schema: parsedSchema } : {}),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        ...(asyncMode ? { async: true } : {}),
        ...(webhookUrl.trim() ? { webhook_url: webhookUrl.trim() } : {}),
        ...(Object.keys(optionsPayload).length ? { options: optionsPayload } : {}),
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      const requestId = res.headers.get('x-request-id') || undefined;
      const cacheHit = res.headers.get('x-cache-hit') === 'true';
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        setError(payload?.error?.message || 'Extraction failed.');
        setResult(JSON.stringify(payload, null, 2));
        setLoading(false);
        return;
      }

      setResult(JSON.stringify(payload, null, 2));
      if (payload?.job_id) {
        setMeta({ id: payload.job_id, status: payload.status, requestId, cacheHit });
      } else {
        setMeta({
          id: payload?.meta?.id,
          latency: payload?.meta?.latencyMs,
          tokens: payload?.meta?.tokens,
          requestId,
          cacheHit,
        });
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-16">
        <nav
          className="flex flex-wrap items-center justify-between gap-4 text-sm"
          aria-label="Main navigation"
        >
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/60">
            <span className="h-2 w-2 rounded-full bg-neon animate-pulse" aria-hidden="true" />
            RobotScraping.com
          </div>
          <nav
            className="flex items-center gap-6 text-xs uppercase tracking-[0.25em] text-white/60"
            aria-label="Page navigation"
          >
            <Link
              className="transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
              href="/jobs"
            >
              Jobs
            </Link>
            <Link
              className="transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
              href="/docs"
            >
              Docs
            </Link>
            <Link
              className="transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
              href="/usage"
            >
              Usage
            </Link>
            <Link
              className="transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
              href="/schedules"
            >
              Schedules
            </Link>
            <a
              className="transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
              href="#playground"
            >
              Playground
            </a>
          </nav>
        </nav>
        <header className="flex flex-col gap-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-neon/30 bg-slate/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-neon">
            <Radar className="h-4 w-4" aria-hidden="true" />
            AI-Powered Universal Extractor
          </div>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
            Turn any website into a <span className="text-neon">JSON API</span> in seconds.
          </h1>
          <p className="max-w-2xl text-lg text-white/70">
            RobotScraping.com renders full pages in Cloudflare Browser Rendering, extracts
            structured data with modern LLMs, and logs everything into D1 + R2. No selectors. No
            brittle scripts. Just URLs and clean JSON.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              className="rounded-full bg-neon px-6 py-3 text-sm font-semibold text-black shadow-glow transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-neon/50"
              onClick={() =>
                document.getElementById('playground')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Launch Playground
            </button>
            <a
              href="#pricing"
              className="rounded-full border border-white/30 px-6 py-3 text-sm text-white/80 transition hover:border-neon/60 hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50"
            >
              View Pricing
            </a>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3" aria-label="Features">
          {[
            {
              icon: <Sparkles className="h-6 w-6 text-neon" aria-hidden="true" />,
              title: 'Zero-maintenance extraction',
              description:
                'AI reads the rendered page like a human. Layout changes are no longer fatal.',
            },
            {
              icon: <Cpu className="h-6 w-6 text-cyan" aria-hidden="true" />,
              title: 'Cloudflare-native speed',
              description: 'Workers + Browser Rendering keep latency low and scale on-demand.',
            },
            {
              icon: <Radar className="h-6 w-6 text-laser" aria-hidden="true" />,
              title: 'Audit-ready logs',
              description:
                'Snapshots, token usage, and trace IDs are stored in D1 + R2 automatically.',
            },
          ].map((item) => (
            <article key={item.title} className="glass rounded-2xl p-6">
              <div className="mb-4 inline-flex rounded-full bg-white/5 p-3" aria-hidden="true">
                {item.icon}
              </div>
              <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
              <p className="text-sm text-white/70">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-3" aria-label="Trust indicators">
          {[
            {
              icon: <Shield className="h-5 w-5 text-neon" aria-hidden="true" />,
              title: 'Security-first',
              description: 'Audit-ready logs, key hashing, and signed webhooks built in.',
            },
            {
              icon: <Zap className="h-5 w-5 text-cyan" aria-hidden="true" />,
              title: 'Edge scale',
              description: 'Runs on the Cloudflare edge for fast global response times.',
            },
            {
              icon: <Globe className="h-5 w-5 text-laser" aria-hidden="true" />,
              title: 'Global reach',
              description: 'Handle multi-region traffic with browser rendering on demand.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center rounded-xl border border-white/10 bg-black/20 p-6 text-center"
            >
              <div className="mb-3" aria-hidden="true">
                {item.icon}
              </div>
              <h3 className="mb-1 text-sm font-semibold">{item.title}</h3>
              <p className="text-xs text-white/50">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div className="glass scanline rounded-2xl p-8">
            <h2 className="mb-4 text-2xl font-semibold">Extraction pipeline</h2>
            <ol className="space-y-4 text-sm text-white/70">
              <li className="flex gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-neon/40 text-xs text-neon">
                  1
                </span>
                Render the target URL with Browser Rendering (Puppeteer), block heavy assets, and
                distill the main content.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-neon/40 text-xs text-neon">
                  2
                </span>
                Send condensed content into GPT-4o-mini or Claude Haiku with strict JSON output
                rules.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-neon/40 text-xs text-neon">
                  3
                </span>
                Return structured data instantly, then store snapshots + logs in D1 and R2 for
                audit.
              </li>
            </ol>
            <div className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-neon/80">
              <div>POST /extract</div>
              <div>{`{ "url": "https://...", "fields": ["price", "title"] }`}</div>
              <div className="text-white/50">→ JSON response in &lt; 5s</div>
            </div>
          </div>

          <div id="pricing" className="glass rounded-2xl p-8">
            <h2 className="mb-4 text-2xl font-semibold">Pricing</h2>
            <div className="space-y-5 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">Free</p>
                  <p>5 requests / day · GPT-4o-mini</p>
                </div>
                <span className="text-neon">$0</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neon/30 bg-white/5 p-4">
                <div>
                  <p className="text-lg font-semibold text-white">Pro</p>
                  <p>1,000 requests / day · Concurrency boost</p>
                </div>
                <span className="text-neon">$29/mo</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">Scale</p>
                  <p>Millions of pages · Affiliate routing</p>
                </div>
                <span className="text-neon">Contact</span>
              </div>
            </div>
          </div>
        </section>

        <section id="playground" className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="glass rounded-2xl p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Live playground</h2>
                <p className="text-sm text-white/60">Test with your own URL and fields.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span className="h-2 w-2 rounded-full bg-neon animate-pulse" aria-hidden="true" />
                <span>Worker online</span>
              </div>
            </div>
            <div className="space-y-5 text-sm">
              <div className="space-y-2">
                <label
                  htmlFor="target-url"
                  className="text-xs uppercase tracking-[0.3em] text-white/40"
                >
                  Target URL
                </label>
                <input
                  id="target-url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-neon/70 focus:ring-1 focus:ring-neon/30"
                  placeholder="https://example.com/product/123"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="fields-input"
                  className="text-xs uppercase tracking-[0.3em] text-white/40"
                >
                  Fields (JSON array; optional if schema)
                </label>
                <textarea
                  id="fields-input"
                  value={fields}
                  onChange={(event) => setFields(event.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-xs text-white outline-none transition focus:border-neon/70 focus:ring-1 focus:ring-neon/30"
                  placeholder='["product_name", "price", "rating"]'
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="api-key"
                  className="text-xs uppercase tracking-[0.3em] text-white/40"
                >
                  API Key (optional)
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="sk_live_..."
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-xs text-white outline-none transition focus:border-neon/70 focus:ring-1 focus:ring-neon/30"
                />
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-white/60">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">
                    Advanced controls
                  </p>
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      checked={asyncMode}
                      onChange={(event) => setAsyncMode(event.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-black/60 text-neon focus:ring-neon/50"
                    />
                    Async mode
                  </label>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                      JSON Schema (optional)
                    </label>
                    <textarea
                      value={schema}
                      onChange={(event) => setSchema(event.target.value)}
                      rows={4}
                      placeholder='{"type":"object","properties":{"price":{"type":"string"}}}'
                      className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-xs text-white outline-none transition focus:border-neon/70 focus:ring-1 focus:ring-neon/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                      Extraction instructions (optional)
                    </label>
                    <textarea
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                      rows={3}
                      placeholder="Prefer the visible price, ignore discounts."
                      className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none transition focus:border-neon/70 focus:ring-1 focus:ring-neon/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                      Webhook URL (optional)
                    </label>
                    <input
                      value={webhookUrl}
                      onChange={(event) => setWebhookUrl(event.target.value)}
                      placeholder="https://yourapp.com/webhook"
                      className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none transition focus:border-neon/70 focus:ring-1 focus:ring-neon/30"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                        Wait until
                      </label>
                      <select
                        value={waitUntil}
                        onChange={(event) =>
                          setWaitUntil(event.target.value as 'domcontentloaded' | 'networkidle0')
                        }
                        className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none"
                      >
                        <option value="domcontentloaded">DOM content loaded</option>
                        <option value="networkidle0">Network idle</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                        Timeout (ms)
                      </label>
                      <input
                        type="number"
                        min={3000}
                        max={60000}
                        value={timeoutMs}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          setTimeoutMs(Number.isFinite(nextValue) ? nextValue : 15000);
                        }}
                        className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 text-xs text-white/70">
                      <input
                        type="checkbox"
                        checked={screenshot}
                        onChange={(event) => setScreenshot(event.target.checked)}
                        className="h-4 w-4 rounded border-white/30 bg-black/60 text-neon focus:ring-neon/50"
                      />
                      Store screenshot
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/70">
                      <input
                        type="checkbox"
                        checked={storeContent}
                        onChange={(event) => setStoreContent(event.target.checked)}
                        className="h-4 w-4 rounded border-white/30 bg-black/60 text-neon focus:ring-neon/50"
                      />
                      Store distilled content
                    </label>
                  </div>
                </div>
              </div>
              <button
                onClick={handleScrape}
                disabled={loading}
                aria-busy={loading}
                className={clsx(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-neon/50',
                  loading
                    ? 'cursor-not-allowed bg-white/10 text-white/50'
                    : 'bg-neon text-black shadow-neon hover:-translate-y-0.5',
                )}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4" aria-hidden="true" />
                )}
                {loading ? 'Extracting...' : 'Run extraction'}
              </button>
              {error && (
                <p className="text-xs text-laser" role="alert">
                  {error}
                </p>
              )}
              {meta && (
                <div className="flex flex-wrap gap-4 text-xs text-white/60" aria-live="polite">
                  <span>ID: {meta.id}</span>
                  {meta.requestId ? <span>Request: {meta.requestId}</span> : null}
                  {meta.status ? <span>Status: {meta.status}</span> : null}
                  {meta.latency !== undefined ? <span>Latency: {meta.latency} ms</span> : null}
                  {meta.tokens !== undefined ? <span>Tokens: {meta.tokens}</span> : null}
                  {meta.cacheHit ? <span>Cache: hit</span> : null}
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Output stream</h3>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-white/70 transition hover:border-neon/70 hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50"
                aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
              >
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre
              className="min-h-[360px] whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-neon/80"
              role="region"
              aria-label="Extraction output"
              tabIndex={0}
            >
              {result || '// Waiting for extraction signal...'}
            </pre>
          </div>
        </section>

        <section className="glass rounded-2xl p-10 text-center">
          <h2 className="mb-4 text-3xl font-semibold">Ready to ship extraction at scale?</h2>
          <p className="mb-8 text-white/70">
            Deploy the Worker on Cloudflare, hook your product to the API, and stop babysitting
            selectors.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {['Cloudflare Workers', 'D1 Logs', 'R2 Snapshots', 'Queue Ready'].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs"
              >
                <Check className="h-3 w-3 text-neon" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
