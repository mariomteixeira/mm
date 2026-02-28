import { prisma } from '../db/prisma-client.js';
import { normalizePhoneE164 } from '../shared/utils/phone.js';
import { sendWhatsAppTextMessage } from '../whatsapp/send-text-message.js';
import { publishRealtimeEvent } from '../realtime/realtime-events.js';

function extractMessageText(content) {
  if (!content || typeof content !== 'object') return null;
  if (typeof content.text === 'string' && content.text.trim()) return content.text.trim();
  if (content.text && typeof content.text === 'object' && typeof content.text.body === 'string') {
    return content.text.body.trim();
  }
  if (typeof content.body === 'string' && content.body.trim()) return content.body.trim();
  return null;
}

function toIso(value) {
  if (!value) return null;
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

function getSaoPauloDayStartUtc() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const year = get('year');
  const month = get('month');
  const day = get('day');
  if (!year || !month || !day) return null;
  return new Date(`${year}-${month}-${day}T00:00:00-03:00`);
}

export async function listOrderConversationMessages({
  orderId,
  limit = 40,
  before,
  todayOnly = true,
} = {}) {
  if (!orderId) throw new Error('orderId is required');

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerId: true,
      customer: { select: { id: true, name: true, phone: true, phoneE164: true } },
    },
  });
  if (!order) return { ok: false, reason: 'order_not_found' };

  const safeLimit = Math.min(Math.max(Number(limit) || 40, 1), 100);
  const where = {
    customerId: order.customerId,
    ...(before ? { createdAt: { lt: new Date(before) } } : {}),
  };

  if (todayOnly) {
    const start = getSaoPauloDayStartUtc();
    if (start) {
      where.createdAt = {
        ...(where.createdAt || {}),
        gte: start,
      };
    }
  }

  const rows = await prisma.whatsAppMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: safeLimit + 1,
    select: {
      id: true,
      direction: true,
      type: true,
      content: true,
      createdAt: true,
      status: true,
      sentAt: true,
      deliveredAt: true,
      readAt: true,
      providerMessageId: true,
    },
  });

  const hasMore = rows.length > safeLimit;
  const page = hasMore ? rows.slice(0, safeLimit) : rows;
  const messages = page
    .map((row) => ({
      id: row.id,
      direction: row.direction,
      type: row.type,
      text: extractMessageText(row.content),
      createdAt: toIso(row.createdAt),
      status: row.status,
      sentAt: toIso(row.sentAt),
      deliveredAt: toIso(row.deliveredAt),
      readAt: toIso(row.readAt),
      providerMessageId: row.providerMessageId ?? null,
    }))
    .reverse();

  return {
    ok: true,
    order: {
      id: order.id,
      customer: order.customer,
    },
    todayOnly: Boolean(todayOnly),
    hasMore,
    nextBefore: hasMore ? toIso(page[page.length - 1]?.createdAt) : null,
    messages,
  };
}

export async function sendOrderConversationMessage({ orderId, text }) {
  if (!orderId) throw new Error('orderId is required');
  const body = String(text ?? '').trim();
  if (!body) return { ok: false, reason: 'empty_text' };

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

  const to = normalizePhoneE164(order.customer.phoneE164 ?? order.customer.phone);
  if (!to) return { ok: false, reason: 'missing_customer_phone' };

  const sent = await sendWhatsAppTextMessage({
    to,
    body,
    customerName: order.customer.name ?? null,
  });

  const persistedMessageId = sent?.persisted?.message?.id ?? null;
  const message = persistedMessageId
    ? await prisma.whatsAppMessage.findUnique({
        where: { id: persistedMessageId },
        select: {
          id: true,
          direction: true,
          type: true,
          content: true,
          createdAt: true,
          status: true,
          sentAt: true,
          deliveredAt: true,
          readAt: true,
          providerMessageId: true,
        },
      })
    : null;

  await publishRealtimeEvent({
    topic: 'orders',
    event: 'conversation_message_sent',
    payload: { orderId, customerId: order.customerId, messageId: message?.id ?? null },
  }).catch(() => {});

  return {
    ok: true,
    orderId,
    message: message
      ? {
          id: message.id,
          direction: message.direction,
          type: message.type,
          text: extractMessageText(message.content),
          createdAt: toIso(message.createdAt),
          status: message.status,
          sentAt: toIso(message.sentAt),
          deliveredAt: toIso(message.deliveredAt),
          readAt: toIso(message.readAt),
          providerMessageId: message.providerMessageId ?? null,
        }
      : null,
  };
}
