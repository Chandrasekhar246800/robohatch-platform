import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from apps/api/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function deleteCustomProducts() {
  try {
    console.log('🗑️  Deleting all Custom 3D Print products and related data...');
    
    // Step 1: Find all custom product IDs
    const customProducts = await prisma.product.findMany({
      where: {
        name: {
          startsWith: 'Custom 3D Print:'
        }
      },
      select: {
        id: true,
        name: true
      }
    });
    
    const productIds = customProducts.map(p => p.id);
    console.log(`📦 Found ${productIds.length} custom products to delete`);
    
    if (productIds.length === 0) {
      console.log('✅ No custom products found');
      return;
    }
    
    // Step 2: Delete all cart items referencing these products
    const deletedCartItems = await prisma.cartItem.deleteMany({
      where: {
        productId: {
          in: productIds
        }
      }
    });
    console.log(`🛒 Deleted ${deletedCartItems.count} cart items`);
    
    // Step 3: Delete all order items referencing these products
    const deletedOrderItems = await prisma.orderItem.deleteMany({
      where: {
        productId: {
          in: productIds
        }
      }
    });
    console.log(`📋 Deleted ${deletedOrderItems.count} order items`);
    
    // Step 4: Delete the products themselves
    const result = await prisma.product.deleteMany({
      where: {
        id: {
          in: productIds
        }
      }
    });
    
    console.log(`✅ Deleted ${result.count} custom 3D print products`);
    console.log('🎉 Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error deleting custom products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteCustomProducts();
