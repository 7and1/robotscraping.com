# API

## Base URL

- Production (example): `https://api.robotscraping.com`

## Authentication

Provide your API key in the `x-api-key` header.

## POST /extract

### Request Body

```json
{
  "url": "https://example.com/product/123",
  "fields": ["product_name", "price", "rating"],
  "instructions": "Prefer the visible price, ignore discount text.",
  "async": false,
  "options": {
    "screenshot": false,
    "storeContent": true,
    "waitUntil": "domcontentloaded",
    "timeoutMs": 15000
  }
}
```

### Response

```json
{
  "success": true,
  "data": {
    "product_name": "Example Widget",
    "price": "$19.99",
    "rating": "4.8"
  },
  "meta": {
    "id": "uuid",
    "latencyMs": 3200,
    "tokens": 932,
    "blocked": false,
    "contentChars": 12034,
    "remainingCredits": 998,
    "cache": {
      "hit": false,
      "ageMs": 0
    }
  }
}
```

### Error Codes

- `bad_request` — invalid payload or missing fields/schema.
- `missing` / `invalid` / `inactive` — API key errors.
- `insufficient_credits` — no remaining credits.
- `blocked` — target site blocked rendering.
- `server_error` — extraction failed.

### Notes

- Use `fields` (array of strings) or `schema` (JSON schema object).
- `options.screenshot` stores a compressed webp in R2.
- `options.storeContent` stores distilled text content in R2.
- Responses include `X-Request-ID` and `X-Cache-Hit` headers.

## Async mode

Send `"async": true` to enqueue a job and return immediately.

```json
{
  "url": "https://example.com",
  "fields": ["title", "price"],
  "async": true,
  "webhook_url": "https://yourapp.com/webhook",
  "webhook_secret": "optional-secret"
}
```

Response:

```json
{
  "success": true,
  "job_id": "uuid",
  "status": "queued",
  "status_url": "https://api.robotscraping.com/jobs/uuid"
}
```

## GET /jobs

List recent jobs.

## GET /jobs/:id

Fetch job status and metadata.

### Job status values

`queued`, `processing`, `completed`, `failed`, `blocked`

## GET /usage

Returns usage summary, recent logs, and daily series for the API key.

Query params:

- `range` (default `7d`, supports `24h`, `7d`, `30d`)
- or `from` / `to` (epoch ms)

## GET /usage/export

Download a CSV export of scrape logs for the API key.

Query params:

- `range` (default `7d`, supports `24h`, `7d`, `30d`)
- or `from` / `to` (epoch ms)
- `limit` (default `500`, max `5000`)

### CSV export example (log compliance)

**Headers**: `id,url,status,token_usage,latency_ms,created_at`

**Sample rows** (epoch ms timestamps):

```
id,url,status,token_usage,latency_ms,created_at
job_9f2c,https://example.com/product/123,success,1423,3100,1716576000123
job_a1b4,https://blocked.example.com,blocked,0,2200,1716576123456
job_ce77,https://example.com/blog/foo,cached,980,1800,1716576400789
```

Use this export for audit/compliance pipelines; ingest as RFC4180 CSV and treat `created_at` as milliseconds since Unix epoch.

## GET /jobs/:id/result

Download the stored JSON result from R2.

## POST /schedules

Create a recurring schedule.

```json
{
  "url": "https://example.com",
  "fields": ["title", "price"],
  "cron": "0 9 * * *",
  "webhook_url": "https://yourapp.com/webhook"
}
```

## GET /schedules

List schedules for the API key.

## PATCH /schedules/:id

Pause/resume or update a schedule (cron, webhook, fields).

## POST /webhook/test

Sends a signed test payload to the provided URL.

### Webhook signature

All webhooks include:

- `X-Robot-Signature`: HMAC-SHA256 hex signature of the JSON body
- `X-Robot-Event`: `job.completed`, `job.failed`, or `job.blocked`
