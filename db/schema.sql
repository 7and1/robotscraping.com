-- Schema version: 2026-01-12 (v1.1) — adds cache_entries + event_logs
-- Increment version/date with each DDL change; newest entry stays at top.

-- API key management (store hashes, never raw keys)
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT UNIQUE NOT NULL,
  user_email TEXT,
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
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_created ON scrape_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_api_key ON scrape_logs(api_key_id);

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

-- Structured event logs
CREATE TABLE IF NOT EXISTS event_logs (
  id TEXT PRIMARY KEY,
  request_id TEXT,
  api_key_id TEXT,
  event_type TEXT,
  message TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_logs_created ON event_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_event_logs_request ON event_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_api_key ON event_logs(api_key_id);
