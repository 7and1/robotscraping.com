# Deployment Guide

This guide covers deploying robotscraping.com to Cloudflare Workers and Pages.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Initial Setup](#initial-setup)
- [Deployment Methods](#deployment-methods)
- [Staging Environment](#staging-environment)
- [Rollback](#rollback)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- Node.js 18+ and npm
- Cloudflare account with Workers and Pages enabled
- Cloudflare API token
- Wrangler CLI

### Installing Wrangler CLI

```bash
npm install -g wrangler
```

### Authenticating with Cloudflare

```bash
wrangler login
```

## Environment Variables

### Cloudflare Secrets

Required secrets for the API Worker:

```bash
cd workers/api

# GitHub OAuth (required for authentication)
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET

# Session security
wrangler secret put WEBHOOK_SECRET

# Optional: OpenAI API key
wrangler secret put OPENAI_API_KEY

# Optional: OpenRouter API key (default AI provider)
wrangler secret put OPENROUTER_API_KEY
```

### GitHub Actions Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret                  | Description                                             | Required |
| ----------------------- | ------------------------------------------------------- | -------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API token with Workers and Pages permissions | Yes      |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID                              | Yes      |
| `GITHUB_CLIENT_ID`      | GitHub OAuth app client ID                              | Yes      |
| `GITHUB_CLIENT_SECRET`  | GitHub OAuth app client secret                          | Yes      |

### Local Development (.dev.vars)

Create `workers/api/.dev.vars` for local development:

```bash
GITHUB_CLIENT_ID=your_dev_client_id
GITHUB_CLIENT_SECRET=your_dev_client_secret
WEBHOOK_SECRET=your_dev_webhook_secret
OPENAI_API_KEY=your_key (optional)
OPENROUTER_API_KEY=your_key (optional)
```

## Local Development

### Running the API Worker

```bash
cd workers/api
wrangler dev
```

The API will be available at `http://localhost:8787`

### Running the Frontend

```bash
cd apps/web
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Running Tests

```bash
# Run all tests
npm test

# Run worker tests only
npm run test -w workers/api

# Run frontend tests only
npm run test -w apps/web

# Run tests in watch mode
npm run test:watch -w workers/api
```

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create D1 Database

```bash
npx wrangler d1 create robot-db
npx wrangler d1 execute robot-db --file=./db/schema.sql
```

Update `workers/api/wrangler.toml` with the generated `database_id`.

### 3. Create R2 Bucket

```bash
npx wrangler r2 bucket create robot-snapshots
```

### 4. Create Queue

```bash
npx wrangler queues create robot-tasks
```

### 5. Configure Secrets

See [Environment Variables](#environment-variables) above.

### 6. Generate API Key

```bash
npm run keygen -w workers/api
```

Insert the hash into D1:

```bash
npx wrangler d1 execute robot-db --command "INSERT INTO api_keys (id, key_hash, user_email, remaining_credits, is_active, created_at) VALUES ('user_1', 'HASH_HERE', 'ops@robotscraping.com', 1000, 1, strftime('%s','now')*1000)"
```

## Deployment Methods

### Method 1: Automated Deploy Script (Recommended)

The `deploy.sh` script provides a simple way to deploy:

```bash
# Deploy to production
./deploy.sh production

# Deploy to staging
./deploy.sh staging

# Deploy to production and skip tests
./deploy.sh production --skip-tests

# Rollback production deployment
./deploy.sh production --rollback
```

### Method 2: Manual Deployment

#### Deploy API Worker

```bash
cd workers/api
wrangler deploy
```

#### Deploy Frontend to Cloudflare Pages

```bash
cd apps/web

# Build for production
npm run build
npm run build:cloudflare

# Deploy to Pages
npx wrangler pages deploy .vercel/output/static --project-name=robot-scraping-web
```

### Method 3: GitHub Actions (CI/CD)

Deployments are automatically triggered:

- **Production**: Push to `main` branch
- **Staging**: Push to `develop` or `staging` branch

You can also trigger manual deployments from the Actions tab in GitHub with options to:

- Skip tests
- Rollback to previous version

## Staging Environment

The staging environment allows you to test changes before production.

### Setting Up Staging

Create a staging environment in your `wrangler.toml`:

```toml
[env.staging]
name = "robot-scraping-core-staging"
vars = { ENVIRONMENT = "staging" }

[[env.staging.d1_databases]]
binding = "DB"
database_name = "robot-db-staging"
database_id = "your-staging-database-id"
```

### Staging URLs

- Worker: `https://robot-scraping-core-staging.workers.dev`
- Frontend: Available in Cloudflare Pages dashboard

## Rollback

### Automatic Rollback

```bash
# Rollback production
./deploy.sh production --rollback

# Rollback staging
./deploy.sh staging --rollback
```

### Manual Rollback via Wrangler

```bash
# List versions
wrangler versions list --name robot-scraping-core

# Rollback to previous version
wrangler versions rollback --name robot-scraping-core
```

### Rollback via GitHub Actions

1. Go to Actions tab in GitHub
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Check the "Rollback to previous version" option

## Troubleshooting

### Build Failures

**Issue**: Build fails with TypeScript errors

**Solution**:

```bash
# Check for type errors locally
npm run build -w apps/web
npm run build -w workers/api
```

### Deployment Failures

**Issue**: "Authentication error" when deploying

**Solution**:

```bash
wrangler logout
wrangler login
```

**Issue**: "Project not found" error

**Solution**: Ensure the project exists in Cloudflare. For first-time deployment:

```bash
wrangler pages project create robot-scraping-web
```

### Database Issues

**Issue**: D1 database connection errors

**Solution**:

```bash
# List your databases
wrangler d1 list

# Create database if needed
wrangler d1 create robot-db

# Update database_id in wrangler.toml
```

### Migrations

Latest schema adds `cache_entries` (response cache) and `event_logs` (structured operational events).

To upgrade existing environments:

```bash
npx wrangler d1 execute robot-db --file=./db/schema.sql
```

For future schema changes:

1. Append DDL to `db/schema.sql`
2. Back up D1 (export or replicate)
3. Re-run the command above in each environment

### Test Failures in CI

**Issue**: Tests pass locally but fail in CI

**Solution**: Check Node.js version matches locally. CI uses Node.js 20.

### Environment Variables Not Available

**Issue**: Secrets not available in deployed worker

**Solution**:

```bash
# Verify secrets are set
wrangler secret list

# Re-add missing secrets
wrangler secret put SECRET_NAME
```

### Frontend Not Connecting to API

**Issue**: API requests fail from frontend

**Solution**:

1. Check CORS settings in worker configuration
2. Verify `NEXT_PUBLIC_API_URL` environment variable
3. Check worker is deployed and accessible

## Monitoring

### Viewing Logs

```bash
# Tail worker logs in real-time
wrangler tail

# View logs for specific worker
wrangler tail --name robot-scraping-core
```

### Health Check

Production endpoint: `https://robot-scraping-core.butterflywork.workers.dev/health`

### Analytics

View analytics in Cloudflare dashboard:

- Workers: Analytics > Workers
- Pages: Analytics > Pages

## Security Best Practices

1. **Never commit secrets** - Use environment variables and Cloudflare secrets
2. **Rotate API keys** regularly
3. **Use different secrets** for staging and production
4. **Enable 2FA** on Cloudflare account
5. **Review deployment logs** for suspicious activity
6. **Keep dependencies updated**: `npm audit fix`

## Support

For deployment issues:

1. Check Cloudflare status page
2. Review worker logs: `wrangler tail`
3. Check GitHub Actions logs for CI/CD issues
4. Review this documentation's troubleshooting section
