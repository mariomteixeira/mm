import { NextResponse } from 'next/server';
import {
  handleWhatsAppWebhookEvent,
  handleWhatsAppWebhookVerify,
} from '../../../../backend/webhooks/whatsapp-webhook-handler.js';

export const runtime = 'nodejs';

export async function GET(request) {
  const result = handleWhatsAppWebhookVerify(request);
  if (result.ok) {
    return new NextResponse(result.challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 });
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const payload = rawBody ? JSON.parse(rawBody) : {};

    await handleWhatsAppWebhookEvent({
      request,
      rawBody,
      payload,
    });

    // ACK fast to avoid retries from Meta.
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        event: 'whatsapp_webhook_post_parse_error',
        errorName: error?.name ?? 'Error',
        errorMessage: error?.message ?? 'Unknown error',
        errorStack: error?.stack ?? null,
      }),
    );
    // Return 200 to avoid unnecessary repeated deliveries while developing.
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
