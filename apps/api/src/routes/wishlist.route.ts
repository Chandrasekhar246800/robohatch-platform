import { Router } from 'express';
import wishlistController from '../controllers/wishlist.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   GET /api/wishlist
 * @desc    Get user's wishlist
 * @access  Private (Auth required)
 */
router.get('/', authMiddleware, wishlistController.getWishlist.bind(wishlistController));

/**
 * @route   POST /api/wishlist/items
 * @desc    Add product to wishlist
 * @access  Private (Auth required)
 */
router.post('/items', authMiddleware, wishlistController.addToWishlist.bind(wishlistController));

/**
 * @route   DELETE /api/wishlist/items/:id
 * @desc    Remove item from wishlist
 * @access  Private (Auth required)
 */
router.delete('/items/:id', authMiddleware, wishlistController.removeFromWishlist.bind(wishlistController));

/**
 * @route   DELETE /api/wishlist/clear
 * @desc    Clear entire wishlist
 * @access  Private (Auth required)
 */
router.delete('/clear', authMiddleware, wishlistController.clearWishlist.bind(wishlistController));

export default router;
