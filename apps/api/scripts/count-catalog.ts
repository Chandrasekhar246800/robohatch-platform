import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [products, categories, productImages, productCategories] = await prisma.$transaction([
    prisma.product.count(),
    prisma.category.count(),
    prisma.productImage.count(),
    prisma.productCategory.count(),
  ]);

  console.log(JSON.stringify({ products, categories, productImages, productCategories }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });