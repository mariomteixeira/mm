import { NextResponse } from 'next/server';
import {
  moveOrderStatusById,
  notifyOrderStatusChange,
} from '../../../../../../backend/orders/order-admin-actions.js';

export const runtime = 'nodejs';

export async function POST(request, context) {
  try {
    const params = await context.params;
    const orderId = params?.id;
    const body = await request.json().catch(() => ({}));
    const toStatus = typeof body?.toStatus === 'string' ? body.toStatus : null;

    const result = await moveOrderStatusById({ orderId, toStatus });
    if (!result.ok) {
      const status =
        result.reason === 'order_not_found'
          ? 404
          : result.reason === 'invalid_target_status'
            ? 422
            : result.reason === 'invalid_status_transition' || result.reason === 'order_completed_locked'
              ? 409
            : 400;
      return NextResponse.json(result, { status });
    }

    let notification = { sent: false, skipped: true, reason: 'status_has_no_customer_notification' };
    if (!result.unchanged && result.toStatus !== 'COMPLETED') {
      try {
        notification = await notifyOrderStatusChange({ orderId, toStatus: result.toStatus });
      } catch (notifyError) {
        notification = {
          sent: false,
          skipped: false,
          reason: 'notification_failed',
          error: notifyError?.message || 'Failed to notify customer',
        };
      }
    }

    return NextResponse.json({ ...result, notification });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to move order status' },
      { status: 500 },
    );
  }
}
