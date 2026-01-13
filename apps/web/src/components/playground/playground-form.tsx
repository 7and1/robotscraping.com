'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Play, ChevronDown, Code2 } from 'lucide-react';
import clsx from 'clsx';

interface ExtractMeta {
  id?: string;
  latency?: number;
  tokens?: number;
  status?: string;
  requestId?: string;
  cacheHit?: boolean;
}

interface PlaygroundFormProps {
  extraction: {
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
    meta: ExtractMeta | null;
    error: string;
    loading: boolean;
    handleScrape: () => Promise<void>;
  };
}

const presetTemplates = [
  {
    id: 'ecommerce',
    label: 'E-commerce Product',
    url: 'https://example.com/product/123',
    fields: '["product_name", "price", "rating", "availability", "image_url"]',
    instructions: 'Extract the main product price, ignore sale prices if original price is shown.',
  },
  {
    id: 'news',
    label: 'News Article',
    url: 'https://example.com/news/article',
    fields: '["headline", "author", "published_date", "content", "tags"]',
    instructions: 'Extract the main article headline, byline, and publication date.',
  },
  {
    id: 'blog',
    label: 'Blog Post',
    url: 'https://example.com/blog/post',
    fields: '["title", "author", "date", "excerpt", "categories"]',
    instructions: 'Extract the blog post title, author name, and publish date.',
  },
  {
    id: 'social',
    label: 'Social Media Post',
    url: 'https://example.com/post/123',
    fields: '["username", "content", "likes", "shares", "timestamp"]',
    instructions: 'Extract the post content, engagement metrics, and timestamp.',
  },
];

const getErrorSuggestion = (error: string): string | null => {
  const lowerError = error.toLowerCase();
  if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
    return 'Try increasing the timeout or using "networkidle" wait mode.';
  }
  if (
    lowerError.includes('blocked') ||
    lowerError.includes('403') ||
    lowerError.includes('captcha')
  ) {
    return 'The site may be blocking automated requests. Try a different URL.';
  }
  if (lowerError.includes('invalid') && lowerError.includes('api key')) {
    return 'Check your API key or try without one for the free tier.';
  }
  if (lowerError.includes('rate limit') || lowerError.includes('too many requests')) {
    return 'You have exceeded the rate limit. Please wait a moment before trying again.';
  }
  if (lowerError.includes('not found') || lowerError.includes('404')) {
    return 'The URL may be incorrect or the page may not exist.';
  }
  return null;
};

// Validation helpers
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidJsonArray = (str: string): boolean => {
  if (!str.trim()) return true; // Empty is valid (optional field)
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed);
  } catch {
    return false;
  }
};

