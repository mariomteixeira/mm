import { getRedisConnection } from '../../../../backend/queues/redis-connection.js';

export const runtime = 'nodejs';

const REDIS_KEY = 'mercadomm:business_hours_enabled';

export async function GET() {
  const redis = getRedisConnection();
  const value = await redis.get(REDIS_KEY);
  const enabled = value !== 'off';
  return Response.json({ ok: true, enabled });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const redis = getRedisConnection();
  const enabled = body.enabled !== false;
  await redis.set(REDIS_KEY, enabled ? 'on' : 'off');
  return Response.json({ ok: true, enabled });
}
