import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma';

import { logger } from '../utils/logger';

const processedWebhookEvents = new Map<string, number>();
const WEBHOOK_EVENT_TTL_MS = 24 * 60 * 60 * 1000;

const pruneProcessedWebhookEvents = () => {
  const now = Date.now();
  for (const [eventId, timestamp] of processedWebhookEvents.entries()) {
    if (now - timestamp > WEBHOOK_EVENT_TTL_MS) {
      processedWebhookEvents.delete(eventId);
    }
  }
};

export class WebhookController {
  /**
   * Handle Razorpay webhook events
   * 🔒 CRITICAL: This is your safety net for payments completed outside the app
   * 
   * Use cases:
   * - User closed browser after payment
   * - Network timeout during verification
   * - App crashed after payment
   * - Razorpay async notifications
   * 
   * @param req - Express request
   * @param res - Express response
   */
  async handleRazorpayWebhook(req: Request, res: Response) {
    try {
      // 🔒 SECURITY: Verify webhook signature
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        logger.error('⚠️ RAZORPAY_WEBHOOK_SECRET not configured');
        return res.status(500).json({
          success: false,
          message: 'Webhook not configured',
        });
      }

      const signature = req.headers['x-razorpay-signature'] as string;
      const eventId = (req.headers['x-razorpay-event-id'] as string) || '';
      
      if (!signature) {
        logger.error('🚨 SECURITY ALERT: Webhook request without signature');
        return res.status(400).json({
          success: false,
          message: 'Missing signature',
        });
      }

      pruneProcessedWebhookEvents();
      if (eventId && processedWebhookEvents.has(eventId)) {
        return res.status(200).json({
          success: true,
          message: 'Webhook already processed',
        });
      }

      // Generate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      // 🔒 TIMING-SAFE COMPARISON: Prevent timing attacks
      const isValid =
        signature.length === expectedSignature.length &&
        crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature)
        );

      if (!isValid) {
        logger.error('🚨 SECURITY ALERT: Invalid webhook signature', {
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
        return res.status(400).json({
          success: false,
          message: 'Invalid signature',
        });
      }

      // ✅ Signature verified - process webhook event
      const { event, payload } = req.body;

      logger.info(`📨 Webhook received: ${event}`, {
        orderId: payload?.payment?.entity?.order_id,
        paymentId: payload?.payment?.entity?.id,
      });

      // Handle different Razorpay events
      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(payload);
          break;

        case 'order.paid':
          await this.handleOrderPaid(payload);
          break;

        default:
          logger.info(`ℹ️ Unhandled webhook event: ${event}`);
      }

      // Always return 200 to acknowledge receipt
      if (eventId) {
        processedWebhookEvents.set(eventId, Date.now());
      }

      return res.status(200).json({
        success: true,
        message: 'Webhook processed',
      });
    } catch (error: any) {
      logger.error('❌ Webhook processing error:', error);
      
      // Still return 200 to prevent Razorpay retries on server errors
      return res.status(200).json({
        success: false,
        message: 'Error processing webhook',
      });
    }
  }

  /**
   * Handle payment.captured event
   * This is the most important event - confirms money received
   */
  private async handlePaymentCaptured(payload: any) {
    try {
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;
      const amount = paymentEntity.amount; // Amount in paise

      logger.info('💰 Payment captured:', {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        amount: amount / 100, // Convert to rupees
      });

      // Find payment record
      const payment = await prisma.payment.findUnique({
        where: { gatewayOrderId: razorpayOrderId },
        include: { order: true },
      });

      if (!payment) {
        logger.error('❌ Payment record not found:', razorpayOrderId);
        return;
      }

      // 🔒 IDEMPOTENCY: Skip if already captured
      if (payment.status === 'CAPTURED') {
        logger.info('✓ Payment already captured (idempotent):', razorpayOrderId);
        return;
      }

      // Update payment and order in transaction
      await prisma.$transaction(async (tx) => {
        // Update payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            gatewayPaymentId: razorpayPaymentId,
            status: 'CAPTURED',
          },
        });

        // Update order status
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: 'PAID',
          },
        });

        // Clear cart (safety net - may already be cleared)
        const cart = await tx.cart.findUnique({
          where: { userId: payment.order.userId },
        });

        if (cart) {
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id },
          });
        }
      });

      logger.info('✅ Payment captured via webhook:', {
        orderId: payment.orderId,
        paymentId: razorpayPaymentId,
      });
    } catch (error: any) {
      logger.error('❌ Error handling payment.captured:', error);
      throw error;
    }
  }

  /**
   * Handle payment.failed event
   * ✅ CRITICAL FIX: Restore stock when payment fails
   */
  private async handlePaymentFailed(payload: any) {
    try {
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const errorReason = paymentEntity.error_description || 'Payment failed';

      logger.info('❌ Payment failed:', {
        orderId: razorpayOrderId,
        reason: errorReason,
      });

      // Find payment record with order and items
      const payment = await prisma.payment.findUnique({
        where: { gatewayOrderId: razorpayOrderId },
        include: {
          order: {
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        logger.error('❌ Payment record not found:', razorpayOrderId);
        return;
      }

      // 🔒 PROTECTION: Only restore stock if payment is not already FAILED
      if (payment.status === 'FAILED') {
        logger.info('✓ Payment already marked as failed (idempotent):', razorpayOrderId);
        return;
      }

      // ✅ ATOMIC TRANSACTION: Mark payment as failed + restore stock
      await prisma.$transaction(async (tx) => {
        // Update payment status to FAILED
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
          },
        });

        // ✅ RESTORE STOCK: Add items back to inventory (only products)
        for (const item of payment.order.items) {
          if (!item.productId || !item.product) continue; // Skip custom designs
          
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });

          logger.info(`✅ Stock restored: ${item.product.name} +${item.quantity} (Payment Failed)`);
        }
      });

      logger.info('✓ Payment marked as failed and stock restored via webhook:', razorpayOrderId);
    } catch (error: any) {
      logger.error('❌ Error handling payment.failed:', error);
      throw error;
    }
  }

  /**
   * Handle order.paid event
   * This is sent when an order is fully paid
   */
  private async handleOrderPaid(payload: any) {
    try {
      const orderEntity = payload.order.entity;
      const razorpayOrderId = orderEntity.id;

      logger.info('✅ Order paid:', razorpayOrderId);

      // Optional: Additional order processing logic here
      // This is called AFTER payment.captured
    } catch (error: any) {
      logger.error('❌ Error handling order.paid:', error);
      throw error;
    }
  }
}
