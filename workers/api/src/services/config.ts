import type { Env } from '../types';

export function resolveAiConfig(env: Env): {
  provider: 'cloudflare' | 'openai' | 'anthropic';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  ai?: Ai;
} {
  const provider =
    env.AI_PROVIDER === 'anthropic'
      ? 'anthropic'
      : env.AI_PROVIDER === 'cloudflare'
        ? 'cloudflare'
        : 'openai';

  const model =
    provider === 'anthropic'
      ? env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307'
      : provider === 'cloudflare'
        ? '@cf/meta/llama-3.3-70b-instruct'
        : env.OPENAI_MODEL || 'gpt-4o-mini';

  const apiKey =
    provider === 'anthropic'
      ? env.ANTHROPIC_API_KEY
      : provider === 'openai'
        ? env.OPENAI_API_KEY
        : undefined;

  if (provider !== 'cloudflare' && !apiKey) {
    throw new Error(`${provider} API key is not configured.`);
  }

  return {
    provider,
    model,
    apiKey,
    baseUrl: env.OPENAI_BASE_URL,
    ai: provider === 'cloudflare' ? env.AI : undefined,
  };
}
