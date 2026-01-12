import type { Env } from '../types';

export function resolveAiConfig(env: Env): {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey: string;
  baseUrl?: string;
} {
  const provider = env.AI_PROVIDER === 'anthropic' ? 'anthropic' : 'openai';
  const model =
    provider === 'anthropic'
      ? env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307'
      : env.OPENAI_MODEL || 'gpt-4o-mini';
  const apiKey =
    provider === 'anthropic' ? env.ANTHROPIC_API_KEY || 'dummy' : env.OPENAI_API_KEY || 'dummy';

  return {
    provider,
    model,
    apiKey,
    baseUrl: env.OPENAI_BASE_URL,
  };
}
