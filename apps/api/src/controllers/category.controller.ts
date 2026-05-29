import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

import { logger } from '../utils/logger';

export class CategoryController {
  async getAllCategories(req: Request, res: Response) {
    try {
      const categories = await prisma.category.findMany({
        orderBy: [
          {
            type: 'asc', // CUSTOM first, then DEFAULT
          },
          {
            name: 'asc', // Then alphabetically within each type
          },
        ],
      });

      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      logger.error('Get categories error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message,
      });
    }
  }

  async createCategory(req: Request, res: Response) {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required',
        });
      }

      const category = await prisma.category.create({
        data: {
          name: name.trim(),
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category,
      });
    } catch (error: any) {
      logger.error('Create category error:', error);

      // Handle unique constraint violation
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'Category with this name already exists',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create category',
        error: error.message,
      });
    }
  }

  async updateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required',
        });
      }

      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      const category = await prisma.category.update({
        where: { id },
        data: {
          name: name.trim(),
        },
      });

      return res.status(200).contentType('application/json').json({
        success: true,
        message: 'Category updated successfully',
        data: category,
      });
    } catch (error: any) {
      logger.error('Update category error:', error);

      // Handle unique constraint violation
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'Category with this name already exists',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to update category',
        error: error.message,
      });
    }
  }

  async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id },
        include: {
          products: {
            include: {
              product: {
                select: { isActive: true },
              },
            },
          },
        },
      });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      // Only block deletion when the category still has active products assigned.
      // Inactive products are already hidden from the admin catalog and can be detached by deleting the category.
      const activeProductCount = existingCategory.products.filter((relation) => relation.product?.isActive).length;

      if (activeProductCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category. It has ${activeProductCount} active product(s) assigned.`,
        });
      }

      await prisma.category.delete({
        where: { id },
      });

      return res.status(200).contentType('application/json').json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete category error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to delete category',
        error: error.message,
      });
    }
  }

  async seedCategories(req: Request, res: Response) {
    try {
      const CategoryType = {
        DEFAULT: 'DEFAULT',
        CUSTOM: 'CUSTOM',
      } as const;

      const categories = [
        // Custom categories
        { name: 'Keychains (Custom)', type: CategoryType.CUSTOM, slug: 'keychains-custom', description: 'Personalized keychains with your design' },
        { name: 'Logo Keychains', type: CategoryType.CUSTOM, slug: 'logo-keychains', description: 'Custom keychains with your logo' },
        { name: 'Moon Lamps', type: CategoryType.CUSTOM, slug: 'moon-lamps', description: 'Personalized moon lamps with photos' },
        { name: 'Photo Frames', type: CategoryType.CUSTOM, slug: 'photo-frames', description: 'Custom 3D printed photo frames' },
        { name: 'Self Miniatures', type: CategoryType.CUSTOM, slug: 'self-miniatures', description: 'Miniature figures of yourself' },
        // Default categories
        { name: 'Keychains', type: CategoryType.DEFAULT, slug: 'keychains', description: 'Ready-made 3D printed keychains' },
        { name: 'Lamps', type: CategoryType.DEFAULT, slug: 'lamps', description: 'Decorative 3D printed lamps' },
        { name: 'Flower Pots & Vases', type: CategoryType.DEFAULT, slug: 'flower-pots-vases', description: '3D printed planters and vases' },
        { name: 'Devotional Idols', type: CategoryType.DEFAULT, slug: 'devotional-idols', description: 'Religious idols and figurines' },
        { name: 'Temple Models', type: CategoryType.DEFAULT, slug: 'temple-models', description: 'Miniature temple replicas' },
        { name: 'Anime Things', type: CategoryType.DEFAULT, slug: 'anime-things', description: 'Anime character figures and accessories' },
        { name: 'Mobile Accessories', type: CategoryType.DEFAULT, slug: 'mobile-accessories', description: 'Phone stands, cases, and holders' },
        { name: 'Desk Accessories', type: CategoryType.DEFAULT, slug: 'desk-accessories', description: 'Organizers, pen holders, and desk items' },
        { name: 'Fidget Toys', type: CategoryType.DEFAULT, slug: 'fidget-toys', description: 'Stress relief and fidget toys' },
      ];

      logger.info('Starting category seeding...');

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
        logger.info(`✓ Created: ${category.name} (${category.type})`);
      }

      logger.info('✅ Category seeding complete!');

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
      logger.error('Seed categories error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to seed categories',
        error: error.message,
      });
    }
  }
}

export const categoryController = new CategoryController();
