import { NextResponse } from 'next/server';
import { sendDraftCustomerQuestion } from '../../../../../../backend/orders/order-admin-actions.js';

export const runtime = 'nodejs';

export async function POST(request, context) {
  try {
    const params = await context.params;
    const draftId = params?.id;
    const body = await request.json().catch(() => ({}));
    const type = typeof body?.type === 'string' ? body.type : null;

    const result = await sendDraftCustomerQuestion({ draftId, type });
    if (!result.ok) {
      const status = result.reason === 'draft_not_found' ? 404 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to send customer question' },
      { status: 500 },
    );
  }
}

