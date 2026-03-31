-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `phone` VARCHAR(30) NOT NULL,
    `phoneE164` VARCHAR(20) NULL,
    `defaultDeliveryAddress` TEXT NULL,
    `whatsappOptInAt` DATETIME(3) NULL,
    `whatsappOptOutAt` DATETIME(3) NULL,
    `firstOrderAt` DATETIME(3) NULL,
    `lastOrderAt` DATETIME(3) NULL,
    `totalOrders` INTEGER NOT NULL DEFAULT 0,
    `totalSpentCents` BIGINT NOT NULL DEFAULT 0,
    `avgDaysBetweenOrders` DOUBLE NULL,
    `orderPattern` ENUM('UNKNOWN', 'RECURRING', 'SPORADIC') NOT NULL DEFAULT 'UNKNOWN',
    `orderPatternUpdatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_phone_key`(`phone`),
    UNIQUE INDEX `Customer_phoneE164_key`(`phoneE164`),
    INDEX `Customer_phoneE164_idx`(`phoneE164`),
    INDEX `Customer_orderPattern_lastOrderAt_idx`(`orderPattern`, `lastOrderAt`),
    INDEX `Customer_totalOrders_lastOrderAt_idx`(`totalOrders`, `lastOrderAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Employee` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Employee_isActive_role_idx`(`isActive`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `normalizedName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_name_idx`(`name`),
    INDEX `Product_normalizedName_idx`(`normalizedName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` INTEGER NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `pickingEmployeeId` VARCHAR(191) NULL,
    `deliveryEmployeeId` VARCHAR(191) NULL,
    `rawMessage` LONGTEXT NULL,
    `interpretedText` LONGTEXT NULL,
    `status` ENUM('NEW_ORDER', 'IN_PICKING', 'WAITING_COURIER', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'NEW_ORDER',
    `totalCents` INTEGER NULL,
    `deliveryAddress` TEXT NULL,
    `notes` TEXT NULL,
    `canceledAt` DATETIME(3) NULL,
    `cancelReason` TEXT NULL,
    `pickingStartedAt` DATETIME(3) NULL,
    `pickingFinishedAt` DATETIME(3) NULL,
    `outForDeliveryAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderNumber_key`(`orderNumber`),
    INDEX `Order_status_idx`(`status`),
    INDEX `Order_createdAt_idx`(`createdAt`),
    INDEX `Order_customerId_createdAt_idx`(`customerId`, `createdAt`),
    INDEX `Order_orderNumber_idx`(`orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NULL,
    `unitPriceCents` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderItem_productId_idx`(`productId`),
    INDEX `OrderItem_productName_idx`(`productName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatusHistory` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `changedByEmployeeId` VARCHAR(191) NULL,
    `fromStatus` ENUM('NEW_ORDER', 'IN_PICKING', 'WAITING_COURIER', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELED') NULL,
    `toStatus` ENUM('NEW_ORDER', 'IN_PICKING', 'WAITING_COURIER', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELED') NOT NULL,
    `changedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StatusHistory_orderId_createdAt_idx`(`orderId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerProductAffinity` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `firstPurchasedAt` DATETIME(3) NOT NULL,
    `lastPurchasedAt` DATETIME(3) NOT NULL,
    `purchaseCount` INTEGER NOT NULL DEFAULT 1,
    `totalQuantity` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomerProductAffinity_productId_purchaseCount_idx`(`productId`, `purchaseCount`),
    INDEX `CustomerProductAffinity_lastPurchasedAt_idx`(`lastPurchasedAt`),
    UNIQUE INDEX `CustomerProductAffinity_customerId_productId_key`(`customerId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaign` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `targetProductId` VARCHAR(191) NULL,
    `whatsappTemplateId` VARCHAR(191) NULL,
    `templateVariables` JSON NULL,
    `messageTextFallback` TEXT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    `scheduledAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Campaign_status_scheduledAt_idx`(`status`, `scheduledAt`),
    INDEX `Campaign_targetProductId_idx`(`targetProductId`),
    INDEX `Campaign_whatsappTemplateId_idx`(`whatsappTemplateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CampaignRecipient` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `channel` VARCHAR(191) NOT NULL DEFAULT 'WHATSAPP',
    `sentAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CampaignRecipient_status_idx`(`status`),
    INDEX `CampaignRecipient_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `CampaignRecipient_customerId_createdAt_idx`(`customerId`, `createdAt`),
    UNIQUE INDEX `CampaignRecipient_campaignId_customerId_key`(`campaignId`, `customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WhatsAppTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `languageCode` VARCHAR(10) NOT NULL DEFAULT 'pt_BR',
    `category` ENUM('MARKETING', 'UTILITY', 'AUTHENTICATION') NOT NULL,
    `bodyText` TEXT NOT NULL,
    `headerText` TEXT NULL,
    `footerText` TEXT NULL,
    `buttonSchema` JSON NULL,
    `metaTemplateId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WhatsAppTemplate_metaTemplateId_key`(`metaTemplateId`),
    INDEX `WhatsAppTemplate_isActive_category_idx`(`isActive`, `category`),
    UNIQUE INDEX `WhatsAppTemplate_name_languageCode_key`(`name`, `languageCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WhatsAppMessage` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `campaignRecipientId` VARCHAR(191) NULL,
    `conversationWindowId` VARCHAR(191) NULL,
    `templateId` VARCHAR(191) NULL,
    `type` ENUM('TEMPLATE', 'TEXT') NOT NULL DEFAULT 'TEMPLATE',
    `direction` ENUM('INBOUND', 'OUTBOUND') NOT NULL DEFAULT 'OUTBOUND',
    `toPhoneE164` VARCHAR(20) NOT NULL,
    `content` JSON NULL,
    `variables` JSON NULL,
    `status` ENUM('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `provider` VARCHAR(191) NOT NULL DEFAULT 'META_CLOUD_API',
    `providerMessageId` VARCHAR(191) NULL,
    `providerErrorCode` VARCHAR(191) NULL,
    `providerErrorMessage` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WhatsAppMessage_providerMessageId_key`(`providerMessageId`),
    INDEX `WhatsAppMessage_campaignId_status_idx`(`campaignId`, `status`),
    INDEX `WhatsAppMessage_customerId_createdAt_idx`(`customerId`, `createdAt`),
    INDEX `WhatsAppMessage_toPhoneE164_createdAt_idx`(`toPhoneE164`, `createdAt`),
    INDEX `WhatsAppMessage_conversationWindowId_createdAt_idx`(`conversationWindowId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderDraft` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'READY_FOR_REVIEW', 'COMMITTED', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'OPEN',
    `closeReason` ENUM('TIMEOUT', 'EARLY_SIGNAL', 'MANUAL', 'LLM_PARSE_FAILED') NULL,
    `aggregatedData` JSON NULL,
    `aggregatedText` LONGTEXT NULL,
    `lastLlmDecision` JSON NULL,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastMessageAt` DATETIME(3) NOT NULL,
    `commitDeadlineAt` DATETIME(3) NOT NULL,
    `committedAt` DATETIME(3) NULL,
    `timedOutAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OrderDraft_orderId_key`(`orderId`),
    INDEX `OrderDraft_customerId_status_lastMessageAt_idx`(`customerId`, `status`, `lastMessageAt`),
    INDEX `OrderDraft_status_commitDeadlineAt_idx`(`status`, `commitDeadlineAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderDraftMessage` (
    `id` VARCHAR(191) NOT NULL,
    `orderDraftId` VARCHAR(191) NOT NULL,
    `whatsappMessageId` VARCHAR(191) NOT NULL,
    `providerMessageId` VARCHAR(191) NULL,
    `sequence` INTEGER NULL,
    `messageText` TEXT NULL,
    `parsedPayload` JSON NULL,
    `parsedIntent` VARCHAR(191) NULL,
    `parsedConfidence` DOUBLE NULL,
    `hasItems` BOOLEAN NOT NULL DEFAULT false,
    `hasDeliveryAddress` BOOLEAN NOT NULL DEFAULT false,
    `hasPaymentIntent` BOOLEAN NOT NULL DEFAULT false,
    `hasClosingSignal` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OrderDraftMessage_whatsappMessageId_key`(`whatsappMessageId`),
    INDEX `OrderDraftMessage_orderDraftId_createdAt_idx`(`orderDraftId`, `createdAt`),
    INDEX `OrderDraftMessage_providerMessageId_idx`(`providerMessageId`),
    UNIQUE INDEX `OrderDraftMessage_orderDraftId_whatsappMessageId_key`(`orderDraftId`, `whatsappMessageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WhatsAppMessageRawPayload` (
    `id` VARCHAR(191) NOT NULL,
    `whatsappMessageId` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'WEBHOOK',
    `payloadType` VARCHAR(191) NOT NULL DEFAULT 'MESSAGE',
    `payload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WhatsAppMessageRawPayload_whatsappMessageId_createdAt_idx`(`whatsappMessageId`, `createdAt`),
    INDEX `WhatsAppMessageRawPayload_source_payloadType_createdAt_idx`(`source`, `payloadType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WhatsAppMessageEvent` (
    `id` VARCHAR(191) NOT NULL,
    `whatsappMessageId` VARCHAR(191) NOT NULL,
    `eventKey` VARCHAR(191) NOT NULL,
    `providerMessageId` VARCHAR(191) NULL,
    `status` ENUM('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED') NOT NULL,
    `providerStatus` VARCHAR(191) NULL,
    `providerTimestamp` DATETIME(3) NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WhatsAppMessageEvent_eventKey_key`(`eventKey`),
    INDEX `WhatsAppMessageEvent_whatsappMessageId_createdAt_idx`(`whatsappMessageId`, `createdAt`),
    INDEX `WhatsAppMessageEvent_providerMessageId_createdAt_idx`(`providerMessageId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WhatsAppConversationWindow` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `openedByDirection` ENUM('INBOUND', 'OUTBOUND') NOT NULL,
    `openedByMessageId` VARCHAR(191) NULL,
    `openedAt` DATETIME(3) NOT NULL,
    `closesAt` DATETIME(3) NOT NULL,
    `closedAt` DATETIME(3) NULL,
    `isOpen` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WhatsAppConversationWindow_customerId_isOpen_idx`(`customerId`, `isOpen`),
    INDEX `WhatsAppConversationWindow_closesAt_isOpen_idx`(`closesAt`, `isOpen`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_pickingEmployeeId_fkey` FOREIGN KEY (`pickingEmployeeId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_deliveryEmployeeId_fkey` FOREIGN KEY (`deliveryEmployeeId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatusHistory` ADD CONSTRAINT `StatusHistory_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatusHistory` ADD CONSTRAINT `StatusHistory_changedByEmployeeId_fkey` FOREIGN KEY (`changedByEmployeeId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerProductAffinity` ADD CONSTRAINT `CustomerProductAffinity_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerProductAffinity` ADD CONSTRAINT `CustomerProductAffinity_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_targetProductId_fkey` FOREIGN KEY (`targetProductId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_whatsappTemplateId_fkey` FOREIGN KEY (`whatsappTemplateId`) REFERENCES `WhatsAppTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignRecipient` ADD CONSTRAINT `CampaignRecipient_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignRecipient` ADD CONSTRAINT `CampaignRecipient_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessage` ADD CONSTRAINT `WhatsAppMessage_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessage` ADD CONSTRAINT `WhatsAppMessage_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessage` ADD CONSTRAINT `WhatsAppMessage_campaignRecipientId_fkey` FOREIGN KEY (`campaignRecipientId`) REFERENCES `CampaignRecipient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessage` ADD CONSTRAINT `WhatsAppMessage_conversationWindowId_fkey` FOREIGN KEY (`conversationWindowId`) REFERENCES `WhatsAppConversationWindow`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessage` ADD CONSTRAINT `WhatsAppMessage_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `WhatsAppTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderDraft` ADD CONSTRAINT `OrderDraft_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderDraft` ADD CONSTRAINT `OrderDraft_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderDraftMessage` ADD CONSTRAINT `OrderDraftMessage_orderDraftId_fkey` FOREIGN KEY (`orderDraftId`) REFERENCES `OrderDraft`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderDraftMessage` ADD CONSTRAINT `OrderDraftMessage_whatsappMessageId_fkey` FOREIGN KEY (`whatsappMessageId`) REFERENCES `WhatsAppMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessageRawPayload` ADD CONSTRAINT `WhatsAppMessageRawPayload_whatsappMessageId_fkey` FOREIGN KEY (`whatsappMessageId`) REFERENCES `WhatsAppMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessageEvent` ADD CONSTRAINT `WhatsAppMessageEvent_whatsappMessageId_fkey` FOREIGN KEY (`whatsappMessageId`) REFERENCES `WhatsAppMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppConversationWindow` ADD CONSTRAINT `WhatsAppConversationWindow_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

