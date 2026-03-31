/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['bullmq', 'ioredis', '@prisma/client', 'pino'],
};

export default nextConfig;
