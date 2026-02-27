/**
 * 🕐 ORDER EXPIRATION WORKER
 * 
 * Critical job that prevents stock from being locked indefinitely.
 * 
 * PROBLEM WITHOUT THIS:
 * ===================
 * 1. User creates order → Stock reserved
 * 2. User closes browser before payment
 * 3. Stock stays locked forever
 * 4. Real customers can't buy the product
 * 
 * SOLUTION:
 * =========
 * This worker runs every 5 minutes and:
 * 1. Finds orders older than 15 minutes with status = CREATED
 * 2. Restores their stock
 * 3. Marks them as CANCELLED (expired orders)
 * 4. Marks their payments as FAILED
 * 
 * @author RoboHatch Backend Team
 * @version 1.0.0
 */

import { prisma, Prisma } from '../config/prisma';
import { StockManager } from '../utils/stock-manager';

// Configuration
const ORDER_EXPIRATION_MINUTES = 15; // Orders expire after 15 minutes
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

/**
 * Find and expire abandoned orders
 */
export async function expireAbandonedOrders() {
  const expirationThreshold = new Date(Date.now() - ORDER_EXPIRATION_MINUTES * 60 * 1000);
  
  console.log(`🕐 Checking for abandoned orders older than ${ORDER_EXPIRATION_MINUTES} minutes...`);

  try {
    // Find orders that are:
    // 1. Status = CREATED (not paid, not cancelled)
    // 2. Created more than 15 minutes ago
    // 3. No successful payment
    const abandonedOrders = await prisma.order.findMany({
      where: {
        status: 'CREATED',
        createdAt: {
          lt: expirationThreshold,
        },
        OR: [
          {
            payment: {
              status: { in: ['PENDING', 'CREATED'] },
            },
          },
          {
            payment: null, // No payment record at all
          },
        ],
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
    });

    if (abandonedOrders.length === 0) {
      console.log('✅ No abandoned orders found');
      return { expired: 0, restored: 0 };
    }

    console.log(`⚠️  Found ${abandonedOrders.length} abandoned orders to expire`);

    let expiredCount = 0;
    let stockRestoredCount = 0;

    // Expire each order
    for (const order of abandonedOrders) {
      try {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // Restore stock for all items
          const restorationResults = await StockManager.batchRestoreStock(
            tx,
            order.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
            }))
          );

          // Count successful restorations
          const successfulRestorations = restorationResults.filter(r => r.success).length;
          stockRestoredCount += successfulRestorations;

          // Log any failed restorations (products may have been deleted)
          restorationResults
            .filter(r => !r.success)
            .forEach(result => {
              console.warn(`⚠️  Failed to restore stock for ${result.productId}: ${result.error}`);
            });

          // Mark order as CANCELLED (expired orders are treated as cancelled)
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'CANCELLED',
            },
          });

          // Mark payment as FAILED if exists (expired payments are treated as failed)
          if (order.payment) {
            await tx.payment.update({
              where: { id: order.payment.id },
              data: {
                status: 'FAILED',
              },
            });
          }

          expiredCount++;

          console.log(
            `✅ Order ${order.id} expired and stock restored (${order.items.length} items, age: ${Math.round((Date.now() - order.createdAt.getTime()) / 60000)} minutes)`
          );
        });
      } catch (error) {
        console.error(`❌ Failed to expire order ${order.id}:`, error);
        // Continue with next order even if one fails
      }
    }

    console.log(
      `✅ Expiration complete: ${expiredCount} orders expired, ${stockRestoredCount} items restored`
    );

    return {
      expired: expiredCount,
      restored: stockRestoredCount,
    };
  } catch (error) {
    console.error('❌ Error in order expiration worker:', error);
    throw error;
  }
}

/**
 * Start the order expiration worker
 * Runs continuously in background
 */
export function startOrderExpirationWorker() {
  console.log(
    `🚀 Starting order expiration worker (checks every ${CHECK_INTERVAL_MS / 1000 / 60} minutes, expires after ${ORDER_EXPIRATION_MINUTES} minutes)`
  );

  // Run immediately on startup
  expireAbandonedOrders().catch(error => {
    console.error('❌ Initial order expiration check failed:', error);
  });

  // Then run periodically
  setInterval(() => {
    expireAbandonedOrders().catch(error => {
      console.error('❌ Order expiration check failed:', error);
    });
  }, CHECK_INTERVAL_MS);
}

/**
 * Manually expire a specific order (for admin use)
 */
export async function manuallyExpireOrder(orderId: string, reason?: string) {
  console.log(`🔧 Manually expiring order ${orderId}${reason ? `: ${reason}` : ''}`);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payment: true,
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  if (order.status !== 'CREATED') {
    throw new Error(`Order ${orderId} cannot be expired (current status: ${order.status})`);
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Restore stock
    await StockManager.batchRestoreStock(
      tx,
      order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
    );

    // Mark as expired (using CANCELLED status)
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    if (order.payment) {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: { status: 'FAILED' },
      });
    }
  });

  console.log(`✅ Order ${orderId} manually expired`);

  return { success: true };
}

// Export for use in main server
export default {
  start: startOrderExpirationWorker,
  runOnce: expireAbandonedOrders,
  manualExpire: manuallyExpireOrder,
};
