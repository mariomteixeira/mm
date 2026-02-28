import { prisma } from '../db/prisma-client.js';
import { logJson } from '../shared/logger/json-logger.js';
import { getOrderDraftConfig } from './order-draft-config.js';
import { publishRealtimeEvent } from '../realtime/realtime-events.js';
import {
  buildDraftContribution,
  buildDraftReviewReason,
  mergeDraftAggregate,
  shouldCloseDraftEarly,
  shouldCreateOrderOnTimeout,
} from './order-draft-rules.js';

function parseDateOrNow(value) {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function addMs(date, ms) {
  return new Date(date.getTime() + ms);
}

function getAggregateControl(aggregate) {
  return aggregate && typeof aggregate === 'object' && aggregate.control && typeof aggregate.control === 'object'
    ? aggregate.control
    : {};
}

function buildAggregatedText(aggregate) {
  const messages = Array.isArray(aggregate?.messages) ? aggregate.messages : [];
  return messages
    .map((msg) => (typeof msg?.text === 'string' ? msg.text.trim() : ''))
    .filter(Boolean)
    .join('\n\n');
}

function buildOrderNotesFromAggregate(aggregate, closeReasonLabel) {
  const lines = [];
  if (aggregate?.delivery?.neighborhood) lines.push(`Neighborhood: ${aggregate.delivery.neighborhood}`);
  if (aggregate?.delivery?.reference) lines.push(`Reference: ${aggregate.delivery.reference}`);
  if (Array.isArray(aggregate?.observations) && aggregate.observations.length) {
    lines.push(`Observations: ${aggregate.observations.join(' | ')}`);
  }
  void closeReasonLabel;
  return lines.join('\n') || null;
}

function buildOrderInterpretedText(aggregate) {
  try {
    return JSON.stringify(
      {
        items: aggregate?.items ?? [],
        delivery: aggregate?.delivery ?? null,
        paymentIntent: aggregate?.paymentIntent ?? null,
        observations: aggregate?.observations ?? [],
        ambiguities: aggregate?.ambiguities ?? [],
      },
      null,
      2,
    );
  } catch {
    return null;
  }
}

async function createOrderFromDraftTx(tx, { draft, aggregate, closeReason }) {
  const items = Array.isArray(aggregate?.items) ? aggregate.items : [];
  const orderNotes = buildOrderNotesFromAggregate(aggregate, closeReason);
  const interpretedText = buildOrderInterpretedText(aggregate);
  const rawMessage = buildAggregatedText(aggregate);
  const aggregateAddress = aggregate?.delivery?.address ?? null;

  if (draft.orderId) {
    const existingOrder = await tx.order.findUnique({
      where: { id: draft.orderId },
      include: { items: true },
    });
    if (!existingOrder) return null;

    const canAmend = ['NEW_ORDER', 'IN_PICKING'].includes(existingOrder.status);
    if (!canAmend) return null;

    const updatedOrder = await tx.order.update({
      where: { id: existingOrder.id },
      data: {
        rawMessage: [existingOrder.rawMessage, rawMessage].filter(Boolean).join('\n\n--- AMENDMENT ---\n\n') || null,
        interpretedText: interpretedText ?? existingOrder.interpretedText,
        deliveryAddress: aggregateAddress ?? existingOrder.deliveryAddress,
        notes: [existingOrder.notes, orderNotes].filter(Boolean).join('\n\n') || null,
        items: items.length
          ? {
              create: items.map((item) => ({
                productName: item.name ?? 'Item',
                quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 1,
                unit: item.unit ?? null,
              })),
            }
          : undefined,
      },
    });

    if (aggregateAddress) {
      await tx.customer.update({
        where: { id: draft.customerId },
        data: { defaultDeliveryAddress: aggregateAddress },
      });
    }

    return updatedOrder;
  }

  if (items.length === 0) return null;

  const customer = await tx.customer.findUnique({
    where: { id: draft.customerId },
    select: { firstOrderAt: true, defaultDeliveryAddress: true },
  });

  const lastOrderWithAddress = await tx.order.findFirst({
    where: {
      customerId: draft.customerId,
      deliveryAddress: { not: null },
      status: { not: 'CANCELED' },
    },
    orderBy: { createdAt: 'desc' },
    select: { deliveryAddress: true },
  });

  const order = await tx.order.create({
    data: {
      customerId: draft.customerId,
      rawMessage,
      interpretedText,
      deliveryAddress: aggregateAddress ?? customer?.defaultDeliveryAddress ?? lastOrderWithAddress?.deliveryAddress ?? null,
      notes: orderNotes,
      status: 'NEW_ORDER',
      items: {
        create: items.map((item) => ({
          productName: item.name ?? 'Item',
          quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 1,
          unit: item.unit ?? null,
        })),
      },
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: 'NEW_ORDER',
          changedBy: 'SYSTEM_ORDER_DRAFT',
        },
      },
    },
  });

  await tx.customer.update({
    where: { id: draft.customerId },
    data: {
      totalOrders: { increment: 1 },
      lastOrderAt: order.createdAt,
      firstOrderAt: customer?.firstOrderAt ?? order.createdAt,
      ...(aggregateAddress ? { defaultDeliveryAddress: aggregateAddress } : {}),
    },
  });

  return order;
}

