import { NextResponse } from 'next/server';
import { listOrders } from '../../../backend/orders/order-read.js';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const limit = Number(searchParams.get('limit') || '100');
    const orders = await listOrders({ status, limit });
    return NextResponse.json({
      ok: true,
      status,
      count: orders.length,
      orders,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to list orders' },
      { status: 500 },
    );
  }
}

