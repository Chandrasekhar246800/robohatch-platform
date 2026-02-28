-- Migration: Add weight tracking fields to CustomDesign and Product tables
-- Date: 2026-02-28
-- Description: Adds filamentGrams, printTimeSeconds to CustomDesign and material, dimensions, weight to Product

-- Add fields to CustomDesign table
ALTER TABLE `CustomDesign` 
  ADD COLUMN `filamentGrams` DECIMAL(10,2) NULL COMMENT 'Weight in grams from STL analysis',
  ADD COLUMN `printTimeSeconds` INT NULL COMMENT 'Print time in seconds from STL analysis';

-- Add fields to Product table
ALTER TABLE `Product` 
  ADD COLUMN `material` VARCHAR(255) NULL COMMENT 'Material specification (e.g., PLA, ABS)',
  ADD COLUMN `dimensions` VARCHAR(255) NULL COMMENT 'Product dimensions',
  ADD COLUMN `weight` VARCHAR(100) NULL COMMENT 'Product weight (e.g., "150g")';

-- Note: These fields are nullable to support existing records
-- New custom designs will automatically populate these fields when STL analysis is performed
