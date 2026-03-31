import { prisma } from '../db/prisma-client.js';
import { publishRealtimeEvent } from '../realtime/realtime-events.js';

/**
 * Creates an order draft marked for manual review when LLM parsing
 * definitively fails after all retries. This prevents silent message loss.
 */
export async function createFailedParseDraft({ persistedMessageId, normalizedMessage, errorMessage }) {
  if (!persistedMessageId) return null;

  const whatsappMessage = await prisma.whatsAppMessage.findUnique({
    where: { id: persistedMessageId },
    select: { id: true, customerId: true, providerMessageId: true, content: true },
  });

  if (!whatsappMessage) return null;

  const messageText = normalizedMessage?.textBody ?? whatsappMessage?.content?.text ?? '';

  const aggregate = {
    version: 1,
    items: [],
    delivery: { address: null, neighborhood: null, reference: null },
    paymentIntent: null,
    observations: [],
    ambiguities: [],
    closingSignals: [],
    flags: {
      hasItems: false,
      hasDeliveryAddress: false,
      hasPaymentIntent: false,
      hasClosingSignal: false,
      hasQuestionSignal: false,
    },
    control: {},
    reviewFlags: { llmParseFailed: true },
    messages: [
      {
        providerMessageId: normalizedMessage?.messageId ?? null,
        text: messageText,
        providerTimestampIso: normalizedMessage?.providerTimestampIso ?? null,
        intent: null,
        confidence: null,
        summary: null,
      },
    ],
    stats: { messageCount: 1, itemCount: 0 },
    lastMessageText: messageText,
    lastProviderMessageId: normalizedMessage?.messageId ?? null,
    lastProviderTimestampIso: normalizedMessage?.providerTimestampIso ?? null,
  };

  const draft = await prisma.orderDraft.create({
    data: {
      customerId: whatsappMessage.customerId,
      status: 'READY_FOR_REVIEW',
      closeReason: 'LLM_PARSE_FAILED',
      aggregatedData: aggregate,
      aggregatedText: messageText,
      lastLlmDecision: {
        reviewReason: 'llm_parse_failed',
        errorMessage,
      },
      openedAt: new Date(),
      lastMessageAt: new Date(),
      commitDeadlineAt: new Date(),
      closedAt: new Date(),
    },
  });

  await prisma.orderDraftMessage.create({
    data: {
      orderDraftId: draft.id,
      whatsappMessageId: persistedMessageId,
      providerMessageId: whatsappMessage.providerMessageId,
      sequence: 1,
      messageText,
      parsedPayload: null,
      parsedIntent: null,
      parsedConfidence: null,
      hasItems: false,
      hasDeliveryAddress: false,
      hasPaymentIntent: false,
      hasClosingSignal: false,
    },
  });

  await publishRealtimeEvent({
    topic: 'orders-drafts',
    event: 'draft_created_from_failed_parse',
    payload: { draftId: draft.id, draftStatus: 'READY_FOR_REVIEW' },
  }).catch(() => {});

  return draft;
}
