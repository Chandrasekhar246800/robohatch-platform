import { Request, Response } from 'express';
import { CartService } from '../services/cart.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const cartService = new CartService();

export class CartController {
  // Get user's cart
  async getCart(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const cart = await cartService.getUserCart(userId);
      res.json({ success: true, cart });
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({ success: false, error: 'Failed to get cart' });
    }
  }

  // Add item to cart
  async addToCart(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { productId, quantity, customText, customImageUrl } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (!productId) {
        return res.status(400).json({ success: false, error: 'Product ID is required' });
      }

      if (quantity && (isNaN(quantity) || quantity < 1)) {
        return res.status(400).json({ success: false, error: 'Quantity must be a positive number' });
      }

      const cartItem = await cartService.addToCart(
        userId,
        productId,
        quantity || 1,
        customText,
        customImageUrl
      );

      res.status(201).json({
        success: true,
        message: 'Item added to cart',
        data: { cartItem },
      });
    } catch (error: any) {
      console.error('Add to cart error:', error);

      if (error.message === 'Product not found') {
        return res.status(404).json({ success: false, error: error.message });
      }

      if (error.message === 'Product is not available') {
        return res.status(400).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: 'Failed to add item to cart' });
    }
  }

  // Add custom design to cart
  async addCustomDesignToCart(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { customDesignId, quantity } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (!customDesignId) {
        return res.status(400).json({ success: false, error: 'Custom Design ID is required' });
      }

      if (quantity && (isNaN(quantity) || quantity < 1)) {
        return res.status(400).json({ success: false, error: 'Quantity must be a positive number' });
      }

      const cartItem = await cartService.addCustomDesignToCart(
        userId,
        customDesignId,
        quantity || 1
      );

      res.status(201).json({
        success: true,
        message: 'Custom design added to cart',
        data: { cartItem },
      });
    } catch (error: any) {
      console.error('Add custom design to cart error:', error);

      if (error.message === 'Custom design not found') {
        return res.status(404).json({ success: false, error: error.message });
      }

      if (error.message === 'Unauthorized: This design belongs to another user') {
        return res.status(403).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: 'Failed to add custom design to cart' });
    }
  }

  // Update cart item quantity
  async updateCartItem(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (!quantity || isNaN(quantity) || quantity < 1) {
        return res.status(400).json({ success: false, error: 'Valid quantity is required' });
      }

      const cartItem = await cartService.updateCartItem(userId, itemId, quantity);

      res.json({
        success: true,
        message: 'Cart item updated',
        data: { cartItem },
      });
    } catch (error: any) {
      console.error('Update cart item error:', error);

      if (error.message === 'Cart item not found') {
        return res.status(404).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: 'Failed to update cart item' });
    }
  }

  // Remove item from cart
  async removeFromCart(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;
      const { itemId } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      await cartService.removeFromCart(userId, itemId);

      res.json({ success: true, message: 'Item removed from cart' });
    } catch (error: any) {
      console.error('Remove from cart error:', error);

      if (error.message === 'Cart item not found') {
        return res.status(404).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: 'Failed to remove item from cart' });
    }
  }

  // Clear entire cart
  async clearCart(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      await cartService.clearCart(userId);

      res.json({ success: true, message: 'Cart cleared' });
    } catch (error: any) {
      console.error('Clear cart error:', error);

      if (error.message === 'Cart not found') {
        return res.status(404).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: 'Failed to clear cart' });
    }
  }

  // Get cart summary
  async getCartSummary(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const summary = await cartService.getCartSummary(userId);

      res.json({ summary });
    } catch (error) {
      console.error('Get cart summary error:', error);
      res.status(500).json({ error: 'Failed to get cart summary' });
    }
  }
}
