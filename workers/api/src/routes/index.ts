export { handleExtract } from './extract';
export { handleJobs } from './jobs';
export { handleSchedules } from './schedules';
export { handleUsage } from './usage';
export { handleWebhookTest } from './webhook';
export { handleBatch } from './batch';
export { handleAuth } from './auth';

import { jsonResponse } from '../lib/http';
import type { Env } from '../types';
import { openApiSpec } from './openapi';

export async function handleOpenApi(
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  return jsonResponse(openApiSpec, 200, corsHeaders);
}
