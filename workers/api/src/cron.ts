import { createJob, updateJobStatus } from './services/jobs';
import { getDueSchedules, updateSchedule, computeNextRun } from './services/schedules';
import { consumeApiKeyById } from './services/auth';
import type { Env, JobMessage } from './types';
import { sendWebhook } from './services/webhook';

export async function handleCron(env: Env, ctx: ExecutionContext): Promise<void> {
  const now = Date.now();
  const schedules = await getDueSchedules(env.DB, now, 25);

  for (const schedule of schedules) {
    const jobId = crypto.randomUUID();
    const nextRunAt = await computeNextRun(schedule.cron, now);

    await updateSchedule(env.DB, {
      id: schedule.id,
      apiKeyId: schedule.api_key_id ?? null,
      lastRunAt: now,
      nextRunAt,
    });

    let fields: string[] | undefined;
    let schema: Record<string, unknown> | undefined;
    try {
      fields = schedule.fields_config ? JSON.parse(schedule.fields_config) : undefined;
    } catch {
      fields = undefined;
    }
    try {
      schema = schedule.schema_json ? JSON.parse(schedule.schema_json) : undefined;
    } catch {
      schema = undefined;
    }

    await createJob(env.DB, {
      id: jobId,
      apiKeyId: schedule.api_key_id ?? null,
      url: schedule.url,
      fields,
      schema,
      instructions: schedule.instructions ?? undefined,
      webhookUrl: schedule.webhook_url,
      webhookSecret: schedule.webhook_secret ?? null,
      createdAt: now,
    });

    const credit = await consumeApiKeyById(env.DB, schedule.api_key_id ?? null, now);
    if (!credit.ok) {
      await updateJobStatus(env.DB, {
        id: jobId,
        status: 'failed',
        completedAt: Date.now(),
        errorMsg: credit.errorCode ?? 'insufficient_credits',
      });

      if (schedule.webhook_url) {
        ctx.waitUntil(
          sendWebhook(
            schedule.webhook_url,
            {
              jobId,
              status: 'failed',
              error: credit.errorCode ?? 'insufficient_credits',
            },
            schedule.webhook_secret || env.WEBHOOK_SECRET || 'default-secret',
          ),
        );
      }

      continue;
    }

    const payload: JobMessage = {
      jobId,
      apiKeyId: schedule.api_key_id ?? null,
      url: schedule.url,
      fields,
      schema,
      instructions: schedule.instructions ?? undefined,
      webhookUrl: schedule.webhook_url,
      webhookSecret: schedule.webhook_secret ?? null,
    };

    ctx.waitUntil(env.TASK_QUEUE.send(payload));
  }
}
