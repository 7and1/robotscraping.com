-- Schema version: 2026-01-15 (v1.3) — adds auth users/sessions, oauth states, daily usage, api_keys metadata
-- Previous: 2026-01-12 (v1.2) — adds webhook_dead_letters, idempotency_entries
-- Increment version/date with each DDL change; newest entry stays at top.

-- Auth users (GitHub-backed)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  github_id TEXT UNIQUE NOT NULL,
  github_login TEXT NOT NULL,
  github_name TEXT,
  github_email TEXT,
  github_avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'github',
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_login ON users(github_login);

-- OAuth state storage (short-lived)
CREATE TABLE IF NOT EXISTS oauth_states (
  id TEXT PRIMARY KEY,
  state_hash TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- Auth sessions (cookie-backed)
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  initial_key TEXT,
  initial_key_expires_at INTEGER,
  initial_key_consumed INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);

-- Daily usage tracking for quota enforcement
CREATE TABLE IF NOT EXISTS daily_usage (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_scope_day ON daily_usage(scope, day);
CREATE INDEX IF NOT EXISTS idx_daily_usage_expires ON daily_usage(scope, day);

-- API key management (store hashes, never raw keys)
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT,
  name TEXT,
  user_email TEXT,
  tier TEXT DEFAULT 'github',
  remaining_credits INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- Scrape logs
CREATE TABLE IF NOT EXISTS scrape_logs (
  id TEXT PRIMARY KEY,
  api_key_id TEXT,
  url TEXT,
  fields_requested TEXT,
  schema_json TEXT,
  token_usage INTEGER,
  latency_ms INTEGER,
  status TEXT,
  error TEXT,
  snapshot_key TEXT,
  content_key TEXT,
  blocked INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  retention_until INTEGER
);

CREATE INDEX IF NOT EXISTS idx_logs_created ON scrape_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_api_key ON scrape_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_logs_api_key_created ON scrape_logs(api_key_id, created_at DESC);

-- Async jobs
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  api_key_id TEXT,
  url TEXT,
  status TEXT DEFAULT 'queued',
  fields_requested TEXT,
  schema_json TEXT,
  instructions TEXT,
  options_json TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  result_path TEXT,
  error_msg TEXT,
  token_usage INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  blocked INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_api_key ON jobs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_jobs_api_key_status ON jobs(api_key_id, status);

-- Schedules (cron-based)
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  api_key_id TEXT,
  url TEXT,
  fields_config TEXT,
  schema_json TEXT,
  instructions TEXT,
  cron TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  is_active INTEGER DEFAULT 1,
  next_run_at INTEGER,
  last_run_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schedules_active ON schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedules_next_run ON schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_schedules_next_run_status ON schedules(next_run_at, status);

-- Cache entries
CREATE TABLE IF NOT EXISTS cache_entries (
  cache_key TEXT PRIMARY KEY,
  url TEXT,
  fields_json TEXT,
  schema_json TEXT,
  instructions TEXT,
  result_path TEXT,
  token_usage INTEGER DEFAULT 0,
  content_chars INTEGER DEFAULT 0,
  hit_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_hit_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_url ON cache_entries(url);
CREATE INDEX IF NOT EXISTS idx_cache_lookup ON cache_entries(cache_key, expires_at, result_path);

-- Structured event logs
CREATE TABLE IF NOT EXISTS event_logs (
  id TEXT PRIMARY KEY,
  request_id TEXT,
  api_key_id TEXT,
  event_type TEXT,
  message TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL,
  retention_until INTEGER
);

CREATE INDEX IF NOT EXISTS idx_event_logs_created ON event_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_event_logs_request ON event_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_api_key ON event_logs(api_key_id);

-- Idempotency entries for duplicate request handling
CREATE TABLE IF NOT EXISTS idempotency_entries (
  idempotency_key TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  response_body TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_entries(expires_at);

-- Webhook dead letter queue for failed webhook deliveries
CREATE TABLE IF NOT EXISTS webhook_dead_letters (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  target_url TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  error TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  failed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_dl_job ON webhook_dead_letters(job_id);
CREATE INDEX IF NOT EXISTS idx_webhook_dl_failed_at ON webhook_dead_letters(failed_at);

-- Rate limit entries for token-bucket rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_entries (
  identifier TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (identifier, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_expires ON rate_limit_entries(window_start);
