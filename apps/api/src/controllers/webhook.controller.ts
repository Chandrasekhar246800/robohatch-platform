import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

import { logger } from '../utils/logger';

type WebhookPayload = {
  event?: string;
  [key: string]: any;
};

const rawBodyToString = (body: unknown) => {
  if (Buffer.isBuffer(body)) {
    return body.toString('utf8');
  }

  if (typeof body === 'string') {
    return body;
  }

  return '';
};

const deriveDedupeKey = (eventId: string | undefined, rawBody: string, signature: string) => {
  if (eventId && eventId.trim().length > 0) {
    return `razorpay:${eventId.trim()}`;
  }

  return `razorpay:${crypto.createHash('sha256').update(rawBody).update(signature).digest('hex')}`;
};

const parseWebhookPayload = (rawBody: string): WebhookPayload => {
  try {
    return JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return {};
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
      const rawBody = rawBodyToString(req.body);
      if (!rawBody) {
        return res.status(400).json({
          success: false,
          message: 'Missing raw webhook body',
        });
      }

      const webhookSecret = env.razorpayWebhookSecret;

      const signature = req.headers['x-razorpay-signature'] as string;
      const eventId = (req.headers['x-razorpay-event-id'] as string | undefined) || undefined;
      
      if (!signature) {
        logger.error('🚨 SECURITY ALERT: Webhook request without signature');
        return res.status(400).json({
          success: false,
          message: 'Missing signature',
        });
      }

      const dedupeKey = deriveDedupeKey(eventId, rawBody, signature);

      // Generate expected signature from the exact raw payload bytes.
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      // 🔒 TIMING-SAFE COMPARISON: Prevent timing attacks
      const isValid =
        signature.length === expectedSignature.length &&
        crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSignature, 'hex')
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
      const payload = parseWebhookPayload(rawBody);
      const event = payload.event;

      if (!event) {
        return res.status(400).json({
          success: false,
          message: 'Missing webhook event type',
        });
      }

      const correlationId = (req as any).requestId || dedupeKey;

      try {
        await prisma.webhookEvent.create({
          data: {
            dedupeKey,
            razorpayEventId: eventId ?? null,
            provider: 'RAZORPAY',
            eventType: event,
            signature,
            rawBody: Buffer.from(rawBody, 'utf8'),
            payload,
            status: 'RECEIVED',
            sourceIp: req.ip,
            userAgent: req.headers['user-agent'] || null,
            correlationId,
          },
        });
      } catch (createError: any) {
        if (createError?.code === 'P2002') {
          return res.status(200).json({
            success: true,
            message: 'Webhook already processed',
          });
        }

        throw createError;
      }

      logger.info(`📨 Webhook received: ${event}`, {
        orderId: payload?.payment?.entity?.order_id,
        paymentId: payload?.payment?.entity?.id,
      });

      await prisma.webhookEvent.update({
        where: { dedupeKey },
        data: { status: 'PROCESSING' },
      });

      // Handle different Razorpay events
      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload, dedupeKey, correlationId);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(payload, dedupeKey, correlationId);
          break;

        case 'order.paid':
          await this.handleOrderPaid(payload, dedupeKey, correlationId);
          break;

        default:
          logger.info(`ℹ️ Unhandled webhook event: ${event}`);
      }

      await prisma.webhookEvent.update({
        where: { dedupeKey },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });

      return res.status(200).json({
        success: true,
        message: 'Webhook processed',
      });
    } catch (error: any) {
      logger.error('❌ Webhook processing error:', error);

      const rawBody = rawBodyToString(req.body);
      const signature = req.headers['x-razorpay-signature'] as string | undefined;
      const eventId = (req.headers['x-razorpay-event-id'] as string | undefined) || undefined;
      if (rawBody && signature) {
        const dedupeKey = deriveDedupeKey(eventId, rawBody, signature);
        await prisma.webhookEvent.updateMany({
          where: { dedupeKey },
          data: {
            status: 'FAILED',
            errorMessage: error?.message || 'Error processing webhook',
          },
        }).catch(() => undefined);
      }
      
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
  private async handlePaymentCaptured(payload: WebhookPayload, dedupeKey: string, correlationId: string) {
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

        await tx.paymentEventLog.create({
          data: {
            paymentId: payment.id,
            orderId: payment.orderId,
            source: 'WEBHOOK',
            eventType: 'payment.captured',
            fromStatus: payment.status,
            toStatus: 'CAPTURED',
            gatewayOrderId: razorpayOrderId,
            gatewayPaymentId: razorpayPaymentId,
            webhookEventKey: dedupeKey,
            correlationId,
            payload,
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
  private async handlePaymentFailed(payload: WebhookPayload, dedupeKey: string, correlationId: string) {
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


        await tx.paymentEventLog.create({
          data: {
            paymentId: payment.id,
            orderId: payment.orderId,
            source: 'WEBHOOK',
            eventType: 'payment.failed',
            fromStatus: payment.status,
            toStatus: 'FAILED',
            gatewayOrderId: razorpayOrderId,
            gatewayPaymentId: paymentEntity.id || null,
            webhookEventKey: dedupeKey,
            correlationId,
            payload,
            reason: errorReason,
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
  private async handleOrderPaid(payload: WebhookPayload, dedupeKey: string, correlationId: string) {
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
