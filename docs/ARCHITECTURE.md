# Architecture

RobotScraping.com is a Cloudflare-native, AI-powered extraction service. The core flow is:

1. Client sends `POST /extract` with a URL + fields/schema.
2. Cloudflare Browser Rendering loads the page and distills main content.
3. LLM extracts the requested fields into strict JSON.
4. Results return instantly; snapshots + logs are written to R2 and D1.
5. Optional: Proxy Grid fallback can supply markdown/screenshot if rendering is blocked.

## Components

- **Workers API** (`workers/api`)
  - HTTP routing, auth, validation, and orchestration.
  - Browser Rendering (Puppeteer) for dynamic pages.
  - LLM extraction (OpenAI or Anthropic).
  - Cloudflare Queues for async job processing.
  - Cron triggers for scheduled extraction.
  - D1 logs + R2 artifacts + job state tracking.

- **D1** (`db/schema.sql`)
  - API keys (hashed) with credit tracking.
  - Request logs for usage + billing.

- **R2**
  - Optional screenshots and distilled content snapshots.
  - Cached extraction payloads (keyed by URL + fields/schema).

- **Next.js Frontend** (`apps/web`)
  - Marketing + playground UI.
  - Optional proxy route (`/api/scrape`) to the Worker.
  - Usage dashboard view (`/usage`).

## Data Flow

```
Client -> /extract
  -> (sync) Browser Rendering -> LLM -> JSON response
  -> (async) create job -> Queue -> Worker consumer -> R2 result + D1 logs
```

## Design Goals

- Low-latency extraction via edge workers.
- Minimal token usage by content distillation.
- Robust to layout changes (AI extraction vs CSS selectors).
- Auditability via D1 + R2.
- Async mode for heavy pages and high throughput.
