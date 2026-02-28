import { logJson } from '../shared/logger/json-logger.js';
import {
  writeWebhookErrorFileLog,
  writeWebhookReceivedFileLog,
} from '../shared/logger/webhook-file-logger.js';
import { serializeErrorForLog } from '../shared/errors/serialize-error.js';
import { getRequestMeta, maskToken } from './http-request-meta.js';
import { verifyWhatsAppSignature } from '../whatsapp/signature.js';
import { normalizeWhatsAppWebhookPayload } from '../whatsapp/normalize-webhook-payload.js';
import { processNormalizedWhatsAppWebhook } from '../whatsapp/process-normalized-webhook.js';

export function handleWhatsAppWebhookVerify(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const meta = getRequestMeta(request);

  if (mode === 'subscribe' && token && token === expectedToken) {
    logJson('info', 'whatsapp_webhook_verify_success', {
      ...meta,
      mode,
      challengeLength: challenge?.length ?? 0,
    });

    return { ok: true, challenge: challenge ?? 'ok' };
  }

  const verifyError = {
    ...meta,
    mode,
    reason: !mode
      ? 'missing_hub_mode'
      : mode !== 'subscribe'
        ? 'invalid_hub_mode'
        : !token
          ? 'missing_verify_token'
          : !expectedToken
            ? 'missing_server_verify_token_env'
            : 'token_mismatch',
    providedTokenMasked: maskToken(token),
    expectedTokenMasked: maskToken(expectedToken),
  };

  logJson('error', 'whatsapp_webhook_verify_failed', verifyError);
  writeWebhookErrorFileLog({
    event: 'whatsapp_webhook_verify_failed',
    requestMeta: meta,
    payload: verifyError,
  }).catch(() => {});

  return { ok: false };
}

export async function handleWhatsAppWebhookEvent({ request, rawBody, payload }) {
  const meta = getRequestMeta(request);
  const signature = verifyWhatsAppSignature({
    rawBody,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    signatureHeader: request.headers.get('x-hub-signature-256'),
  });

  logJson(signature.ok ? 'info' : 'error', 'whatsapp_webhook_signature_check', {
    ...meta,
    signatureOk: signature.ok,
    signatureReason: signature.reason,
  });
  if (!signature.ok) {
    await writeWebhookErrorFileLog({
      event: 'whatsapp_webhook_signature_check',
      requestMeta: meta,
      payload: {
        signature,
        metaSignature: meta.metaSignature,
      },
    }).catch(() => {});
  }

  const normalized = normalizeWhatsAppWebhookPayload(payload);

  logJson('info', 'whatsapp_webhook_event_received', {
    ...meta,
    object: payload?.object ?? null,
    entryCount: Array.isArray(payload?.entry) ? payload.entry.length : 0,
    hasMessages: normalized.stats.messages > 0,
    hasStatuses: normalized.stats.statuses > 0,
    hasAssets: normalized.stats.assets > 0,
    stats: normalized.stats,
  });

  logJson('info', 'whatsapp_webhook_payload_normalized', {
    ...meta,
    stats: normalized.stats,
    messages: normalized.messages.map((message) => ({
      messageId: message.messageId,
      messageType: message.messageType,
      fromPhoneE164: message.fromPhoneE164,
      providerTimestampIso: message.providerTimestampIso,
      textPreview: message.textBody ? message.textBody.slice(0, 120) : null,
      hasAsset: Boolean(message.asset),
      assetKind: message.asset?.kind ?? null,
      assetMimeType: message.asset?.mimeType ?? null,
    })),
    statuses: normalized.statuses.map((status) => ({
      messageId: status.messageId,
      status: status.status,
      recipientPhoneE164: status.recipientPhoneE164,
      providerTimestampIso: status.providerTimestampIso,
      conversationId: status.conversationId,
      conversationOriginType: status.conversationOriginType,
      conversationExpirationIso: status.conversationExpirationIso,
    })),
    assets: normalized.assets.map((asset) => ({
      kind: asset.kind,
      messageId: asset.messageId,
      mediaId: asset.mediaId,
      mimeType: asset.mimeType,
      isVoice: asset.isVoice,
    })),
  });

  await writeWebhookReceivedFileLog({
    event: 'whatsapp_webhook_event_received',
    requestMeta: meta,
    payload: {
      signature,
      rawPayload: payload,
      normalized,
    },
  }).catch(() => {});

  try {
    const processing = await processNormalizedWhatsAppWebhook(normalized);
    logJson('info', 'whatsapp_webhook_persistence_processed', {
      ...meta,
      processing,
    });
  } catch (error) {
    const errorPayload = {
      ...meta,
      ...serializeErrorForLog(error, {
        messageLines: 6,
        stackLines: 6,
      }),
    };
    logJson('error', 'whatsapp_webhook_persistence_error', errorPayload);
    await writeWebhookErrorFileLog({
      event: 'whatsapp_webhook_persistence_error',
      requestMeta: meta,
      payload: {
        ...errorPayload,
        normalizedStats: normalized.stats,
      },
    }).catch(() => {});
  }

  return {
    signature,
    normalized,
  };
}
