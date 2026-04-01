import { logJson } from '../shared/logger/json-logger.js';
import { errorToLogPayload } from '../shared/errors/error-to-log-payload.js';
import { processInboundTextMessageWithLLM } from '../orders/process-inbound-text-message.js';
import { persistInboundMessageWebhook, persistOutboundStatusWebhook } from './persistence.js';
import { isWithinBusinessHours, getBusinessHoursMessage } from '../shared/business-hours.js';
import { sendWhatsAppTextMessage } from './send-text-message.js';
import { normalizePhoneE164 } from '../shared/utils/phone.js';
import { getRedisConnection } from '../queues/redis-connection.js';

/**
 * Process a normalized WhatsApp webhook payload.
 * LLM parsing is fire-and-forget: the webhook responds 200 immediately,
 * and the LLM call runs in the background within the same process.
 * Outside business hours, sends auto-reply and still saves the message for next opening.
 */
export async function processNormalizedWhatsAppWebhook(normalized) {
  const result = {
    inboundMessages: { processed: 0, skipped: 0, items: [] },
    inboundTextLLM: { queued: 0, skipped: 0, items: [] },
    statuses: { processed: 0, skipped: 0, items: [] },
  };

  let withinHours = isWithinBusinessHours();
  try {
    const redis = getRedisConnection();
    const bhEnabled = await redis.get('mercadomm:business_hours_enabled');
    if (bhEnabled === 'off') withinHours = true; // Bypass: treat as always open
  } catch {}

  for (const message of normalized?.messages ?? []) {
    const item = await persistInboundMessageWebhook(message);
    result.inboundMessages.items.push(item);
    if (item.skipped) {
      result.inboundMessages.skipped += 1;
    } else {
      result.inboundMessages.processed += 1;
    }

    if (!item.skipped) {
      if (withinHours) {
        // Within business hours: process normally with LLM (fire-and-forget)
        processInboundTextMessageWithLLM({
          normalizedMessage: message,
          persistedMessageId: item.messageId,
        }).catch((error) => {
          logJson('error', 'whatsapp_inbound_text_llm_processing_error', {
            ...errorToLogPayload(error, {
              reason: 'llm_direct_processing_failed',
              providerMessageId: message.messageId ?? null,
            }),
          });
        });
        result.inboundTextLLM.queued += 1;
      } else {
        // Outside business hours: send auto-reply, still process LLM so the order is ready when store opens
        const autoReply = getBusinessHoursMessage();
        if (autoReply && message.fromPhoneE164) {
          const to = normalizePhoneE164(message.fromPhoneE164);
          if (to) {
            sendWhatsAppTextMessage({ to, body: autoReply }).catch((error) => {
              logJson('error', 'whatsapp_business_hours_auto_reply_failed', {
                to,
                errorMessage: String(error?.message ?? '').slice(0, 300),
              });
            });
          }
        }

        // Still process with LLM so the order/draft is created for the next business day
        processInboundTextMessageWithLLM({
          normalizedMessage: message,
          persistedMessageId: item.messageId,
        }).catch((error) => {
          logJson('error', 'whatsapp_inbound_text_llm_processing_error', {
            ...errorToLogPayload(error, {
              reason: 'llm_direct_processing_failed_outside_hours',
              providerMessageId: message.messageId ?? null,
            }),
          });
        });
        result.inboundTextLLM.queued += 1;
      }
    } else {
      result.inboundTextLLM.skipped += 1;
    }
  }

  for (const status of normalized?.statuses ?? []) {
    const item = await persistOutboundStatusWebhook(status);
    result.statuses.items.push(item);
    if (item.skipped) {
      result.statuses.skipped += 1;
    } else {
      result.statuses.processed += 1;
    }
  }

  return result;
}
