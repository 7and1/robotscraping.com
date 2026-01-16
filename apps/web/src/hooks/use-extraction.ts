'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';

type ExtractStatus = 'idle' | 'validating' | 'fetching' | 'success' | 'error';
type LoadingState = 'idle' | 'debouncing' | 'loading' | 'retrying';

interface ExtractMeta {
  id?: string;
  latency?: number;
  tokens?: number;
  status?: string;
  requestId?: string;
  cacheHit?: boolean;
  retryAttempt?: number;
}

interface UseExtractionResult {
  url: string;
  setUrl: (url: string) => void;
  fields: string;
  setFields: (fields: string) => void;
  schema: string;
  setSchema: (schema: string) => void;
  instructions: string;
  setInstructions: (instructions: string) => void;
  apiKey: string;
  setApiKey: (apiKey: string) => void;
  webhookUrl: string;
  setWebhookUrl: (webhookUrl: string) => void;
  asyncMode: boolean;
  setAsyncMode: (asyncMode: boolean) => void;
  screenshot: boolean;
  setScreenshot: (screenshot: boolean) => void;
  storeContent: boolean;
  setStoreContent: (storeContent: boolean) => void;
  waitUntil: 'domcontentloaded' | 'networkidle0';
  setWaitUntil: (waitUntil: 'domcontentloaded' | 'networkidle0') => void;
  timeoutMs: number;
  setTimeoutMs: (timeoutMs: number) => void;
  result: string;
  originalContent: string;
  meta: ExtractMeta | null;
  error: string;
  loading: boolean;
  loadingState: LoadingState;
  handleScrape: () => Promise<void>;
}

const defaultFields = ['product_name', 'price', 'rating', 'description'];
const defaultUrl = 'https://example.com/product/123';

const DEBOUNCE_MS = 500;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

// Exponential backoff with jitter
function getRetryDelay(attempt: number): number {
  const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 200; // Add up to 200ms of jitter
  return exponentialDelay + jitter;
}

// Check if error is retryable
function isRetryableError(error: string): boolean {
  const lowerError = error.toLowerCase();
  const retryablePatterns = [
    'network error',
    'timeout',
    'etimedout',
    'econnreset',
    'enotfound',
    'fetch failed',
    'rate limit',
    'too many requests',
    'server error',
    '502',
    '503',
    '504',
  ];
  return retryablePatterns.some((pattern) => lowerError.includes(pattern));
}

