-- CreateEnum
CREATE TYPE "public"."OrderDraftStatus" AS ENUM ('OPEN', 'READY_FOR_REVIEW', 'COMMITTED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."OrderDraftCloseReason" AS ENUM ('TIMEOUT', 'EARLY_SIGNAL', 'MANUAL');

-- CreateTable
CREATE TABLE "public"."OrderDraft" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "public"."OrderDraftStatus" NOT NULL DEFAULT 'OPEN',
    "closeReason" "public"."OrderDraftCloseReason",
    "aggregatedData" JSONB,
    "aggregatedText" TEXT,
    "lastLlmDecision" JSONB,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "commitDeadlineAt" TIMESTAMP(3) NOT NULL,
    "committedAt" TIMESTAMP(3),
    "timedOutAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderDraftMessage" (
    "id" TEXT NOT NULL,
    "orderDraftId" TEXT NOT NULL,
    "whatsappMessageId" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "sequence" INTEGER,
    "messageText" TEXT,
    "parsedPayload" JSONB,
    "parsedIntent" TEXT,
    "parsedConfidence" DOUBLE PRECISION,
    "hasItems" BOOLEAN NOT NULL DEFAULT false,
    "hasDeliveryAddress" BOOLEAN NOT NULL DEFAULT false,
    "hasPaymentIntent" BOOLEAN NOT NULL DEFAULT false,
    "hasClosingSignal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderDraftMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderDraft_orderId_key" ON "public"."OrderDraft"("orderId");

-- CreateIndex
CREATE INDEX "OrderDraft_customerId_status_lastMessageAt_idx" ON "public"."OrderDraft"("customerId", "status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "OrderDraft_status_commitDeadlineAt_idx" ON "public"."OrderDraft"("status", "commitDeadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderDraftMessage_whatsappMessageId_key" ON "public"."OrderDraftMessage"("whatsappMessageId");

-- CreateIndex
CREATE INDEX "OrderDraftMessage_orderDraftId_createdAt_idx" ON "public"."OrderDraftMessage"("orderDraftId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderDraftMessage_providerMessageId_idx" ON "public"."OrderDraftMessage"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderDraftMessage_orderDraftId_whatsappMessageId_key" ON "public"."OrderDraftMessage"("orderDraftId", "whatsappMessageId");

-- AddForeignKey
ALTER TABLE "public"."OrderDraft" ADD CONSTRAINT "OrderDraft_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderDraft" ADD CONSTRAINT "OrderDraft_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderDraftMessage" ADD CONSTRAINT "OrderDraftMessage_orderDraftId_fkey" FOREIGN KEY ("orderDraftId") REFERENCES "public"."OrderDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderDraftMessage" ADD CONSTRAINT "OrderDraftMessage_whatsappMessageId_fkey" FOREIGN KEY ("whatsappMessageId") REFERENCES "public"."WhatsAppMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
