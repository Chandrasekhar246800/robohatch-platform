import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const paymentService = new PaymentService();

export class PaymentController {
  /**
   * Create order from cart (Step 1: Before payment)
   */
  async createOrder(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { shippingAddress } = req.body;

      if (!shippingAddress) {
        return res.status(400).json({ success: false, message: 'Shipping address is required' });
      }

      const order = await paymentService.createOrderFromCart(userId, shippingAddress);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order,
      });
    } catch (error: any) {
      console.error('Create order error:', error);

      // Return specific error messages for validation failures
      if (error.message === 'Cart is empty') {
        return res.status(400).json({ 
          success: false, 
          message: 'Your cart is empty. Please add products to your cart before checking out.'
        });
      }

      if (error.message.includes('no longer available') || error.message.includes('Insufficient stock')) {
        return res.status(400).json({ success: false, message: error.message });
      }

      res.status(500).json({ success: false, message: 'Failed to create order' });
    }
  }

  /**
   * Create Razorpay order (Step 2: Initialize payment)
   */
  async createRazorpayOrder(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { orderId } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID is required' });
      }

      const razorpayOrder = await paymentService.createRazorpayOrder(orderId, userId);

      res.json({
        success: true,
        data: razorpayOrder,
      });
    } catch (error: any) {
      console.error('Create Razorpay order error:', error);

      if (
        error.message === 'Order not found or unauthorized' ||
        error.message === 'Order already paid' ||
        error.message === 'Payment already initiated'
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }

      res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }
  }

  /**
   * Verify Razorpay payment (Step 3: After user payment)
   * ⚠️ CRITICAL: This endpoint verifies payment signature
   */
  async verifyPayment(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing payment verification data',
        });
      }

      const result = await paymentService.verifyPayment(
        {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        },
        userId
      );

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Verify payment error:', error);

      // Log security-critical errors
      if (error.message === 'Invalid payment signature') {
        console.error('⚠️ SECURITY ALERT: Invalid payment signature detected', {
          userId: (req as AuthRequest).user?.userId,
          ip: req.ip,
          timestamp: new Date().toISOString(),
        });
      }

      if (
        error.message === 'Payment not found' ||
        error.message === 'Unauthorized' ||
        error.message === 'Payment already verified' ||
        error.message === 'Invalid payment signature'
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }

      res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { orderId, reason } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID is required' });
      }

      const result = await paymentService.handlePaymentFailure(orderId, userId, reason);

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Handle payment failure error:', error);

      if (error.message === 'Payment not found') {
        return res.status(404).json({ success: false, message: error.message });
      }

      res.status(500).json({ success: false, message: 'Failed to handle payment failure' });
    }
  }

  /**
   * Get payment status for an order
   */
  async getPaymentStatus(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { orderId } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const payment = await paymentService.getPaymentStatus(orderId, userId);

      res.json({ success: true, data: payment });
    } catch (error: any) {
      console.error('Get payment status error:', error);

      if (error.message === 'Payment not found' || error.message === 'Unauthorized') {
        return res.status(404).json({ success: false, message: error.message });
      }

      res.status(500).json({ success: false, message: 'Failed to get payment status' });
    }
  }

  /**
   * Get order with payment details
   */
  async getOrderWithPayment(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { orderId } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const order = await paymentService.getOrderWithPayment(orderId, userId);

      res.json({ success: true, data: order });
    } catch (error: any) {
      console.error('Get order error:', error);

      if (error.message === 'Order not found') {
        return res.status(404).json({ success: false, message: error.message });
      }

      res.status(500).json({ success: false, message: 'Failed to get order' });
    }
  }
}
