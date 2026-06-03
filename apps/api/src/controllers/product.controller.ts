import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { s3 } from '../config/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { validateImageSignatureFromS3 } from '../utils/fileSignature';
import { getSignedS3UrlFromUrlOrKey } from '../utils/s3SignedUrl';

import { logger } from '../utils/logger';

export class ProductController {
  private async withSignedImages<T extends { images?: Array<{ url: string }> }>(product: T): Promise<T> {
    if (!product?.images || product.images.length === 0) {
      return product;
    }

    const signedImages = await Promise.all(
      product.images.map(async (image: any) => {
        try {
          return {
            ...image,
            url: await getSignedS3UrlFromUrlOrKey(image.url, 3600),
          };
        } catch (error: any) {
          logger.warn({
            event: 'product_image_signing_failed',
            imageUrl: image.url,
            message: error?.message,
          });

          // Fall back to the stored URL so one bad S3 object does not break the whole catalog.
          return {
            ...image,
            url: image.url,
          };
        }
      })
    );

    return {
      ...product,
      images: signedImages,
    };
  }

  private async validateUploadedImages(files: Express.MulterS3.File[]) {
    for (const file of files) {
      const result = await validateImageSignatureFromS3(file.key || file.location);
      if (!result.valid) {
        if (file.key) {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: env.awsS3Bucket,
              Key: file.key,
            })
          );
        }

        throw new Error(result.reason || 'Invalid image file signature');
      }
    }
  }

  async createProduct(req: AuthRequest, res: Response) {
    try {
      const { name, description, price, salePrice, stock, categoryIds } = req.body;
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

      // Parse and validate sale price if provided
      let parsedSalePrice: number | undefined = undefined;
      if (salePrice !== undefined && salePrice !== null && salePrice !== '') {
        parsedSalePrice = parseFloat(salePrice);
        if (isNaN(parsedSalePrice) || parsedSalePrice < 0) {
          return res.status(400).json({
            success: false,
            message: 'Sale price must be a non-negative number',
          });
        }
        if (parsedSalePrice >= parsedPrice) {
          return res.status(400).json({
            success: false,
            message: 'Sale price must be less than regular price',
          });
        }
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

      await this.validateUploadedImages(files);

      // Create product with images and categories in a transaction
      const product = await prisma.product.create({
        data: {
          name,
          description: description || '',
          price: parsedPrice,
          ...(parsedSalePrice !== undefined && { salePrice: parsedSalePrice }),
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
      const transformedProduct: any = {
        ...product,
        category: (product as any).categories[0]?.category || null,
        categoryId: (product as any).categories[0]?.categoryId || null,
      };
      delete transformedProduct.categories;

      const signedProduct = await this.withSignedImages(transformedProduct);

      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: signedProduct,
      });
    } catch (error: any) {
      logger.error('Create product error:', error);

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
      const transformedProducts = await Promise.all(products.map(async (product: any) => {
        const transformed = {
          ...product,
          category: product.categories[0]?.category || null,
          categoryId: product.categories[0]?.categoryId || null,
        };
        delete (transformed as any).categories;

        // Aggregate approved reviews for rating and count
        try {
          const agg = await prisma.review.aggregate({
            where: { productId: product.id, isApproved: true },
            _avg: { rating: true },
            _count: { id: true },
          });

          (transformed as any).rating = agg._avg.rating ? Number(Number(agg._avg.rating).toFixed(1)) : 0;
          (transformed as any).reviews = agg._count.id || 0;
        } catch (e) {
          // ignore aggregation errors
          (transformed as any).rating = 0;
          (transformed as any).reviews = 0;
        }

        return this.withSignedImages(transformed);
      }));

      return res.status(200).json({
        success: true,
        data: transformedProducts,
      });
    } catch (error: any) {
      logger.error('Get products error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch products',
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

      // Search products by name, description, or category metadata
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
                {
                  categories: {
                    some: {
                      category: {
                        name: {
                          contains: searchTerm,
                        },
                      },
                    },
                  },
                },
                {
                  categories: {
                    some: {
                      category: {
                        slug: {
                          contains: searchTerm,
                        },
                      },
                    },
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
      const transformedProducts = await Promise.all(products.map(async (product: any) => {
        const transformed = {
          ...product,
          category: product.categories[0]?.category || null,
          categoryId: product.categories[0]?.categoryId || null,
        };
        delete (transformed as any).categories;
        return this.withSignedImages(transformed);
      }));

      return res.status(200).json({
        success: true,
        data: transformedProducts,
        count: transformedProducts.length,
        query: q,
      });
    } catch (error: any) {
      logger.error('Search products error:', error);
      return res.status(500).json({
        success: false,
        message: 'Search failed',
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
      // Aggregate approved reviews for rating and count
      try {
        const agg = await prisma.review.aggregate({
          where: { productId: product.id, isApproved: true },
          _avg: { rating: true },
          _count: { id: true },
        });

        (transformedProduct as any).rating = agg._avg.rating ? Number(Number(agg._avg.rating).toFixed(1)) : 0;
        (transformedProduct as any).reviews = agg._count.id || 0;
      } catch (e) {
        (transformedProduct as any).rating = 0;
        (transformedProduct as any).reviews = 0;
      }

      const signedProduct = await this.withSignedImages(transformedProduct);

      return res.status(200).json({
        success: true,
        data: signedProduct,
      });
    } catch (error: any) {
      logger.error('Get product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch product',
      });
    }
  }

  async updateProduct(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, price, salePrice, stock, categoryIds } = req.body;
      const hasSalePriceField = Object.prototype.hasOwnProperty.call(req.body, 'salePrice');
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
      if (hasSalePriceField) {
        if (salePrice === null || salePrice === '' || (typeof salePrice === 'string' && salePrice.trim() === '')) {
          updateData.salePrice = null;
        } else {
          const parsedSalePrice = parseFloat(String(salePrice).trim());
          if (isNaN(parsedSalePrice) || parsedSalePrice < 0) {
            return res.status(400).json({
              success: false,
              message: 'Sale price must be a non-negative number',
            });
          }
          const currentPrice = updateData.price || existingProduct.price;
          if (parsedSalePrice >= Number(currentPrice)) {
            return res.status(400).json({
              success: false,
              message: 'Sale price must be less than regular price',
            });
          }
          updateData.salePrice = parsedSalePrice;
        }
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
        await this.validateUploadedImages(files);

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
      const signedProduct = await this.withSignedImages(transformedProduct);

      return res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: signedProduct,
      });
    } catch (error: any) {
      logger.error('Update product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update product',
      });
    }
  }

  async deleteProduct(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Check if product exists and get images
      const product = await prisma.product.findUnique({
        where: { id },
        include: { 
          images: true,
          orderItems: true, // Check if product is in any orders
        },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Preserve order history by soft-disabling products that have already been ordered.
      if (product.orderItems && product.orderItems.length > 0) {
        const updatedProduct = await prisma.product.update({
          where: { id },
          data: { isActive: false },
        });

        return res.status(200).json({
          success: false,
          deactivated: true,
          message: 'Product has order history and was marked as inactive instead of being deleted.',
          ordersCount: product.orderItems.length,
          data: updatedProduct,
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
              Bucket: env.awsS3Bucket,
              Key: key,
            });
            
            await s3.send(deleteCommand);
            logger.info(`✓ Deleted image from S3: ${key}`);
          } catch (s3Error: any) {
            logger.error(`Failed to delete image from S3: ${image.url}`, s3Error.message);
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
      logger.error('Delete product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete product',
      });
    }
  }
}

export const productController = new ProductController();
