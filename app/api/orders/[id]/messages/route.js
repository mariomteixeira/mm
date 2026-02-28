import { NextResponse } from 'next/server';
import {
  listOrderConversationMessages,
  sendOrderConversationMessage,
} from '../../../../../backend/orders/order-conversation.js';

export const runtime = 'nodejs';

export async function GET(request, context) {
  try {
    const params = await context.params;
    const orderId = params?.id;
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || '40');
    const before = searchParams.get('before') || null;
    const todayOnly = searchParams.get('todayOnly') !== '0';

    const result = await listOrderConversationMessages({
      orderId,
      limit,
      before,
      todayOnly,
    });
    if (!result.ok) {
      return NextResponse.json(result, {
        status: result.reason === 'order_not_found' ? 404 : 400,
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to load conversation' },
      { status: 500 },
    );
  }
}

export async function POST(request, context) {
  try {
    const params = await context.params;
    const orderId = params?.id;
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === 'string' ? body.text : '';

    const result = await sendOrderConversationMessage({ orderId, text });
    if (!result.ok) {
      return NextResponse.json(result, {
        status: result.reason === 'order_not_found' ? 404 : 400,
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to send conversation message' },
      { status: 500 },
    );
  }
}
