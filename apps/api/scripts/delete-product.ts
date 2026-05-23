import 'dotenv/config';
import { prisma } from '../src/config/prisma';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const name = process.argv[2];
if (!name) {
  console.error('Usage: tsx scripts/delete-product.ts "Product Name"');
  process.exit(1);
}

async function parseS3Url(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('amazonaws.com') || u.hostname.includes('s3')) {
      // Try to extract bucket and key
      // formats: https://bucket.s3.amazonaws.com/key or https://s3.amazonaws.com/bucket/key
      const hostParts = u.hostname.split('.');
      if (hostParts[0] && hostParts[1] === 's3') {
        // s3.amazonaws.com style: /bucket/key
        const parts = u.pathname.split('/').filter(Boolean);
        const bucket = parts.shift();
        const key = parts.join('/');
        if (bucket && key) return { bucket, key };
      } else if (hostParts.length && !hostParts[0].startsWith('s3')) {
        // bucket.s3.amazonaws.com style
        const bucket = hostParts[0];
        const key = u.pathname.slice(1);
        if (bucket && key) return { bucket, key };
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

async function tryDeleteS3Object(url: string) {
  const parsed = await parseS3Url(url);
  if (!parsed) return false;
  const { bucket, key } = parsed;
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e) {
    console.error('S3 delete failed for', url, e.message || e);
    return false;
  }
}

(async () => {
  const product = await prisma.product.findFirst({
    where: { name },
    include: { images: true },
  });

  if (!product) {
    console.error('Product not found:', name);
    process.exit(1);
  }

  console.log('Found product:', product.id, product.name);
  console.log('Images count:', product.images.length);

  // Start transaction
  const res = await prisma.$transaction(async (tx) => {
    // Nullify order items product references (preserve order history)
    const nullified = await tx.orderItem.updateMany({
      where: { productId: product.id },
      data: { productId: null },
    });

    // Delete cart items referencing product
    const cartDeleted = await tx.cartItem.deleteMany({ where: { productId: product.id } });

    // Delete wishlist items referencing product
    const wishDeleted = await tx.wishlistItem.deleteMany({ where: { productId: product.id } });

    // Delete product categories
    const pcDeleted = await tx.productCategory.deleteMany({ where: { productId: product.id } });

    // Delete product images rows
    const piDeleted = await tx.productImage.deleteMany({ where: { productId: product.id } });

    // Finally delete product record
    const prodDeleted = await tx.product.delete({ where: { id: product.id } });

    return { nullified, cartDeleted, wishDeleted, pcDeleted, piDeleted, prodDeleted };
  });

  console.log('Transaction results:', res);

  // Attempt to delete image files from S3 (best-effort)
  for (const img of product.images) {
    if (img.url) {
      const ok = await tryDeleteS3Object(img.url);
      console.log(`S3 deletion for ${img.url}: ${ok ? 'deleted' : 'skipped/failed'}`);
    }
  }

  console.log('Product deletion complete.');
  process.exit(0);
})();
