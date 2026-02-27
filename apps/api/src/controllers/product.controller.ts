import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { s3 } from '../config/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import environment from '../config/environment';

export class ProductController {
  async createProduct(req: AuthRequest, res: Response) {
    try {
      const { name, description, price, stock, categoryIds } = req.body;
      const files = req.files as Express.MulterS3.File[];

      // Validate required fields
      if (!name || !price) {
        return res.status(400).json({
          success: false,
          message: 'Name and price are required',
        });
      }

      // Parse categoryIds (can be string or array from form data)
      let parsedCategoryIds: string[] = [];
      if (categoryIds) {
        if (typeof categoryIds === 'string') {
          try {
            // Try parsing as JSON array
            parsedCategoryIds = JSON.parse(categoryIds);
          } catch {
            // If not JSON, treat as single ID
            parsedCategoryIds = [categoryIds];
          }
        } else if (Array.isArray(categoryIds)) {
          parsedCategoryIds = categoryIds;
        }
      }

      // Validate at least one category
      if (parsedCategoryIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one category is required',
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

      // Parse stock (default to 0 if not provided)
      const parsedStock = stock ? parseInt(stock, 10) : 0;
      if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock must be a non-negative number',
        });
      }

      // Validate all categories exist
      const categories = await prisma.category.findMany({
        where: { id: { in: parsedCategoryIds } },
      });

      if (categories.length !== parsedCategoryIds.length) {
        return res.status(404).json({
          success: false,
          message: 'One or more categories not found',
        });
      }

