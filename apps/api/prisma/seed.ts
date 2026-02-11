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
  const categories = [
    // Custom categories
    { name: 'Keychains (Custom)', type: 'CUSTOM', slug: 'keychains-custom', description: 'Personalized keychains with your design' },
    { name: 'Logo Keychains', type: 'CUSTOM', slug: 'logo-keychains', description: 'Custom keychains with your logo' },
    { name: 'Moon Lamps', type: 'CUSTOM', slug: 'moon-lamps', description: 'Personalized moon lamps with photos' },
    { name: 'Photo Frames', type: 'CUSTOM', slug: 'photo-frames', description: 'Custom 3D printed photo frames' },
    { name: 'Self Miniatures', type: 'CUSTOM', slug: 'self-miniatures', description: 'Miniature figures of yourself' },
    // Default categories
    { name: 'Keychains', type: 'DEFAULT', slug: 'keychains', description: 'Ready-made 3D printed keychains' },
    { name: 'Lamps', type: 'DEFAULT', slug: 'lamps', description: 'Decorative 3D printed lamps' },
    { name: 'Anime Things', type: 'DEFAULT', slug: 'anime-things', description: 'Anime character figures and accessories' },
    { name: 'Desk Accessories', type: 'DEFAULT', slug: 'desk-accessories', description: 'Organizers, pen holders, and desk items' },
    { name: 'Devotional Idols', type: 'DEFAULT', slug: 'devotional-idols', description: 'Religious idols and figurines' },
    { name: 'Fidget Toys', type: 'DEFAULT', slug: 'fidget-toys', description: 'Stress relief and fidget toys' },
    { name: 'Flower Pots & Vases', type: 'DEFAULT', slug: 'flower-pots-vases', description: '3D printed planters and vases' },
    { name: 'Mobile Accessories', type: 'DEFAULT', slug: 'mobile-accessories', description: 'Phone stands, cases, and holders' },
    { name: 'Temple Models', type: 'DEFAULT', slug: 'temple-models', description: 'Miniature temple replicas' },
  ];

  let categoryCount = 0;
  for (const category of categories) {
    const result = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, type: category.type, description: category.description },
      create: category,
    });
    categoryCount++;
    categoryCount++;
  }

  console.log(`✅ Created/Updated ${categoryCount} categories (5 Custom + 9 Default)`);
  console.log('');
  console.log('📌 ADMIN LOGIN:');
  console.log('   Email: Admin@robohatch.in');
  console.log('   Password: Admin@123456789090');
  console.log('');
  console.log('📌 ADD PRODUCTS: http://localhost:3000/admin/products/add');
  console.log('');
  
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
