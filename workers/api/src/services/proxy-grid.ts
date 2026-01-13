import type { ScrapeResult } from '../types';

export type ProxyGridServiceType =
  | 'google'
  | 'bing'
  | 'youtube'
  | 'youtube_info'
  | 'youtube_serp'
  | 'similarweb'
  | 'web2md'
  | 'screenshot'
  | 'hackernews'
  | 'reddit'
  | 'twitter'
  | 'instagram'
  | 'tiktok'
  | 'amazon'
  | 'crunchbase';

interface ProxyGridConfig {
  enabled: boolean;
  baseUrl: string;
  secret: string;
  allowlist: Set<string> | null;
  force: boolean;
}

interface ProxyGridWeb2MdResponse {
  status?: number;
  url?: string;
  title?: string;
  markdown?: string;
  provider?: string;
}

interface ProxyGridScreenshotResponse {
  status?: number;
  url?: string;
  image?: string;
  contentType?: string;
  width?: number;
  height?: number;
  provider?: string;
}

interface ProxyGridSearchResponse {
  status?: number;
  results?: Array<{
    title?: string;
    url?: string;
    snippet?: string;
    position?: number;
  }>;
  provider?: string;
}

interface ProxyGridYouTubeInfoResponse {
  status?: number;
  title?: string;
  description?: string;
  views?: string;
  duration?: string;
  uploadDate?: string;
  channel?: string;
  transcript?: string;
}

interface ProxyGridGenericResponse {
  status?: number;
  data?: Record<string, unknown>;
  markdown?: string;
  title?: string;
  provider?: string;
}

export function getProxyGridConfig(env: {
  PROXY_GRID_ENABLED?: string;
  PROXY_GRID_BASE_URL?: string;
  PROXY_GRID_SECRET?: string;
  PROXY_GRID_ALLOWLIST?: string;
  PROXY_GRID_FORCE?: string;
}): ProxyGridConfig {
  const enabled = env.PROXY_GRID_ENABLED === 'true';
  const baseUrl = env.PROXY_GRID_BASE_URL || 'http://google.savedimage.com';
  const secret = env.PROXY_GRID_SECRET || '';
  const allowlist = parseAllowlist(env.PROXY_GRID_ALLOWLIST);
  const force = env.PROXY_GRID_FORCE === 'true';
  return {
    enabled: enabled && Boolean(secret),
    baseUrl,
    secret,
    allowlist,
    force,
  };
}

export function isProxyGridAllowed(config: ProxyGridConfig, apiKeyId?: string | null): boolean {
  if (!config.enabled) {
    return false;
  }
  if (!config.allowlist) {
    return true;
  }
  if (!apiKeyId) {
    return false;
  }
  return config.allowlist.has(apiKeyId);
}

export async function fetchProxyGridFallback(options: {
  config: ProxyGridConfig;
  url: string;
  maxContentChars: number;
  screenshot: boolean;
}): Promise<{ result: ScrapeResult; provider?: string } | null> {
  const { config, url, maxContentChars, screenshot } = options;
  const endpoint = `${config.baseUrl.replace(/\/$/, '')}/api/search`;

  const web2md = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-grid-secret': config.secret,
    },
    body: JSON.stringify({ type: 'web2md', url, ...(config.force ? { force: true } : {}) }),
  });

  if (!web2md.ok) {
    return null;
  }

  const web2mdJson = (await web2md.json()) as ProxyGridWeb2MdResponse;
  if (!web2mdJson.markdown) {
    return null;
  }

  const content = web2mdJson.markdown.slice(0, maxContentChars);
  let screenshotBuffer: ArrayBuffer | undefined;
  let screenshotType: string | undefined;

  if (screenshot) {
    const shot = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-grid-secret': config.secret,
      },
      body: JSON.stringify({ type: 'screenshot', url, ...(config.force ? { force: true } : {}) }),
    });

    if (shot.ok) {
      const shotJson = (await shot.json()) as ProxyGridScreenshotResponse;
      if (shotJson.image) {
        screenshotBuffer = decodeBase64(shotJson.image);
        screenshotType = shotJson.contentType || 'image/png';
      }
    }
  }

  return {
    result: {
      content,
      title: web2mdJson.title || null,
      description: null,
      blocked: false,
      screenshot: screenshotBuffer,
      screenshotType,
    },
    provider: web2mdJson.provider,
  };
}

