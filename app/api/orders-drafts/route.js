import { NextResponse } from 'next/server';
import { listOrderDrafts } from '../../../backend/orders/order-draft-read.js';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = Number(searchParams.get('limit') || '50');

    const drafts = await listOrderDrafts({ status, limit });
    return NextResponse.json({
      ok: true,
      now: new Date().toISOString(),
      count: drafts.length,
      drafts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to list order drafts',
      },
      { status: 500 },
    );
  }
}

