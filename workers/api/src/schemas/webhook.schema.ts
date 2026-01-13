import { z } from 'zod';

export const WebhookTestSchema = z.object({
  url: z.string().url({
    message: 'Invalid webhook URL',
  }),
  secret: z.string().min(16).max(256).optional(),
});

export const WebhookPayloadSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.number().optional(),
});

export type WebhookTestInput = z.infer<typeof WebhookTestSchema>;
export type WebhookPayloadInput = z.infer<typeof WebhookPayloadSchema>;
