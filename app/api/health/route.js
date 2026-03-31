import { prisma } from '../../../backend/db/prisma-client.js';
import { getRedisConnection } from '../../../backend/queues/redis-connection.js';

export async function GET() {
  const checks = { postgres: false, redis: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = true;
  } catch {}

  try {
    const redis = getRedisConnection();
    const pong = await redis.ping();
    checks.redis = pong === 'PONG';
  } catch {}

  const healthy = checks.postgres && checks.redis;

  return Response.json(
    { ok: healthy, checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
