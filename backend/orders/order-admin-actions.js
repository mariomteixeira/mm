import { prisma } from '../db/prisma-client.js';
import { finalizeOrderDraftIfDue } from './order-draft-service.js';
import { sendWhatsAppTextMessage } from '../whatsapp/send-text-message.js';
import { getOrderDraftConfig } from './order-draft-config.js';
import { normalizePhoneE164 } from '../shared/utils/phone.js';
import { publishRealtimeEvent } from '../realtime/realtime-events.js';

export async function cancelOrderById({ orderId, reason = null }) {
  if (!orderId) throw new Error('orderId is required');

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, canceledAt: true },
    });

    if (!order) {
      return { ok: false, reason: 'order_not_found' };
    }

    if (order.status === 'CANCELED') {
      return { ok: true, alreadyCanceled: true, orderId: order.id, status: order.status };
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        cancelReason: reason ?? 'manual_admin_cancel',
      },
    });

    await tx.statusHistory.create({
      data: {
        orderId: updated.id,
        fromStatus: order.status,
        toStatus: 'CANCELED',
        changedBy: 'ADMIN_MANUAL_CANCEL',
      },
    });

    return {
      ok: true,
      alreadyCanceled: false,
      orderId: updated.id,
      status: updated.status,
      canceledAt: updated.canceledAt?.toISOString() ?? null,
      cancelReason: updated.cancelReason ?? null,
    };
  });

  if (result?.ok && !result?.alreadyCanceled) {
    await publishRealtimeEvent({
      topic: 'orders',
      event: 'order_canceled',
      payload: { orderId: result.orderId, status: result.status },
    }).catch(() => {});
    await publishRealtimeEvent({
      topic: 'orders-drafts',
      event: 'order_canceled',
      payload: { orderId: result.orderId, status: result.status },
    }).catch(() => {});
  }

  return result;
}

const ORDER_FLOW_STATUSES = [
  'NEW_ORDER',
  'IN_PICKING',
  'WAITING_COURIER',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
];
const ORDER_STATUS_TRANSITIONS = {
  NEW_ORDER: ['IN_PICKING'],
  IN_PICKING: ['WAITING_COURIER'],
  WAITING_COURIER: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['COMPLETED'],
  COMPLETED: [],
};

export async function moveOrderStatusById({ orderId, toStatus }) {
  if (!orderId) throw new Error('orderId is required');
  if (!toStatus) throw new Error('toStatus is required');
  if (!ORDER_FLOW_STATUSES.includes(toStatus)) {
    return { ok: false, reason: 'invalid_target_status' };
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!order) return { ok: false, reason: 'order_not_found' };
    if (order.status === 'CANCELED') return { ok: false, reason: 'order_canceled' };
    if (order.status === 'COMPLETED') return { ok: false, reason: 'order_completed_locked' };
    if (order.status === toStatus) {
      return { ok: true, unchanged: true, orderId: order.id, status: order.status };
    }
    const allowedTargets = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowedTargets.includes(toStatus)) {
      return { ok: false, reason: 'invalid_status_transition', fromStatus: order.status, toStatus };
    }

    const now = new Date();
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: toStatus,
        ...(toStatus === 'IN_PICKING' ? { pickingStartedAt: now } : {}),
        ...(toStatus === 'WAITING_COURIER' ? { pickingFinishedAt: now } : {}),
        ...(toStatus === 'OUT_FOR_DELIVERY' ? { outForDeliveryAt: now } : {}),
      },
    });

    await tx.statusHistory.create({
      data: {
        orderId: updated.id,
        fromStatus: order.status,
        toStatus,
        changedBy: 'ADMIN_MOVE_STATUS',
      },
    });

    return {
      ok: true,
      unchanged: false,
      orderId: updated.id,
      fromStatus: order.status,
      toStatus: updated.status,
    };
  });

  if (result?.ok && !result?.unchanged) {
    await publishRealtimeEvent({
      topic: 'orders',
      event: 'order_status_changed',
      payload: { orderId: result.orderId, fromStatus: result.fromStatus, toStatus: result.toStatus },
    }).catch(() => {});
    await publishRealtimeEvent({
      topic: 'orders-drafts',
      event: 'order_status_changed',
      payload: { orderId: result.orderId, fromStatus: result.fromStatus, toStatus: result.toStatus },
    }).catch(() => {});
  }

  return result;
}

export async function cancelOrderDraftById({ draftId, reason = null }) {
  if (!draftId) throw new Error('draftId is required');

  const result = await prisma.$transaction(async (tx) => {
    const draft = await tx.orderDraft.findUnique({
      where: { id: draftId },
      select: { id: true, status: true, orderId: true },
    });

    if (!draft) {
      return { ok: false, reason: 'draft_not_found' };
    }

    if (draft.status === 'CANCELED') {
      return { ok: true, alreadyCanceled: true, draftId: draft.id, status: draft.status };
    }

    const updated = await tx.orderDraft.update({
      where: { id: draft.id },
      data: {
        status: 'CANCELED',
        closeReason: 'MANUAL',
        closedAt: new Date(),
      },
    });

    return {
      ok: true,
      alreadyCanceled: false,
      draftId: updated.id,
      status: updated.status,
      linkedOrderId: draft.orderId ?? null,
      cancelReason: reason ?? 'manual_admin_cancel',
    };
  });

  if (result?.ok && !result?.alreadyCanceled) {
    await publishRealtimeEvent({
      topic: 'orders-drafts',
      event: 'draft_canceled',
      payload: { draftId: result.draftId, status: result.status },
    }).catch(() => {});
  }

  return result;
}

