import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export class ProductController {
  async createProduct(req: AuthRequest, res: Response) {
    try {
      const { name, description, price, categoryId } = req.body;
      const files = req.files as Express.MulterS3.File[];

      // Validate required fields
      if (!name || !price || !categoryId) {
        return res.status(400).json({
          success: false,
          message: 'Name, price, and categoryId are required',
        });
      }

      // Validate price is a positive number
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a positive number',
        });
      }

      // Validate category exists
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      // Validate images were uploaded
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one product image is required',
        });
      }

      // Create product with images in a transaction
      const product = await prisma.product.create({
        data: {
          name,
          description: description || '',
          price: parsedPrice,
          categoryId,
          images: {
            create: files.map((file, index) => ({
              url: file.location, // S3 URL from multer-s3
              alt: `${name} - Image ${index + 1}`,
              order: index,
            })),
          },
        },
        include: {
          images: true,
          category: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error: any) {
      console.error('Create product error:', error);

      // Handle Prisma-specific errors
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'Product with this name already exists',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: error.message,
      });
    }
  }

  async getAllProducts(req: Request, res: Response) {
    try {
      const products = await prisma.product.findMany({
        include: {
          images: true,
          category: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error: any) {
      console.error('Get products error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch products',
        error: error.message,
      });
    }
  }

  async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          images: true,
          category: true,
        },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      console.error('Get product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch product',
        error: error.message,
      });
    }
  }
}

export const productController = new ProductController();
