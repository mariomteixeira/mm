import { NextResponse } from 'next/server';
import { cancelOrderById } from '../../../../../../backend/orders/order-admin-actions.js';

export const runtime = 'nodejs';

export async function POST(request, context) {
  try {
    const params = await context.params;
    const orderId = params?.id;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason : null;

    const result = await cancelOrderById({ orderId, reason });
    if (!result.ok) {
      return NextResponse.json(result, { status: result.reason === 'order_not_found' ? 404 : 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to cancel order' },
      { status: 500 },
    );
  }
}

