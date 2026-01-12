# Deployment

## 1) Install dependencies

```bash
npm install
```

## 2) Create D1 + R2

```bash
npx wrangler d1 create robot-db
npx wrangler d1 execute robot-db --file=./db/schema.sql

npx wrangler r2 bucket create robot-snapshots

npx wrangler queues create robot-tasks
```

Update `workers/api/wrangler.toml` with the generated `database_id`.

## Migrations

- Latest schema adds `cache_entries` (response cache) and `event_logs` (structured operational events).
- To upgrade existing environments, re-run the schema file so missing tables are created safely:

```bash
npx wrangler d1 execute robot-db --file=./db/schema.sql
```

- For future schema changes, append DDL to `db/schema.sql`, back up D1 (export or replicate), then re-run the command above in each environment.

## 3) Configure secrets

```bash
npx wrangler secret put OPENAI_API_KEY
# or
npx wrangler secret put ANTHROPIC_API_KEY

# optional (Proxy Grid fallback)
npx wrangler secret put PROXY_GRID_SECRET
```

Optionally set `AI_PROVIDER` in `wrangler.toml` to `anthropic`.
Set `WEBHOOK_SECRET` for signed webhook callbacks.
Set `PROXY_GRID_ENABLED=true` and `PROXY_GRID_BASE_URL` if using Proxy Grid fallback.
Adjust `CACHE_ENABLED` and `CACHE_TTL_MS` for response caching.

## 4) Generate an API key

```bash
npm run keygen -w workers/api
```

Insert the hash into D1 (example):

```bash
npx wrangler d1 execute robot-db --command "INSERT INTO api_keys (id, key_hash, user_email, remaining_credits, is_active, created_at) VALUES ('user_1', 'HASH_HERE', 'ops@robotscraping.com', 1000, 1, strftime('%s','now')*1000)"
```

## 5) Deploy Worker

```bash
npm run deploy -w workers/api
```

## 6) Frontend (Cloudflare Pages)

Set environment variables:

- `NEXT_PUBLIC_API_URL` = `https://api.robotscraping.com`
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` = `your-verification-code` (optional)

Build command:

```bash
npm run build -w apps/web
```

Output directory: `.next`

## 7) Verify

```bash
curl -X POST https://api.robotscraping.com/extract \
  -H 'content-type: application/json' \
  -H 'x-api-key: YOUR_KEY' \
  -d '{"url": "https://example.com", "fields": ["title"]}'
```
