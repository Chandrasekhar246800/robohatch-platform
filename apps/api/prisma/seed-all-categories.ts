import { PrismaClient, CategoryType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed all categories (CUSTOM + DEFAULT) for RoboHatch platform
 * 
 * Run with: npx tsx prisma/seed-all-categories.ts
 */

const CUSTOM_CATEGORIES = [
  {
    name: 'Name Keychains',
    slug: 'name-keychains',
    description: 'Personalized keychains with custom names',
    type: CategoryType.CUSTOM,
  },
  {
    name: 'Logo Keychains',
    slug: 'logo-keychains',
    description: 'Custom keychains with your logo or design',
    type: CategoryType.CUSTOM,
  },
  {
    name: 'Photo Lamps',
    slug: 'photo-lamps',
    description: 'Illuminated lamps with your favorite photos',
    type: CategoryType.CUSTOM,
  },
  {
    name: 'Photo Frames',
    slug: 'photo-frames',
    description: 'Customized 3D printed photo frames',
    type: CategoryType.CUSTOM,
  },
  {
    name: 'Self Miniatures',
    slug: 'self-miniatures',
    description: '3D printed miniature figurines of yourself',
    type: CategoryType.CUSTOM,
  },
];

const DEFAULT_CATEGORIES = [
  {
    name: 'Keychains',
    slug: 'keychains',
    description: 'Unique and creative 3D printed keychains',
    type: CategoryType.DEFAULT,
  },
  {
    name: 'Lamps',
    slug: 'lamps',
    description: 'Aesthetically designed 3D printed lamps',
    type: CategoryType.DEFAULT,
  },
  {
    name: 'Flower Vases',
    slug: 'flower-vases',
    description: 'Elegant and modern 3D printed vases',
    type: CategoryType.DEFAULT,
  },
  {
    name: 'Idols',
    slug: 'idols',
    description: 'Religious and devotional 3D printed idols',
    type: CategoryType.DEFAULT,
  },
  {
    name: 'Temple Models',
    slug: 'temple-models',
    description: 'Miniature temple and mandir models',
    type: CategoryType.DEFAULT,
  },
  {
    name: 'Anime Things',
    slug: 'anime-things',
    description: 'Anime-inspired accessories and collectibles',
    type: CategoryType.DEFAULT,
  },
  {
    name: 'Mobile Accessories',
    slug: 'mobile-accessories',
    description: 'Phone stands, holders, and accessories',
    type: CategoryType.DEFAULT,
  },
  {
    name: 'Desk Accessories',
    slug: 'desk-accessories',
    description: 'Organizers, pen holders, and desk decor',
    type: CategoryType.DEFAULT,
  },
  {
    name: 'Fidget Toys',
    slug: 'fidget-toys',
    description: 'Stress relief and fidget toys',
    type: CategoryType.DEFAULT,
  },
];

async function seedCategories() {
  console.log('🌱 Starting category seeding...\n');

  try {
    // Clear existing categories
    console.log('🗑️  Clearing existing categories...');
    await prisma.productCategory.deleteMany({});
    await prisma.category.deleteMany({});
    console.log('✅ Existing categories cleared\n');

    // Seed CUSTOM categories
    console.log('📦 Seeding CUSTOM categories...');
    let customCount = 0;
    for (const category of CUSTOM_CATEGORIES) {
      const created = await prisma.category.create({
        data: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          type: category.type,
        },
      });
      console.log(`  ✅ ${created.name}`);
      customCount++;
    }
    console.log(`✅ Created ${customCount} CUSTOM categories\n`);

    // Seed DEFAULT categories
    console.log('📦 Seeding DEFAULT categories...');
    let defaultCount = 0;
    for (const category of DEFAULT_CATEGORIES) {
      const created = await prisma.category.create({
        data: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          type: category.type,
        },
      });
      console.log(`  ✅ ${created.name}`);
      defaultCount++;
    }
    console.log(`✅ Created ${defaultCount} DEFAULT categories\n`);

    // Summary
    console.log('='.repeat(60));
    console.log('🎉 Category seeding complete!');
    console.log('='.repeat(60));
    console.log(`📊 SUMMARY:`);
    console.log(`   • CUSTOM categories:  ${customCount}`);
    console.log(`   • DEFAULT categories: ${defaultCount}`);
    console.log(`   • TOTAL categories:   ${customCount + defaultCount}`);
    console.log('='.repeat(60));
    console.log('\n✅ Database is ready for products!\n');

  } catch (error: any) {
    console.error('\n❌ Error during seeding:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Database connection closed\n');
  }
}

// Execute seeding
seedCategories();
