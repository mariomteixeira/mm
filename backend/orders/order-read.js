import { prisma } from '../db/prisma-client.js';

function toIso(value) {
  if (!value) return null;
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

function parseOrderInterpretedText(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function listOrders({ status = 'ALL', limit = 100 } = {}) {
  const normalizedStatus = String(status || 'ALL').toUpperCase();
  const where =
    normalizedStatus === 'ALL'
      ? { status: { in: ['NEW_ORDER', 'IN_PICKING', 'WAITING_COURIER', 'OUT_FOR_DELIVERY', 'COMPLETED'] } }
      : { status: normalizedStatus };

  const orders = await prisma.order.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    take: Math.min(Math.max(Number(limit) || 100, 1), 300),
    include: {
      customer: {
        select: { id: true, name: true, phone: true, phoneE164: true, totalOrders: true },
      },
      items: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, productName: true, quantity: true, unit: true },
      },
      _count: {
        select: { items: true },
      },
    },
  });

  const customerIds = [...new Set(orders.map((order) => order.customerId).filter(Boolean))];
  const groupedCounts = customerIds.length
    ? await prisma.order.groupBy({
        by: ['customerId'],
        where: {
          customerId: { in: customerIds },
          status: { not: 'CANCELED' },
        },
        _count: { _all: true },
      })
    : [];
  const countByCustomerId = new Map(
    groupedCounts.map((item) => [item.customerId, Number(item._count?._all ?? 0)]),
  );

  const withDailySequence = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const dailyCounter = new Map();
  const dailyNumberByOrderId = new Map();
  const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });

  for (const order of withDailySequence) {
    const dayKey = dayFormatter.format(new Date(order.createdAt));
    const nextValue = (dailyCounter.get(dayKey) ?? 0) + 1;
    dailyCounter.set(dayKey, nextValue);
    dailyNumberByOrderId.set(order.id, nextValue);
  }

  return orders.map((order) => {
    const parsed = parseOrderInterpretedText(order.interpretedText);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      displayOrderNumber: dailyNumberByOrderId.get(order.id) ?? order.orderNumber,
      status: order.status,
      customer: {
        ...order.customer,
        totalOrders: countByCustomerId.get(order.customerId) ?? order.customer?.totalOrders ?? 0,
      },
      deliveryAddress: order.deliveryAddress,
      paymentIntent: parsed?.paymentIntent ?? null,
      notes: order.notes,
      canceledAt: toIso(order.canceledAt),
      cancelReason: order.cancelReason,
      createdAt: toIso(order.createdAt),
      updatedAt: toIso(order.updatedAt),
      items: order.items,
      counts: { items: order._count.items },
    };
  });
}