async function attachMessageToDraftTx(tx, payload) {
  const existingLink = await tx.orderDraftMessage.findUnique({
    where: { whatsappMessageId: payload.whatsappMessageId },
  });
  if (existingLink) {
    return { skipped: true, reason: 'message_already_linked', draftId: existingLink.orderDraftId };
  }

  const currentCount = await tx.orderDraftMessage.count({
    where: { orderDraftId: payload.orderDraftId },
  });

  await tx.orderDraftMessage.create({
    data: {
      orderDraftId: payload.orderDraftId,
      whatsappMessageId: payload.whatsappMessageId,
      providerMessageId: payload.providerMessageId ?? null,
      sequence: currentCount + 1,
      messageText: payload.messageText ?? null,
      parsedPayload: payload.parsedPayload ?? null,
      parsedIntent: payload.parsedIntent ?? null,
      parsedConfidence:
        typeof payload.parsedConfidence === 'number' ? payload.parsedConfidence : null,
      hasItems: Boolean(payload.hasItems),
      hasDeliveryAddress: Boolean(payload.hasDeliveryAddress),
      hasPaymentIntent: Boolean(payload.hasPaymentIntent),
      hasClosingSignal: Boolean(payload.hasClosingSignal),
    },
  });

  return { skipped: false };
}

