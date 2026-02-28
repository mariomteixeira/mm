-- CreateTable
CREATE TABLE "public"."WhatsAppMessageRawPayload" (
    "id" TEXT NOT NULL,
    "whatsappMessageId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'WEBHOOK',
    "payloadType" TEXT NOT NULL DEFAULT 'MESSAGE',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessageRawPayload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppMessageRawPayload_whatsappMessageId_createdAt_idx" ON "public"."WhatsAppMessageRawPayload"("whatsappMessageId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessageRawPayload_source_payloadType_createdAt_idx" ON "public"."WhatsAppMessageRawPayload"("source", "payloadType", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."WhatsAppMessageRawPayload" ADD CONSTRAINT "WhatsAppMessageRawPayload_whatsappMessageId_fkey" FOREIGN KEY ("whatsappMessageId") REFERENCES "public"."WhatsAppMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
