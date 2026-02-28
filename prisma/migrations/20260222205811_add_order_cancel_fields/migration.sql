-- AlterEnum
ALTER TYPE "public"."OrderStatus" ADD VALUE 'CANCELED';

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "canceledAt" TIMESTAMP(3);