export async function upsertOrderDraftFromParsedInboundMessage({
  persistedMessageId,
  normalizedMessage,
  llmResult,
}) {
  if (!persistedMessageId) return { skipped: true, reason: 'missing_persisted_message_id' };
  if (!llmResult?.ok) return { skipped: true, reason: 'llm_result_not_ok' };
  if (!llmResult?.parsed) return { skipped: true, reason: 'missing_llm_parsed_payload' };

  const config = getOrderDraftConfig();
  const whatsappMessage = await prisma.whatsAppMessage.findUnique({
    where: { id: persistedMessageId },
    select: {
      id: true,
      customerId: true,
      providerMessageId: true,
      createdAt: true,
      content: true,
    },
  });

  if (!whatsappMessage) return { skipped: true, reason: 'persisted_message_not_found' };

  const messageText = normalizedMessage?.textBody ?? whatsappMessage?.content?.text ?? null;
  const contribution = buildDraftContribution({
    parsed: llmResult.parsed,
    normalizedMessage,
    messageText,
    config,
  });

  const incomingAt = parseDateOrNow(
    normalizedMessage?.providerTimestampIso ?? contribution.providerTimestampIso ?? whatsappMessage.createdAt,
  );

  const action = await prisma.$transaction(async (tx) => {
    const existingLink = await tx.orderDraftMessage.findUnique({
      where: { whatsappMessageId: persistedMessageId },
      include: { orderDraft: true },
    });

    if (existingLink) {
      return {
        skipped: true,
        reason: 'message_already_processed_in_draft',
        draftId: existingLink.orderDraftId,
        draftStatus: existingLink.orderDraft?.status ?? null,
      };
    }

    const latestOpenDraft = await tx.orderDraft.findFirst({
      where: { customerId: whatsappMessage.customerId, status: 'OPEN' },
      orderBy: { updatedAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const latestAwaitingReplyDraft = await tx.orderDraft.findFirst({
      where: {
        customerId: whatsappMessage.customerId,
        status: { in: ['OPEN', 'READY_FOR_REVIEW'] },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const latestCommittedDraft = await tx.orderDraft.findFirst({
      where: {
        customerId: whatsappMessage.customerId,
        status: 'COMMITTED',
        orderId: { not: null },
      },
      orderBy: { closedAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const latestOpenDraftLinkedOrderStatus = latestOpenDraft?.order?.status ?? null;
    const canReuseOpenDraftLinkedToOrder =
      !latestOpenDraft?.orderId || ['NEW_ORDER', 'IN_PICKING'].includes(latestOpenDraftLinkedOrderStatus);

    const awaitingControl = getAggregateControl(latestAwaitingReplyDraft?.aggregatedData);
    const awaitingReplyWindowUntil = awaitingControl.awaitingReplyUntil
      ? new Date(awaitingControl.awaitingReplyUntil)
      : null;
    const awaitingDraftLinkedOrderStatus = latestAwaitingReplyDraft?.order?.status ?? null;
    const canReuseAwaitingReplyDraftLinkedOrder =
      !latestAwaitingReplyDraft?.orderId || ['NEW_ORDER', 'IN_PICKING'].includes(awaitingDraftLinkedOrderStatus);
    const shouldReuseAwaitingReplyDraft =
      latestAwaitingReplyDraft &&
      Boolean(awaitingControl.awaitingCustomerReply) &&
      canReuseAwaitingReplyDraftLinkedOrder &&
      awaitingReplyWindowUntil &&
      !Number.isNaN(awaitingReplyWindowUntil.getTime()) &&
      incomingAt.getTime() <= awaitingReplyWindowUntil.getTime();

    const shouldReuseDraft =
      !shouldReuseAwaitingReplyDraft &&
      latestOpenDraft &&
      canReuseOpenDraftLinkedToOrder &&
      incomingAt.getTime() - new Date(latestOpenDraft.lastMessageAt).getTime() <= config.aggregationGapMs;

    const withinCommittedAmendmentWindow =
      !shouldReuseDraft &&
      latestCommittedDraft?.order &&
      latestCommittedDraft.closedAt &&
      incomingAt.getTime() - new Date(latestCommittedDraft.closedAt).getTime() <=
        config.postCommitAmendmentWindowMs &&
      ['NEW_ORDER', 'IN_PICKING'].includes(latestCommittedDraft.order.status);

    const isIsolatedNotOrderNoUsefulSignals =
      llmResult.parsed.intent === 'NOT_ORDER' &&
      !contribution.flags.hasItems &&
      !contribution.flags.hasDeliveryAddress &&
      !contribution.flags.hasPaymentIntent &&
      !contribution.flags.hasClosingSignal &&
      !contribution.flags.hasQuestionSignal &&
      !shouldReuseDraft &&
      !withinCommittedAmendmentWindow;

    if (isIsolatedNotOrderNoUsefulSignals) {
      return {
        skipped: true,
        reason: 'not_order_intent',
      };
    }

    const commitDeadlineAt = addMs(incomingAt, config.aggregationGapMs);
    let draft;
    let origin = 'new';

    if (shouldReuseAwaitingReplyDraft || shouldReuseDraft) {
      const baseDraft = shouldReuseAwaitingReplyDraft ? latestAwaitingReplyDraft : latestOpenDraft;
      const mergedAggregate = mergeDraftAggregate(baseDraft.aggregatedData, contribution);
      draft = await tx.orderDraft.update({
        where: { id: baseDraft.id },
        data: {
          status: 'OPEN',
          closeReason: null,
          aggregatedData: mergedAggregate,
          aggregatedText: buildAggregatedText(mergedAggregate),
          lastLlmDecision: llmResult.decision ?? null,
          lastMessageAt: incomingAt,
          commitDeadlineAt,
          timedOutAt: null,
          closedAt: null,
        },
      });
      origin = shouldReuseAwaitingReplyDraft ? 'reused_awaiting_reply' : 'reused_open';
    } else if (withinCommittedAmendmentWindow) {
      const initialAggregate = mergeDraftAggregate(null, contribution);
      draft = await tx.orderDraft.create({
        data: {
          customerId: whatsappMessage.customerId,
          orderId: latestCommittedDraft.orderId,
          status: 'OPEN',
          aggregatedData: initialAggregate,
          aggregatedText: buildAggregatedText(initialAggregate),
          lastLlmDecision: llmResult.decision ?? null,
          openedAt: incomingAt,
          lastMessageAt: incomingAt,
          commitDeadlineAt,
        },
      });
      origin = 'post_commit_amendment';
    } else {
      const initialAggregate = mergeDraftAggregate(null, contribution);
      draft = await tx.orderDraft.create({
        data: {
          customerId: whatsappMessage.customerId,
          status: 'OPEN',
          aggregatedData: initialAggregate,
          aggregatedText: buildAggregatedText(initialAggregate),
          lastLlmDecision: llmResult.decision ?? null,
          openedAt: incomingAt,
          lastMessageAt: incomingAt,
          commitDeadlineAt,
        },
      });
      origin = 'new_open';
    }

    const linkResult = await attachMessageToDraftTx(tx, {
      orderDraftId: draft.id,
      whatsappMessageId: persistedMessageId,
      providerMessageId: whatsappMessage.providerMessageId,
      messageText: contribution.messageText,
      parsedPayload: llmResult,
      parsedIntent: contribution.intent,
      parsedConfidence: contribution.confidence,
      hasItems: contribution.flags.hasItems,
      hasDeliveryAddress: contribution.flags.hasDeliveryAddress,
      hasPaymentIntent: contribution.flags.hasPaymentIntent,
      hasClosingSignal: contribution.flags.hasClosingSignal,
    });

    if (linkResult.skipped) {
      return {
        skipped: true,
        reason: linkResult.reason,
        draftId: linkResult.draftId,
      };
    }

    const aggregate = draft.aggregatedData;

    if (contribution.flags.hasDeliveryAddress && contribution.delivery?.address) {
      await tx.customer.update({
        where: { id: whatsappMessage.customerId },
        data: { defaultDeliveryAddress: contribution.delivery.address },
      });
    }

    const shouldCloseEarly = shouldCloseDraftEarly(aggregate);
    if (!shouldCloseEarly) {
      return {
        skipped: false,
        action:
          origin === 'reused_awaiting_reply'
            ? 'updated_awaiting_reply_draft'
            : origin === 'reused_open'
            ? 'updated_open_draft'
            : origin === 'post_commit_amendment'
              ? 'created_post_commit_amendment_draft'
              : 'created_new_draft',
        draftId: draft.id,
        draftStatus: 'OPEN',
        linkedOrderId: draft.orderId ?? null,
        commitDeadlineAt: draft.commitDeadlineAt,
        shouldScheduleTimeout: true,
        mergedFlags: aggregate?.flags ?? null,
        draftControl: aggregate?.control ?? null,
        reviewFlags: aggregate?.reviewFlags ?? null,
      };
    }

    const createdOrder = await createOrderFromDraftTx(tx, {
      draft,
      aggregate,
      closeReason: 'EARLY_SIGNAL',
    });

    const closedDraft = await tx.orderDraft.update({
      where: { id: draft.id },
      data: createdOrder
        ? {
            status: 'COMMITTED',
            closeReason: 'EARLY_SIGNAL',
            orderId: createdOrder.id,
            committedAt: new Date(),
            closedAt: new Date(),
          }
        : {
            status: 'READY_FOR_REVIEW',
            closeReason: 'EARLY_SIGNAL',
            closedAt: new Date(),
          },
    });

    return {
      skipped: false,
      action: 'closed_early',
      draftId: closedDraft.id,
      draftStatus: closedDraft.status,
      orderId: createdOrder?.id ?? null,
      linkedOrderId: draft.orderId ?? null,
      shouldScheduleTimeout: false,
      commitDeadlineAt: null,
      mergedFlags: aggregate?.flags ?? null,
      draftControl: aggregate?.control ?? null,
      reviewFlags: aggregate?.reviewFlags ?? null,
    };
  });

  if (!action.skipped) {
    logJson('info', 'order_draft_upserted_from_llm', {
      providerMessageId: normalizedMessage?.messageId ?? null,
      persistedMessageId,
      ...action,
    });

    await publishRealtimeEvent({
      topic: 'orders-drafts',
      event: 'draft_upserted_from_llm',
      payload: {
        draftId: action.draftId ?? null,
        draftStatus: action.draftStatus ?? null,
        orderId: action.orderId ?? null,
      },
    }).catch(() => {});

    if (action.orderId) {
      await publishRealtimeEvent({
        topic: 'orders',
        event: 'order_created_from_draft',
        payload: { orderId: action.orderId },
      }).catch(() => {});
    }
  }

  return action;
}

export async function finalizeOrderDraftIfDue({ draftId, force = false, closeReason = 'TIMEOUT' }) {
  if (!draftId) return { skipped: true, reason: 'missing_draft_id' };
  const config = getOrderDraftConfig();

  const result = await prisma.$transaction(async (tx) => {
    const draft = await tx.orderDraft.findUnique({ where: { id: draftId } });
    if (!draft) return { skipped: true, reason: 'draft_not_found' };
    if (draft.status !== 'OPEN') {
      return { skipped: true, reason: 'draft_not_open', draftStatus: draft.status };
    }

    const now = new Date();
    if (!force && new Date(draft.commitDeadlineAt).getTime() > now.getTime()) {
      return {
        skipped: true,
        reason: 'draft_not_due_yet',
        draftStatus: draft.status,
        commitDeadlineAt: draft.commitDeadlineAt,
      };
    }

    const aggregate = draft.aggregatedData;
    const shouldCreateOrder = shouldCreateOrderOnTimeout(aggregate, config);

    if (shouldCreateOrder) {
      const createdOrder = await createOrderFromDraftTx(tx, {
        draft,
        aggregate,
        closeReason,
      });

      const updated = await tx.orderDraft.update({
        where: { id: draft.id },
        data: {
          status: createdOrder ? 'COMMITTED' : 'READY_FOR_REVIEW',
          closeReason,
          orderId: createdOrder?.id ?? null,
          committedAt: createdOrder ? now : null,
          timedOutAt: closeReason === 'TIMEOUT' ? now : null,
          closedAt: now,
        },
      });

      return {
        skipped: false,
        action: createdOrder ? 'created_order_from_timeout' : 'timeout_ready_for_review',
        draftId: updated.id,
        draftStatus: updated.status,
        orderId: createdOrder?.id ?? null,
      };
    }

    const updated = await tx.orderDraft.update({
      where: { id: draft.id },
      data: {
        status: 'READY_FOR_REVIEW',
        closeReason,
        timedOutAt: closeReason === 'TIMEOUT' ? now : null,
        closedAt: now,
        lastLlmDecision: {
          ...(draft.lastLlmDecision && typeof draft.lastLlmDecision === 'object' ? draft.lastLlmDecision : {}),
          reviewReason: buildDraftReviewReason(aggregate),
        },
      },
    });

    return {
      skipped: false,
      action: 'timeout_ready_for_review',
      draftId: updated.id,
      draftStatus: updated.status,
      orderId: null,
      reviewReason: buildDraftReviewReason(aggregate),
    };
  });

  if (!result.skipped) {
    logJson('info', 'order_draft_finalize_result', { draftId, closeReason, ...result });

    await publishRealtimeEvent({
      topic: 'orders-drafts',
      event: 'draft_finalized',
      payload: {
        draftId: result.draftId ?? draftId,
        draftStatus: result.draftStatus ?? null,
        orderId: result.orderId ?? null,
      },
    }).catch(() => {});

    if (result.orderId) {
      await publishRealtimeEvent({
        topic: 'orders',
        event: 'order_created_from_draft',
        payload: { orderId: result.orderId },
      }).catch(() => {});
    }
  }

  return result;
}
