import { jsonResponse, textResponse } from '../lib/http';
import { verifyApiKey } from '../services/auth';
import {
  createSchedule,
  listSchedules,
  updateSchedule,
  deleteSchedule,
  computeNextRun,
  getSchedule,
} from '../services/schedules';
import { parseScheduleCreate, parseScheduleUpdate } from '../lib/validate';
import type { Env, HandlerDeps } from '../types';

export async function handleSchedules(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  parts: string[],
  deps: HandlerDeps = {},
): Promise<Response> {
  const auth = await authorize(request, env, deps);
  if (!auth.ok) {
    return jsonResponse(
      {
        success: false,
        error: { code: auth.errorCode ?? 'unauthorized', message: 'Unauthorized.' },
      },
      auth.status,
      corsHeaders,
    );
  }

  // GET /schedules - list schedules
  if (request.method === 'GET' && parts.length === 1) {
    const limit = Number(new URL(request.url).searchParams.get('limit') || 50);
    const schedules = await listSchedules(env.DB, {
      apiKeyId: auth.apiKeyId ?? null,
      limit: Number.isFinite(limit) ? limit : 50,
    });
    return jsonResponse({ success: true, data: schedules }, 200, corsHeaders);
  }

  // POST /schedules - create schedule
  if (request.method === 'POST' && parts.length === 1) {
    return handleCreateSchedule(request, env, corsHeaders, auth.apiKeyId);
  }

  // PATCH /schedules/:id - update schedule
  if (request.method === 'PATCH' && parts.length === 2) {
    return handleUpdateSchedule(request, env, corsHeaders, parts[1], auth.apiKeyId);
  }

  // DELETE /schedules/:id - delete schedule
  if (request.method === 'DELETE' && parts.length === 2) {
    return handleDeleteSchedule(request, env, corsHeaders, parts[1], auth.apiKeyId);
  }

  return textResponse('Method Not Allowed', 405, corsHeaders);
}

async function handleCreateSchedule(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  apiKeyId: string | null | undefined,
): Promise<Response> {
  const body = await request.json().catch(() => null);

  const parsed = parseScheduleCreate(body);
  if (!parsed.ok) {
    return jsonResponse(
      { success: false, error: { code: 'bad_request', message: parsed.message } },
      400,
      corsHeaders,
    );
  }

  const { url, fields, schema, instructions, cron, webhook_url, webhook_secret } = parsed.data;

  try {
    await computeNextRun(cron, Date.now());
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: { code: 'bad_request', message: `Invalid cron: ${(error as Error).message}` },
      },
      400,
      corsHeaders,
    );
  }

  const scheduleId = crypto.randomUUID();
  await createSchedule(env.DB, {
    id: scheduleId,
    apiKeyId: apiKeyId ?? null,
    url,
    fields,
    schema,
    instructions,
    cron,
    webhookUrl: webhook_url,
    webhookSecret: webhook_secret ?? null,
    createdAt: Date.now(),
  });

  return jsonResponse(
    {
      success: true,
      schedule_id: scheduleId,
      status: 'active',
    },
    201,
    corsHeaders,
  );
}

async function handleUpdateSchedule(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  scheduleId: string,
  apiKeyId: string | null | undefined,
): Promise<Response> {
  const body = await request.json().catch(() => null);

  const schedule = await getSchedule(env.DB, scheduleId, apiKeyId ?? null);
  if (!schedule) {
    return jsonResponse(
      { success: false, error: { code: 'not_found', message: 'Schedule not found.' } },
      404,
      corsHeaders,
    );
  }

  const parsed = parseScheduleUpdate(body);
  if (!parsed.ok) {
    return jsonResponse(
      { success: false, error: { code: 'bad_request', message: parsed.message } },
      400,
      corsHeaders,
    );
  }

  const { is_active, cron, webhook_url, webhook_secret, fields, schema, instructions } =
    parsed.data;

  const nextRunAt = await computeNextRunForUpdate(schedule, is_active, cron, corsHeaders);
  if (nextRunAt instanceof Response) return nextRunAt;

  await updateSchedule(env.DB, {
    id: scheduleId,
    apiKeyId: apiKeyId ?? null,
    isActive: typeof is_active === 'boolean' ? is_active : undefined,
    cron,
    webhookUrl: webhook_url,
    webhookSecret: webhook_secret ?? undefined,
    fields,
    schema,
    instructions,
    nextRunAt: nextRunAt.value,
  });

  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function computeNextRunForUpdate(
  schedule: { is_active: number; cron: string },
  is_active: boolean | undefined,
  cron: string | undefined,
  corsHeaders: Record<string, string>,
): Promise<{ value: number | null | undefined } | Response> {
  const now = Date.now();
  const willBeActive = typeof is_active === 'boolean' ? is_active : schedule.is_active === 1;

  if (cron) {
    try {
      const computed = await computeNextRun(cron, now);
      if (willBeActive) {
        return { value: computed };
      } else if (typeof is_active === 'boolean' && !is_active) {
        return { value: null };
      }
    } catch (error) {
      return jsonResponse(
        {
          success: false,
          error: { code: 'bad_request', message: `Invalid cron: ${(error as Error).message}` },
        },
        400,
        corsHeaders,
      );
    }
  } else if (typeof is_active === 'boolean') {
    if (is_active) {
      try {
        const computed = await computeNextRun(schedule.cron, now);
        return { value: computed };
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            error: { code: 'bad_request', message: `Invalid cron: ${(error as Error).message}` },
          },
          400,
          corsHeaders,
        );
      }
    } else {
      return { value: null };
    }
  }

  return { value: undefined };
}

async function authorize(
  request: Request,
  env: Env,
  deps: HandlerDeps = {},
): Promise<
  { ok: true; apiKeyId?: string | null } | { ok: false; status: number; errorCode?: string }
> {
  const allowAnon = env.ALLOW_ANON === 'true';
  if (allowAnon) {
    return { ok: true, apiKeyId: null };
  }

  const apiKey = request.headers.get('x-api-key');
  const result = await verifyApiKey(env.DB, apiKey);

  if (!result.ok) {
    return { ok: false, status: 401, errorCode: result.errorCode };
  }

  return { ok: true, apiKeyId: result.apiKeyId ?? null };
}

async function handleDeleteSchedule(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  scheduleId: string,
  apiKeyId: string | null | undefined,
): Promise<Response> {
  const schedule = await getSchedule(env.DB, scheduleId, apiKeyId ?? null);
  if (!schedule) {
    return jsonResponse(
      { success: false, error: { code: 'not_found', message: 'Schedule not found.' } },
      404,
      corsHeaders,
    );
  }

  const deleted = await deleteSchedule(env.DB, scheduleId, apiKeyId ?? null);
  if (!deleted) {
    return jsonResponse(
      { success: false, error: { code: 'internal_error', message: 'Failed to delete schedule.' } },
      500,
      corsHeaders,
    );
  }

  return jsonResponse({ success: true }, 200, corsHeaders);
}
