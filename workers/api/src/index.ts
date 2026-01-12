import type { Env, JobMessage } from './types';

// Minimal test handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check without importing any modules
    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'robot-scraping-core' }, { status: 200 });
    }

    // Test endpoint to check if handler import works
    if (url.pathname === '/test') {
      try {
        await import('./handler');
        return Response.json({ ok: true, message: 'Handler loaded successfully' }, { status: 200 });
      } catch (error) {
        return Response.json(
          { error: (error as Error).message, stack: (error as Error).stack },
          { status: 500 },
        );
      }
    }

    // Try importing handler for other requests
    try {
      const { handleRequest } = await import('./handler');
      return handleRequest(request, env, ctx);
    } catch (error) {
      return Response.json({ error: (error as Error).message }, { status: 500 });
    }
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
