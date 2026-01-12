export interface Env {
  MYBROWSER: unknown;
  DB: D1Database;
  BUCKET: R2Bucket;
  TASK_QUEUE: Queue;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  AI_PROVIDER?: string;
  OPENAI_MODEL?: string;
  ANTHROPIC_MODEL?: string;
  MAX_CONTENT_CHARS?: string;
  BROWSER_TIMEOUT_MS?: string;
  CORS_ORIGIN?: string;
  DEFAULT_SCREENSHOT?: string;
  STORE_CONTENT?: string;
  ALLOW_ANON?: string;
  WEBHOOK_SECRET?: string;
  RATE_LIMIT_ENABLED?: string;
  RATE_LIMIT_REQUESTS?: string;
  RATE_LIMIT_WINDOW_MS?: string;
  MAX_REQUEST_SIZE_MB?: string;
  ENABLE_RATE_LIMIT_HEADERS?: string;
  CACHE_ENABLED?: string;
  CACHE_TTL_MS?: string;
  PROXY_GRID_ENABLED?: string;
  PROXY_GRID_BASE_URL?: string;
  PROXY_GRID_SECRET?: string;
  PROXY_GRID_ALLOWLIST?: string;
  PROXY_GRID_FORCE?: string;
}

export interface ExtractRequest {
  url: string;
  fields?: string[];
  schema?: Record<string, unknown>;
  instructions?: string;
  async?: boolean;
  webhook_url?: string;
  webhook_secret?: string;
  format?: 'json';
  options?: {
    screenshot?: boolean;
    storeContent?: boolean;
    waitUntil?: 'domcontentloaded' | 'networkidle0';
    timeoutMs?: number;
  };
}

export interface ExtractResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
  meta: {
    id: string;
    latencyMs: number;
    tokens: number;
    blocked: boolean;
    contentChars: number;
    remainingCredits?: number | null;
    cache?: {
      hit: boolean;
      ageMs?: number;
    };
  };
}

export interface ScrapeResult {
  content: string;
  title?: string | null;
  description?: string | null;
  blocked: boolean;
  screenshot?: ArrayBuffer;
  screenshotType?: string;
}

export interface ExtractResult {
  data: Record<string, unknown>;
  usage: number;
  raw: string;
}

export interface JobMessage {
  jobId: string;
  apiKeyId: string | null;
  url: string;
  fields?: string[];
  schema?: Record<string, unknown>;
  instructions?: string;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  options?: {
    screenshot?: boolean;
    storeContent?: boolean;
    waitUntil?: 'domcontentloaded' | 'networkidle0';
    timeoutMs?: number;
  };
}

export interface JobRecord {
  id: string;
  api_key_id: string | null;
  url: string;
  status: string;
  fields_requested?: string | null;
  schema_json?: string | null;
  instructions?: string | null;
  options_json?: string | null;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  result_path?: string | null;
  error_msg?: string | null;
  token_usage?: number | null;
  latency_ms?: number | null;
  blocked?: number | null;
  created_at: number;
  started_at?: number | null;
  completed_at?: number | null;
}

export interface ScheduleRecord {
  id: string;
  api_key_id: string | null;
  url: string;
  fields_config?: string | null;
  schema_json?: string | null;
  instructions?: string | null;
  cron: string;
  webhook_url: string;
  webhook_secret?: string | null;
  is_active: number;
  next_run_at?: number | null;
  last_run_at?: number | null;
  created_at: number;
}
