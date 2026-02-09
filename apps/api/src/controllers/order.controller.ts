import { Request, Response } from 'express';
import orderService from '../services/order.service';
import { OrderStatus } from '@prisma/client';

interface AuthRequest extends Request {
  userId?: string;
}

class OrderController {
  // Create order from cart
  async createOrder(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const order = await orderService.createOrderFromCart(userId);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order },
      });
    } catch (error: any) {
      console.error('Create order error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create order',
      });
    }
  }

  // Get order by ID
  async getOrder(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const order = await orderService.getOrderById(id, userId);

      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (error: any) {
      console.error('Get order error:', error);
      const statusCode = error.message === 'Order not found' ? 404 : 
                         error.message === 'Unauthorized access to order' ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get order',
      });
    }
  }

  // Get all user orders
  async getUserOrders(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await orderService.getUserOrders(userId, limit, offset);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Get user orders error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get orders',
      });
    }
  }

  // Update order status
  async updateOrderStatus(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      if (!status || !Object.values(OrderStatus).includes(status as OrderStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order status',
        });
      }

      const order = await orderService.updateOrderStatus(id, userId, status as OrderStatus);

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: { order },
      });
    } catch (error: any) {
      console.error('Update order status error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update order status',
      });
    }
  }

  // Get order statistics
  async getOrderStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const stats = await orderService.getOrderStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get order stats error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get order statistics',
      });
    }
  }
}

export default new OrderController();
