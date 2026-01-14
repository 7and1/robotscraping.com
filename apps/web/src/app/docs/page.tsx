import type { Metadata } from 'next';
import Link from 'next/link';
// import { DocsStructuredData } from '../structured-data';
// import { CodeBlock } from '../../components/ui/code-block';

export const metadata: Metadata = {
  title: 'API Documentation | RobotScraping.com',
  description:
    'RobotScraping.com API documentation for extraction, jobs, schedules, and webhooks. Learn how to integrate AI-powered web scraping into your application.',
  alternates: {
    canonical: 'https://robotscraping.com/docs',
  },
  openGraph: {
    title: 'API Documentation | RobotScraping.com',
    description:
      'RobotScraping.com API documentation for extraction, jobs, schedules, and webhooks. Learn how to integrate AI-powered web scraping.',
    url: 'https://robotscraping.com/docs',
    siteName: 'RobotScraping.com',
    type: 'website',
    images: [
      {
        url: 'https://robotscraping.com/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'RobotScraping.com - API Documentation',
      },
    ],
  },
};

export default function DocsPage() {
  return (
    <div>
      {/* <DocsStructuredData /> */}
      <main
        id="main-content"
        className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white"
      >
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
              className="text-xs uppercase tracking-[0.25em] text-white/60 transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
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
            {/* <CodeBlock language="bash">{`curl -X POST https://api.robotscraping.com/extract \\ */}
            {/*   -H "content-type: application/json" \\ */}
            {/*   -H "x-api-key: YOUR_KEY" \\ */}
            {/*   -d '{"url":"https://example.com","fields":["title","price"]}'`}</CodeBlock> */}
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold">POST /extract</h2>
            <p className="mt-2 text-sm text-white/70">
              Render a page, distill content, and extract structured JSON using an LLM.
            </p>
            {/* <CodeBlock language="json">{`{ */}
            {/*   "url": "https://example.com/product/123", */}
            {/*   "fields": ["product_name", "price"], */}
            {/*   "instructions": "Prefer visible price", */}
            {/*   "options": { */}
            {/*     "screenshot": false, */}
            {/*     "storeContent": true, */}
            {/*     "waitUntil": "domcontentloaded", */}
            {/*     "timeoutMs": 15000, */}
            {/*     "proxy": { */}
            {/*       "type": "proxy_grid", */}
            {/*       "country": "us" */}
            {/*     }, */}
            {/*     "headers": { */}
            {/*       "User-Agent": "Mozilla/5.0...", */}
            {/*       "Accept-Language": "en-US" */}
            {/*     } */}
            {/*   } */}
            {/* }`}</CodeBlock> */}
            <p className="mt-4 text-xs text-white/50">
              Available proxy types: browser, proxy_grid, residential, datacenter
            </p>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Async mode</h2>
            <p className="mt-2 text-sm text-white/70">
              Send async: true to enqueue work and poll the job status.
            </p>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold">POST /batch</h2>
            <p className="mt-2 text-sm text-white/70">
              Process multiple URLs in a single request. Each URL creates an async job.
            </p>
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
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Webhooks</h2>
            <p className="mt-2 text-sm text-white/70">
              Webhooks are signed with HMAC-SHA256. Verify using the X-Robot-Signature header.
            </p>
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
    </div>
  );
}
