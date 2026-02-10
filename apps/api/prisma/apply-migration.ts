import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🔧 Applying Many-to-Many migration manually...\n');

  try {
    // Step 1: Check if ProductCategory table exists
    const tables = await prisma.$queryRaw<Array<{ Tables_in_robohatch_db: string }>>`
      SHOW TABLES LIKE 'ProductCategory'
    `;

    if (tables.length > 0) {
      console.log('✓ ProductCategory table already exists');
      console.log('✓ Migration already applied\n');
      return;
    }

    console.log('1️⃣ Dropping old Product.categoryId foreign key...');
    try {
      await prisma.$executeRaw`ALTER TABLE Product DROP FOREIGN KEY Product_categoryId_fkey`;
      console.log('✓ Dropped foreign key');
    } catch (error: any) {
      if (error.code === 'P2010' || error.message.includes("Can't DROP")) {
        console.log('⚠ Foreign key already dropped or does not exist');
      } else {
        throw error;
      }
    }

    console.log('\n2️⃣ Dropping old Product.categoryId column...');
    try {
      await prisma.$executeRaw`ALTER TABLE Product DROP COLUMN categoryId`;
      console.log('✓ Dropped column');
    } catch (error: any) {
      if (error.code === 'P2010' || error.message.includes("Can't DROP")) {
        console.log('⚠ Column already dropped or does not exist');
      } else {
        throw error;
      }
    }

    console.log('\n3️⃣ Creating ProductCategory join table...');
    await prisma.$executeRaw`
      CREATE TABLE ProductCategory (
        id VARCHAR(191) NOT NULL,
        productId VARCHAR(191) NOT NULL,
        categoryId VARCHAR(191) NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY ProductCategory_productId_categoryId_key (productId, categoryId),
        KEY ProductCategory_productId_idx (productId),
        KEY ProductCategory_categoryId_idx (categoryId)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `;
    console.log('✓ Created ProductCategory table');

    console.log('\n4️⃣ Adding foreign key constraints...');
    await prisma.$executeRaw`
      ALTER TABLE ProductCategory 
      ADD CONSTRAINT ProductCategory_productId_fkey 
      FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE CASCADE ON UPDATE CASCADE
    `;
    console.log('✓ Added productId foreign key');

    await prisma.$executeRaw`
      ALTER TABLE ProductCategory 
      ADD CONSTRAINT ProductCategory_categoryId_fkey 
      FOREIGN KEY (categoryId) REFERENCES Category(id) ON DELETE CASCADE ON UPDATE CASCADE
    `;
    console.log('✓ Added categoryId foreign key');

    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
