import 'dotenv/config';
import { prisma, Prisma } from '../src/config/prisma';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const imageUrl = process.argv[2];
if (!imageUrl) {
  console.error('Usage: tsx scripts/delete-product-by-image-url.ts "https://..."');
  process.exit(1);
}

async function parseS3Url(url: string) {
  try {
    const u = new URL(url);
    const hostParts = u.hostname.split('.');

    if (u.hostname.endsWith('amazonaws.com') || u.hostname.includes('s3')) {
      if (hostParts[0] && hostParts[1] === 's3') {
        const parts = u.pathname.split('/').filter(Boolean);
        const bucket = parts.shift();
        const key = parts.join('/');
        if (bucket && key) return { bucket, key };
      }

      if (hostParts.length && !hostParts[0].startsWith('s3')) {
        const bucket = hostParts[0];
        const key = u.pathname.slice(1);
        if (bucket && key) return { bucket, key };
      }
    }
  } catch {
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
  } catch (e: any) {
    console.error('S3 delete failed for', url, e?.message || e);
    return false;
  }
}

(async () => {
  const matchingImages = await prisma.productImage.findMany({
    where: {
      OR: [
        { url: imageUrl },
        { url: { endsWith: imageUrl.split('/').pop() || imageUrl } },
      ],
    },
    include: {
      product: {
        include: {
          images: true,
        },
      },
    },
  });

  if (matchingImages.length === 0) {
    console.log('No product image matched:', imageUrl);
    process.exit(0);
  }

  const productsById = new Map<string, (typeof matchingImages)[number]['product']>();
  for (const row of matchingImages) {
    if (row.product) productsById.set(row.product.id, row.product);
  }

  if (productsById.size === 0) {
    console.log('Matched image rows, but no product relations were found.');
    process.exit(1);
  }

  const products = [...productsById.values()];
  console.log('Matched products:', products.map((p) => ({ id: p?.id, name: p?.name })));

  for (const product of products) {
    if (!product) continue;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const orderItemDeleted = await tx.orderItem.deleteMany({ where: { productId: product.id } });
      const cartItemDeleted = await tx.cartItem.deleteMany({ where: { productId: product.id } });
      const wishlistItemDeleted = await tx.wishlistItem.deleteMany({ where: { productId: product.id } });
      const productCategoryDeleted = await tx.productCategory.deleteMany({ where: { productId: product.id } });
      const productImageDeleted = await tx.productImage.deleteMany({ where: { productId: product.id } });
      const productDeleted = await tx.product.delete({ where: { id: product.id } });

      return {
        orderItemDeleted,
        cartItemDeleted,
        wishlistItemDeleted,
        productCategoryDeleted,
        productImageDeleted,
        productDeleted,
      };
    });

    console.log('Deleted product:', product.id, product.name);
    console.log('DB result:', result);

    for (const image of product.images || []) {
      if (image.url) {
        const deleted = await tryDeleteS3Object(image.url);
        console.log(`S3 ${deleted ? 'deleted' : 'skipped'}: ${image.url}`);
      }
    }
  }

  process.exit(0);
})();
