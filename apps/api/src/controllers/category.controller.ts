import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export class CategoryController {
  async getAllCategories(req: Request, res: Response) {
    try {
      const categories = await prisma.category.findMany({
        orderBy: {
          name: 'asc',
        },
      });

      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      console.error('Get categories error:', error);
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
      console.error('Create category error:', error);

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
      console.error('Update category error:', error);

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
          _count: {
            select: { products: true },
          },
        },
      });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      // Check if category has products
      if (existingCategory._count.products > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category. It has ${existingCategory._count.products} product(s) assigned.`,
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
      console.error('Delete category error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to delete category',
        error: error.message,
      });
    }
  }
}

export const categoryController = new CategoryController();
