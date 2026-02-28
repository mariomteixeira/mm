import { logJson } from '../shared/logger/json-logger.js';
import { errorToLogPayload } from '../shared/errors/error-to-log-payload.js';
import { enqueueInboundTextParseJob } from '../queues/llm-parse-queue.js';
import { persistInboundMessageWebhook, persistOutboundStatusWebhook } from './persistence.js';

export async function processNormalizedWhatsAppWebhook(normalized) {
  const result = {
    inboundMessages: { processed: 0, skipped: 0, items: [] },
    inboundTextLLM: { queued: 0, skipped: 0, errors: 0, items: [] },
    statuses: { processed: 0, skipped: 0, items: [] },
  };

  for (const message of normalized?.messages ?? []) {
    const item = await persistInboundMessageWebhook(message);
    result.inboundMessages.items.push(item);
    if (item.skipped) {
      result.inboundMessages.skipped += 1;
    } else {
      result.inboundMessages.processed += 1;
    }

    if (!item.skipped) {
      try {
        const llmItem = await enqueueInboundTextParseJob({
          normalizedMessage: message,
          persistedMessageId: item.messageId,
        });

        result.inboundTextLLM.items.push(llmItem);
        if (llmItem.skipped) {
          result.inboundTextLLM.skipped += 1;
        } else if (llmItem.queued) {
          result.inboundTextLLM.queued += 1;
        } else {
          result.inboundTextLLM.skipped += 1;
        }
      } catch (error) {
        const llmError = {
          skipped: false,
          ok: false,
          ...errorToLogPayload(error, {
            reason: 'llm_text_enqueue_failed',
            providerMessageId: message.messageId ?? null,
          }),
        };
        result.inboundTextLLM.items.push(llmError);
        result.inboundTextLLM.errors += 1;
        logJson('error', 'whatsapp_inbound_text_llm_processing_error', llmError);
      }
    } else {
      result.inboundTextLLM.items.push({
        skipped: true,
        reason: 'inbound_message_not_persisted',
      });
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
