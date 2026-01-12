import type { ScrapeResult } from '../types';

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
