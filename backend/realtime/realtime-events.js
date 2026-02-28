import { getRedisConnection } from '../queues/redis-connection.js';

export const REALTIME_CHANNELS = {
  ORDERS: 'realtime:orders',
  ORDER_DRAFTS: 'realtime:order-drafts',
};

function getChannelByTopic(topic) {
  if (topic === 'orders') return REALTIME_CHANNELS.ORDERS;
  if (topic === 'orders-drafts') return REALTIME_CHANNELS.ORDER_DRAFTS;
  return null;
}

export function getChannelsForTopic(topic) {
  if (topic === 'orders') return [REALTIME_CHANNELS.ORDERS];
  if (topic === 'orders-drafts') return [REALTIME_CHANNELS.ORDER_DRAFTS];
  return [REALTIME_CHANNELS.ORDERS, REALTIME_CHANNELS.ORDER_DRAFTS];
}

export async function publishRealtimeEvent({ topic, event, payload = null }) {
  const channel = getChannelByTopic(topic);
  if (!channel) return;

  const redis = getRedisConnection();
  const message = JSON.stringify({
    topic,
    event: event || 'updated',
    payload,
    ts: new Date().toISOString(),
  });
  await redis.publish(channel, message);
}
