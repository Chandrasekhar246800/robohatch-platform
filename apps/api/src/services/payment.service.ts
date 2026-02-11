import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '../config/prisma';

// Initialize Razorpay with credentials from environment
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Validate Razorpay configuration at startup
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('❌ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing Razorpay credentials');
  }
}

export class PaymentService {
  /**
   * Create Razorpay order for an existing order
   * @param orderId - Order ID from database
   * @param userId - User ID for verification
   * @returns Razorpay order object
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

    // Check if payment was already created
    if (order.payment && order.payment.status !== 'PENDING') {
      throw new Error('Payment already initiated');
    }

    // Delete any existing pending payment to allow retry
    if (order.payment && order.payment.status === 'PENDING') {
      await prisma.payment.delete({
        where: { id: order.payment.id },
      });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(Number(order.total) * 100), // Convert to paise
      currency: 'INR',
      receipt: orderId,
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

    return {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
    };
  }

  /**
   * Verify Razorpay payment signature (CRITICAL SECURITY CHECK)
   * @param paymentData - Payment response from Razorpay frontend
   * @param userId - User ID for verification
   * @returns Verified payment object
   */
  async verifyPayment(
    paymentData: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
    userId: string
  ) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    // 🔒 IDEMPOTENCY CHECK: Find payment by gateway order ID
    const payment = await prisma.payment.findUnique({
      where: { gatewayOrderId: razorpay_order_id },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new Error('Payment record not found');
    }

    // Verify order belongs to user
    if (payment.order.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // 🔒 IDEMPOTENCY: Return existing payment if already processed
    if (payment.status === 'CAPTURED') {
      return {
        success: true,
        orderId: payment.orderId,
        paymentId: payment.gatewayPaymentId || razorpay_payment_id,
        message: 'Payment already processed',
      };
    }

    // Prevent processing if payment is in final state
    if (payment.status === 'REFUNDED') {
      throw new Error('Payment was refunded and cannot be reprocessed');
    }

    // ⚠️ CRITICAL SECURITY: Verify Razorpay signature with timing-safe comparison
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
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
      // Mark payment as failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      throw new Error('Invalid payment signature');
    }

    // Payment signature verified - Execute transaction atomically
    await prisma.$transaction(async (tx) => {
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

    return {
      success: true,
      orderId: payment.orderId,
      paymentId: razorpay_payment_id,
    };
  }

  /**
   * Handle payment failure
   * @param orderId - Order ID
   * @param userId - User ID for verification
   * @param reason - Failure reason
   */
  async handlePaymentFailure(orderId: string, userId: string, reason?: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        orderId,
        order: { userId },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
      },
    });

    return { success: true, message: 'Payment marked as failed' };
  }

  /**
   * Get payment status for an order
   * @param orderId - Order ID
   * @param userId - User ID for verification
   * @returns Payment details
   */
  async getPaymentStatus(orderId: string, userId: string) {
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.order.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      gatewayOrderId: payment.gatewayOrderId,
      gatewayPaymentId: payment.gatewayPaymentId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /**
   * Create order from cart (before payment)
   * @param userId - User ID
   * @returns Created order
   */
  async createOrderFromCart(userId: string) {
    // 🔒 DOUBLE ORDER PREVENTION: Check for existing pending order
    const existingPendingOrder = await prisma.order.findFirst({
      where: {
        userId,
        status: 'PENDING',
      },
      include: {
        items: true,
      },
    });

    // If pending order exists, return it instead of creating new one
    if (existingPendingOrder) {
      console.log(`♻️ Reusing existing pending order: ${existingPendingOrder.id}`);
      return existingPendingOrder;
    }

    // Get user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Validate all products are active
    const inactiveProducts = cart.items.filter((item) => !item.product.isActive);
    if (inactiveProducts.length > 0) {
      throw new Error('Some products in cart are no longer available');
    }

    // Calculate total (locked prices from current time)
    const total = cart.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );

    // Create order with items (NO payment yet, NO cart clearing)
    const order = await prisma.order.create({
      data: {
        userId,
        total,
        status: 'PENDING',
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price, // Lock price at order time
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
      },
    });

    return order;
  }

  /**
   * Get order with payment details
   * @param orderId - Order ID
   * @param userId - User ID for verification
   * @returns Order with items and payment
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
            product: {
              include: {
                images: true,
              },
            },
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }
}