export function PlaygroundForm({ extraction }: PlaygroundFormProps) {
  const {
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
    meta,
    error,
    loading,
    handleScrape,
  } = extraction;

  const [showPresets, setShowPresets] = useState(false);
  const [showCodeSnippets, setShowCodeSnippets] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'python' | 'node'>('curl');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const presetsButtonRef = useRef<HTMLButtonElement>(null);
  const presetsDropdownRef = useRef<HTMLDivElement>(null);
  const codeSnippetsButtonRef = useRef<HTMLButtonElement>(null);

  // Close dropdowns on Escape key or click outside
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowPresets(false);
        setShowCodeSnippets(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        presetsDropdownRef.current &&
        !presetsDropdownRef.current.contains(event.target as Node) &&
        !presetsButtonRef.current?.contains(event.target as Node)
      ) {
        setShowPresets(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Return focus to button when closing dropdowns
  useEffect(() => {
    if (!showPresets && presetsButtonRef.current) {
      presetsButtonRef.current.focus();
    }
  }, [showPresets]);

  const copyCodeToClipboard = useCallback(async () => {
    const code = getCodeSnippet();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Silently fail if clipboard is not available
    }
  }, [codeLanguage]);

  const applyPreset = (preset: (typeof presetTemplates)[number]) => {
    setUrl(preset.url);
    setFields(preset.fields);
    setInstructions(preset.instructions);
    setShowPresets(false);
  };

  const generateCurl = () => {
    const fieldsJson = fields.trim() ? fields : '["title"]';
    return `curl -X POST https://api.robotscraping.com/extract \\
  -H "content-type: application/json" \\
  ${apiKey ? `-H "x-api-key: ${apiKey}" \\` : ''}
  -d '{
    "url": "${url}",
    "fields": ${fieldsJson}${
      instructions.trim()
        ? `,
    "instructions": "${instructions}"`
        : ''
    }${
      asyncMode
        ? `,
    "async": true${
      webhookUrl
        ? `,
    "webhook_url": "${webhookUrl}"`
        : ''
    }`
        : ''
    }
  }'`;
  };

  const generatePython = () => {
    const fieldsJson = fields.trim() ? fields : '["title"]';
    return `import requests

response = requests.post(
    "https://api.robotscraping.com/extract",
    headers={
        "Content-Type": "application/json"${
          apiKey
            ? `,
        "x-api-key": "${apiKey}"`
            : ''
        }
    },
    json={
        "url": "${url}",
        "fields": ${fieldsJson}${
          instructions.trim()
            ? `,
        "instructions": "${instructions}"`
            : ''
        }${
          asyncMode
            ? `,
        "async": True${
          webhookUrl
            ? `,
        "webhook_url": "${webhookUrl}"`
            : ''
        }`
            : ''
        }
    }
)

print(response.json())`;
  };

  const generateNode = () => {
    const fieldsJson = fields.trim() ? fields : '["title"]';
    return `const response = await fetch('https://api.robotscraping.com/extract', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'${
      apiKey
        ? `,
    'x-api-key': '${apiKey}'`
        : ''
    }
  },
  body: JSON.stringify({
    url: '${url}',
    fields: ${fieldsJson}${
      instructions.trim()
        ? `,
    instructions: '${instructions}'`
        : ''
    }${
      asyncMode
        ? `,
    async: true${
      webhookUrl
        ? `,
    webhook_url: '${webhookUrl}'`
        : ''
    }`
        : ''
    }
  })
});

const data = await response.json();
console.log(data);`;
  };

  const getCodeSnippet = () => {
    switch (codeLanguage) {
      case 'python':
        return generatePython();
      case 'node':
        return generateNode();
      default:
        return generateCurl();
    }
  };

  const errorSuggestion = error ? getErrorSuggestion(error) : null;

  return (
    <div className="glass rounded-2xl p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Live playground</h2>
          <p className="text-sm text-white/60">Test with your own URL and fields.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              ref={presetsButtonRef}
              onClick={() => setShowPresets(!showPresets)}
              aria-expanded={showPresets}
              aria-haspopup="listbox"
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:border-neon/60 hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50"
            >
              <Code2 className="h-4 w-4" aria-hidden="true" />
              Templates
              <ChevronDown
                className={clsx('h-4 w-4 transition-transform', showPresets && 'rotate-180')}
                aria-hidden="true"
              />
            </button>
            {showPresets && (
              <div
                ref={presetsDropdownRef}
                role="listbox"
                className="absolute right-0 top-full z-10 mt-2 w-56 rounded-xl border border-white/20 bg-black/95 p-2 shadow-xl"
              >
                {presetTemplates.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    role="option"
                    className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/70 transition hover:bg-white/10 hover:text-neon focus:outline-none focus:bg-white/10"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="h-2 w-2 rounded-full bg-neon animate-pulse" aria-hidden="true" />
            <span>Worker online</span>
          </div>
        </div>
      </div>
      <div className="space-y-5 text-sm">
        <div className="space-y-2">
          <label htmlFor="target-url" className="text-xs uppercase tracking-[0.3em] text-white/40">
            Target URL
          </label>
          <input
            id="target-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-neon/70 focus:ring-1 focus:ring-neon/30"
            placeholder="https://example.com/product/123"
            autoComplete="url"
            aria-invalid={url && !isValidUrl(url) ? 'true' : 'false'}
            aria-describedby={url && !isValidUrl(url) ? 'url-error' : undefined}
          />
          {url && !isValidUrl(url) && (
            <p id="url-error" className="text-xs text-laser" role="alert">
              Please enter a valid URL (e.g., https://example.com)
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label
            htmlFor="fields-input"
            className="text-xs uppercase tracking-[0.3em] text-white/40"
          >
            Fields (JSON array; optional if schema)
          </label>
          <textarea
            id="fields-input"
            value={fields}
            onChange={(event) => setFields(event.target.value)}
            rows={6}
            className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-xs text-white outline-none transition focus:border-neon/70 focus:ring-1 focus:ring-neon/30"
            placeholder='["product_name", "price", "rating"]'
            aria-invalid={fields && !isValidJsonArray(fields) ? 'true' : 'false'}
            aria-describedby={fields && !isValidJsonArray(fields) ? 'fields-error' : undefined}
          />
          {fields && !isValidJsonArray(fields) && (
            <p id="fields-error" className="text-xs text-laser" role="alert">
              Fields must be a valid JSON array (e.g., ["title", "price"])
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="api-key" className="text-xs uppercase tracking-[0.3em] text-white/40">
            API Key (optional)
          </label>
          <div className="relative">
            <input
              id="api-key"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk_live_..."
              className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-xs text-white outline-none transition focus:border-neon/70 focus:ring-1 focus:ring-neon/30 pr-20"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-neon transition focus:outline-none focus:ring-2 focus:ring-neon/50 rounded px-2 py-1"
              aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <AdvancedControls
          schema={schema}
          setSchema={setSchema}
          instructions={instructions}
          setInstructions={setInstructions}
          webhookUrl={webhookUrl}
          setWebhookUrl={setWebhookUrl}
          asyncMode={asyncMode}
          setAsyncMode={setAsyncMode}
          screenshot={screenshot}
          setScreenshot={setScreenshot}
          storeContent={storeContent}
          setStoreContent={setStoreContent}
          waitUntil={waitUntil}
          setWaitUntil={setWaitUntil}
          timeoutMs={timeoutMs}
          setTimeoutMs={setTimeoutMs}
        />
        <button
          onClick={handleScrape}
          disabled={loading}
          aria-busy={loading}
          className={clsx(
            'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-neon/50',
            loading
              ? 'cursor-not-allowed bg-white/10 text-white/50'
              : 'bg-neon text-black shadow-neon hover:-translate-y-0.5',
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {loading ? 'Extracting...' : 'Run extraction'}
        </button>
        {error && (
          <div className="rounded-xl border border-laser/30 bg-laser/10 p-3" role="alert">
            <p className="text-xs text-laser">{error}</p>
            {errorSuggestion && (
              <p className="mt-2 text-xs text-white/70">
                <span className="font-semibold">Suggestion:</span> {errorSuggestion}
              </p>
            )}
          </div>
        )}
        {meta && (
          <div className="flex flex-wrap gap-4 text-xs text-white/60" aria-live="polite">
            <span>ID: {meta.id}</span>
            {meta.requestId ? <span>Request: {meta.requestId}</span> : null}
            {meta.status ? <span>Status: {meta.status}</span> : null}
            {meta.latency !== undefined ? <span>Latency: {meta.latency} ms</span> : null}
            {meta.tokens !== undefined ? <span>Tokens: {meta.tokens}</span> : null}
            {meta.cacheHit ? <span>Cache: hit</span> : null}
          </div>
        )}
      </div>

      {/* Code Snippets */}
      {url && (
        <div className="mt-6 border-t border-white/10 pt-6">
          <button
            ref={codeSnippetsButtonRef}
            onClick={() => setShowCodeSnippets(!showCodeSnippets)}
            aria-expanded={showCodeSnippets}
            className="flex items-center gap-2 text-xs text-white/60 transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
          >
            <Code2 className="h-4 w-4" aria-hidden="true" />
            {showCodeSnippets ? 'Hide' : 'Show'} code snippets
            <ChevronDown
              className={clsx('h-4 w-4 transition-transform', showCodeSnippets && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
          {showCodeSnippets && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div role="tablist" className="flex gap-2">
                  {(['curl', 'python', 'node'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeLanguage(lang)}
                      role="tab"
                      aria-selected={codeLanguage === lang}
                      className={clsx(
                        'rounded-lg px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-neon/50',
                        codeLanguage === lang
                          ? 'bg-neon text-black'
                          : 'bg-white/5 text-white/60 hover:bg-white/10',
                      )}
                    >
                      {lang === 'node' ? 'Node.js' : lang === 'python' ? 'Python' : 'cURL'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={copyCodeToClipboard}
                  aria-label={copiedCode ? 'Code copied to clipboard' : 'Copy code to clipboard'}
                  className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/60 transition hover:border-neon/60 hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50"
                >
                  {copiedCode ? 'Copied!' : 'Copy code'}
                </button>
              </div>
              <pre
                className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-neon/80"
                role="tabpanel"
                aria-label={`${codeLanguage} code snippet`}
              >
                {getCodeSnippet()}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AdvancedControlsProps {
  schema: string;
  setSchema: (schema: string) => void;
  instructions: string;
  setInstructions: (instructions: string) => void;
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
}

function AdvancedControls({
  schema,
  setSchema,
  instructions,
  setInstructions,
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
}: AdvancedControlsProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-white/60">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">Advanced controls</p>
        <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
          <input
            type="checkbox"
            checked={asyncMode}
            onChange={(event) => setAsyncMode(event.target.checked)}
            className="h-4 w-4 rounded border-white/30 bg-black/60 text-neon focus:ring-neon/50 focus:ring-2 focus:ring-offset-2 focus:ring-offset-black"
          />
          <span>Async mode</span>
        </label>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">
            JSON Schema (optional)
          </label>
          <textarea
            value={schema}
            onChange={(event) => setSchema(event.target.value)}
            rows={4}
            placeholder='{"type":"object","properties":{"price":{"type":"string"}}}'
            className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-xs text-white outline-none transition focus:border-neon/70 focus:ring-1 focus:ring-neon/30"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">
            Extraction instructions (optional)
          </label>
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={3}
            placeholder="Prefer the visible price, ignore discounts."
            className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none transition focus:border-neon/70 focus:ring-1 focus:ring-neon/30"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">
            Webhook URL (optional)
          </label>
          <input
            value={webhookUrl}
            onChange={(event) => setWebhookUrl(event.target.value)}
            placeholder="https://yourapp.com/webhook"
            className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none transition focus:border-neon/70 focus:ring-1 focus:ring-neon/30"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">
              Wait until
            </label>
            <select
              value={waitUntil}
              onChange={(event) =>
                setWaitUntil(event.target.value as 'domcontentloaded' | 'networkidle0')
              }
              className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none"
            >
              <option value="domcontentloaded">DOM content loaded</option>
              <option value="networkidle0">Network idle</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">
              Timeout (ms)
            </label>
            <input
              type="number"
              min={3000}
              max={60000}
              value={timeoutMs}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setTimeoutMs(Number.isFinite(nextValue) ? nextValue : 15000);
              }}
              className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-white outline-none"
            />
          </div>
        </div>
        <fieldset className="flex flex-wrap gap-6">
          <legend className="sr-only">Storage options</legend>
          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={screenshot}
              onChange={(event) => setScreenshot(event.target.checked)}
              className="h-4 w-4 rounded border-white/30 bg-black/60 text-neon focus:ring-neon/50 focus:ring-2 focus:ring-offset-2 focus:ring-offset-black"
            />
            <span>Store screenshot</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={storeContent}
              onChange={(event) => setStoreContent(event.target.checked)}
              className="h-4 w-4 rounded border-white/30 bg-black/60 text-neon focus:ring-neon/50 focus:ring-2 focus:ring-offset-2 focus:ring-offset-black"
            />
            <span>Store distilled content</span>
          </label>
        </fieldset>
      </div>
    </div>
  );
}
