require('dotenv/config');

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const outputPath = path.resolve(__dirname, '../backups/catalog-count.json');

async function main() {
  const [products, categories, productImages, productCategories] = await prisma.$transaction([
    prisma.product.count(),
    prisma.category.count(),
    prisma.productImage.count(),
    prisma.productCategory.count(),
  ]);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({ products, categories, productImages, productCategories }, null, 2), 'utf8');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });