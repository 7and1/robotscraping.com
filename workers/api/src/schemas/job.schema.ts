import { z } from 'zod';

export const JobCreateSchema = z
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
    webhook_url: z.string().url().optional(),
    webhook_secret: z.string().min(16).max(256).optional(),
    options: z
      .object({
        screenshot: z.boolean().optional(),
        storeContent: z.boolean().optional(),
        waitUntil: z.enum(['domcontentloaded', 'networkidle0']).optional(),
        timeoutMs: z.number().int().min(1000).max(60000).optional(),
      })
      .optional(),
  })
  .refine((data) => data.fields || data.schema, {
    message: 'Either fields or schema must be provided',
  });

export const JobListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export type JobCreateInput = z.infer<typeof JobCreateSchema>;
export type JobListQueryInput = z.infer<typeof JobListQuerySchema>;
