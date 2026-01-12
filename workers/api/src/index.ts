import type { Env } from './types';

// Minimal handler for testing - imports full handler dynamically
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { handleRequest } = await import('./handler');
    return handleRequest(request, env, ctx);
  },
};
