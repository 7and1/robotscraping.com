import type { Env } from '../types';
import { getOpenRouterKeys, getOpenRouterModels } from './extract';

export function resolveAiConfig(env: Env): {
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  apiKey: string;
  baseUrl?: string;
  fallbackModels?: string[];
  fallbackKeys?: string[];
} {
  const provider = (env.AI_PROVIDER as string) || 'openrouter';

  if (provider === 'openrouter') {
    const keys = getOpenRouterKeys(env);
    const { primary: model, fallbacks } = getOpenRouterModels(env);

    return {
      provider: 'openrouter',
      model,
      apiKey: keys[0] || 'dummy',
      fallbackKeys: keys.slice(1),
      fallbackModels: fallbacks,
    };
  }

  if (provider === 'anthropic') {
    return {
      provider: 'anthropic',
      model: env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      apiKey: env.ANTHROPIC_API_KEY || 'dummy',
    };
  }

  // Default to OpenAI
  return {
    provider: 'openai',
    model: env.OPENAI_MODEL || 'gpt-4o-mini',
    apiKey: env.OPENAI_API_KEY || 'dummy',
    baseUrl: env.OPENAI_BASE_URL,
  };
}