      // Validate images were uploaded
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one product image is required',
        });
      }

      // Create product with images and categories in a transaction
      const product = await prisma.product.create({
        data: {
          name,
          description: description || '',
          price: parsedPrice,
          stock: parsedStock,
          images: {
            create: files.map((file, index) => ({
              url: file.location, // S3 URL from multer-s3
              alt: `${name} - Image ${index + 1}`,
              order: index,
            })),
          },
          categories: {
            create: parsedCategoryIds.map(categoryId => ({
              categoryId,
            })),
          },
        },
        include: {
          images: true,
          categories: {
            include: {
              category: true,
            },
          },
        },
      });

      // Transform response to include single category instead of categories array
      const transformedProduct = {
        ...product,
        category: product.categories[0]?.category || null,
        categoryId: product.categories[0]?.categoryId || null,
      };
      delete (transformedProduct as any).categories;

      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: transformedProduct,
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
          categories: {
            include: {
              category: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Transform response to include single category instead of categories array
      const transformedProducts = products.map((product: any) => {
        const transformed = {
          ...product,
          category: product.categories[0]?.category || null,
          categoryId: product.categories[0]?.categoryId || null,
        };
        delete (transformed as any).categories;
        return transformed;
      });

      return res.status(200).json({
        success: true,
        data: transformedProducts,
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

  async searchProducts(req: Request, res: Response) {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
          data: [],
        });
      }

      const searchTerm = q.trim();

      // Search products by name or description
      // MySQL search is case-insensitive by default for contains
      const products = await prisma.product.findMany({
        where: {
          AND: [
            { isActive: true }, // Only show active products
            {
              OR: [
                {
                  name: {
                    contains: searchTerm,
                  },
                },
                {
                  description: {
                    contains: searchTerm,
                  },
                },
              ],
            },
          ],
        },
        include: {
          images: true,
          categories: {
            include: {
              category: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20, // Limit to 20 results for performance
      });

      // Transform response to include single category instead of categories array
      const transformedProducts = products.map((product: any) => {
        const transformed = {
          ...product,
          category: product.categories[0]?.category || null,
          categoryId: product.categories[0]?.categoryId || null,
        };
        delete (transformed as any).categories;
        return transformed;
      });

      return res.status(200).json({
        success: true,
        data: transformedProducts,
        count: transformedProducts.length,
        query: q,
      });
    } catch (error: any) {
      console.error('Search products error:', error);
      return res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error.message,
        data: [],
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
          categories: {
            include: {
              category: true,
            },
          },
        },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Transform response to include single category instead of categories array
      const transformedProduct = {
        ...product,
        category: product.categories[0]?.category || null,
        categoryId: product.categories[0]?.categoryId || null,
      };
      delete (transformedProduct as any).categories;

      return res.status(200).json({
        success: true,
        data: transformedProduct,
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

  async updateProduct(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, price, stock, categoryIds } = req.body;
      const files = req.files as Express.MulterS3.File[];

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id },
        include: { 
          categories: { include: { category: true } }, 
          images: true 
        },
      });

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Parse categoryIds if provided
      let parsedCategoryIds: string[] | undefined;
      if (categoryIds) {
        if (typeof categoryIds === 'string') {
          try {
            parsedCategoryIds = JSON.parse(categoryIds);
          } catch {
            parsedCategoryIds = [categoryIds];
          }
        } else if (Array.isArray(categoryIds)) {
          parsedCategoryIds = categoryIds;
        }

        // Validate categories
        if (parsedCategoryIds && parsedCategoryIds.length > 0) {
          const categories = await prisma.category.findMany({
            where: { id: { in: parsedCategoryIds } },
          });

          if (categories.length !== parsedCategoryIds.length) {
            return res.status(404).json({
              success: false,
              message: 'One or more categories not found',
            });
          }
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price) {
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Price must be a positive number',
          });
        }
        updateData.price = parsedPrice;
      }
      if (stock !== undefined) {
        const parsedStock = parseInt(stock, 10);
        if (isNaN(parsedStock) || parsedStock < 0) {
          return res.status(400).json({
            success: false,
            message: 'Stock must be a non-negative number',
          });
        }
        updateData.stock = parsedStock;
      }

      // Handle category updates
      if (parsedCategoryIds && parsedCategoryIds.length > 0) {
        updateData.categories = {
          deleteMany: {}, // Remove all existing relationships
          create: parsedCategoryIds.map(categoryId => ({ categoryId })),
        };
      }

      // Handle new images
      if (files && files.length > 0) {
        const maxOrder = existingProduct.images.length > 0 
          ? Math.max(...existingProduct.images.map((img: any) => img.order), -1)
          : -1;
        updateData.images = {
          create: files.map((file, index) => ({
            url: file.location,
            alt: `${name || existingProduct.name} - Image ${maxOrder + index + 2}`,
            order: maxOrder + index + 1,
          })),
        };
      }

      // Update product
      const product = await prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          images: true,
          categories: {
            include: {
              category: true,
            },
          },
        },
      });

      // Transform response to include single category instead of categories array
      const transformedProduct = {
        ...product,
        category: product.categories[0]?.category || null,
        categoryId: product.categories[0]?.categoryId || null,
      };
      delete (transformedProduct as any).categories;

      return res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: transformedProduct,
      });
    } catch (error: any) {
      console.error('Update product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: error.message,
      });
    }
  }

  async deleteProduct(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Check if product exists and get images
      const product = await prisma.product.findUnique({
        where: { id },
        include: { images: true },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Delete images from S3 bucket
      if (product.images && product.images.length > 0) {
        const deletePromises = product.images.map(async (image: any) => {
          try {
            // Extract S3 key from URL (e.g., "products/xyz.jpg")
            const url = new URL(image.url);
            const key = url.pathname.substring(1); // Remove leading slash
            
            const deleteCommand = new DeleteObjectCommand({
              Bucket: environment.AWS_S3_BUCKET,
              Key: key,
            });
            
            await s3.send(deleteCommand);
            console.log(`✓ Deleted image from S3: ${key}`);
          } catch (s3Error: any) {
            console.error(`Failed to delete image from S3: ${image.url}`, s3Error.message);
            // Continue even if S3 deletion fails
          }
        });

        await Promise.all(deletePromises);
      }

      // Delete product from database (categories and images will cascade delete)
      await prisma.product.delete({
        where: { id },
      });

      return res.status(200).json({
        success: true,
        message: 'Product deleted successfully from database and S3',
      });
    } catch (error: any) {
      console.error('Delete product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete product',
        error: error.message,
      });
    }
  }
}

export const productController = new ProductController();
