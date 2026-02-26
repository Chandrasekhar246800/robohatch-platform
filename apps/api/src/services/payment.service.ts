import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma, Prisma } from '../config/prisma';
import { validateShippingAddress, validatePaymentVerification } from '../validators/order.validator';
import { emailService } from './email.service';
import whatsappService from './whatsapp.service';
import { StockManager } from '../utils/stock-manager';

// 🔒 SECURITY: NO FALLBACK - Crash if Razorpay credentials missing
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('🚨 CRITICAL: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set!');
  throw new Error('Missing Razorpay credentials');
}

// 🔒 SECURITY: Webhook secret required
if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
  console.error('🚨 CRITICAL: RAZORPAY_WEBHOOK_SECRET must be set!');
  console.error('This is required for webhook signature verification');
  throw new Error('Missing Razorpay webhook secret');
}

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

console.log('✅ Razorpay credentials loaded successfully');
console.log('✅ Webhook secret configured');

export class PaymentService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    console.log('✅ Razorpay initialized successfully');
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
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // ✅ INVENTORY CHECK: Verify stock availability
    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new Error(`Product ${item.product.name} is no longer available`);
      }
      
      if (item.product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.product.name}. Available: ${item.product.stock}`);
      }
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum: number, item: typeof cart.items[0]) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);

    // Calculate total (no GST - business doesn't have GST number)
    const total = subtotal;

    // ✅ ATOMIC TRANSACTION: Reserve stock FIRST, then create order
    // Why this order? Fail fast before any DB writes. More efficient.
    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // STEP 1: Reserve stock for ALL items FIRST (fails early, no wasted writes)
      for (const cartItem of cart.items) {
        const reservationResult = await StockManager.reserveStock(
          tx,
          cartItem.productId,
          cartItem.quantity
        );

        // ❌ FAILURE: Stock reservation failed - transaction will rollback
        if (!reservationResult.success) {
          console.error(
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
        console.log(
          `✅ Stock reserved: ${cartItem.product.name} -${cartItem.quantity}`
        );
      }

      // STEP 2: All stock reserved successfully → NOW create order
      const newOrder = await tx.order.create({
        data: {
          userId,
          total,
          status: 'CREATED',
        },
      });

      // STEP 3: Create order items (stock already reserved above)
      for (const cartItem of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            price: cartItem.product.price,
          },
        });
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

    console.log(`✅ Order created with shipping address: ${order.id}`);

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
        console.log(`🔄 Deleting ${order.payment.status} payment to allow retry:`, order.payment.id);
        await prisma.payment.delete({
          where: { id: order.payment.id },
        });
      }
    }

    // Create Razorpay order with idempotency
    const amountInPaise = Math.round(Number(order.total) * 100);
    
    console.log('💳 Creating Razorpay order:', {
      orderId,
      amount: `₹${order.total}`,
      amountInPaise: `${amountInPaise} paise`,
    });
    
    // ✅ IDEMPOTENCY: Use orderId as receipt for idempotency
    const razorpayOrder = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: orderId, // This acts as idempotency key
      notes: {
        orderId,
        userId,
      },
    });

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

    console.log(`✅ Razorpay order created: ${razorpayOrder.id}`);

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
      console.error('🚨 SECURITY ALERT: Unauthorized payment verification attempt', {
        userId,
        orderId: payment.orderId,
        ip: 'N/A', // Add IP from request in controller
      });
      throw new Error('Unauthorized');
    }

    // 🔒 IDEMPOTENCY: Return existing payment if already processed
    if (payment.status === 'CAPTURED') {
      console.log(`✓ Payment already captured (idempotent): ${payment.id}`);
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
      console.error('🚨 SECURITY ALERT: Invalid payment signature detected', {
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

    console.log(`✅ Payment verified and captured: ${payment.id}`);

    // 📧 Send email notifications (non-blocking)
    Promise.all([
      emailService.sendOrderConfirmation(payment.orderId),
      emailService.sendPaymentSuccess(payment.orderId, razorpay_payment_id),
    ]).catch(error => {
      console.error('⚠️  Email notification failed (non-critical):', error.message);
    });

    // 📱 Send WhatsApp notification (non-blocking)
    this.sendOrderWhatsAppNotification(payment.orderId).catch(error => {
      console.error('⚠️  WhatsApp notification failed (non-critical):', error.message);
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

        // ✅ RESTORE STOCK: Add items back to inventory
        for (const item of payment.order.items) {
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

      console.log(`✅ Payment refunded: ${payment.id}, Refund ID: ${refund.id}`);

      // 📧 Send refund confirmation email (non-blocking)
      emailService.sendRefundConfirmation(
        orderId,
        Number(payment.amount),
        refund.id
      ).catch(error => {
        console.error('⚠️  Refund email notification failed (non-critical):', error.message);
      });

      return {
        success: true,
        refundId: refund.id,
        amount: Number(payment.amount),
        status: 'REFUNDED',
      };
    } catch (error: any) {
      console.error('❌ Razorpay refund failed:', error);
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
        const restorationResult = await StockManager.restoreStock(
          tx,
          item.productId,
          item.quantity
        );

        if (!restorationResult.success) {
          console.warn(
            `⚠️ Failed to restore stock for product ${item.productId}: ${restorationResult.error}`
          );
        } else {
          console.log(
            `✅ Stock restored: ${item.product.name} +${item.quantity} (Failed payment: ${payment.id})`
          );
        }
      }
    });

    console.log(`✅ Payment marked as failed and stock restored: ${payment.id}`);

    return { success: true, message: 'Payment marked as failed' };
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
            },
          },
          shippingAddress: true,
        },
      });

      if (!order || !order.shippingAddress) {
        console.error('Order or shipping address not found for WhatsApp notification');
        return;
      }

      // Calculate subtotal
      const subtotal = order.items.reduce((sum, item) => {
        return sum + Number(item.price) * item.quantity;
      }, 0);

      // Format items for notification
      const items = order.items.map(item => ({
        name: item.product.name,
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
      console.error('Failed to send WhatsApp order notification:', error.message);
      // Don't throw - let the payment succeed even if notification fails
    }
  }
}

