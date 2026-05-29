import 'dotenv/config';

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const confirmReset = process.argv.includes('--confirm');
const backupDir = path.resolve(__dirname, '../backups');

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function safeDbTarget() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    return {
      host: parsed.hostname,
      database: parsed.pathname.replace(/^\//, ''),
    };
  } catch {
    return null;
  }
}

async function main() {
  const dbTarget = safeDbTarget();
  const backupPath = path.join(backupDir, `catalog-reset-${nowStamp()}.json`);

  console.log('Catalog reset target:', dbTarget ?? { host: 'unknown', database: 'unknown' });
  console.log('Backup path:', backupPath);
  console.log('Mode:', confirmReset ? 'confirm' : 'dry-run');

  const [
    products,
    categories,
    productImages,
    productCategories,
    cartItems,
    wishlistItems,
    orderItems,
  ] = await prisma.$transaction([
    prisma.product.findMany({
      include: {
        images: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.category.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.productImage.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.productCategory.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.cartItem.findMany({
      where: { productId: { not: null } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.wishlistItem.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.orderItem.findMany({
      where: { productId: { not: null } },
      orderBy: { id: 'asc' },
    }),
  ]);

  const backup = {
    generatedAt: new Date().toISOString(),
    database: dbTarget,
    scope: {
      products: products.length,
      categories: categories.length,
      productImages: productImages.length,
      productCategories: productCategories.length,
      cartItemsWithProducts: cartItems.length,
      wishlistItems: wishlistItems.length,
      orderItemsWithProducts: orderItems.length,
    },
    data: {
      products,
      categories,
      productImages,
      productCategories,
      cartItems,
      wishlistItems,
      orderItems,
    },
  };

  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  console.log('Backup written:', backupPath);
  console.log('Exact deletion scope:');
  console.log('- ProductImage rows');
  console.log('- ProductCategory rows');
  console.log('- CartItem rows with productId');
  console.log('- WishlistItem rows');
  console.log('- Product rows');
  console.log('- Category rows');
  console.log('- OrderItem.productId references will be nulled');
  console.log('Preserved tables: User, Auth/RefreshToken, Order, Payment, Upload, CustomDesign, ContactSubmission, WebhookEvent, Cart, ShippingAddress, Address, system settings');

  if (!confirmReset) {
    console.log('Dry run complete. Re-run with --confirm to execute the deletion.');
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const nulledOrderItems = await tx.orderItem.updateMany({
      where: { productId: { not: null } },
      data: { productId: null },
    });

    const deletedWishlistItems = await tx.wishlistItem.deleteMany({});

    const deletedCartItems = await tx.cartItem.deleteMany({
      where: { productId: { not: null } },
    });

    const deletedProductCategories = await tx.productCategory.deleteMany({});
    const deletedProductImages = await tx.productImage.deleteMany({});
    const deletedProducts = await tx.product.deleteMany({});
    const deletedCategories = await tx.category.deleteMany({});

    return {
      nulledOrderItems,
      deletedWishlistItems,
      deletedCartItems,
      deletedProductCategories,
      deletedProductImages,
      deletedProducts,
      deletedCategories,
    };
  });

  console.log('Reset completed successfully.');
  console.log(JSON.stringify(result, null, 2));

  const postCounts = await prisma.$transaction([
    prisma.product.count(),
    prisma.category.count(),
    prisma.productImage.count(),
    prisma.productCategory.count(),
    prisma.cartItem.count({ where: { productId: { not: null } } }),
    prisma.wishlistItem.count(),
    prisma.orderItem.count({ where: { productId: { not: null } } }),
  ]);

  console.log('Post-reset counts:', {
    products: postCounts[0],
    categories: postCounts[1],
    productImages: postCounts[2],
    productCategories: postCounts[3],
    cartItemsWithProducts: postCounts[4],
    wishlistItems: postCounts[5],
    orderItemsWithProducts: postCounts[6],
  });
}

main()
  .catch((error) => {
    console.error('Catalog reset failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });