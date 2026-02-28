import { NextResponse } from 'next/server';
import { logWebhookTiming } from '../../../../backend/observability/performance-log.js';
import { writeWebhookErrorFileLog } from '../../../../backend/shared/logger/webhook-file-logger.js';
import { serializeErrorForLog } from '../../../../backend/shared/errors/serialize-error.js';
import { getRequestMeta } from '../../../../backend/webhooks/http-request-meta.js';
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
  const startedAt = Date.now();
  try {
    const rawBody = await request.text();
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const requestMeta = getRequestMeta(request);

    await handleWhatsAppWebhookEvent({
      request,
      rawBody,
      payload,
    });

    await logWebhookTiming({
      path: requestMeta.path,
      method: requestMeta.method,
      ip: requestMeta.ip,
      durationMs: Date.now() - startedAt,
      object: payload?.object ?? null,
      entryCount: Array.isArray(payload?.entry) ? payload.entry.length : 0,
      ok: true,
    }).catch(() => {});

    // ACK fast to avoid retries from Meta.
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const requestMeta = getRequestMeta(request);
    const errorPayload = {
      ...requestMeta,
      ...serializeErrorForLog(error, {
        messageLines: 6,
        stackLines: 6,
      }),
    };
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        event: 'whatsapp_webhook_post_parse_error',
        ...errorPayload,
      }),
    );
    await writeWebhookErrorFileLog({
      event: 'whatsapp_webhook_post_parse_error',
      requestMeta,
      payload: errorPayload,
    }).catch(() => {});
    await logWebhookTiming({
      path: requestMeta.path,
      method: requestMeta.method,
      ip: requestMeta.ip,
      durationMs: Date.now() - startedAt,
      ok: false,
      errorName: errorPayload.errorName,
      errorCode: errorPayload.errorCode,
    }).catch(() => {});
    // Return 200 to avoid unnecessary repeated deliveries while developing.
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
