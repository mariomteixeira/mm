import { prisma } from '../db/prisma-client.js';

function toIso(value) {
  if (!value) return null;
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

function safeObject(value) {
  return value && typeof value === 'object' ? value : {};
}

export async function listOrderDrafts({ status, limit = 50 } = {}) {
  const where = status ? { status } : undefined;

  const drafts = await prisma.orderDraft.findMany({
    where,
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    take: Math.min(Math.max(Number(limit) || 50, 1), 200),
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          phoneE164: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          canceledAt: true,
          cancelReason: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 5,
        select: {
          id: true,
          sequence: true,
          messageText: true,
          parsedIntent: true,
          parsedConfidence: true,
          hasItems: true,
          hasDeliveryAddress: true,
          hasPaymentIntent: true,
          hasClosingSignal: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  const mapped = drafts.map((draft) => {
    const aggregate = safeObject(draft.aggregatedData);
    const flags = safeObject(aggregate.flags);
    const stats = safeObject(aggregate.stats);
    const delivery = safeObject(aggregate.delivery);
    const control = safeObject(aggregate.control);
    const reviewFlags = safeObject(aggregate.reviewFlags);
    const items = Array.isArray(aggregate.items) ? aggregate.items : [];

    return {
      id: draft.id,
      status: draft.status,
      closeReason: draft.closeReason,
      customer: draft.customer,
      order: draft.order
        ? {
            ...draft.order,
            createdAt: toIso(draft.order.createdAt),
            canceledAt: toIso(draft.order.canceledAt),
          }
        : null,
      openedAt: toIso(draft.openedAt),
      lastMessageAt: toIso(draft.lastMessageAt),
      commitDeadlineAt: toIso(draft.commitDeadlineAt),
      committedAt: toIso(draft.committedAt),
      timedOutAt: toIso(draft.timedOutAt),
      closedAt: toIso(draft.closedAt),
      createdAt: toIso(draft.createdAt),
      updatedAt: toIso(draft.updatedAt),
      aggregatedTextPreview: typeof draft.aggregatedText === 'string' ? draft.aggregatedText.slice(0, 300) : null,
      aggregate: {
        paymentIntent: aggregate.paymentIntent ?? null,
        closingSignals: Array.isArray(aggregate.closingSignals) ? aggregate.closingSignals : [],
        ambiguities: Array.isArray(aggregate.ambiguities) ? aggregate.ambiguities : [],
        delivery: {
          address: delivery.address ?? null,
          neighborhood: delivery.neighborhood ?? null,
          reference: delivery.reference ?? null,
        },
        flags: {
          hasItems: Boolean(flags.hasItems),
          hasDeliveryAddress: Boolean(flags.hasDeliveryAddress),
          hasPaymentIntent: Boolean(flags.hasPaymentIntent),
          hasClosingSignal: Boolean(flags.hasClosingSignal),
          hasQuestionSignal: Boolean(flags.hasQuestionSignal),
        },
        control: {
          pauseForClarification: Boolean(control.pauseForClarification),
          awaitingCustomerReply: Boolean(control.awaitingCustomerReply),
          awaitingReplyType:
            typeof control.awaitingReplyType === 'string' ? control.awaitingReplyType : null,
          awaitingReplyUntil:
            typeof control.awaitingReplyUntil === 'string' ? control.awaitingReplyUntil : null,
        },
        reviewFlags: {
          hasUnclassifiedContextMessage: Boolean(reviewFlags.hasUnclassifiedContextMessage),
        },
        stats: {
          messageCount: Number(stats.messageCount ?? draft._count.messages ?? 0),
          itemCount: Number(stats.itemCount ?? items.length),
        },
        itemsPreview: items.slice(0, 10),
      },
      messagesPreview: draft.messages.map((m) => ({
        ...m,
        createdAt: toIso(m.createdAt),
        messageText: typeof m.messageText === 'string' ? m.messageText.slice(0, 180) : null,
      })),
      counts: {
        messages: draft._count.messages,
      },
    };
  });

  mapped.sort((a, b) => {
    const statusCmp = String(a.status).localeCompare(String(b.status));
    if (statusCmp !== 0) return statusCmp;
    const orderA = a.order?.orderNumber ?? -1;
    const orderB = b.order?.orderNumber ?? -1;
    if (orderA !== orderB) return orderB - orderA;
    return String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''));
  });

  return mapped;
}
