import Razorpay from 'razorpay';
import crypto from 'crypto';
import { inspect } from 'util';
import { prisma, Prisma } from '../config/prisma';
import { validateShippingAddress, validatePaymentVerification } from '../validators/order.validator';
import { emailService } from './email.service';
import whatsappService from './whatsapp.service';
import { StockManager } from '../utils/stock-manager';
import { env } from '../config/env';
import { logger } from '../utils/logger';
const RAZORPAY_KEY_ID = env.razorpayKeyId;
const RAZORPAY_KEY_SECRET = env.razorpayKeySecret;
const RAZORPAY_WEBHOOK_SECRET = env.razorpayWebhookSecret;

const maskSecret = (value: string) => (value.length <= 8 ? '***' : `${value.slice(0, 6)}***${value.slice(-4)}`);

logger.info('✅ Razorpay credentials loaded successfully');
logger.info('✅ Webhook secret configured');

export class PaymentService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    logger.info('✅ Razorpay initialized successfully');
  }

  private async recordPaymentEvent(input: {
    paymentId?: string;
    orderId: string;
    source: 'CLIENT' | 'WEBHOOK' | 'RECONCILIATION' | 'SYSTEM';
    eventType: string;
    fromStatus?: string | null;
    toStatus: string;
    gatewayOrderId?: string | null;
    gatewayPaymentId?: string | null;
    webhookEventKey?: string | null;
    correlationId?: string | null;
    payload?: any;
    reason?: string | null;
  }) {
    return prisma.paymentEventLog.create({
      data: {
        paymentId: input.paymentId ?? null,
        orderId: input.orderId,
        source: input.source,
        eventType: input.eventType,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus,
        gatewayOrderId: input.gatewayOrderId ?? null,
        gatewayPaymentId: input.gatewayPaymentId ?? null,
        webhookEventKey: input.webhookEventKey ?? null,
        correlationId: input.correlationId ?? input.orderId,
        payload: input.payload ?? undefined,
        reason: input.reason ?? null,
      },
    });
  }

  /**
   * Create order from cart WITH shipping address
   * ✅ CRITICAL FIX: Stores shipping address atomically
   */
  async createOrderFromCart(userId: string, shippingAddressData: any) {
    // ✅ VALIDATION: Validate shipping address
    const validatedAddress = validateShippingAddress(shippingAddressData);

    // Get user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
            customDesign: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // ✅ INVENTORY CHECK: Verify stock availability (only for products)
    for (const item of cart.items) {
      // Check if it's a product (not a custom design)
      if (item.product) {
        if (!item.product.isActive) {
          throw new Error(`Product ${item.product.name} is no longer available`);
        }
        
        if (item.product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product.name}. Available: ${item.product.stock}`);
        }
      }
    }

    // Calculate subtotal (handle both products and custom designs)
    const subtotal = cart.items.reduce((sum: number, item: typeof cart.items[0]) => {
      if (item.product) {
        return sum + Number(item.product.price) * item.quantity;
      } else if (item.customDesign) {
        const price = item.customDesign.estimatedPrice || 0;
        return sum + Number(price) * item.quantity;
      }
      return sum;
    }, 0);

    // Calculate shipping cost (free shipping for orders above ₹999)
    const shippingCost = subtotal > 999 ? 0 : 89;

    // Calculate total
    const total = subtotal + shippingCost;

    // ✅ ATOMIC TRANSACTION: Reserve stock FIRST, then create order
    // Why this order? Fail fast before any DB writes. More efficient.
    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // STEP 1: Reserve stock for PRODUCTS FIRST (fails early, no wasted writes)
      // Note: Custom designs don't have stock - they're made on demand
      for (const cartItem of cart.items) {
        // Only reserve stock for products, skip custom designs
        if (!cartItem.product || !cartItem.productId) continue;

        const reservationResult = await StockManager.reserveStock(
          tx,
          cartItem.productId,
          cartItem.quantity
        );

        // ❌ FAILURE: Stock reservation failed - transaction will rollback
        if (!reservationResult.success) {
          logger.error(
            `❌ STOCK RESERVATION FAILED (Order not created):`,
            {
              product: cartItem.product.name,
              productId: cartItem.productId,
              requested: cartItem.quantity,
              available: reservationResult.availableStock,
              errorCode: reservationResult.errorCode,
              userId,
              timestamp: new Date().toISOString(),
            }
          );

          // Throw user-friendly error message (no order was created)
          throw new Error(reservationResult.error);
        }

        // ✅ SUCCESS: Stock reserved atomically
        logger.info(
          `✅ Stock reserved: ${cartItem.product.name} -${cartItem.quantity}`
        );
      }

      // STEP 2: All stock reserved successfully → NOW create order
      const newOrder = await tx.order.create({
        data: {
          userId,
          subtotal,
          shippingCost,
          total,
          status: 'CREATED',
        },
      });

      // STEP 3: Create order items (stock already reserved above for products)
      for (const cartItem of cart.items) {
        if (cartItem.product) {
          // Product order item
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: cartItem.productId,
              quantity: cartItem.quantity,
              price: cartItem.product.price,
            },
          });
        } else if (cartItem.customDesign) {
          // Custom design order item
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              customDesignId: cartItem.customDesignId,
              quantity: cartItem.quantity,
              price: cartItem.customDesign.estimatedPrice || new Prisma.Decimal(0),
            },
          });
        }
      }

      // ✅ CRITICAL FIX: Store shipping address
      await tx.shippingAddress.create({
        data: {
          orderId: newOrder.id,
          fullName: validatedAddress.fullName,
          email: validatedAddress.email,
          phone: validatedAddress.phone,
          addressLine1: validatedAddress.addressLine1,
          addressLine2: validatedAddress.addressLine2 || null,
          city: validatedAddress.city,
          state: validatedAddress.state,
          postalCode: validatedAddress.postalCode,
          country: validatedAddress.country,
        },
      });

      return newOrder;
    });

    logger.info(`✅ Order created with shipping address: ${order.id}`);

    return order;
  }

  /**
   * Create Razorpay order with idempotency
   * ✅ IDEMPOTENCY: Uses orderId as idempotency key
   */
  async createRazorpayOrder(orderId: string, userId: string) {
    // Verify order exists and belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        payment: true,
      },
    });

    if (!order) {
      throw new Error('Order not found or unauthorized');
    }

    // Check if order is already paid
    if (order.status === 'PAID') {
      throw new Error('Order already paid');
    }

    // 🔒 ALLOW RETRY: Delete pending/created payments to enable retry
    if (order.payment) {
      const blockingStatuses = ['CAPTURED', 'AUTHORIZED', 'REFUNDED', 'PARTIALLY_REFUNDED'];
      if (blockingStatuses.includes(order.payment.status)) {
        throw new Error('Payment already processed');
      }
      
      // Delete PENDING or CREATED payments to allow retry
      if (['PENDING', 'CREATED', 'FAILED'].includes(order.payment.status)) {
        logger.info(`🔄 Deleting ${order.payment.status} payment to allow retry:`, order.payment.id);
        await prisma.payment.delete({
          where: { id: order.payment.id },
        });
      }
    }

    // Create Razorpay order with idempotency
    const amountInPaise = Math.round(Number(order.total) * 100);
    
    logger.info('💳 Creating Razorpay order:', {
      orderId,
      amount: `₹${order.total}`,
      amountInPaise: `${amountInPaise} paise`,
      razorpayKeyId: maskSecret(RAZORPAY_KEY_ID),
      keySecretConfigured: Boolean(RAZORPAY_KEY_SECRET),
    });

    const razorpayRequestPayload = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: orderId,
      notes: {
        orderId,
        userId,
      },
    };

    logger.info('📤 Razorpay outbound payload:', razorpayRequestPayload);
    
    // ✅ IDEMPOTENCY: Use orderId as receipt for idempotency
    let razorpayOrder;
    try {
      razorpayOrder = await this.razorpay.orders.create(razorpayRequestPayload);
      logger.info('📥 Razorpay inbound response:', razorpayOrder);
    } catch (error: any) {
      logger.error('❌ Razorpay SDK raw error object:', inspect(error, { depth: 10, breakLength: 120 }));
      logger.error('❌ Razorpay order creation failed:', {
        name: error?.name,
        message: error?.message,
        statusCode: error?.statusCode,
        code: error?.error?.code || error?.code,
        errorObject: error?.error,
        description: error?.error?.description || error?.description,
        source: error?.error?.source,
        step: error?.error?.step,
        reason: error?.error?.reason,
        metadata: error?.error?.metadata,
        stack: error?.stack,
      });

      if (error?.response) {
        logger.error('❌ Razorpay HTTP response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data,
          body: error.response.body,
        });
      }

      throw error;
    }

    // Store payment record in database
    const payment = await prisma.payment.create({
      data: {
        orderId,
        userId,
        gatewayOrderId: razorpayOrder.id,
        amount: order.total,
        currency: 'INR',
        status: 'CREATED',
      },
    });

    await this.recordPaymentEvent({
      paymentId: payment.id,
      orderId,
      source: 'SYSTEM',
      eventType: 'razorpay.order.created',
      fromStatus: 'PENDING',
      toStatus: 'CREATED',
      gatewayOrderId: razorpayOrder.id,
      correlationId: orderId,
      payload: {
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
      },
    });

    logger.info(`✅ Razorpay order created: ${razorpayOrder.id}`);

    return {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
    };
  }

  /**
   * Verify Razorpay payment signature
   * ✅ SECURITY: Timing-safe comparison + idempotency
   */
  async verifyPayment(paymentData: any, userId: string) {
    // ✅ VALIDATION: Validate payment data
    const validated = validatePaymentVerification(paymentData);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = validated;

    // 🔒 IDEMPOTENCY CHECK: Find payment by gateway order ID
    const payment = await prisma.payment.findUnique({
      where: { gatewayOrderId: razorpay_order_id },
      include: {
        order: {
          include: {
            shippingAddress: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment record not found');
    }

    // Verify order belongs to user
    if (payment.order.userId !== userId) {
      logger.error('🚨 SECURITY ALERT: Unauthorized payment verification attempt', {
        userId,
        orderId: payment.orderId,
        ip: 'N/A', // Add IP from request in controller
      });
      throw new Error('Unauthorized');
    }

    // 🔒 IDEMPOTENCY: Return existing payment if already processed
    if (payment.status === 'CAPTURED') {
      logger.info(`✓ Payment already captured (idempotent): ${payment.id}`);
      return {
        success: true,
        orderId: payment.orderId,
        paymentId: payment.gatewayPaymentId || razorpay_payment_id,
        message: 'Payment already processed',
      };
    }

    // Prevent processing if payment is in final state
    if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(payment.status)) {
      throw new Error('Payment was refunded and cannot be reprocessed');
    }

    // ⚠️ CRITICAL SECURITY: Verify Razorpay signature with timing-safe comparison
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // 🔒 TIMING ATTACK PROTECTION: Use constant-time comparison
    const isValidSignature =
      generatedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(generatedSignature, 'hex'),
        Buffer.from(razorpay_signature, 'hex')
      );

    if (!isValidSignature) {
      // 🔒 AUDIT LOG: Security-critical event
      logger.error('🚨 SECURITY ALERT: Invalid payment signature detected', {
        userId,
        orderId: payment.orderId,
        razorpay_order_id,
        razorpay_payment_id,
        timestamp: new Date().toISOString(),
      });

      // Mark payment as failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });

      throw new Error('Invalid payment signature');
    }

    // ✅ Payment signature verified - Execute transaction atomically
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          gatewayPaymentId: razorpay_payment_id,
          signature: razorpay_signature,
          status: 'CAPTURED',
        },
      });

      await tx.paymentEventLog.create({
        data: {
          paymentId: payment.id,
          orderId: payment.orderId,
          source: 'CLIENT',
          eventType: 'payment.verified',
          fromStatus: payment.status,
          toStatus: 'CAPTURED',
          gatewayOrderId: razorpay_order_id,
          gatewayPaymentId: razorpay_payment_id,
          correlationId: payment.orderId,
          payload: {
            razorpay_order_id,
            razorpay_payment_id,
          },
        },
      });

      // Update order status
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID' },
      });

      // Clear user's cart after successful payment
      const cart = await tx.cart.findUnique({
        where: { userId },
      });

      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
      }
    });

    logger.info(`✅ Payment verified and captured: ${payment.id}`);

    // 📧 Send email notifications (non-blocking)
    Promise.all([
      emailService.sendOrderConfirmation(payment.orderId),
      emailService.sendPaymentSuccess(payment.orderId, razorpay_payment_id),
      emailService.sendAdminOrderNotification(payment.orderId),
    ]).catch(error => {
      logger.error('⚠️  Email notification failed (non-critical):', error.message);
    });

    // 📱 Send WhatsApp notification (non-blocking)
    this.sendOrderWhatsAppNotification(payment.orderId).catch(error => {
      logger.error('⚠️  WhatsApp notification failed (non-critical):', error.message);
    });

    return {
      success: true,
      orderId: payment.orderId,
      paymentId: razorpay_payment_id,
    };
  }

  /**
   * Refund payment
   * ✅ NEW: Full refund implementation
   */
  async refundPayment(orderId: string, userId: string, reason?: string) {
    // Find payment
    const payment = await prisma.payment.findFirst({
      where: {
        orderId,
        order: { userId },
      },
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
      throw new Error('Payment not found');
    }

    // Verify payment can be refunded
    if (payment.status !== 'CAPTURED') {
      throw new Error('Only captured payments can be refunded');
    }

    if (payment.refundId) {
      throw new Error('Payment already refunded');
    }

    // Create refund via Razorpay API
    try {
      const refund = await this.razorpay.payments.refund(
        payment.gatewayPaymentId!,
        {
          amount: Math.round(Number(payment.amount) * 100), // Full refund in paise
          notes: {
            orderId,
            reason: reason || 'Customer requested refund',
          },
        }
      );

      // ✅ ATOMIC TRANSACTION: Update payment + order + restore stock
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Update payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'REFUNDED',
            refundId: refund.id,
            refundedAt: new Date(),
          },
        });

        // Update order status
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'REFUNDED' },
        });

        // ✅ RESTORE STOCK: Add items back to inventory (only products)
        for (const item of payment.order.items) {
          if (!item.productId) continue; // Skip custom designs
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      });

      logger.info(`✅ Payment refunded: ${payment.id}, Refund ID: ${refund.id}`);

      // 📧 Send refund confirmation email (non-blocking)
      emailService.sendRefundConfirmation(
        orderId,
        Number(payment.amount),
        refund.id
      ).catch(error => {
        logger.error('⚠️  Refund email notification failed (non-critical):', error.message);
      });

      return {
        success: true,
        refundId: refund.id,
        amount: Number(payment.amount),
        status: 'REFUNDED',
      };
    } catch (error: any) {
      logger.error('❌ Razorpay refund failed:', error);
      throw new Error('Refund processing failed: ' + error.message);
    }
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(orderId: string, userId: string, reason?: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        orderId,
        order: { userId },
      },
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
      throw new Error('Payment not found');
    }

    // ✅ ATOMIC: Mark payment as failed + restore stock
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
        },
      });

      // ✅ RESTORE STOCK: Payment failed, release reserved stock
      for (const item of payment.order.items) {
        if (!item.productId || !item.product) continue; // Skip custom designs
        
        const restorationResult = await StockManager.restoreStock(
          tx,
          item.productId,
          item.quantity
        );

        if (!restorationResult.success) {
          logger.warn(
            `⚠️ Failed to restore stock for product ${item.productId}: ${restorationResult.error}`
          );
        } else {
          logger.info(
            `✅ Stock restored: ${item.product.name} +${item.quantity} (Failed payment: ${payment.id})`
          );
        }
      }

      await tx.paymentEventLog.create({
        data: {
          paymentId: payment.id,
          orderId: payment.orderId,
          source: 'SYSTEM',
          eventType: 'payment.failed',
          fromStatus: payment.status,
          toStatus: 'FAILED',
          gatewayOrderId: payment.gatewayOrderId,
          gatewayPaymentId: payment.gatewayPaymentId,
          correlationId: payment.orderId,
          reason: reason || 'Payment failed',
        },
      });
    });

    logger.info(`✅ Payment marked as failed and stock restored: ${payment.id}`);

    return { success: true, message: 'Payment marked as failed' };
  }

  /**
   * Reconcile a single order against Razorpay's current gateway state.
   * This is used by the background worker and manual recovery paths.
   */
  async reconcileOrderPayment(orderId: string, correlationId?: string) {
    const payment = await prisma.payment.findFirst({
      where: { orderId },
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
      return { success: false, status: 'NOT_FOUND' as const };
    }

    if (['CAPTURED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(payment.status)) {
      return { success: true, status: payment.status };
    }

    if (!payment.gatewayPaymentId) {
      return { success: true, status: 'AWAITING_GATEWAY_CONFIRMATION' as const };
    }

    const gatewayPayment: any = await this.razorpay.payments.fetch(payment.gatewayPaymentId);
    const sourceCorrelationId = correlationId || payment.orderId;

    if (gatewayPayment?.status === 'captured') {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const currentPayment = await tx.payment.findUnique({
          where: { id: payment.id },
        });

        if (!currentPayment || currentPayment.status === 'CAPTURED') {
          return;
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            gatewayPaymentId: gatewayPayment.id || payment.gatewayPaymentId,
            signature: payment.signature,
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: 'PAID' },
        });

        const cart = await tx.cart.findUnique({
          where: { userId: payment.userId },
        });

        if (cart) {
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id },
          });
        }

        await tx.paymentEventLog.create({
          data: {
            paymentId: payment.id,
            orderId: payment.orderId,
            source: 'RECONCILIATION',
            eventType: 'payment.reconciled.captured',
            fromStatus: currentPayment.status,
            toStatus: 'CAPTURED',
            gatewayOrderId: payment.gatewayOrderId,
            gatewayPaymentId: gatewayPayment.id || payment.gatewayPaymentId,
            correlationId: sourceCorrelationId,
            payload: {
              gatewayStatus: gatewayPayment?.status,
            },
          },
        });
      });

      logger.info(`✅ Reconciled captured payment: ${payment.id}`);
      return { success: true, status: 'CAPTURED' as const };
    }

    if (gatewayPayment?.status === 'failed' || gatewayPayment?.status === 'cancelled') {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });

        for (const item of payment.order.items) {
          if (!item.productId || !item.product) continue;

          const restorationResult = await StockManager.restoreStock(
            tx,
            item.productId,
            item.quantity
          );

          if (!restorationResult.success) {
            logger.warn(
              `⚠️ Failed to restore stock for product ${item.productId}: ${restorationResult.error}`
            );
          }
        }

        await tx.paymentEventLog.create({
          data: {
            paymentId: payment.id,
            orderId: payment.orderId,
            source: 'RECONCILIATION',
            eventType: 'payment.reconciled.failed',
            fromStatus: payment.status,
            toStatus: 'FAILED',
            gatewayOrderId: payment.gatewayOrderId,
            gatewayPaymentId: gatewayPayment.id || payment.gatewayPaymentId,
            correlationId: sourceCorrelationId,
            payload: {
              gatewayStatus: gatewayPayment?.status,
            },
            reason: gatewayPayment?.error_description || 'Gateway reported failure',
          },
        });
      });

      logger.info(`✅ Reconciled failed payment: ${payment.id}`);
      return { success: true, status: 'FAILED' as const };
    }

    return {
      success: true,
      status: gatewayPayment?.status || 'PENDING',
    };
  }

  /**
   * Get payment status for an order
   */
  async getPaymentStatus(orderId: string, userId: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        orderId,
        order: { userId },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment;
  }

  /**
   * Get order with payment details
   */
  async getOrderWithPayment(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
        shippingAddress: true, // ✅ Include shipping address
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  /**
   * Send WhatsApp notification for paid order (helper method)
   * @private
   */
  private async sendOrderWhatsAppNotification(orderId: string) {
    try {
      // Fetch complete order details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true,
              customDesign: true,
            },
          },
          shippingAddress: true,
        },
      });

      if (!order || !order.shippingAddress) {
        logger.error('Order or shipping address not found for WhatsApp notification');
        return;
      }

      // Calculate subtotal
      const subtotal = order.items.reduce((sum, item) => {
        return sum + Number(item.price) * item.quantity;
      }, 0);

      // Format items for notification
      const items = order.items.map(item => ({
        name: item.product?.name || item.customDesign?.name || 'Custom Item',
        quantity: item.quantity,
        price: Number(item.price),
      }));

      // Format shipping address
      const address = order.shippingAddress;
      const shippingAddress = [
        address.addressLine1,
        address.addressLine2,
        `${address.city}, ${address.state} - ${address.postalCode}`,
        address.country,
      ]
        .filter(Boolean)
        .join('\n');

      // Send notification (no GST - business doesn't have GST number)
      await whatsappService.sendOrderNotification({
        orderId: order.id,
        customerName: address.fullName,
        customerPhone: address.phone,
        customerEmail: address.email,
        items,
        subtotal,
        total: Number(order.total),
        shippingAddress,
      });
    } catch (error: any) {
      logger.error('Failed to send WhatsApp order notification:', error.message);
      // Don't throw - let the payment succeed even if notification fails
    }
  }
}

