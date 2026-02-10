-- Make migration idempotent by checking what exists
SET FOREIGN_KEY_CHECKS=0;

-- Drop old category relationship from Product table (if exists)
SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0;
ALTER TABLE `Product` DROP FOREIGN KEY IF EXISTS `Product_categoryId_fkey`;
ALTER TABLE `Product` DROP COLUMN IF EXISTS `categoryId`;
SET SQL_NOTES=@OLD_SQL_NOTES;

-- Drop and recreate ProductCategory table to ensure clean state
DROP TABLE IF EXISTS `ProductCategory`;

-- CreateTable ProductCategory
CREATE TABLE `ProductCategory` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductCategory_productId_idx`(`productId`),
    INDEX `ProductCategory_categoryId_idx`(`categoryId`),
    UNIQUE INDEX `ProductCategory_productId_categoryId_key`(`productId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductCategory` ADD CONSTRAINT `ProductCategory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductCategory` ADD CONSTRAINT `ProductCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS=1;
