import type { MessageBatch } from '@cloudflare/workers-types';
import { scrapePage } from './services/browser';
import { extractWithLLM } from './services/extract';
import { resolveAiConfig } from './services/config';
import { updateJobStatus } from './services/jobs';
import { logEvent, logRequest, storeArtifacts, storeJobResult } from './services/storage';
import { sendWebhook } from './services/webhook';
import { sanitizeErrorMessage } from './lib/security';
import {
  computeCacheKey,
  getCacheEntry,
  getCacheSettings,
  loadCacheResult,
  markCacheHit,
  storeCacheEntry,
  storeCacheResult,
} from './services/cache';
import {
  fetchProxyGridFallback,
  getProxyGridConfig,
  isProxyGridAllowed,
} from './services/proxy-grid';
import type { Env, JobMessage } from './types';

export async function handleQueue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    const payload = message.body;
    const startedAt = Date.now();
    const cacheSettings = getCacheSettings(env);
    const cacheKey = cacheSettings.enabled
      ? await computeCacheKey({
          url: payload.url,
          fields: payload.fields,
          schema: payload.schema,
          instructions: payload.instructions,
        })
      : null;

    await updateJobStatus(env.DB, {
      id: payload.jobId,
      status: 'processing',
      startedAt,
    });

    try {
      if (cacheSettings.enabled && cacheKey) {
        const cached = await getCacheEntry(env.DB, cacheKey, startedAt);
        if (cached?.result_path) {
          const cachedData = await loadCacheResult(env.BUCKET, cached.result_path);
          if (cachedData) {
            await markCacheHit(env.DB, cacheKey, Date.now());
            await updateJobStatus(env.DB, {
              id: payload.jobId,
              status: 'completed',
              completedAt: Date.now(),
              resultPath: cached.result_path,
              tokenUsage: cached.token_usage ?? 0,
              latencyMs: Date.now() - startedAt,
              blocked: false,
            });

            await logRequest(env.DB, {
              id: payload.jobId,
              apiKeyId: payload.apiKeyId,
              url: payload.url,
              fields: payload.fields,
              schema: payload.schema,
              tokenUsage: cached.token_usage ?? 0,
              latencyMs: Date.now() - startedAt,
              status: 'cached',
              errorMessage: null,
              snapshotKey: null,
              contentKey: null,
              blocked: false,
              createdAt: Date.now(),
            });

            await logEvent(env.DB, {
              id: crypto.randomUUID(),
              requestId: payload.jobId,
              apiKeyId: payload.apiKeyId,
              eventType: 'cache_hit',
              message: 'Served queued job from cache.',
              metadata: { cacheKey },
              createdAt: Date.now(),
            });

            if (payload.webhookUrl) {
              await safeSendWebhook(
                payload.webhookUrl,
                {
                  jobId: payload.jobId,
                  status: 'completed',
                  resultPath: cached.result_path,
                  data: cachedData,
                  meta: {
                    tokens: cached.token_usage ?? 0,
                    latencyMs: Date.now() - startedAt,
                    cacheHit: true,
                  },
                },
                payload.webhookSecret || env.WEBHOOK_SECRET || 'default-secret',
              );
            }

            message.ack();
            continue;
          }
        }

        await logEvent(env.DB, {
          id: crypto.randomUUID(),
          requestId: payload.jobId,
          apiKeyId: payload.apiKeyId,
          eventType: 'cache_miss',
          message: 'Cache miss for queued job.',
          metadata: { cacheKey },
          createdAt: Date.now(),
        });
      }

      const timeoutMs = payload.options?.timeoutMs ?? Number(env.BROWSER_TIMEOUT_MS || 15000);
      const waitUntil = payload.options?.waitUntil ?? 'domcontentloaded';
      const maxContentChars = Number(env.MAX_CONTENT_CHARS || 20000);
      const screenshotEnabled =
        typeof payload.options?.screenshot === 'boolean'
          ? payload.options?.screenshot
          : env.DEFAULT_SCREENSHOT === 'true';
      const storeContent =
        typeof payload.options?.storeContent === 'boolean'
          ? payload.options?.storeContent
          : env.STORE_CONTENT !== 'false';

      let scrapeResult = await scrapePage(env.MYBROWSER, payload.url, {
        waitUntil,
        timeoutMs,
        screenshot: screenshotEnabled,
        maxContentChars,
      });

      if (scrapeResult.blocked) {
        const proxyConfig = getProxyGridConfig(env);
        if (isProxyGridAllowed(proxyConfig, payload.apiKeyId)) {
          try {
            const fallback = await fetchProxyGridFallback({
              config: proxyConfig,
              url: payload.url,
              maxContentChars,
              screenshot: screenshotEnabled,
            });

            if (fallback?.result?.content) {
              scrapeResult = fallback.result;

              await logEvent(env.DB, {
                id: crypto.randomUUID(),
                requestId: payload.jobId,
                apiKeyId: payload.apiKeyId,
                eventType: 'proxy_grid_fallback',
                message: 'Proxy Grid fallback succeeded for queued job.',
                metadata: { provider: fallback.provider ?? null },
                createdAt: Date.now(),
              });
            } else {
              await logEvent(env.DB, {
                id: crypto.randomUUID(),
                requestId: payload.jobId,
                apiKeyId: payload.apiKeyId,
                eventType: 'proxy_grid_fallback_failed',
                message: 'Proxy Grid fallback failed for queued job.',
                createdAt: Date.now(),
              });
            }
          } catch (error) {
            await logEvent(env.DB, {
              id: crypto.randomUUID(),
              requestId: payload.jobId,
              apiKeyId: payload.apiKeyId,
              eventType: 'proxy_grid_error',
              message: (error as Error).message,
              createdAt: Date.now(),
            });
          }
        }
      }

      if (scrapeResult.blocked) {
        await updateJobStatus(env.DB, {
          id: payload.jobId,
          status: 'blocked',
          completedAt: Date.now(),
          errorMsg: 'blocked',
          blocked: true,
        });

        await logRequest(env.DB, {
          id: payload.jobId,
          apiKeyId: payload.apiKeyId,
          url: payload.url,
          fields: payload.fields,
          schema: payload.schema,
          tokenUsage: 0,
          latencyMs: Date.now() - startedAt,
          status: 'blocked',
          errorMessage: 'blocked',
          snapshotKey: null,
          contentKey: null,
          blocked: true,
          createdAt: Date.now(),
        });

        if (payload.webhookUrl) {
          await safeSendWebhook(
            payload.webhookUrl,
            {
              jobId: payload.jobId,
              status: 'blocked',
              error: 'blocked',
            },
            payload.webhookSecret || env.WEBHOOK_SECRET || 'default-secret',
          );
        }

        message.ack();
        continue;
      }

      const { provider, model, apiKey, baseUrl } = resolveAiConfig(env);
      const extractResult = await extractWithLLM({
        provider,
        model,
        apiKey,
        baseUrl,
        content: scrapeResult.content,
        fields: payload.fields,
        schema: payload.schema,
        instructions: payload.instructions,
      });

      const latencyMs = Date.now() - startedAt;
      const stored = await storeJobResult({
        bucket: env.BUCKET,
        id: payload.jobId,
        data: extractResult.data,
      });

      const artifacts = await storeArtifacts({
        bucket: env.BUCKET,
        id: payload.jobId,
        screenshot: scrapeResult.screenshot,
        screenshotType: scrapeResult.screenshotType,
        content: storeContent ? scrapeResult.content : undefined,
        storeContent,
      });

      await updateJobStatus(env.DB, {
        id: payload.jobId,
        status: 'completed',
        completedAt: Date.now(),
        resultPath: stored.resultKey,
        tokenUsage: extractResult.usage,
        latencyMs,
      });

      await logRequest(env.DB, {
        id: payload.jobId,
        apiKeyId: payload.apiKeyId,
        url: payload.url,
        fields: payload.fields,
        schema: payload.schema,
        tokenUsage: extractResult.usage,
        latencyMs,
        status: 'success',
        errorMessage: null,
        snapshotKey: artifacts?.snapshotKey ?? null,
        contentKey: artifacts?.contentKey ?? null,
        blocked: false,
        createdAt: Date.now(),
      });

      if (cacheSettings.enabled && cacheKey) {
        try {
          const resultPath = await storeCacheResult(env.BUCKET, cacheKey, extractResult.data);
          await storeCacheEntry(env.DB, {
            key: cacheKey,
            url: payload.url,
            fields: payload.fields,
            schema: payload.schema,
            instructions: payload.instructions,
            resultPath,
            tokenUsage: extractResult.usage,
            contentChars: scrapeResult.content?.length ?? 0,
            createdAt: Date.now(),
            expiresAt: Date.now() + cacheSettings.ttlMs,
          });
          await logEvent(env.DB, {
            id: crypto.randomUUID(),
            requestId: payload.jobId,
            apiKeyId: payload.apiKeyId,
            eventType: 'cache_store',
            message: 'Stored queued extraction in cache.',
            metadata: { cacheKey, ttlMs: cacheSettings.ttlMs },
            createdAt: Date.now(),
          });
        } catch (error) {
          await logEvent(env.DB, {
            id: crypto.randomUUID(),
            requestId: payload.jobId,
            apiKeyId: payload.apiKeyId,
            eventType: 'cache_store_failed',
            message: (error as Error).message,
            metadata: { cacheKey },
            createdAt: Date.now(),
          });
        }
      }

      if (payload.webhookUrl) {
        await safeSendWebhook(
          payload.webhookUrl,
          {
            jobId: payload.jobId,
            status: 'completed',
            resultPath: stored.resultKey,
            data: extractResult.data,
            meta: {
              tokens: extractResult.usage,
              latencyMs,
            },
          },
          payload.webhookSecret || env.WEBHOOK_SECRET || 'default-secret',
        );
      }

      message.ack();
    } catch (error) {
      const safeError = sanitizeErrorMessage((error as Error).message);
      await updateJobStatus(env.DB, {
        id: payload.jobId,
        status: 'failed',
        completedAt: Date.now(),
        errorMsg: safeError,
      });

      await logRequest(env.DB, {
        id: payload.jobId,
        apiKeyId: payload.apiKeyId,
        url: payload.url,
        fields: payload.fields,
        schema: payload.schema,
        tokenUsage: 0,
        latencyMs: Date.now() - startedAt,
        status: 'error',
        errorMessage: safeError,
        snapshotKey: null,
        contentKey: null,
        blocked: false,
        createdAt: Date.now(),
      });

      if (payload.webhookUrl) {
        await safeSendWebhook(
          payload.webhookUrl,
          {
            jobId: payload.jobId,
            status: 'failed',
            error: (error as Error).message,
          },
          payload.webhookSecret || env.WEBHOOK_SECRET || 'default-secret',
        );
      }

      message.ack();
    }
  }
}

async function safeSendWebhook(
  url: string,
  payload: Parameters<typeof sendWebhook>[1],
  secret: string,
) {
  try {
    await sendWebhook(url, payload, secret);
  } catch {
    // webhook failures should not flip job status
  }
}
