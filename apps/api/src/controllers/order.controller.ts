import { Request, Response } from 'express';
import orderService from '../services/order.service';
import { OrderStatus } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';

import { logger } from '../utils/logger';

const MAX_LIMIT = 100;

const getAuthenticatedUserId = (req: Request): string | undefined => {
  return (req as AuthRequest).user?.userId;
};

class OrderController {
  // Create order from cart
  async createOrder(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const order = await orderService.createOrderFromCart(userId);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order },
      });
    } catch (error: any) {
      logger.error('Create order error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create order',
      });
    }
  }

  // Get order by ID
  async getOrder(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const order = await orderService.getOrderById(id, userId);

      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (error: any) {
      logger.error('Get order error:', error);
      const statusCode = error.message === 'Order not found' ? 404 : 
                         error.message === 'Unauthorized access to order' ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get order',
      });
    }
  }

  // Get all user orders
  async getUserOrders(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const parsedLimit = parseInt(req.query.limit as string, 10);
      const parsedOffset = parseInt(req.query.offset as string, 10);
      const limit = Number.isNaN(parsedLimit) ? 10 : Math.min(Math.max(parsedLimit, 1), MAX_LIMIT);
      const offset = Number.isNaN(parsedOffset) ? 0 : Math.max(parsedOffset, 0);

      const result = await orderService.getUserOrders(userId, limit, offset);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Get user orders error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get orders',
      });
    }
  }

  // Update order status
  async updateOrderStatus(req: Request, res: Response) {
    try {
      const adminId = getAuthenticatedUserId(req);
      const { id } = req.params;
      const { status } = req.body;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      // Validate status
      if (!status || !Object.values(OrderStatus).includes(status as OrderStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order status',
        });
      }

      const order = await orderService.adminUpdateOrderStatus(id, status as OrderStatus, adminId);

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: { order },
      });
    } catch (error: any) {
      logger.error('Update order status error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update order status',
      });
    }
  }

  // Get order statistics
  async getOrderStats(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const stats = await orderService.getOrderStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Get order stats error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get order statistics',
      });
    }
  }
}

export default new OrderController();
