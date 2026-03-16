import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

import { logger } from '../utils/logger';

export class AdminController {
  /**
   * Get dashboard statistics
   * Returns counts for products, categories, orders, and users
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      // Run all counts in parallel for better performance
      const [
        productsCount,
        categoriesCount,
        ordersCount,
        usersCount,
        activeProductsCount,
        pendingOrdersCount,
        customCategoriesCount,
      ] = await Promise.all([
        prisma.product.count(),
        prisma.category.count(),
        prisma.order.count(),
        prisma.user.count(),
        prisma.product.count({ where: { isActive: true } }),
        prisma.order.count({ where: { status: 'PENDING' } }),
        prisma.category.count({ where: { type: 'CUSTOM' } }),
      ]);

      // Get recent orders (last 5)
      const recentOrders = await prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          stats: {
            products: {
              total: productsCount,
              active: activeProductsCount,
              inactive: productsCount - activeProductsCount,
            },
            categories: {
              total: categoriesCount,
              custom: customCategoriesCount,
              default: categoriesCount - customCategoriesCount,
            },
            orders: {
              total: ordersCount,
              pending: pendingOrdersCount,
            },
            users: {
              total: usersCount,
            },
          },
          recentOrders,
        },
      });
    } catch (error: any) {
      logger.error('Dashboard stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics',
      });
    }
  }
}

export const adminController = new AdminController();
