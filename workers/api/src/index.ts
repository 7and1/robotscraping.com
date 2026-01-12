import { handleRequest } from './handler';
import { handleQueue } from './queue';
import type { Env, JobMessage } from './types';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env, ctx);
  },
  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    return handleQueue(batch, env);
  },
};
