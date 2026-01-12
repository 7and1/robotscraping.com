# Operations

## Monitoring & Logs

- Use D1 `scrape_logs` to monitor usage, latency, token counts, and block rates.
- Store snapshots in R2 for debugging and audit trails.
- Add Cloudflare Analytics + Logs for request tracing.

## Cost Controls

- Tune `MAX_CONTENT_CHARS` to limit LLM tokens.
- Block heavy assets in browser rendering (images, fonts, media).
- Use `DEFAULT_SCREENSHOT=false` in production unless needed.
- Route high-volume customers to affiliate proxies.
- Enable `CACHE_ENABLED` with `CACHE_TTL_MS` to avoid repeat extractions.
- Use `PROXY_GRID_ENABLED` for fallback content on blocked targets.
- Use `PROXY_GRID_ALLOWLIST` to restrict fallback to specific API key IDs.

## Cache invalidation

- Purge cache entries when:
  - Source content changes (detected via ETag/hash drift or customer notice).
  - Schema/fields/instructions change for the same URL.
  - Security or privacy requests require removal of stored artifacts.
- Recommended TTLs (set via `CACHE_TTL_MS`):
  - Free tier: 5 minutes (300,000 ms) to reduce stale data risk.
  - Pro tier: 15 minutes (900,000 ms) balancing freshness and savings.
  - Enterprise: 60 minutes (3,600,000 ms) when customers accept longer reuse windows.
- If in doubt, purge with `DELETE FROM cache_entries WHERE cache_key = ?` and remove R2 artifacts under `cache/{key}.json`.

## Proxy Grid allowlist

- `PROXY_GRID_ALLOWLIST` accepts a comma-separated list of API key IDs permitted to use Proxy Grid fallback.
- When set, only allowlisted API key IDs can receive Proxy Grid results; others bypass fallback even if `PROXY_GRID_ENABLED=true`.
- Leave blank to allow all keys when Proxy Grid is enabled; set to an empty string to disable allowlisting.
- Example: `PROXY_GRID_ALLOWLIST="customer_a,partner_b"` in `wrangler.toml` or environment.

## Reliability

- Detect block pages (captcha/access denied) and return `blocked` errors.
- Use Cloudflare Queues for burst handling or long-running jobs.
- Keep timeouts strict to avoid worker timeouts.
- Inspect `event_logs` in D1 for cache hits and fallback events.

## Security

- Store only SHA-256 hashes of API keys in D1.
- Rotate API keys and deactivate via `is_active`.
- Disable `ALLOW_ANON` in production.
- Consider IP allowlists for enterprise keys.
- Webhooks are signed with `X-Robot-Signature` (HMAC-SHA256).

## Scaling

- Use Queues for concurrency control and isolate slow scrapes.
- Add a caching layer (R2) keyed on URL + fields for repeat requests.
- Promote higher tier models only on fallback or low-confidence extractions.

## Scheduling

- Cron triggers enqueue jobs every minute and calculate the next run with `cron-parser`.
- Store `next_run_at` in D1 to avoid missing runs.
- Keep webhook endpoints idempotent; duplicate deliveries are possible.