export async function forceFinalizeOrderDraftById({ draftId }) {
  if (!draftId) throw new Error('draftId is required');
  const result = await finalizeOrderDraftIfDue({
    draftId,
    force: true,
    closeReason: 'MANUAL',
  });
  const output = { ok: !result?.skipped, result };
  if (!result?.skipped) {
    await publishRealtimeEvent({
      topic: 'orders-drafts',
      event: 'draft_finalized_manual',
      payload: { draftId: result?.draftId ?? draftId, status: result?.draftStatus ?? null, orderId: result?.orderId ?? null },
    }).catch(() => {});

    if (result?.orderId) {
      await publishRealtimeEvent({
        topic: 'orders',
        event: 'order_created_from_draft',
        payload: { orderId: result.orderId },
      }).catch(() => {});
    }
  }
  return output;
}

function buildPromptMessageByType(type) {
  if (type === 'address') return 'Qual o endereço de entrega, por favor?';
  if (type === 'payment') return 'Qual a forma de pagamento, por favor? (pix, dinheiro, cartão)';
  return null;
}

function buildStatusMessage(status) {
  if (status === 'IN_PICKING') return 'Seu pedido está em separação 🛒';
  if (status === 'WAITING_COURIER') return 'Seu pedido foi separado e está aguardando sair para entrega 🚚';
  if (status === 'OUT_FOR_DELIVERY') return 'Seu pedido saiu para entrega e logo chegará 🛵';
  return null;
}

export async function notifyOrderStatusChange({ orderId, toStatus }) {
  const body = buildStatusMessage(toStatus);
  if (!orderId || !body) return { sent: false, skipped: true, reason: 'no_notification_for_status' };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        select: { id: true, name: true, phone: true, phoneE164: true },
      },
    },
  });
  if (!order || !order.customer) return { sent: false, skipped: true, reason: 'order_or_customer_not_found' };

  const to = normalizePhoneE164(order.customer.phoneE164 ?? order.customer.phone);
  if (!to) return { sent: false, skipped: true, reason: 'missing_customer_phone' };

  const sendResult = await sendWhatsAppTextMessage({
    to,
    body,
    customerName: order.customer.name ?? null,
  });

  return {
    sent: true,
    skipped: false,
    providerMessageId: sendResult?.api?.messages?.[0]?.id ?? null,
  };
}

