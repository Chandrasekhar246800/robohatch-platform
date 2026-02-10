import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

const CategoryType = {
  DEFAULT: 'DEFAULT',
  CUSTOM: 'CUSTOM',
} as const;

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

export class SeedController {
  async seedCategories(req: Request, res: Response) {
    try {
      console.log('Starting category seeding...');

      // Check if categories already exist
      const existingCount = await prisma.category.count();
      
      if (existingCount > 0) {
        return res.status(200).json({
          success: true,
          message: `Categories already exist (${existingCount} found). Skipping seed.`,
          data: { existingCount },
        });
      }

      // Create new categories
      const createdCategories = [];
      for (const category of categories) {
        const created = await prisma.category.create({
          data: category,
        });
        createdCategories.push(created);
        console.log(`✓ Created: ${category.name} (${category.type})`);
      }

      console.log('✅ Category seeding complete!');

      return res.status(201).json({
        success: true,
        message: `Successfully created ${createdCategories.length} categories`,
        data: {
          total: createdCategories.length,
          custom: createdCategories.filter(c => c.type === 'CUSTOM').length,
          default: createdCategories.filter(c => c.type === 'DEFAULT').length,
          categories: createdCategories,
        },
      });
    } catch (error: any) {
      console.error('Seed categories error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to seed categories',
        error: error.message,
      });
    }
  }
}

export const seedController = new SeedController();
