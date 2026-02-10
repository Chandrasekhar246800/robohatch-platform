import { prisma } from '../config/prisma';

export class PaymentService {
  // Create order with pending payment
  async createOrder(userId: string) {
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

    // Calculate total
    const total = cart.items.reduce(
      (sum: number, item: any) => sum + Number(item.product.price) * item.quantity,
      0
    );

    // Create order with items
    const order = await prisma.order.create({
      data: {
        userId,
        total,
        status: 'PENDING',
        items: {
          create: cart.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
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

  // Initiate UPI payment
  async initiatePayment(orderId: string, userId: string, upiId: string) {
    // Verify order belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new Error('Order already processed');
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId },
    });

    if (existingPayment) {
      throw new Error('Payment already initiated');
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount: order.total,
        method: 'UPI',
        status: 'PENDING',
        upiId,
      },
    });

    // In real app, you would integrate with UPI payment gateway here
    // For demo, we'll generate a mock transaction ID
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    return {
      payment,
      transactionId,
      upiLink: `upi://pay?pa=${upiId}&pn=Robohatch&am=${order.total}&cu=INR&tn=Order${orderId}`,
    };
  }

  // Verify and complete payment
  async verifyPayment(transactionId: string, userId: string) {
    // Find payment by transaction ID
    const payment = await prisma.payment.findUnique({
      where: { transactionId },
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

    if (payment.status === 'SUCCESS') {
      throw new Error('Payment already verified');
    }

    // In real app, verify with payment gateway
    // For demo, we'll simulate success
    
    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        transactionId,
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: 'PAID',
      },
    });

    // Clear user's cart after successful payment
    await prisma.cartItem.deleteMany({
      where: {
        cart: {
          userId,
        },
      },
    });

    return updatedPayment;
  }

  // Get payment status
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

    return payment;
  }

  // Get order with payment details
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
