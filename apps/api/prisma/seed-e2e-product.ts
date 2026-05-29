import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const envId = process.env.E2E_STABLE_PRODUCT_ID;
  const defaultId = '9d39b839-441d-4e8a-b18e-8e49518ee839';
  const id = envId && envId.trim().length > 0 ? envId.trim() : defaultId;

  // Create or find category
  const categoryName = 'E2E Stable Products';
  const categorySlug = 'e2e-stable-products';

  const category = await prisma.category.upsert({
    where: { name: categoryName },
    update: {},
    create: {
      name: categoryName,
      description: 'Deterministic category for Playwright E2E stable product',
      slug: categorySlug,
    },
  });

  const stableId = id;

  // Upsert product
  const productName = 'E2E Stable Product';
  const productDesc = 'Deterministic product seeded for Playwright E2E tests.';
  const price = '499.00';

  const product = await prisma.product.upsert({
    where: { id: stableId },
    create: {
      id: stableId,
      name: productName,
      description: productDesc,
      price: price as any,
      stock: 100,
      isActive: true,
    },
    update: {
      name: productName,
      description: productDesc,
      price: price as any,
      stock: 100,
      isActive: true,
    },
  });

  // Ensure product-category relation exists
  const existingRel = await prisma.productCategory.findFirst({
    where: { productId: product.id, categoryId: category.id },
  });

  if (!existingRel) {
    await prisma.productCategory.create({
      data: {
        productId: product.id,
        categoryId: category.id,
      },
    });
  }

  // Remove existing images and add a deterministic image
  await prisma.productImage.deleteMany({ where: { productId: product.id } });

  const imageUrl = process.env.E2E_STABLE_PRODUCT_IMAGE || 'https://placehold.co/600x600/png?text=E2E+Product';

  await prisma.productImage.create({
    data: {
      url: imageUrl,
      productId: product.id,
      alt: 'E2E stable product image',
      order: 0,
    },
  });

  console.log('E2E stable product id:', product.id);

  // ------------------------
  // Deterministic E2E accounts
  // ------------------------
  // Read credentials from env when provided; otherwise fall back to safe deterministic defaults.
  const customerEmail = (process.env.E2E_TEST_USER_EMAIL || 'e2e.customer@robohatch.local').toLowerCase();
  const customerPassword = process.env.E2E_TEST_USER_PASSWORD || 'E2E_test_pass_2026!';

  const adminEmail = (process.env.E2E_ADMIN_EMAIL || 'e2e.admin@robohatch.local').toLowerCase();
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'E2E_admin_pass_2026!';

  const rounds = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS, 10) : 12;

  // Upsert customer user
  const hashedCustomer = await bcrypt.hash(customerPassword, rounds);
  await prisma.user.upsert({
    where: { email: customerEmail },
    update: {
      password: hashedCustomer,
      name: 'E2E Customer',
    },
    create: {
      email: customerEmail,
      password: hashedCustomer,
      name: 'E2E Customer',
      role: 'USER',
    },
  });

  // Upsert admin user
  const hashedAdmin = await bcrypt.hash(adminPassword, rounds);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedAdmin,
      name: 'E2E Admin',
      role: 'ADMIN',
    },
    create: {
      email: adminEmail,
      password: hashedAdmin,
      name: 'E2E Admin',
      role: 'ADMIN',
    },
  });

  console.log('Seeded E2E accounts:', { customerEmail, adminEmail });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
