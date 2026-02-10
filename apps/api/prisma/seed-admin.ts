import { PrismaClient, CategoryType } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  // CUSTOM Categories (5)
  {
    name: 'Keychains Custom',
    type: CategoryType.CUSTOM,
    slug: 'keychains-custom',
    description: 'Custom-designed keychains with personalized text and images'
  },
  {
    name: 'Logo Keychains',
    type: CategoryType.CUSTOM,
    slug: 'logo-keychains',
    description: 'Keychains with custom logos and branding'
  },
  {
    name: 'Moon Lamps',
    type: CategoryType.CUSTOM,
    slug: 'moon-lamps',
    description: 'Custom moon lamps with personalized photos'
  },
  {
    name: 'Photo Frames',
    type: CategoryType.CUSTOM,
    slug: 'photo-frames',
    description: 'Custom 3D-printed photo frames'
  },
  {
    name: 'Self Miniatures',
    type: CategoryType.CUSTOM,
    slug: 'self-miniatures',
    description: 'Personalized miniature figurines of yourself'
  },
  // DEFAULT Categories (9)
  {
    name: 'Keychains',
    type: CategoryType.DEFAULT,
    slug: 'keychains',
    description: 'Pre-designed keychains in various styles'
  },
  {
    name: 'Lamps',
    type: CategoryType.DEFAULT,
    slug: 'lamps',
    description: '3D-printed decorative lamps and lighting'
  },
  {
    name: 'Flower Pots & Vases',
    type: CategoryType.DEFAULT,
    slug: 'flower-pots-vases',
    description: 'Decorative planters and vases'
  },
  {
    name: 'Devotional Idols',
    type: CategoryType.DEFAULT,
    slug: 'devotional-idols',
    description: 'Religious statues and idols'
  },
  {
    name: 'Temple Models',
    type: CategoryType.DEFAULT,
    slug: 'temple-models',
    description: 'Miniature temple replicas'
  },
  {
    name: 'Anime Things',
    type: CategoryType.DEFAULT,
    slug: 'anime-things',
    description: 'Anime figurines and collectibles'
  },
  {
    name: 'Mobile Accessories',
    type: CategoryType.DEFAULT,
    slug: 'mobile-accessories',
    description: 'Phone stands, holders, and accessories'
  },
  {
    name: 'Desk Accessories',
    type: CategoryType.DEFAULT,
    slug: 'desk-accessories',
    description: 'Organizational items for your workspace'
  },
  {
    name: 'Fidget Toys',
    type: CategoryType.DEFAULT,
    slug: 'fidget-toys',
    description: 'Interactive stress-relief toys'
  }
];

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing ProductCategory relationships first (if any)
  console.log('🧹 Clearing existing product-category relationships...');
  try {
    const count = await prisma.productCategory.deleteMany({});
    console.log(`✅ Cleared ${count.count} product-category relationships\n`);
  } catch (error) {
    console.log('⚠ No existing relationships to clear\n');
  }

  // Seed categories
  console.log('📦 Seeding categories...');
  let customCount = 0;
  let defaultCount = 0;

  for (const category of CATEGORIES) {
    const result = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        type: category.type,
        description: category.description
      },
      create: category
    });

    if (result.type === CategoryType.CUSTOM) {
      customCount++;
      console.log(`  ✓ ${result.name} (CUSTOM)`);
    } else {
      defaultCount++;
      console.log(`  ✓ ${result.name} (DEFAULT)`);
    }
  }

  console.log(`\n✅ Seeded ${customCount} CUSTOM categories`);
  console.log(`✅ Seeded ${defaultCount} DEFAULT categories`);
  console.log(`📊 Total: ${CATEGORIES.length} categories\n`);

  // Display all categories grouped by type
  const allCategories = await prisma.category.findMany({
    orderBy: [
      { type: 'asc' },
      { name: 'asc' }
    ]
  });

  console.log('📋 Current categories in database:\n');
  console.log('CUSTOM Categories:');
  allCategories
    .filter(c => c.type === CategoryType.CUSTOM)
    .forEach(c => console.log(`  - ${c.name}`));

  console.log('\nDEFAULT Categories:');
  allCategories
    .filter(c => c.type === CategoryType.DEFAULT)
    .forEach(c => console.log(`  - ${c.name}`));

  console.log('\n🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
