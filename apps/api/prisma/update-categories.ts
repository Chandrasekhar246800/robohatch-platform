import { PrismaClient } from '@prisma/client';

// Note: CategoryType will be available after running the migration
const CategoryType = {
  DEFAULT: 'DEFAULT',
  CUSTOM: 'CUSTOM',
} as const;

const prisma = new PrismaClient();

const categories = [
  // Custom categories
  {
    name: 'Keychains (Custom)',
    type: CategoryType.CUSTOM,
    slug: 'keychains-custom',
    description: 'Personalized keychains with your design',
  },
  {
    name: 'Logo Keychains',
    type: CategoryType.CUSTOM,
    slug: 'logo-keychains',
    description: 'Custom keychains with your logo',
  },
  {
    name: 'Moon Lamps',
    type: CategoryType.CUSTOM,
    slug: 'moon-lamps',
    description: 'Personalized moon lamps with photos',
  },
  {
    name: 'Photo Frames',
    type: CategoryType.CUSTOM,
    slug: 'photo-frames',
    description: 'Custom 3D printed photo frames',
  },
  {
    name: 'Self Miniatures',
    type: CategoryType.CUSTOM,
    slug: 'self-miniatures',
    description: 'Miniature figures of yourself',
  },
  // Default categories
  {
    name: 'Keychains',
    type: CategoryType.DEFAULT,
    slug: 'keychains',
    description: 'Ready-made 3D printed keychains',
  },
  {
    name: 'Lamps',
    type: CategoryType.DEFAULT,
    slug: 'lamps',
    description: 'Decorative 3D printed lamps',
  },
  {
    name: 'Flower Pots & Vases',
    type: CategoryType.DEFAULT,
    slug: 'flower-pots-vases',
    description: '3D printed planters and vases',
  },
  {
    name: 'Devotional Idols',
    type: CategoryType.DEFAULT,
    slug: 'devotional-idols',
    description: 'Religious idols and figurines',
  },
  {
    name: 'Temple Models',
    type: CategoryType.DEFAULT,
    slug: 'temple-models',
    description: 'Miniature temple replicas',
  },
  {
    name: 'Anime Things',
    type: CategoryType.DEFAULT,
    slug: 'anime-things',
    description: 'Anime character figures and accessories',
  },
  {
    name: 'Mobile Accessories',
    type: CategoryType.DEFAULT,
    slug: 'mobile-accessories',
    description: 'Phone stands, cases, and holders',
  },
  {
    name: 'Desk Accessories',
    type: CategoryType.DEFAULT,
    slug: 'desk-accessories',
    description: 'Organizers, pen holders, and desk items',
  },
  {
    name: 'Fidget Toys',
    type: CategoryType.DEFAULT,
    slug: 'fidget-toys',
    description: 'Stress relief and fidget toys',
  },
];

async function main() {
  console.log('Starting category update...');

  // Delete all existing categories (this will cascade delete products)
  console.log('Deleting existing categories...');
  await prisma.category.deleteMany({});

  // Create new categories
  console.log('Creating new categories...');
  for (const category of categories) {
    await prisma.category.create({
      data: category,
    });
    console.log(`✓ Created: ${category.name} (${category.type})`);
  }

  console.log('\n✅ Category update complete!');
  console.log(`Total categories: ${categories.length}`);
  console.log(`Custom categories: ${categories.filter(c => c.type === CategoryType.CUSTOM).length}`);
  console.log(`Default categories: ${categories.filter(c => c.type === CategoryType.DEFAULT).length}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
