/**
 * 🔒 PRODUCTION-GRADE STOCK MANAGEMENT UTILITY
 * 
 * Provides atomic, race-condition-free stock operations for e-commerce transactions.
 * 
 * WHY RAW SQL INSTEAD OF PRISMA ORM?
 * ===================================
 * Prisma's `updateMany` with conditional WHERE is vulnerable to race conditions:
 * 
 * ❌ VULNERABLE (Prisma ORM):
 * ```typescript
 * await prisma.product.updateMany({
 *   where: { id: productId, stock: { gte: quantity } },
 *   data: { stock: { decrement: quantity } }
 * })
 * ```
 * 
 * Race condition scenario:
 * - Stock = 5
 * - User A checks: stock >= 3 ✓ (reads 5)
 * - User B checks: stock >= 3 ✓ (reads 5)  
 * - User A updates: stock = 2 (5 - 3)
 * - User B updates: stock = -1 (2 - 3) ❌ OVERSOLD!
 * 
 * ✅ ATOMIC (Raw SQL):
 * ```sql
 * UPDATE Product
 * SET stock = stock - ?
 * WHERE id = ? AND stock >= ?
 * ```
 * 
 * Database guarantees:
 * 1. Row-level lock acquired
 * 2. WHERE evaluated atomically
 * 3. UPDATE applied only if condition true
 * 4. Lock released
 * 
 * Only ONE transaction can modify a product row at a time.
 * 
 * MYSQL InnoDB COMPATIBILITY NOTES:
 * ==================================
 * - Uses row-level locking (InnoDB)
 * - ACID compliant within Prisma transactions
 * - SELECT FOR UPDATE implicit in UPDATE with WHERE
 * - Deadlock prevention: Always update products in consistent order (by ID)
 * 
 * @module stock-manager
 * @author RoboHatch Backend Team
 * @version 1.0.0
 */

import { Prisma } from '@prisma/client';

/**
 * Result of a stock reservation attempt
 */
export interface StockReservationResult {
  success: boolean;
  productId: string;
  requestedQuantity: number;
  availableStock?: number;
  productName?: string;
  isActive?: boolean;
  error?: string;
  errorCode?: 'INSUFFICIENT_STOCK' | 'PRODUCT_NOT_FOUND' | 'PRODUCT_INACTIVE' | 'UNKNOWN';
}

/**
 * Result of a stock restoration attempt
 */
export interface StockRestorationResult {
  success: boolean;
  productId: string;
  restoredQuantity: number;
  error?: string;
}

/**
 * Stock Manager - Production-grade atomic stock operations
 */
export class StockManager {
  /**
   * 🔒 ATOMIC STOCK RESERVATION
   * 
   * Reserves stock for a product using a single atomic SQL UPDATE statement.
   * Prevents overselling even under heavy concurrent load.
   * 
   * @param tx - Prisma transaction client
   * @param productId - UUID of the product
   * @param quantity - Quantity to reserve (must be positive integer)
   * @returns StockReservationResult with success status and details
   * 
   * @example
   * ```typescript
   * await prisma.$transaction(async (tx) => {
   *   const result = await StockManager.reserveStock(tx, productId, 3);
   *   if (!result.success) {
   *     throw new Error(result.error);
   *   }
   * });
   * ```
   */
  static async reserveStock(
    tx: Prisma.TransactionClient,
    productId: string,
    quantity: number
  ): Promise<StockReservationResult> {
    // Input validation
    if (quantity <= 0) {
      return {
        success: false,
        productId,
        requestedQuantity: quantity,
        error: 'Quantity must be a positive integer',
        errorCode: 'UNKNOWN',
      };
    }

    try {
      // 🔒 ATOMIC UPDATE: Single SQL statement prevents race conditions
      // This will:
      // 1. Lock the product row (InnoDB row-level lock)
      // 2. Check if stock >= quantity AND product is active
      // 3. Decrement stock only if condition is true
      // 4. Return number of affected rows (0 or 1)
      const affectedRows = await tx.$executeRaw`
        UPDATE Product
        SET stock = stock - ${quantity}
        WHERE id = ${productId}
          AND stock >= ${quantity}
          AND isActive = 1
      `;

      // ✅ SUCCESS: Stock was reserved
      if (affectedRows > 0) {
        return {
          success: true,
          productId,
          requestedQuantity: quantity,
        };
      }

      // ❌ FAILURE: Stock was NOT reserved
      // Fetch current product state to determine why
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: {
          name: true,
          stock: true,
          isActive: true,
        },
      });

      // Product doesn't exist
      if (!product) {
        return {
          success: false,
          productId,
          requestedQuantity: quantity,
          error: 'Product no longer exists. Please refresh your cart.',
          errorCode: 'PRODUCT_NOT_FOUND',
        };
      }

      // Product is inactive
      if (!product.isActive) {
        return {
          success: false,
          productId,
          requestedQuantity: quantity,
          productName: product.name,
          isActive: product.isActive,
          error: `"${product.name}" is no longer available. Please remove it from your cart.`,
          errorCode: 'PRODUCT_INACTIVE',
        };
      }

