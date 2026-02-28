ALTER TABLE "public"."Customer"
ADD COLUMN IF NOT EXISTS "defaultDeliveryAddress" TEXT;
