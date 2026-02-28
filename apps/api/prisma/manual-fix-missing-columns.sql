-- Add missing 'material' column to Product table if not exists
ALTER TABLE `Product` ADD COLUMN IF NOT EXISTS `material` VARCHAR(191) NULL;

-- Add missing 'filamentGrams' column to CustomDesign table if not exists
ALTER TABLE `CustomDesign` ADD COLUMN IF NOT EXISTS `filamentGrams` DECIMAL(65,30) NULL;