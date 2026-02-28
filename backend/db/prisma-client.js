import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__mmPrismaClient ??
  new PrismaClient({
    log: ['warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__mmPrismaClient = prisma;
}
