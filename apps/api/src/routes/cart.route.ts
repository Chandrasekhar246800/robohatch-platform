import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const cartController = new CartController();

// All cart routes require authentication
router.use(authMiddleware);

// Get user's cart
router.get('/', (req, res) => cartController.getCart(req, res));

// Get cart summary (total items, price)
router.get('/summary', (req, res) => cartController.getCartSummary(req, res));

// Add item to cart
router.post('/items', (req, res) => cartController.addToCart(req, res));

// Add custom design to cart
router.post('/custom-designs', (req, res) => cartController.addCustomDesignToCart(req, res));

// Update cart item quantity
router.put('/items/:itemId', (req, res) => cartController.updateCartItem(req, res));

// Remove item from cart
router.delete('/items/:itemId', (req, res) => cartController.removeFromCart(req, res));

// Clear entire cart
router.delete('/', (req, res) => cartController.clearCart(req, res));

export default router;
