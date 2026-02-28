import { NextResponse } from 'next/server';
import { forceFinalizeOrderDraftById } from '../../../../../../backend/orders/order-admin-actions.js';

export const runtime = 'nodejs';

export async function POST(_request, context) {
  try {
    const params = await context.params;
    const draftId = params?.id;

    const result = await forceFinalizeOrderDraftById({ draftId });
    if (!result.ok) {
      const reason = result?.result?.reason;
      return NextResponse.json(result, { status: reason === 'draft_not_found' ? 404 : 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to finalize draft' },
      { status: 500 },
    );
  }
}

