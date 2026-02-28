import { NextResponse } from 'next/server';
import { cancelOrderDraftById } from '../../../../../../backend/orders/order-admin-actions.js';

export const runtime = 'nodejs';

export async function POST(request, context) {
  try {
    const params = await context.params;
    const draftId = params?.id;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason : null;

    const result = await cancelOrderDraftById({ draftId, reason });
    if (!result.ok) {
      return NextResponse.json(result, { status: result.reason === 'draft_not_found' ? 404 : 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to cancel draft' },
      { status: 500 },
    );
  }
}