export async function sendDraftCustomerQuestion({ draftId, type }) {
  if (!draftId) throw new Error('draftId is required');
  if (!type) throw new Error('type is required');

  const body = buildPromptMessageByType(type);
  if (!body) return { ok: false, reason: 'unsupported_question_type' };

  const config = getOrderDraftConfig();

  const draft = await prisma.orderDraft.findUnique({
    where: { id: draftId },
    include: {
      customer: {
        select: { id: true, name: true, phone: true, phoneE164: true },
      },
      order: {
        select: { id: true, status: true },
      },
    },
  });

  if (!draft) return { ok: false, reason: 'draft_not_found' };

  const targetDraft = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const replyUntil = new Date(now.getTime() + config.askReplyWindowMs);

    const mergeAwaitingControl = (aggregatedData) => {
      const base = aggregatedData && typeof aggregatedData === 'object' ? aggregatedData : {};
      const control = base.control && typeof base.control === 'object' ? base.control : {};
      return {
        ...base,
        control: {
          ...control,
          pauseForClarification: false,
          awaitingCustomerReply: true,
          awaitingReplyType: type,
          awaitingReplySince: now.toISOString(),
          awaitingReplyUntil: replyUntil.toISOString(),
        },
      };
    };

    // Reopen and pin this same draft when possible.
    if (draft.status === 'OPEN' || draft.status === 'READY_FOR_REVIEW') {
      return tx.orderDraft.update({
        where: { id: draft.id },
        data: {
          status: 'OPEN',
          closeReason: null,
          timedOutAt: null,
          closedAt: null,
          commitDeadlineAt: replyUntil,
          aggregatedData: mergeAwaitingControl(draft.aggregatedData),
        },
      });
    }

    // If this draft is already committed and linked to an active order, create/reuse an amendment draft
    // so the customer reply keeps going to the same order context.
    if (draft.status === 'COMMITTED' && draft.orderId && draft.order && ['NEW_ORDER', 'IN_PICKING'].includes(draft.order.status)) {
      const existingOpenAmendment = await tx.orderDraft.findFirst({
        where: {
          customerId: draft.customerId,
          orderId: draft.orderId,
          status: 'OPEN',
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (existingOpenAmendment) {
        return tx.orderDraft.update({
          where: { id: existingOpenAmendment.id },
          data: {
            commitDeadlineAt: replyUntil,
            aggregatedData: mergeAwaitingControl(existingOpenAmendment.aggregatedData),
          },
        });
      }

      return tx.orderDraft.create({
        data: {
          customerId: draft.customerId,
          orderId: draft.orderId,
          status: 'OPEN',
          openedAt: now,
          lastMessageAt: now,
          commitDeadlineAt: replyUntil,
          aggregatedData: mergeAwaitingControl({
            version: 1,
            items: [],
            delivery: { address: null, neighborhood: null, reference: null },
            paymentIntent: null,
            observations: [],
            ambiguities: [],
            messages: [],
            flags: {
              hasItems: false,
              hasDeliveryAddress: false,
              hasPaymentIntent: false,
              hasClosingSignal: false,
              hasQuestionSignal: false,
            },
            stats: { messageCount: 0, itemCount: 0 },
            reviewFlags: { hasUnclassifiedContextMessage: false },
          }),
          aggregatedText: null,
        },
      });
    }

    // For canceled/expired etc, do not create hidden state automatically.
    return draft;
  });

  const to = normalizePhoneE164(draft.customer.phoneE164 ?? draft.customer.phone);
  if (!to) return { ok: false, reason: 'missing_customer_phone' };
  const sent = await sendWhatsAppTextMessage({
    to,
    body,
    customerName: draft.customer.name ?? null,
  });

  const output = {
    ok: true,
    draftId: targetDraft.id,
    questionType: type,
    to,
    replyDeadlineAt: targetDraft.commitDeadlineAt?.toISOString?.() ?? null,
    providerMessageId: sent?.api?.messages?.[0]?.id ?? null,
  };

  await publishRealtimeEvent({
    topic: 'orders-drafts',
    event: 'draft_waiting_customer_reply',
    payload: { draftId: targetDraft.id, questionType: type },
  }).catch(() => {});

  return output;
}

export async function sendOrderCustomerQuestion({ orderId, type }) {
  if (!orderId) throw new Error('orderId is required');
  if (!type) throw new Error('type is required');

  const body = buildPromptMessageByType(type);
  if (!body) return { ok: false, reason: 'unsupported_question_type' };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        select: { id: true, name: true, phone: true, phoneE164: true },
      },
    },
  });

  if (!order) return { ok: false, reason: 'order_not_found' };
  if (!order.customer) return { ok: false, reason: 'order_customer_not_found' };

  const config = getOrderDraftConfig();
  const targetDraft = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const replyUntil = new Date(now.getTime() + config.askReplyWindowMs);
    const baseAggregate = {
      version: 1,
      items: [],
      delivery: { address: null, neighborhood: null, reference: null },
      paymentIntent: null,
      observations: [],
      ambiguities: [],
      messages: [],
      flags: {
        hasItems: false,
        hasDeliveryAddress: false,
        hasPaymentIntent: false,
        hasClosingSignal: false,
        hasQuestionSignal: false,
      },
      reviewFlags: { hasUnclassifiedContextMessage: false },
      control: {},
    };

    const mergeControl = (aggregate) => {
      const current = aggregate && typeof aggregate === 'object' ? aggregate : baseAggregate;
      const control = current.control && typeof current.control === 'object' ? current.control : {};
      return {
        ...current,
        control: {
          ...control,
          pauseForClarification: false,
          awaitingCustomerReply: true,
          awaitingReplyType: type,
          awaitingReplySince: now.toISOString(),
          awaitingReplyUntil: replyUntil.toISOString(),
        },
      };
    };

    const existingByOrder = await tx.orderDraft.findFirst({
      where: {
        orderId: order.id,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (existingByOrder) {
      return tx.orderDraft.update({
        where: { id: existingByOrder.id },
        data: {
          status: 'OPEN',
          closeReason: null,
          timedOutAt: null,
          closedAt: null,
          commitDeadlineAt: replyUntil,
          aggregatedData: mergeControl(existingByOrder.aggregatedData),
        },
      });
    }

    return tx.orderDraft.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        status: 'OPEN',
        openedAt: now,
        lastMessageAt: now,
        commitDeadlineAt: replyUntil,
        aggregatedData: mergeControl(baseAggregate),
      },
    });
  });

  const to = normalizePhoneE164(order.customer.phoneE164 ?? order.customer.phone);
  if (!to) return { ok: false, reason: 'missing_customer_phone' };

  const sendResult = await sendWhatsAppTextMessage({
    to,
    body,
    customerName: order.customer.name ?? null,
  });

  const output = {
    ok: true,
    orderId: order.id,
    draftId: targetDraft.id,
    type,
    sentTo: to,
    providerMessageId: sendResult?.api?.messages?.[0]?.id ?? null,
  };

  await publishRealtimeEvent({
    topic: 'orders-drafts',
    event: 'draft_waiting_customer_reply',
    payload: { draftId: targetDraft.id, orderId: order.id, questionType: type },
  }).catch(() => {});

  return output;
}
