-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('NEW_ORDER', 'IN_PICKING', 'WAITING_COURIER', 'OUT_FOR_DELIVERY', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."CampaignRecipientStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."CustomerOrderPattern" AS ENUM ('UNKNOWN', 'RECURRING', 'SPORADIC');

-- CreateEnum
CREATE TYPE "public"."WhatsAppTemplateCategory" AS ENUM ('MARKETING', 'UTILITY', 'AUTHENTICATION');

-- CreateEnum
CREATE TYPE "public"."WhatsAppMessageType" AS ENUM ('TEMPLATE', 'TEXT');

-- CreateEnum
CREATE TYPE "public"."WhatsAppDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "public"."WhatsAppMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "phoneE164" TEXT,
    "whatsappOptInAt" TIMESTAMP(3),
    "whatsappOptOutAt" TIMESTAMP(3),
    "firstOrderAt" TIMESTAMP(3),
    "lastOrderAt" TIMESTAMP(3),
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpentCents" BIGINT NOT NULL DEFAULT 0,
    "avgDaysBetweenOrders" DOUBLE PRECISION,
    "orderPattern" "public"."CustomerOrderPattern" NOT NULL DEFAULT 'UNKNOWN',
    "orderPatternUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "pickingEmployeeId" TEXT,
    "deliveryEmployeeId" TEXT,
    "rawMessage" TEXT,
    "interpretedText" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'NEW_ORDER',
    "totalCents" INTEGER,
    "deliveryAddress" TEXT,
    "notes" TEXT,
    "pickingStartedAt" TIMESTAMP(3),
    "pickingFinishedAt" TIMESTAMP(3),
    "outForDeliveryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "unitPriceCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "changedByEmployeeId" TEXT,
    "fromStatus" "public"."OrderStatus",
    "toStatus" "public"."OrderStatus" NOT NULL,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomerProductAffinity" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "firstPurchasedAt" TIMESTAMP(3) NOT NULL,
    "lastPurchasedAt" TIMESTAMP(3) NOT NULL,
    "purchaseCount" INTEGER NOT NULL DEFAULT 1,
    "totalQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProductAffinity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetProductId" TEXT,
    "whatsappTemplateId" TEXT,
    "templateVariables" JSONB,
    "messageTextFallback" TEXT,
    "status" "public"."CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "public"."CampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL DEFAULT 'pt_BR',
    "category" "public"."WhatsAppTemplateCategory" NOT NULL,
    "bodyText" TEXT NOT NULL,
    "headerText" TEXT,
    "footerText" TEXT,
    "buttonSchema" JSONB,
    "metaTemplateId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "campaignId" TEXT,
    "campaignRecipientId" TEXT,
    "conversationWindowId" TEXT,
    "templateId" TEXT,
    "type" "public"."WhatsAppMessageType" NOT NULL DEFAULT 'TEMPLATE',
    "direction" "public"."WhatsAppDirection" NOT NULL DEFAULT 'OUTBOUND',
    "toPhoneE164" TEXT NOT NULL,
    "content" JSONB,
    "variables" JSONB,
    "status" "public"."WhatsAppMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL DEFAULT 'META_CLOUD_API',
    "providerMessageId" TEXT,
    "providerErrorCode" TEXT,
    "providerErrorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WhatsAppMessageEvent" (
    "id" TEXT NOT NULL,
    "whatsappMessageId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "status" "public"."WhatsAppMessageStatus" NOT NULL,
    "providerStatus" TEXT,
    "providerTimestamp" TIMESTAMP(3),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WhatsAppConversationWindow" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "openedByDirection" "public"."WhatsAppDirection" NOT NULL,
    "openedByMessageId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConversationWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "public"."Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phoneE164_key" ON "public"."Customer"("phoneE164");

-- CreateIndex
CREATE INDEX "Customer_phoneE164_idx" ON "public"."Customer"("phoneE164");

-- CreateIndex
CREATE INDEX "Customer_orderPattern_lastOrderAt_idx" ON "public"."Customer"("orderPattern", "lastOrderAt");

-- CreateIndex
CREATE INDEX "Customer_totalOrders_lastOrderAt_idx" ON "public"."Customer"("totalOrders", "lastOrderAt");

-- CreateIndex
CREATE INDEX "Employee_isActive_role_idx" ON "public"."Employee"("isActive", "role");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "public"."Product"("name");

-- CreateIndex
CREATE INDEX "Product_normalizedName_idx" ON "public"."Product"("normalizedName");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "public"."Order"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "public"."OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_productName_idx" ON "public"."OrderItem"("productName");

-- CreateIndex
CREATE INDEX "StatusHistory_orderId_createdAt_idx" ON "public"."StatusHistory"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerProductAffinity_productId_purchaseCount_idx" ON "public"."CustomerProductAffinity"("productId", "purchaseCount");

-- CreateIndex
CREATE INDEX "CustomerProductAffinity_lastPurchasedAt_idx" ON "public"."CustomerProductAffinity"("lastPurchasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProductAffinity_customerId_productId_key" ON "public"."CustomerProductAffinity"("customerId", "productId");

-- CreateIndex
CREATE INDEX "Campaign_status_scheduledAt_idx" ON "public"."Campaign"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Campaign_targetProductId_idx" ON "public"."Campaign"("targetProductId");

-- CreateIndex
CREATE INDEX "Campaign_whatsappTemplateId_idx" ON "public"."Campaign"("whatsappTemplateId");

-- CreateIndex
CREATE INDEX "CampaignRecipient_status_idx" ON "public"."CampaignRecipient"("status");

-- CreateIndex
CREATE INDEX "CampaignRecipient_status_createdAt_idx" ON "public"."CampaignRecipient"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignRecipient_customerId_createdAt_idx" ON "public"."CampaignRecipient"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_customerId_key" ON "public"."CampaignRecipient"("campaignId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_metaTemplateId_key" ON "public"."WhatsAppTemplate"("metaTemplateId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_isActive_category_idx" ON "public"."WhatsAppTemplate"("isActive", "category");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_name_languageCode_key" ON "public"."WhatsAppTemplate"("name", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_providerMessageId_key" ON "public"."WhatsAppMessage"("providerMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_campaignId_status_idx" ON "public"."WhatsAppMessage"("campaignId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_customerId_createdAt_idx" ON "public"."WhatsAppMessage"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_toPhoneE164_createdAt_idx" ON "public"."WhatsAppMessage"("toPhoneE164", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_conversationWindowId_createdAt_idx" ON "public"."WhatsAppMessage"("conversationWindowId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessageEvent_eventKey_key" ON "public"."WhatsAppMessageEvent"("eventKey");

-- CreateIndex
CREATE INDEX "WhatsAppMessageEvent_whatsappMessageId_createdAt_idx" ON "public"."WhatsAppMessageEvent"("whatsappMessageId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessageEvent_providerMessageId_createdAt_idx" ON "public"."WhatsAppMessageEvent"("providerMessageId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppConversationWindow_customerId_isOpen_idx" ON "public"."WhatsAppConversationWindow"("customerId", "isOpen");

-- CreateIndex
CREATE INDEX "WhatsAppConversationWindow_closesAt_isOpen_idx" ON "public"."WhatsAppConversationWindow"("closesAt", "isOpen");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_pickingEmployeeId_fkey" FOREIGN KEY ("pickingEmployeeId") REFERENCES "public"."Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_deliveryEmployeeId_fkey" FOREIGN KEY ("deliveryEmployeeId") REFERENCES "public"."Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StatusHistory" ADD CONSTRAINT "StatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StatusHistory" ADD CONSTRAINT "StatusHistory_changedByEmployeeId_fkey" FOREIGN KEY ("changedByEmployeeId") REFERENCES "public"."Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerProductAffinity" ADD CONSTRAINT "CustomerProductAffinity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerProductAffinity" ADD CONSTRAINT "CustomerProductAffinity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Campaign" ADD CONSTRAINT "Campaign_targetProductId_fkey" FOREIGN KEY ("targetProductId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Campaign" ADD CONSTRAINT "Campaign_whatsappTemplateId_fkey" FOREIGN KEY ("whatsappTemplateId") REFERENCES "public"."WhatsAppTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_campaignRecipientId_fkey" FOREIGN KEY ("campaignRecipientId") REFERENCES "public"."CampaignRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_conversationWindowId_fkey" FOREIGN KEY ("conversationWindowId") REFERENCES "public"."WhatsAppConversationWindow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."WhatsAppTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppMessageEvent" ADD CONSTRAINT "WhatsAppMessageEvent_whatsappMessageId_fkey" FOREIGN KEY ("whatsappMessageId") REFERENCES "public"."WhatsAppMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppConversationWindow" ADD CONSTRAINT "WhatsAppConversationWindow_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
