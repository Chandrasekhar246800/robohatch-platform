import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123456789090', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'Admin@robohatch.in' },
    update: {},
    create: {
      email: 'Admin@robohatch.in',
      password: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Keychains' },
      update: {},
      create: { name: 'Keychains' },
    }),
    prisma.category.upsert({
      where: { name: 'Figurines' },
      update: {},
      create: { name: 'Figurines' },
    }),
    prisma.category.upsert({
      where: { name: 'Anime Figures' },
      update: {},
      create: { name: 'Anime Figures' },
    }),
    prisma.category.upsert({
      where: { name: 'Home Décor' },
      update: {},
      create: { name: 'Home Décor' },
    }),
    prisma.category.upsert({
      where: { name: 'Lamps' },
      update: {},
      create: { name: 'Lamps' },
    }),
    prisma.category.upsert({
      where: { name: 'Custom Designs' },
      update: {},
      create: { name: 'Custom Designs' },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Create products
  const products = [
    {
      name: 'Dragon Keychain',
      description: 'Detailed 3D printed dragon keychain in vibrant colors',
      price: 299,
      categoryId: categories[0].id,
      images: ['https://placehold.co/400x400/F27405/white?text=Dragon+Keychain'],
    },
    {
      name: 'Superhero Figurine',
      description: 'Custom superhero figurine with incredible detail',
      price: 899,
      categoryId: categories[1].id,
      images: ['https://placehold.co/400x400/F25C05/white?text=Superhero'],
    },
    {
      name: 'Anime Character Model',
      description: 'High-quality anime character collectible figure',
      price: 1499,
      categoryId: categories[2].id,
      images: ['https://placehold.co/400x400/8C3503/white?text=Anime+Figure'],
    },
    {
      name: 'Geometric Vase',
      description: 'Modern geometric vase for home decoration',
      price: 799,
      categoryId: categories[3].id,
      images: ['https://placehold.co/400x400/F2935C/white?text=Vase'],
    },
    {
      name: 'Moon Lamp',
      description: 'Beautiful 3D printed moon lamp with LED lighting',
      price: 1299,
      categoryId: categories[4].id,
      images: ['https://placehold.co/400x400/260A03/white?text=Moon+Lamp'],
    },
    {
      name: 'Custom Pet Figurine',
      description: 'Personalized 3D printed figurine of your pet',
      price: 2499,
      categoryId: categories[5].id,
      images: ['https://placehold.co/400x400/F27405/white?text=Pet+Figure'],
    },
    {
      name: 'Mandalorian Helmet',
      description: 'Detailed replica helmet from the hit series',
      price: 3999,
      categoryId: categories[1].id,
      images: ['https://placehold.co/400x400/8C3503/white?text=Helmet'],
    },
    {
      name: 'Plant Pot Set',
      description: 'Set of 3 modern geometric plant pots',
      price: 699,
      categoryId: categories[3].id,
      images: ['https://placehold.co/400x400/F2935C/white?text=Plant+Pots'],
    },
    {
      name: 'Custom Logo Keychain',
      description: 'Personalized keychain with your company logo',
      price: 399,
      categoryId: categories[5].id,
      images: ['https://placehold.co/400x400/F27405/white?text=Logo+Key'],
    },
    {
      name: 'Galaxy Night Light',
      description: '3D printed galaxy-themed decorative night light',
      price: 1599,
      categoryId: categories[4].id,
      images: ['https://placehold.co/400x400/260A03/white?text=Galaxy+Light'],
    },
  ];

  for (const product of products) {
    const { images, ...productData } = product;
    
    const createdProduct = await prisma.product.upsert({
      where: { id: productData.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: productData.name.toLowerCase().replace(/\s+/g, '-'),
        ...productData,
        images: {
          create: images.map((url) => ({ url })),
        },
      },
    });

    console.log(`✅ Created product: ${createdProduct.name}`);
  }

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
