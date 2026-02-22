import crypto from 'node:crypto';
import { prisma } from '../db/prisma-client.js';
import { normalizePhoneDigits, normalizePhoneE164 } from '../shared/utils/phone.js';
import {
  buildMessageStatusTimestamps,
  mapProviderStatusToDbStatus,
} from './status-mapping.js';

function eventKeyForStatus(statusEvent) {
  const base = [
    statusEvent.messageId ?? '',
    statusEvent.status ?? '',
    statusEvent.providerTimestamp ?? '',
    statusEvent.recipientPhoneE164 ?? '',
  ].join('|');

  return crypto.createHash('sha256').update(base).digest('hex');
}

async function ensureCustomerByPhone({ name, phoneE164 }) {
  const phoneDigits = normalizePhoneDigits(phoneE164);
  const normalizedE164 = normalizePhoneE164(phoneE164);

  if (!phoneDigits) {
    throw new Error('Cannot ensure customer without phone');
  }

  const existing = await prisma.customer.findFirst({
    where: {
      OR: [{ phoneE164: normalizedE164 }, { phone: phoneDigits }],
    },
  });

  if (existing) {
    if ((name && !existing.name) || (normalizedE164 && !existing.phoneE164)) {
      return prisma.customer.update({
        where: { id: existing.id },
        data: {
          ...(name && !existing.name ? { name } : {}),
          ...(normalizedE164 && !existing.phoneE164 ? { phoneE164: normalizedE164 } : {}),
        },
      });
    }

    return existing;
  }

  return prisma.customer.create({
    data: {
      name: name ?? null,
      phone: phoneDigits,
      phoneE164: normalizedE164,
    },
  });
}

async function findOrCreateOutboundMessageFromStatus(statusEvent) {
  const customer = await ensureCustomerByPhone({
    name: null,
    phoneE164: statusEvent.recipientPhoneE164,
  });

  const dbStatus = mapProviderStatusToDbStatus(statusEvent.status) ?? 'QUEUED';
  const timestampFields = buildMessageStatusTimestamps(
    statusEvent.status,
    statusEvent.providerTimestampIso,
  );

  const existing = await prisma.whatsAppMessage.findFirst({
    where: {
      OR: [
        { providerMessageId: statusEvent.messageId ?? undefined },
        {
          AND: [
            { customerId: customer.id },
            { direction: 'OUTBOUND' },
            { providerMessageId: null },
          ],
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    const updated = await prisma.whatsAppMessage.update({
      where: { id: existing.id },
      data: {
        providerMessageId: statusEvent.messageId ?? existing.providerMessageId,
        status: dbStatus,
        ...timestampFields,
        content: existing.content ?? { source: 'status_webhook_placeholder' },
      },
    });

    return { message: updated, customer, created: false };
  }

  const created = await prisma.whatsAppMessage.create({
    data: {
      customerId: customer.id,
      direction: 'OUTBOUND',
      type: 'TEXT',
      toPhoneE164: statusEvent.recipientPhoneE164 ?? customer.phoneE164 ?? `+${customer.phone}`,
      providerMessageId: statusEvent.messageId,
      status: dbStatus,
      provider: 'META_CLOUD_API',
      content: {
        source: 'status_webhook_placeholder',
        note: 'Message record created from status webhook before outbound send persistence exists',
      },
      ...timestampFields,
    },
  });

  return { message: created, customer, created: true };
}

export async function persistOutboundStatusWebhook(statusEvent) {
  if (!statusEvent?.messageId || !statusEvent?.status) {
    return { skipped: true, reason: 'missing_message_id_or_status' };
  }

  const { message, created } = await findOrCreateOutboundMessageFromStatus(statusEvent);

  const dbStatus = mapProviderStatusToDbStatus(statusEvent.status);
  if (!dbStatus) {
    return {
      skipped: true,
      reason: 'unsupported_status',
      messageId: message.id,
      providerMessageId: message.providerMessageId,
    };
  }

  const eventKey = eventKeyForStatus(statusEvent);
  const providerTimestamp = statusEvent.providerTimestampIso
    ? new Date(statusEvent.providerTimestampIso)
    : null;

  await prisma.whatsAppMessageEvent.upsert({
    where: { eventKey },
    update: {},
    create: {
      whatsappMessageId: message.id,
      eventKey,
      providerMessageId: statusEvent.messageId,
      status: dbStatus,
      providerStatus: statusEvent.status,
      providerTimestamp,
      payload: statusEvent.raw ?? statusEvent,
    },
  });

  return {
    skipped: false,
    createdMessagePlaceholder: created,
    messageId: message.id,
    providerMessageId: message.providerMessageId,
    status: dbStatus,
    eventKey,
  };
}

export async function persistInboundMessageWebhook(normalizedMessage) {
  if (!normalizedMessage?.messageId) {
    return { skipped: true, reason: 'missing_message_id' };
  }

  const customer = await ensureCustomerByPhone({
    name: normalizedMessage.customerName ?? null,
    phoneE164: normalizedMessage.fromPhoneE164,
  });

  const existing = await prisma.whatsAppMessage.findFirst({
    where: { providerMessageId: normalizedMessage.messageId },
  });

  if (existing) {
    return { skipped: true, reason: 'duplicate_inbound_message', messageId: existing.id };
  }

  const created = await prisma.whatsAppMessage.create({
    data: {
      customerId: customer.id,
      direction: 'INBOUND',
      type: normalizedMessage.messageType === 'text' ? 'TEXT' : 'TEXT',
      toPhoneE164:
        normalizedMessage.toBusinessPhoneE164 ?? normalizedMessage.toBusinessPhone ?? '+00000000000',
      provider: 'META_CLOUD_API',
      providerMessageId: normalizedMessage.messageId,
      status: 'DELIVERED',
      deliveredAt: normalizedMessage.providerTimestampIso
        ? new Date(normalizedMessage.providerTimestampIso)
        : null,
      content: {
        messageType: normalizedMessage.messageType,
        textBody: normalizedMessage.textBody,
        asset: normalizedMessage.asset,
        raw: normalizedMessage.raw,
      },
    },
  });

  return { skipped: false, messageId: created.id, providerMessageId: created.providerMessageId };
}

export async function persistOutboundMessageAccepted({
  toPhone,
  providerMessageId,
  messageType = 'TEXT',
  content,
  customerName = null,
  campaignId = null,
  campaignRecipientId = null,
  templateId = null,
  variables = null,
}) {
  const phoneE164 = normalizePhoneE164(toPhone);
  const customer = await ensureCustomerByPhone({
    name: customerName,
    phoneE164,
  });

  const existing = providerMessageId
    ? await prisma.whatsAppMessage.findFirst({ where: { providerMessageId } })
    : null;

  if (existing) {
    return { message: existing, created: false };
  }

  const message = await prisma.whatsAppMessage.create({
    data: {
      customerId: customer.id,
      campaignId,
      campaignRecipientId,
      templateId,
      direction: 'OUTBOUND',
      type: messageType,
      toPhoneE164: phoneE164 ?? `+${customer.phone}`,
      providerMessageId: providerMessageId ?? null,
      status: 'QUEUED',
      content: content ?? null,
      variables,
    },
  });

  return { message, created: true };
}
