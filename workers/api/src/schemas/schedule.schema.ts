import { z } from 'zod';

const CronPattern =
  /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/[0-9]+)\s+(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/[0-9]+)\s+(\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/[0-9]+)\s+(\*|([1-9]|1[0-2])|\*\/[0-9]+)\s+(\*|([0-6])|\*\/[0-9]+)$/;

export const ScheduleCreateSchema = z
  .object({
    url: z
      .string()
      .url()
      .refine((u) => {
        try {
          const parsed = new URL(u);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      }, 'URL must use http or https protocol'),
    fields: z.array(z.string()).max(50).optional(),
    schema: z.any().optional(),
    instructions: z.string().max(5000).optional(),
    cron: z.string().regex(CronPattern, {
      message: 'Invalid cron expression. Format: min hour day month dow',
    }),
    webhook_url: z.string().url('Invalid webhook URL'),
    webhook_secret: z.string().min(16).max(256).optional(),
  })
  .refine((data) => data.fields || data.schema, {
    message: 'Either fields or schema must be provided',
  });

export const ScheduleUpdateSchema = z.object({
  is_active: z.boolean().optional(),
  cron: z
    .string()
    .regex(CronPattern, {
      message: 'Invalid cron expression. Format: min hour day month dow',
    })
    .optional(),
  webhook_url: z.string().url().optional(),
  webhook_secret: z.string().min(16).max(256).optional(),
  fields: z.array(z.string()).max(50).optional(),
  schema: z.any().optional(),
  instructions: z.string().max(5000).optional(),
});

export const ScheduleListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ScheduleCreateInput = z.infer<typeof ScheduleCreateSchema>;
export type ScheduleUpdateInput = z.infer<typeof ScheduleUpdateSchema>;
export type ScheduleListQueryInput = z.infer<typeof ScheduleListQuerySchema>;
