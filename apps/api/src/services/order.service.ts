import { prisma } from '../config/prisma';
import { OrderStatus } from '@prisma/client';
import { emailService } from './email.service';

class OrderService {
  // Create order from cart
  async createOrderFromCart(userId: string) {
    // Get user's cart with items
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

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum: number, item: any) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);

    // Total = Subtotal (no GST - business doesn't have GST number)
    const total = subtotal;
    
    console.log('💰 Real-time order calculation:', {
      items: cart.items.length,
      subtotal: `₹${subtotal}`,
      total: `₹${total}`,
      breakdown: cart.items.map((item: any) => `${item.product.name}: ₹${item.product.price} × ${item.quantity}`)
    });

    // Create order with items
    const order = await prisma.order.create({
      data: {
        userId,
        total,
        status: OrderStatus.PENDING,
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
            product: true,
          },
        },
      },
    });

    return order;
  }

  // Get order by ID with ownership validation
  async getOrderById(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.userId !== userId) {
      throw new Error('Unauthorized access to order');
    }

    return order;
  }

  // Get all orders for user
  async getUserOrders(userId: string, limit = 10, offset = 0) {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.order.count({
      where: { userId },
    });

    return {
      orders,
      total,
      limit,
      offset,
    };
  }

  // Update order status (for admin/internal use)
  async updateOrderStatus(orderId: string, userId: string, status: OrderStatus) {
    // Validate order ownership
    const order = await this.getOrderById(orderId, userId);

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      CREATED: [OrderStatus.PAID, OrderStatus.PENDING, OrderStatus.CANCELLED],
      PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
      PAID: [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      PROCESSING: [OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
      SHIPPED: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED],
      OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.SHIPPED],
      DELIVERED: [],
      CANCELLED: [],
      REFUNDED: [],
    };

    const currentStatus = order.status as OrderStatus;
    if (!validTransitions[currentStatus].includes(status)) {
      throw new Error(`Invalid status transition from ${order.status} to ${status}`);
    }

    // ✅ STOCK REVERSAL: If cancelling a paid/processing order, restore stock
    if (status === OrderStatus.CANCELLED && ['PAID', 'CREATED', 'PROCESSING'].includes(currentStatus)) {
      await this.restoreStockForOrder(orderId);
      console.log(`✅ Stock restored for cancelled order: ${orderId}`);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
    });

    // 📧 Send shipping notification when order is shipped (non-blocking)
    if (status === OrderStatus.SHIPPED) {
      emailService.sendShippingNotification(orderId).catch(error => {
        console.error('⚠️  Shipping email notification failed (non-critical):', error.message);
      });
    }

    return updatedOrder;
  }

  // Get order statistics for user
  async getOrderStats(userId: string) {
    const [totalOrders, pendingOrders, completedOrders, totalSpent] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.count({ where: { userId, status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { userId, status: OrderStatus.DELIVERED } }),
      prisma.order.aggregate({
        where: { userId, status: { in: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED] } },
        _sum: { total: true },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalSpent: totalSpent._sum.total || 0,
    };
  }

  /**
   * Restore stock for an order (used for cancellations and failures)
   * ✅ CRITICAL: Prevents double-restoration with transaction
   */
  async restoreStockForOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // ✅ ATOMIC TRANSACTION: Restore all items
    await prisma.$transaction(async (tx: any) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });

        console.log(`📦 Stock restored: ${item.product.name} +${item.quantity} (Order ${orderId} cancelled)`);
      }
    });
  }

  /**
   * Cancel order (user-facing endpoint)
   * ✅ CRITICAL: Validates cancellation is allowed and restores stock
   */
  async cancelOrder(orderId: string, userId: string, reason?: string) {
    const order = await this.getOrderById(orderId, userId);

    // Validate order can be cancelled
    const cancellableStatuses = ['CREATED', 'PENDING', 'PAID', 'PROCESSING'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error(`Cannot cancel order in ${order.status} status`);
    }

    // Check if order has been shipped
    if (order.status === 'SHIPPED' || order.status === 'OUT_FOR_DELIVERY') {
      throw new Error('Cannot cancel shipped orders. Please contact support.');
    }

    // Restore stock and update status
    await this.restoreStockForOrder(orderId);

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log(`✅ Order cancelled: ${orderId}, Reason: ${reason || 'User requested'}`);

    // Send cancellation email (non-blocking)
    if (emailService && typeof emailService.sendOrderCancellation === 'function') {
      emailService.sendOrderCancellation(orderId, reason).catch((error: any) => {
        console.error('⚠️  Cancellation email failed (non-critical):', error.message);
      });
    }

    return updatedOrder;
  }
}

export default new OrderService();
