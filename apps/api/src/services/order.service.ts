import { prisma } from '../config/prisma';
import { OrderStatus } from '@prisma/client';

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

    // Calculate GST (18%)
    const gst = Math.round(subtotal * 0.18);
    
    // Total = Subtotal + GST
    const total = subtotal + gst;

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
      PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
      PAID: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      SHIPPED: [OrderStatus.DELIVERED],
      DELIVERED: [],
      CANCELLED: [],
    };

    const currentStatus = order.status as OrderStatus;
    if (!validTransitions[currentStatus].includes(status)) {
      throw new Error(`Invalid status transition from ${order.status} to ${status}`);
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
}

export default new OrderService();
