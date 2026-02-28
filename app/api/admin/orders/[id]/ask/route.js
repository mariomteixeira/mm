import { NextResponse } from 'next/server';
import { sendOrderCustomerQuestion } from '../../../../../../backend/orders/order-admin-actions.js';

export const runtime = 'nodejs';

export async function POST(request, context) {
  try {
    const params = await context.params;
    const orderId = params?.id;
    const body = await request.json().catch(() => ({}));
    const type = typeof body?.type === 'string' ? body.type : null;

    const result = await sendOrderCustomerQuestion({ orderId, type });
    if (!result.ok) {
      const status = result.reason === 'order_not_found' ? 404 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to send order question' },
      { status: 500 },
    );
  }
}
