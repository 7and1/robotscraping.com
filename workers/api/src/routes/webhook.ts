import { jsonResponse, textResponse } from '../lib/http';
import { verifyApiKey } from '../services/auth';
import { sendWebhook } from '../services/webhook';
import { parseWebhookTest } from '../lib/validate';
import type { Env } from '../types';

function getWebhookSecret(
  secret: string | null | undefined,
  envSecret: string | undefined,
): string {
  if (secret) return secret;
  if (envSecret) return envSecret;
  throw new Error('Webhook URL requires a webhook_secret for signature verification.');
}

export async function handleWebhookTest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  parts: string[],
): Promise<Response> {
  if (request.method !== 'POST' || parts.length !== 2 || parts[1] !== 'test') {
    return textResponse('Not Found', 404, corsHeaders);
  }

  const auth = await authorize(request, env);
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

  const body = await request.json().catch(() => null);

  const parsed = parseWebhookTest(body);
  if (!parsed.ok) {
    return jsonResponse(
      { success: false, error: { code: 'bad_request', message: parsed.message } },
      400,
      corsHeaders,
    );
  }

  const { url, secret } = parsed.data;

  await sendWebhook(
    url,
    {
      jobId: crypto.randomUUID(),
      status: 'completed',
      data: { message: 'Test webhook from RobotScraping.com' },
    },
    getWebhookSecret(secret, env.WEBHOOK_SECRET),
  );

  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function authorize(
  request: Request,
  env: Env,
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