      // Stock insufficient (most common failure case)
      return {
        success: false,
        productId,
        requestedQuantity: quantity,
        availableStock: product.stock,
        productName: product.name,
        error:
          `Insufficient stock for "${product.name}". ` +
          `Requested: ${quantity}, Available: ${product.stock}. ` +
          `Another customer may have just purchased this item. ` +
          `Please update your cart quantity.`,
        errorCode: 'INSUFFICIENT_STOCK',
      };
    } catch (error) {
      console.error('❌ Stock reservation failed:', error);
      return {
        success: false,
        productId,
        requestedQuantity: quantity,
        error: 'Failed to reserve stock due to database error',
        errorCode: 'UNKNOWN',
      };
    }
  }

  /**
   * 📦 RESTORE STOCK
   * 
   * Restores stock for a product (used when orders are cancelled or payments fail).
   * Uses raw SQL for consistency, though stock restoration doesn't have the same
   * race condition concerns as reservation (we're adding, not checking limits).
   * 
   * @param tx - Prisma transaction client
   * @param productId - UUID of the product
   * @param quantity - Quantity to restore (must be positive integer)
   * @returns StockRestorationResult with success status
   * 
   * @example
   * ```typescript
   * await prisma.$transaction(async (tx) => {
   *   const result = await StockManager.restoreStock(tx, productId, 3);
   *   if (!result.success) {
   *     console.warn(`Failed to restore stock: ${result.error}`);
   *   }
   * });
   * ```
   */
  static async restoreStock(
    tx: Prisma.TransactionClient,
    productId: string,
    quantity: number
  ): Promise<StockRestorationResult> {
    // Input validation
    if (quantity <= 0) {
      return {
        success: false,
        productId,
        restoredQuantity: 0,
        error: 'Quantity must be a positive integer',
      };
    }

    try {
      const affectedRows = await tx.$executeRaw`
        UPDATE Product
        SET stock = stock + ${quantity}
        WHERE id = ${productId}
      `;

      if (affectedRows > 0) {
        return {
          success: true,
          productId,
          restoredQuantity: quantity,
        };
      }

      // Product doesn't exist (may have been deleted)
      return {
        success: false,
        productId,
        restoredQuantity: 0,
        error: 'Product no longer exists. Stock could not be restored.',
      };
    } catch (error) {
      console.error('❌ Stock restoration failed:', error);
      return {
        success: false,
        productId,
        restoredQuantity: 0,
        error: 'Failed to restore stock due to database error',
      };
    }
  }

  /**
   * 📊 BATCH RESERVE STOCK
   * 
   * Reserves stock for multiple products atomically within a transaction.
   * Useful for checkout flows with multiple items in the cart.
   * 
   * Important: If ANY item fails to reserve, the entire batch fails and
   * the transaction should be rolled back.
   * 
   * @param tx - Prisma transaction client
   * @param reservations - Array of { productId, quantity } to reserve
   * @returns Array of StockReservationResult for each item
   * 
   * @example
   * ```typescript
   * await prisma.$transaction(async (tx) => {
   *   const results = await StockManager.batchReserveStock(tx, [
   *     { productId: 'prod-1', quantity: 2 },
   *     { productId: 'prod-2', quantity: 1 },
   *   ]);
   *   
   *   const failed = results.find(r => !r.success);
   *   if (failed) {
   *     throw new Error(failed.error);
   *   }
   * });
   * ```
   */
  static async batchReserveStock(
    tx: Prisma.TransactionClient,
    reservations: Array<{ productId: string; quantity: number; productName?: string }>
  ): Promise<StockReservationResult[]> {
    const results: StockReservationResult[] = [];

    // Sort by productId to prevent deadlocks when multiple concurrent transactions
    // are trying to update the same products in different orders
    const sortedReservations = [...reservations].sort((a, b) => 
      a.productId.localeCompare(b.productId)
    );

    for (const reservation of sortedReservations) {
      const result = await this.reserveStock(
        tx,
        reservation.productId,
        reservation.quantity
      );

      // Include product name from cart item if available
      if (reservation.productName && result.success) {
        result.productName = reservation.productName;
      }

      results.push(result);

      // Early exit on first failure (fail-fast)
      // Caller should handle transaction rollback
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * 📦 BATCH RESTORE STOCK
   * 
   * Restores stock for multiple products atomically within a transaction.
   * Used when orders are cancelled or payments fail.
   * 
   * @param tx - Prisma transaction client
   * @param restorations - Array of { productId, quantity } to restore
   * @returns Array of StockRestorationResult for each item
   */
  static async batchRestoreStock(
    tx: Prisma.TransactionClient,
    restorations: Array<{ productId: string; quantity: number }>
  ): Promise<StockRestorationResult[]> {
    const results: StockRestorationResult[] = [];

    for (const restoration of restorations) {
      const result = await this.restoreStock(
        tx,
        restoration.productId,
        restoration.quantity
      );

      results.push(result);

      // Continue even if one fails (best effort restoration)
      // Log warnings for failed restorations
      if (!result.success) {
        console.warn(
          `⚠️ Failed to restore stock for ${restoration.productId}: ${result.error}`
        );
      }
    }

    return results;
  }

  /**
   * 🔍 CHECK STOCK AVAILABILITY
   * 
   * Checks if sufficient stock is available without reserving it.
   * Useful for pre-checkout validation.
   * 
   * Note: This is NOT atomic with the reservation. Stock could change between
   * this check and the actual reservation. Always use reserveStock for actual
   * order processing.
   * 
   * @param tx - Prisma transaction client (or regular prisma client)
   * @param productId - UUID of the product
   * @param quantity - Quantity to check
   * @returns True if sufficient stock is available
   */
  static async checkStockAvailability(
    tx: Prisma.TransactionClient,
    productId: string,
    quantity: number
  ): Promise<boolean> {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { stock: true, isActive: true },
    });

    if (!product || !product.isActive) {
      return false;
    }

    return product.stock >= quantity;
  }
}

/**
 * Export singleton instance for convenience
 */
export const stockManager = StockManager;
