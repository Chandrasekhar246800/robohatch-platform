-- CreateTable
CREATE TABLE `PaymentEventLog` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `source` ENUM('CLIENT', 'WEBHOOK', 'RECONCILIATION', 'SYSTEM') NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `fromStatus` VARCHAR(191) NULL,
    `toStatus` VARCHAR(191) NOT NULL,
    `gatewayOrderId` VARCHAR(191) NULL,
    `gatewayPaymentId` VARCHAR(191) NULL,
    `webhookEventKey` VARCHAR(191) NULL,
    `correlationId` VARCHAR(128) NOT NULL,
    `payload` JSON NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentEventLog_paymentId_idx`(`paymentId`),
    INDEX `PaymentEventLog_orderId_idx`(`orderId`),
    INDEX `PaymentEventLog_gatewayOrderId_idx`(`gatewayOrderId`),
    INDEX `PaymentEventLog_gatewayPaymentId_idx`(`gatewayPaymentId`),
    INDEX `PaymentEventLog_webhookEventKey_idx`(`webhookEventKey`),
    INDEX `PaymentEventLog_source_createdAt_idx`(`source`, `createdAt`),
    INDEX `PaymentEventLog_correlationId_idx`(`correlationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PaymentEventLog` ADD CONSTRAINT `PaymentEventLog_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentEventLog` ADD CONSTRAINT `PaymentEventLog_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;