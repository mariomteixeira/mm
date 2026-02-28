import { getRedisConnection } from '../../../../backend/queues/redis-connection.js';
import { getChannelsForTopic } from '../../../../backend/realtime/realtime-events.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildSSEMessage(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic') || 'all';
  const channels = getChannelsForTopic(topic);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const redis = getRedisConnection();
      const subscriber = redis.duplicate();
      let keepaliveTimer = null;
      let closed = false;

      const safeEnqueue = (value) => {
        if (closed) return;
        controller.enqueue(encoder.encode(value));
      };

      const cleanup = async () => {
        if (closed) return;
        closed = true;
        if (keepaliveTimer) clearInterval(keepaliveTimer);
        subscriber.off('message', onMessage);
        try {
          if (channels.length) await subscriber.unsubscribe(...channels);
        } catch {}
        try {
          subscriber.disconnect();
        } catch {}
        try {
          controller.close();
        } catch {}
      };

      const onMessage = (channel, message) => {
        safeEnqueue(buildSSEMessage({ channel, message }));
      };

      request.signal.addEventListener('abort', () => {
        cleanup();
      });

      await subscriber.subscribe(...channels);
      subscriber.on('message', onMessage);

      safeEnqueue(buildSSEMessage({ type: 'connected', topic, channels, ts: new Date().toISOString() }));

      keepaliveTimer = setInterval(() => {
        safeEnqueue(`: ping ${Date.now()}\n\n`);
      }, 25000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
