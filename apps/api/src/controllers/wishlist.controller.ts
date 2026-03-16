import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

import { logger } from '../utils/logger';

/**
 * Wishlist Controller
 * Handles wishlist CRUD operations
 */

// Validation schema
const addToWishlistSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
});

export class WishlistController {
  /**
   * Get user's wishlist with populated products
   */
  async getWishlist(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Find or create wishlist
      let wishlist = await prisma.wishlist.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: {
                    orderBy: { order: 'asc' },
                    take: 1,
                  },
                  categories: {
                    include: {
                      category: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      // Create wishlist if doesn't exist
      if (!wishlist) {
        wishlist = await prisma.wishlist.create({
          data: { userId },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: {
                      orderBy: { order: 'asc' },
                      take: 1,
                    },
                    categories: {
                      include: {
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          id: wishlist.id,
          items: wishlist.items.map((item: typeof wishlist.items[0]) => ({
            id: item.id,
            productId: item.productId,
            createdAt: item.createdAt,
            product: {
              id: item.product.id,
              name: item.product.name,
              description: item.product.description,
              price: item.product.price.toString(),
              stock: item.product.stock,
              isActive: item.product.isActive,
              image: item.product.images[0]?.url || null,
              category: item.product.categories[0]?.category || null,
            },
          })),
          count: wishlist.items.length,
        },
      });
    } catch (error: any) {
      logger.error('Get wishlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch wishlist',
      });
    }
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Validate request body
      const { productId } = addToWishlistSchema.parse(req.body);

      // Check if product exists and is active
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: 'This product is no longer available',
        });
      }

      // Find or create wishlist
      let wishlist = await prisma.wishlist.findUnique({
        where: { userId },
      });

      if (!wishlist) {
        wishlist = await prisma.wishlist.create({
          data: { userId },
        });
      }

      // Check if product already in wishlist
      const existingItem = await prisma.wishlistItem.findUnique({
        where: {
          wishlistId_productId: {
            wishlistId: wishlist.id,
            productId,
          },
        },
      });

      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: 'Product already in wishlist',
        });
      }

      // Add to wishlist
      const wishlistItem = await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
        },
        include: {
          product: {
            include: {
              images: {
                orderBy: { order: 'asc' },
                take: 1,
              },
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Added to wishlist',
        data: {
          id: wishlistItem.id,
          productId: wishlistItem.productId,
        },
      });
    } catch (error: any) {
      logger.error('Add to wishlist error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add to wishlist',
      });
    }
  }

  /**
   * Remove item from wishlist
   */
  async removeFromWishlist(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { id } = req.params; // wishlistItem ID

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Find wishlist item and verify ownership
      const wishlistItem = await prisma.wishlistItem.findUnique({
        where: { id },
        include: {
          wishlist: true,
        },
      });

      if (!wishlistItem) {
        return res.status(404).json({
          success: false,
          message: 'Wishlist item not found',
        });
      }

      if (wishlistItem.wishlist.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      // Delete wishlist item
      await prisma.wishlistItem.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: 'Removed from wishlist',
      });
    } catch (error: any) {
      logger.error('Remove from wishlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove from wishlist',
      });
    }
  }

  /**
   * Clear entire wishlist
   */
  async clearWishlist(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Find wishlist
      const wishlist = await prisma.wishlist.findUnique({
        where: { userId },
      });

      if (!wishlist) {
        return res.status(404).json({
          success: false,
          message: 'Wishlist not found',
        });
      }

      // Delete all items
      await prisma.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id },
      });

      res.status(200).json({
        success: true,
        message: 'Wishlist cleared',
      });
    } catch (error: any) {
      logger.error('Clear wishlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear wishlist',
      });
    }
  }
}

export default new WishlistController();
