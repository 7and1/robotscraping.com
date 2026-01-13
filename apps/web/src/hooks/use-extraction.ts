'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Check, Copy, Loader2, Play } from 'lucide-react';
import clsx from 'clsx';

type ExtractStatus = 'idle' | 'validating' | 'fetching' | 'success' | 'error';

interface ExtractMeta {
  id?: string;
  latency?: number;
  tokens?: number;
  status?: string;
  requestId?: string;
  cacheHit?: boolean;
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
  meta: ExtractMeta | null;
  error: string;
  loading: boolean;
  handleScrape: () => Promise<void>;
}

const defaultFields = ['product_name', 'price', 'rating', 'description'];
const defaultUrl = 'https://example.com/product/123';

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
  const [meta, setMeta] = useState<ExtractMeta | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [extractStatus, setExtractStatus] = useState<ExtractStatus>('idle');

  const abortControllerRef = useRef<AbortController | null>(null);

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
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => abortRequest();
  }, [abortRequest]);

  const handleScrape = async () => {
    // Abort any existing request
    abortRequest();

    setLoading(true);
    setExtractStatus('validating');
    setError('');
    setResult('');
    setMeta(null);

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
        setExtractStatus('error');
        setError('Schema must be a valid JSON object.');
        return;
      }
    }

    if (!parsedFields && !parsedSchema) {
      setLoading(false);
      setExtractStatus('error');
      setError('Provide fields or a schema.');
      return;
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    setExtractStatus('fetching');

    try {
      const optionsPayload: Record<string, unknown> = {};
      if (screenshot) optionsPayload.screenshot = true;
      if (!storeContent) optionsPayload.storeContent = false;
      if (waitUntil !== 'domcontentloaded') optionsPayload.waitUntil = waitUntil;
      if (timeoutMs && timeoutMs !== 15000) optionsPayload.timeoutMs = timeoutMs;

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
        setExtractStatus('error');
        setError(payload?.error?.message || 'Extraction failed.');
        setResult(JSON.stringify(payload, null, 2));
        setLoading(false);
        return;
      }

      setExtractStatus('success');
      setResult(JSON.stringify(payload, null, 2));
      if (payload?.job_id) {
        setMeta({ id: payload.job_id, status: payload.status, requestId, cacheHit });
      } else {
        setMeta({
          id: payload?.meta?.id,
          latency: payload?.meta?.latencyMs,
          tokens: payload?.meta?.tokens,
          requestId,
          cacheHit,
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request cancelled.');
        return;
      }
      setExtractStatus('error');
      setError('Network error. Please try again.');
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

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
    meta,
    error,
    loading,
    handleScrape,
  };
}
