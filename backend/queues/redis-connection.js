import IORedis from 'ioredis';

let connection;

export function getRedisConnection() {
  if (connection) return connection;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('Missing REDIS_URL');
  }

  const isTls = redisUrl.startsWith('rediss://');

  connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
  });

  return connection;
}
