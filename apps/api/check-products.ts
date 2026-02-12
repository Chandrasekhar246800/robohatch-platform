import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProducts() {
  const productCount = await prisma.product.count();
  const categoryCount = await prisma.category.count();
  
  const products = await prisma.product.findMany({
    take: 5,
    select: {
      name: true,
      price: true,
      stock: true,
      isActive: true,
    }
  });

  const totalInventoryValue = await prisma.product.aggregate({
    _sum: {
      stock: true,
    },
  });

  console.log('\n📊 PRODUCT CATALOG STATUS');
  console.log('='.repeat(60));
  console.log(`✅ Total Products: ${productCount}`);
  console.log(`✅ Total Categories: ${categoryCount}`);
  console.log(`📦 Total Stock Units: ${totalInventoryValue._sum.stock || 0}`);
  console.log('='.repeat(60));
  console.log('\n🎯 Sample Products:');
  products.forEach(p => {
    console.log(`   • ${p.name}: ₹${p.price} (stock: ${p.stock})`);
  });
  console.log('\n');
  
  await prisma.$disconnect();
}

checkProducts();
