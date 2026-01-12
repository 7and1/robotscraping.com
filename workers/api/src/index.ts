import type { Env, JobMessage } from './types';

// All imports are deferred to runtime to avoid module load issues
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { handleRequest } = await import('./handler');
    return handleRequest(request, env, ctx);
  },
  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    const { handleQueue } = await import('./queue');
    return handleQueue(batch, env);
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const { handleCron } = await import('./cron');
    ctx.waitUntil(handleCron(env, ctx));
  },
};
