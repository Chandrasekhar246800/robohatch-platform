/**
 * Setup Test Data for Concurrency Tests
 * 
 * Creates test users and products needed for concurrency testing.
 * Run this script before running the concurrency test.
 * 
 * Usage:
 *   npx tsx apps/api/tests/setup-concurrency-test-data.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TEST_USERS = [
  { email: 'buyer1@test.com', password: 'Test123!@#', name: 'Test Buyer 1' },
  { email: 'buyer2@test.com', password: 'Test123!@#', name: 'Test Buyer 2' },
  { email: 'buyer3@test.com', password: 'Test123!@#', name: 'Test Buyer 3' },
  { email: 'buyer4@test.com', password: 'Test123!@#', name: 'Test Buyer 4' },
  { email: 'buyer5@test.com', password: 'Test123!@#', name: 'Test Buyer 5' },
  { email: 'buyer6@test.com', password: 'Test123!@#', name: 'Test Buyer 6' },
  { email: 'buyer7@test.com', password: 'Test123!@#', name: 'Test Buyer 7' },
  { email: 'buyer8@test.com', password: 'Test123!@#', name: 'Test Buyer 8' },
  { email: 'buyer9@test.com', password: 'Test123!@#', name: 'Test Buyer 9' },
  { email: 'buyer10@test.com', password: 'Test123!@#', name: 'Test Buyer 10' },
  { email: 'buyer11@test.com', password: 'Test123!@#', name: 'Test Buyer 11' },
  { email: 'buyer12@test.com', password: 'Test123!@#', name: 'Test Buyer 12' },
  { email: 'buyer13@test.com', password: 'Test123!@#', name: 'Test Buyer 13' },
  { email: 'buyer14@test.com', password: 'Test123!@#', name: 'Test Buyer 14' },
  { email: 'buyer15@test.com', password: 'Test123!@#', name: 'Test Buyer 15' },
];

const TEST_PRODUCT_ID = 'test-product-1';
const INITIAL_STOCK = 10;

async function setupTestData() {
  console.log('🔧 Setting up test data for concurrency tests...\n');

  try {
    // 1. Create test users
    console.log('👥 Creating test users...');
    for (const user of TEST_USERS) {
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUser) {
        console.log(`  ⏭️  User ${user.email} already exists, skipping...`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);
      await prisma.user.create({
        data: {
          email: user.email,
          password: hashedPassword,
          name: user.name,
          role: 'USER',
        },
      });
      console.log(`  ✅ Created user: ${user.email}`);
    }

    // 2. Create or update test product
    console.log('\n📦 Creating test product...');
    const existingProduct = await prisma.product.findUnique({
      where: { id: TEST_PRODUCT_ID },
    });

    if (existingProduct) {
      // Update existing product
      await prisma.product.update({
        where: { id: TEST_PRODUCT_ID },
        data: {
          stock: INITIAL_STOCK,
          isActive: true,
        },
      });
      console.log(`  ✅ Updated existing product: ${TEST_PRODUCT_ID}`);
      console.log(`     Stock reset to: ${INITIAL_STOCK}`);
    } else {
      // Create new product
      await prisma.product.create({
        data: {
          id: TEST_PRODUCT_ID,
          name: 'Concurrency Test Product',
          description: 'This product is used for testing concurrent stock reservations',
          price: 999.99,
          stock: INITIAL_STOCK,
          isActive: true,
        },
      });
      console.log(`  ✅ Created new product: ${TEST_PRODUCT_ID}`);
      console.log(`     Initial stock: ${INITIAL_STOCK}`);
    }

    // 3. Clear any existing carts for test users
    console.log('\n🗑️  Clearing existing test carts...');
    const testEmails = TEST_USERS.map(u => u.email);
    const testUsers = await prisma.user.findMany({
      where: { email: { in: testEmails } },
      select: { id: true },
    });
    const testUserIds = testUsers.map(u => u.id);

    await prisma.cartItem.deleteMany({
      where: {
        cart: {
          userId: { in: testUserIds },
        },
      },
    });

    await prisma.cart.deleteMany({
      where: {
        userId: { in: testUserIds },
      },
    });
    console.log('  ✅ Cleared existing carts');

    // 4. Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST DATA SETUP COMPLETE');
    console.log('='.repeat(80));
    console.log('\nConfiguration:');
    console.log(`  - Test Users: ${TEST_USERS.length}`);
    console.log(`  - Test Product ID: ${TEST_PRODUCT_ID}`);
    console.log(`  - Initial Stock: ${INITIAL_STOCK}`);
    console.log('\nYou can now run the concurrency test:');
    console.log('  npx tsx apps/api/tests/concurrency-test.ts\n');
  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData();
