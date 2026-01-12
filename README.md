# RobotScraping.com

AI-powered universal web extraction on Cloudflare Workers.

## Structure

- `workers/api` — Cloudflare Worker (Browser Rendering + LLM extraction)
- `apps/web` — Next.js marketing site + playground
- `db/schema.sql` — D1 schema
- `docs` — Architecture, API, deployment, operations

## Quickstart

```bash
npm install

# D1 + R2
npx wrangler d1 create robot-db
npx wrangler d1 execute robot-db --file=./db/schema.sql
npx wrangler r2 bucket create robot-snapshots
npx wrangler queues create robot-tasks

# Secrets
npx wrangler secret put OPENAI_API_KEY

# Deploy worker
npm run deploy -w workers/api

# Run frontend locally
npm run dev -w apps/web
```

## Docs

- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/DEPLOYMENT.md`
- `docs/OPERATIONS.md`
