import { prisma } from '../db/prisma-client.js';
import { publishRealtimeEvent } from '../realtime/realtime-events.js';
import { getOrderDraftConfig } from './order-draft-config.js';

/**
 * Creates an order draft marked for manual review when LLM parsing
 * definitively fails after all retries. This prevents silent message loss.
 * Tries to link to the most recent active order if within amendment window.
 */
export async function createFailedParseDraft({ persistedMessageId, normalizedMessage, errorMessage }) {
  if (!persistedMessageId) return null;

  const whatsappMessage = await prisma.whatsAppMessage.findUnique({
    where: { id: persistedMessageId },
    select: { id: true, customerId: true, providerMessageId: true, content: true },
  });

  if (!whatsappMessage) return null;

  const messageText = normalizedMessage?.textBody ?? whatsappMessage?.content?.text ?? '';
  const config = getOrderDraftConfig();

  // Try to link to most recent active order within amendment window
  const recentDraft = await prisma.orderDraft.findFirst({
    where: {
      customerId: whatsappMessage.customerId,
      status: 'COMMITTED',
      orderId: { not: null },
    },
    orderBy: { closedAt: 'desc' },
    include: { order: { select: { id: true, status: true } } },
  });

  const now = new Date();
  const linkedOrderId = recentDraft?.order &&
    recentDraft.closedAt &&
    now.getTime() - new Date(recentDraft.closedAt).getTime() <= config.postCommitAmendmentWindowMs &&
    ['NEW_ORDER', 'IN_PICKING'].includes(recentDraft.order.status)
    ? recentDraft.orderId
    : null;

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
      orderId: linkedOrderId,
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
    payload: { draftId: draft.id, draftStatus: 'READY_FOR_REVIEW', orderId: linkedOrderId },
  }).catch(() => {});

  if (linkedOrderId) {
    await publishRealtimeEvent({
      topic: 'orders',
      event: 'order_amendment_failed_parse',
      payload: { orderId: linkedOrderId, draftId: draft.id },
    }).catch(() => {});
  }

  return draft;
}
