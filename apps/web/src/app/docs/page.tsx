import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Docs',
  description: 'RobotScraping.com API documentation for extraction, jobs, schedules, and webhooks.',
};

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">API Docs</p>
            <h1 className="mt-3 text-3xl font-semibold">RobotScraping.com API</h1>
            <p className="mt-2 text-sm text-white/60">
              Production-grade extraction endpoints for synchronous and asynchronous scraping.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.25em] text-white/60 transition hover:text-neon"
          >
            Back to home
          </Link>
        </header>

        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Quickstart</h2>
          <div className="mt-4 space-y-2 text-xs text-white/70">
            <p>Base URL: https://api.robotscraping.com</p>
            <p>Authenticate with the x-api-key header.</p>
          </div>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-neon/80">
            {`curl -X POST https://api.robotscraping.com/extract \\
  -H "content-type: application/json" \\
  -H "x-api-key: YOUR_KEY" \\
  -d '{"url":"https://example.com","fields":["title","price"]}'`}
          </pre>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">POST /extract</h2>
          <p className="mt-2 text-sm text-white/70">
            Render a page, distill content, and extract structured JSON using an LLM.
          </p>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-neon/80">
            {`{
  "url": "https://example.com/product/123",
  "fields": ["product_name", "price"],
  "instructions": "Prefer visible price",
  "options": {
    "screenshot": false,
    "storeContent": true,
    "waitUntil": "domcontentloaded",
    "timeoutMs": 15000
  }
}`}
          </pre>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Async mode</h2>
          <p className="mt-2 text-sm text-white/70">
            Send async: true to enqueue work and poll the job status.
          </p>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-neon/80">
            {`{
  "url": "https://example.com",
  "fields": ["title"],
  "async": true,
  "webhook_url": "https://yourapp.com/webhook"
}`}
          </pre>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Jobs</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>GET /jobs — list recent jobs</li>
            <li>GET /jobs/:id — fetch job status</li>
            <li>GET /jobs/:id/result — download stored JSON</li>
          </ul>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Schedules</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>POST /schedules — create a cron schedule</li>
            <li>GET /schedules — list schedules for the API key</li>
            <li>PATCH /schedules/:id — pause/resume or update cron/webhook</li>
          </ul>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Usage</h2>
          <p className="mt-2 text-sm text-white/70">
            Use GET /usage to pull summary, recent logs, and daily series for the API key. Use GET
            /usage/export to download CSV exports.
          </p>
          <div className="mt-4 space-y-2 text-sm text-white/70">
            <p className="font-semibold text-white">CSV export example (log compliance)</p>
            <p className="text-xs text-white/60">
              Headers: id, url, status, token_usage, latency_ms, created_at
            </p>
          </div>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-neon/80">
            {`id,url,status,token_usage,latency_ms,created_at
job_9f2c,https://example.com/product/123,success,1423,3100,1716576000123
job_a1b4,https://blocked.example.com,blocked,0,2200,1716576123456
job_ce77,https://example.com/blog/foo,cached,980,1800,1716576400789`}
          </pre>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="mt-2 text-sm text-white/70">
            Webhooks are signed with HMAC-SHA256. Verify using the X-Robot-Signature header.
          </p>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-neon/80">
            {`X-Robot-Signature: <hex>
X-Robot-Event: job.completed | job.failed | job.blocked`}
          </pre>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Error codes</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>bad_request — invalid payload or missing fields/schema</li>
            <li>missing | invalid | inactive — API key errors</li>
            <li>insufficient_credits — out of credits</li>
            <li>blocked — target site blocked rendering</li>
            <li>server_error — extraction failed</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