/**
 * Generic Proxy Grid API request for all supported service types
 */
export async function fetchProxyGridService(options: {
  config: ProxyGridConfig;
  type: ProxyGridServiceType;
  query: string;
  force?: boolean;
}): Promise<{ data: Record<string, unknown>; provider?: string } | null> {
  const { config, type, query, force } = options;
  const endpoint = `${config.baseUrl.replace(/\/$/, '')}/api/search`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-grid-secret': config.secret,
    },
    body: JSON.stringify({
      type,
      query,
      ...(force || config.force ? { force: true } : {}),
    }),
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as ProxyGridGenericResponse;
  if (!json.data && !json.markdown) {
    return null;
  }

  return {
    data: (json.data as Record<string, unknown>) || { markdown: json.markdown, title: json.title },
    provider: json.provider,
  };
}

/**
 * Google SERP via Proxy Grid
 */
export async function fetchGoogleSerp(options: {
  config: ProxyGridConfig;
  query: string;
  force?: boolean;
}): Promise<{
  results: Array<{ title: string; url: string; snippet: string }>;
  provider?: string;
} | null> {
  const response = await fetchProxyGridService({ ...options, type: 'google' });
  if (!response?.data.results || !Array.isArray(response.data.results)) {
    return null;
  }
  return {
    results: response.data.results as Array<{ title: string; url: string; snippet: string }>,
    provider: response.provider,
  };
}

/**
 * YouTube transcript via Proxy Grid
 */
export async function fetchYouTubeTranscript(options: {
  config: ProxyGridConfig;
  videoId: string;
  force?: boolean;
}): Promise<{ transcript: string; title?: string; provider?: string } | null> {
  const response = await fetchProxyGridService({
    ...options,
    type: 'youtube',
    query: options.videoId,
  });
  if (!response?.data) {
    return null;
  }
  return {
    transcript: (response.data.markdown as string) || '',
    title: response.data.title as string | undefined,
    provider: response.provider,
  };
}

/**
 * YouTube video info via Proxy Grid
 */
export async function fetchYouTubeInfo(options: {
  config: ProxyGridConfig;
  videoId: string;
  force?: boolean;
}): Promise<{ data: Record<string, unknown>; provider?: string } | null> {
  return fetchProxyGridService({ ...options, type: 'youtube_info', query: options.videoId });
}

/**
 * SimilarWeb data via Proxy Grid
 */
export async function fetchSimilarWeb(options: {
  config: ProxyGridConfig;
  domain: string;
  force?: boolean;
}): Promise<{ data: Record<string, unknown>; provider?: string } | null> {
  return fetchProxyGridService({ ...options, type: 'similarweb', query: options.domain });
}

/**
 * Hacker News via Proxy Grid
 */
export async function fetchHackerNews(options: {
  config: ProxyGridConfig;
  query: 'top' | 'new' | 'best' | string;
  force?: boolean;
}): Promise<{ data: Record<string, unknown>; provider?: string } | null> {
  return fetchProxyGridService({ ...options, type: 'hackernews', query: options.query });
}

/**
 * Screenshot via Proxy Grid
 */
export async function fetchScreenshot(options: {
  config: ProxyGridConfig;
  url: string;
  force?: boolean;
}): Promise<{ image: ArrayBuffer; contentType: string; provider?: string } | null> {
  const { config, url, force } = options;
  const endpoint = `${config.baseUrl.replace(/\/$/, '')}/api/search`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-grid-secret': config.secret,
    },
    body: JSON.stringify({
      type: 'screenshot',
      query: url,
      ...(force || config.force ? { force: true } : {}),
    }),
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as ProxyGridScreenshotResponse;
  if (!json.image) {
    return null;
  }

  return {
    image: decodeBase64(json.image),
    contentType: json.contentType || 'image/png',
    provider: json.provider,
  };
}

function parseAllowlist(raw?: string): Set<string> | null {
  if (!raw) return null;
  const entries = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) return null;
  return new Set(entries);
}

function decodeBase64(data: string): ArrayBuffer {
  if (typeof Buffer !== 'undefined') {
    const buffer = Buffer.from(data, 'base64');
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }

  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