export function useExtraction(): UseExtractionResult {
  const [url, setUrl] = useState(defaultUrl);
  const [fields, setFields] = useState(JSON.stringify(defaultFields, null, 2));
  const [schema, setSchema] = useState('');
  const [instructions, setInstructions] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [asyncMode, setAsyncMode] = useState(false);
  const [screenshot, setScreenshot] = useState(false);
  const [storeContent, setStoreContent] = useState(true);
  const [waitUntil, setWaitUntil] = useState<'domcontentloaded' | 'networkidle0'>(
    'domcontentloaded',
  );
  const [timeoutMs, setTimeoutMs] = useState(15000);
  const [result, setResult] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [meta, setMeta] = useState<ExtractMeta | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [extractStatus, setExtractStatus] = useState<ExtractStatus>('idle');
  const [retryCount, setRetryCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem('robot_api_key');
    if (stored) {
      setApiKey(stored);
    }
  }, []);

  useEffect(() => {
    if (apiKey) {
      window.localStorage.setItem('robot_api_key', apiKey);
    } else {
      window.localStorage.removeItem('robot_api_key');
    }
  }, [apiKey]);

  const endpoint = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
    return base ? `${base}/extract` : '/api/scrape';
  }, []);

  // Cleanup function for abort
  const abortRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => abortRequest();
  }, [abortRequest]);

  const performExtraction = useCallback(
    async (attempt = 0): Promise<boolean> => {
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const optionsPayload: Record<string, unknown> = {};
        if (screenshot) optionsPayload.screenshot = true;
        if (!storeContent) optionsPayload.storeContent = false;
        if (waitUntil !== 'domcontentloaded') optionsPayload.waitUntil = waitUntil;
        if (timeoutMs && timeoutMs !== 15000) optionsPayload.timeoutMs = timeoutMs;

        let parsedFields: string[] | undefined;
        let parsedSchema: Record<string, unknown> | undefined;

        try {
          if (fields.trim()) parsedFields = JSON.parse(fields);
          if (schema.trim()) parsedSchema = JSON.parse(schema);
        } catch {
          // Validation already done before calling this
        }

        const requestBody = {
          url,
          ...(parsedFields ? { fields: parsedFields } : {}),
          ...(parsedSchema ? { schema: parsedSchema } : {}),
          ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
          ...(asyncMode ? { async: true } : {}),
          ...(webhookUrl.trim() ? { webhook_url: webhookUrl.trim() } : {}),
          ...(Object.keys(optionsPayload).length ? { options: optionsPayload } : {}),
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(apiKey ? { 'x-api-key': apiKey } : {}),
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        const requestId = res.headers.get('x-request-id') || undefined;
        const cacheHit = res.headers.get('x-cache-hit') === 'true';
        const payload = await res.json();

        if (!res.ok || !payload.success) {
          const errorMessage = payload?.error?.message || 'Extraction failed.';

          // Check if we should retry
          if (attempt < MAX_RETRIES && isRetryableError(errorMessage)) {
            const delay = getRetryDelay(attempt);
            setExtractStatus('fetching');
            setError(`Retrying in ${Math.round(delay / 1000)}s... (${attempt + 1}/${MAX_RETRIES})`);

            await new Promise((resolve) => {
              retryTimeoutRef.current = setTimeout(resolve, delay);
            });

            setRetryCount(attempt + 1);
            return performExtraction(attempt + 1);
          }

          setExtractStatus('error');
          setError(errorMessage);
          setResult(JSON.stringify(payload, null, 2));
          return false;
        }

        setExtractStatus('success');
        setResult(JSON.stringify(payload, null, 2));
        setOriginalContent(payload?.content || '');
        if (payload?.job_id) {
          setMeta({
            id: payload.job_id,
            status: payload.status,
            requestId,
            cacheHit,
            retryAttempt: attempt,
          });
        } else {
          setMeta({
            id: payload?.meta?.id,
            latency: payload?.meta?.latencyMs,
            tokens: payload?.meta?.tokens,
            requestId,
            cacheHit,
            retryAttempt: attempt,
          });
        }
        return true;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request cancelled.');
          return false;
        }

        const errorMessage =
          err instanceof Error ? err.message : 'Network error. Please try again.';

        // Check if we should retry
        if (attempt < MAX_RETRIES && isRetryableError(errorMessage)) {
          const delay = getRetryDelay(attempt);
          setExtractStatus('fetching');
          setError(`Retrying in ${Math.round(delay / 1000)}s... (${attempt + 1}/${MAX_RETRIES})`);

          await new Promise((resolve) => {
            retryTimeoutRef.current = setTimeout(resolve, delay);
          });

          setRetryCount(attempt + 1);
          return performExtraction(attempt + 1);
        }

        setExtractStatus('error');
        setError(errorMessage);
        return false;
      }
    },
    [
      url,
      fields,
      schema,
      instructions,
      apiKey,
      webhookUrl,
      asyncMode,
      screenshot,
      storeContent,
      waitUntil,
      timeoutMs,
      endpoint,
    ],
  );

  const handleScrape = useCallback(async () => {
    // Abort any existing request
    abortRequest();

    setLoading(true);
    setLoadingState('debouncing');
    setExtractStatus('validating');
    setError('');
    setResult('');
    setOriginalContent('');
    setMeta(null);
    setRetryCount(0);

    // Validation phase
    let parsedFields: string[] | undefined;
    let parsedSchema: Record<string, unknown> | undefined;

    if (fields.trim()) {
      try {
        const candidate = JSON.parse(fields);
        if (!Array.isArray(candidate)) {
          throw new Error('Fields must be a JSON array.');
        }
        parsedFields = candidate;
      } catch {
        setLoading(false);
        setLoadingState('idle');
        setExtractStatus('error');
        setError('Fields must be a valid JSON array.');
        return;
      }
    }

    if (schema.trim()) {
      try {
        const candidate = JSON.parse(schema);
        if (!candidate || typeof candidate !== 'object') {
          throw new Error('Schema must be a JSON object.');
        }
        parsedSchema = candidate as Record<string, unknown>;
      } catch {
        setLoading(false);
        setLoadingState('idle');
        setExtractStatus('error');
        setError('Schema must be a valid JSON object.');
        return;
      }
    }

    if (!parsedFields && !parsedSchema) {
      setLoading(false);
      setLoadingState('idle');
      setExtractStatus('error');
      setError('Provide fields or a schema.');
      return;
    }

    // Debounce phase
    await new Promise<void>((resolve) => {
      debounceTimerRef.current = setTimeout(() => {
        setLoadingState('loading');
        setExtractStatus('fetching');
        resolve();
      }, DEBOUNCE_MS);
    });

    // Perform extraction with retry logic
    await performExtraction(0);

    setLoading(false);
    setLoadingState('idle');
  }, [fields, schema, abortRequest, performExtraction]);

  return {
    url,
    setUrl,
    fields,
    setFields,
    schema,
    setSchema,
    instructions,
    setInstructions,
    apiKey,
    setApiKey,
    webhookUrl,
    setWebhookUrl,
    asyncMode,
    setAsyncMode,
    screenshot,
    setScreenshot,
    storeContent,
    setStoreContent,
    waitUntil,
    setWaitUntil,
    timeoutMs,
    setTimeoutMs,
    result,
    originalContent,
    meta,
    error,
    loading,
    loadingState,
    handleScrape,
  };
}
