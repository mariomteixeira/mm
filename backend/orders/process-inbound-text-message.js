import { appendWhatsAppMessageRawPayload } from '../whatsapp/persistence.js';
import { scheduleOrderDraftTimeoutJob } from '../queues/order-draft-queue.js';
import { parseOrderTextWithLLM } from './parse-order-with-llm.js';
import { upsertOrderDraftFromParsedInboundMessage } from './order-draft-service.js';

function shouldRunTextParsing(message) {
  return message?.messageType === 'text' && Boolean(message?.textBody?.trim());
}

export async function processInboundTextMessageWithLLM({ normalizedMessage, persistedMessageId }) {
  if (!shouldRunTextParsing(normalizedMessage)) {
    return { skipped: true, reason: 'not_text_message' };
  }

  if (!persistedMessageId) {
    return { skipped: true, reason: 'missing_persisted_message_id' };
  }

  const llmResult = await parseOrderTextWithLLM({
    messageText: normalizedMessage.textBody,
  });

  await appendWhatsAppMessageRawPayload({
    whatsappMessageId: persistedMessageId,
    source: 'LLM',
    payloadType: 'ORDER_PARSE_RESULT',
    payload: llmResult,
  });

  if (!llmResult.ok) {
    return llmResult;
  }

  const draftResult = await upsertOrderDraftFromParsedInboundMessage({
    normalizedMessage,
    persistedMessageId,
    llmResult,
  });

  let draftTimeoutJob = null;
  if (!draftResult?.skipped && draftResult?.shouldScheduleTimeout && draftResult?.draftId) {
    draftTimeoutJob = await scheduleOrderDraftTimeoutJob({
      draftId: draftResult.draftId,
      commitDeadlineAt: draftResult.commitDeadlineAt,
    });
  }

  return {
    skipped: false,
    ok: true,
    responseId: llmResult.responseId,
    model: llmResult.model,
    intent: llmResult.parsed.intent,
    confidence: llmResult.parsed.confidence,
    itemsCount: llmResult.parsed.items.length,
    ambiguitiesCount: llmResult.parsed.ambiguities.length,
    decision: llmResult.decision,
    draft: draftResult,
    draftTimeoutJob,
  };
}
