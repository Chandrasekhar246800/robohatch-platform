/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Category` ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `slug` VARCHAR(191) NULL,
    ADD COLUMN `type` ENUM('DEFAULT', 'CUSTOM') NOT NULL DEFAULT 'DEFAULT';

-- CreateTable
CREATE TABLE `CustomDesign` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `material` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `size` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `fileUrl` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'QUOTED', 'APPROVED', 'IN_PRODUCTION', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `estimatedPrice` DECIMAL(65, 30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Category_slug_key` ON `Category`(`slug`);

-- AddForeignKey
ALTER TABLE `CustomDesign` ADD CONSTRAINT `CustomDesign_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
