import { getRedisConnection } from '../../../../backend/queues/redis-connection.js';
import { isWithinBusinessHours } from '../../../../backend/shared/business-hours.js';

export const runtime = 'nodejs';

const REDIS_KEY = 'mercadomm:delivery_manual_override';

export async function GET() {
  const redis = getRedisConnection();
  const override = await redis.get(REDIS_KEY);

  let active;
  let mode;
  if (override === 'on') {
    active = true;
    mode = 'manual';
  } else if (override === 'off') {
    active = false;
    mode = 'manual';
  } else {
    active = isWithinBusinessHours();
    mode = 'auto';
  }

  return Response.json({ ok: true, active, mode });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { active } = body;

  const redis = getRedisConnection();

  if (active === null || active === undefined) {
    await redis.del(REDIS_KEY);
    return Response.json({ ok: true, active: isWithinBusinessHours(), mode: 'auto' });
  }

  await redis.set(REDIS_KEY, active ? 'on' : 'off');
  return Response.json({ ok: true, active: Boolean(active), mode: 'manual' });
}
