import { getRedisConnection } from '../../../../backend/queues/redis-connection.js';

export const runtime = 'nodejs';

const REDIS_KEY = 'mercadomm:delivery_manual_override';

// Horário de funcionamento: Seg-Sex 6:00-21:00 (America/Sao_Paulo)
function isWithinBusinessHours() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);

  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday);
  return isWeekday && hour >= 6 && hour < 21;
}

export async function GET() {
  const redis = getRedisConnection();
  const override = await redis.get(REDIS_KEY);

  // override: "on" | "off" | null (auto/fallback)
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
    // Reset to auto mode
    await redis.del(REDIS_KEY);
    return Response.json({ ok: true, active: isWithinBusinessHours(), mode: 'auto' });
  }

  await redis.set(REDIS_KEY, active ? 'on' : 'off');
  return Response.json({ ok: true, active: Boolean(active), mode: 'manual' });
}
