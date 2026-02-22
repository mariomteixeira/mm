import { logJson } from '../shared/logger/json-logger.js';
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

  logJson('error', 'whatsapp_webhook_verify_failed', {
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
  });

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

  const normalized = normalizeWhatsAppWebhookPayload(payload);

  logJson('info', 'whatsapp_webhook_event_received', {
    ...meta,
    object: payload?.object ?? null,
    entryCount: Array.isArray(payload?.entry) ? payload.entry.length : 0,
    payload,
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
    assets: normalized.assets,
  });

  try {
    const processing = await processNormalizedWhatsAppWebhook(normalized);
    logJson('info', 'whatsapp_webhook_persistence_processed', {
      ...meta,
      processing,
    });
  } catch (error) {
    logJson('error', 'whatsapp_webhook_persistence_error', {
      ...meta,
      errorName: error?.name ?? 'Error',
      errorMessage: error?.message ?? 'Unknown error',
      errorStack: error?.stack ?? null,
    });
  }

  return {
    signature,
    normalized,
  };
}
