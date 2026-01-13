import { z } from 'zod';

export const ProxyConfigSchema = z
  .object({
    type: z.enum(['browser', 'proxy_grid', 'residential', 'datacenter']).optional(),
    country: z.string().length(2).optional(), // ISO 3166-1 alpha-2
    sessionId: z.string().max(100).optional(),
  })
  .optional();

export const CookieSchema = z.object({
  name: z.string().min(1).max(200),
  value: z.string().max(4096),
  domain: z.string().optional(),
  path: z.string().default('/'),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
});

export const ExtractOptionsSchema = z.object({
  screenshot: z.boolean().optional(),
  storeContent: z.boolean().optional(),
  waitUntil: z.enum(['domcontentloaded', 'networkidle0']).optional(),
  timeoutMs: z.number().int().min(1000).max(60000).optional(),
  proxy: ProxyConfigSchema,
  headers: z.record(z.string().min(1), z.string().max(8192)).optional(),
  cookies: z.array(CookieSchema).max(50).optional(),
});

export const ExtractRequestSchema = z
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
    async: z.boolean().default(false),
    webhook_url: z.string().url().optional(),
    webhook_secret: z.string().min(16).max(256).optional(),
    format: z.literal('json').default('json'),
    options: ExtractOptionsSchema.optional(),
  })
  .refine((data) => data.fields || data.schema, {
    message: 'Either fields or schema must be provided',
  });

export type ExtractRequestInput = z.infer<typeof ExtractRequestSchema>;
