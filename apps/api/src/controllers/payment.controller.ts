import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const paymentService = new PaymentService();

export class PaymentController {
  // Create order from cart
  async createOrder(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const order = await paymentService.createOrder(userId);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order },
      });
    } catch (error: any) {
      console.error('Create order error:', error);

      if (error.message === 'Cart is empty') {
        return res.status(400).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: 'Failed to create order' });
    }
  }

  // Initiate UPI payment
  async initiatePayment(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { orderId, upiId } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (!orderId || !upiId) {
        return res.status(400).json({ success: false, error: 'Order ID and UPI ID are required' });
      }

      // Validate UPI ID format
      const upiRegex = /^[\w.-]+@[\w.-]+$/;
      if (!upiRegex.test(upiId)) {
        return res.status(400).json({ success: false, error: 'Invalid UPI ID format' });
      }

      const result = await paymentService.initiatePayment(orderId, userId, upiId);

      res.json({
        success: true,
        message: 'Payment initiated successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Initiate payment error:', error);

      if (error.message === 'Order not found' || error.message === 'Order already processed' || error.message === 'Payment already initiated') {
        return res.status(400).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: 'Failed to initiate payment' });
    }
  }

  // Verify payment
  async verifyPayment(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { transactionId } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (!transactionId) {
        return res.status(400).json({ success: false, error: 'Transaction ID is required' });
      }

      const payment = await paymentService.verifyPayment(transactionId, userId);

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: { payment },
      });
    } catch (error: any) {
      console.error('Verify payment error:', error);

      if (error.message === 'Payment not found' || error.message === 'Unauthorized' || error.message === 'Payment already verified') {
        return res.status(400).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: 'Failed to verify payment' });
    }
  }

  // Get payment status
  async getPaymentStatus(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { orderId } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const payment = await paymentService.getPaymentStatus(orderId, userId);

      res.json({ success: true, data: { payment } });
    } catch (error: any) {
      console.error('Get payment status error:', error);

      if (error.message === 'Payment not found' || error.message === 'Unauthorized') {
        return res.status(404).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: 'Failed to get payment status' });
    }
  }

  // Get order with payment
  async getOrderWithPayment(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { orderId } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const order = await paymentService.getOrderWithPayment(orderId, userId);

      res.json({ success: true, data: { order } });
    } catch (error: any) {
      console.error('Get order error:', error);

      if (error.message === 'Order not found') {
        return res.status(404).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: 'Failed to get order' });
    }
  }
}
