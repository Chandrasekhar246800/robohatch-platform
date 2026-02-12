import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Clear all products from the database
 * 
 * Run with: npx tsx prisma/clear-products.ts
 */

async function clearProducts() {
  console.log('🗑️  Starting product cleanup...\n');

  try {
    // Delete in correct order due to foreign key constraints
    console.log('Deleting product images...');
    const deletedImages = await prisma.productImage.deleteMany({});
    console.log(`✅ Deleted ${deletedImages.count} product images`);

    console.log('Deleting product-category relationships...');
    const deletedRelations = await prisma.productCategory.deleteMany({});
    console.log(`✅ Deleted ${deletedRelations.count} product-category relations`);

    console.log('Deleting cart items...');
    const deletedCartItems = await prisma.cartItem.deleteMany({});
    console.log(`✅ Deleted ${deletedCartItems.count} cart items`);

    console.log('Deleting products...');
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`✅ Deleted ${deletedProducts.count} products`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Product cleanup complete!');
    console.log('='.repeat(60));
    console.log('✅ Database is now clean and ready for real products');
    console.log('\n📝 Next steps:');
    console.log('   1. Navigate to http://localhost:3000/admin/products/add');
    console.log('   2. Add real products with actual photos');
    console.log('   3. Upload real product images (not Unsplash placeholders)');
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n❌ Error during cleanup:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Database connection closed\n');
  }
}

// Execute cleanup
clearProducts();
