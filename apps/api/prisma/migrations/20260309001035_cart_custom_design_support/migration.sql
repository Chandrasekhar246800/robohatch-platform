-- Step 1: Drop the unique index on CartItem (this is what's blocking us)
ALTER TABLE `CartItem` DROP INDEX `CartItem_cartId_productId_key`;

-- Step 2: Modify CartItem schema
ALTER TABLE `CartItem` MODIFY `productId` VARCHAR(191) NULL;
ALTER TABLE `CartItem` ADD COLUMN `customDesignId` VARCHAR(191) NULL;

-- Step 3: Add index for customDesignId in CartItem
ALTER TABLE `CartItem` ADD INDEX `CartItem_customDesignId_fkey` (`customDesignId`);

-- Step 4: Add foreign keys for CartItem (create all properly)
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_cartId_fkey` 
  FOREIGN KEY (`cartId`) REFERENCES `Cart`(`id`) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_productId_fkey` 
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_customDesignId_fkey` 
  FOREIGN KEY (`customDesignId`) REFERENCES `CustomDesign`(`id`) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Modify OrderItem schema
ALTER TABLE `OrderItem` MODIFY `productId` VARCHAR(191) NULL;
ALTER TABLE `OrderItem` ADD COLUMN `customDesignId` VARCHAR(191) NULL;

-- Step 6: Add index for customDesignId in OrderItem
ALTER TABLE `OrderItem` ADD INDEX `OrderItem_customDesignId_fkey` (`customDesignId`);

-- Step 7: Add foreign keys for OrderItem
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` 
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_customDesignId_fkey` 
  FOREIGN KEY (`customDesignId`) REFERENCES `CustomDesign`(`id`) 
  ON DELETE CASCADE ON UPDATE CASCADE;
