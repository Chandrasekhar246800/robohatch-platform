import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/', (req, res) => categoryController.getAllCategories(req, res));

/**
 * @route   POST /api/admin/categories
 * @desc    Create a new category
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  (req, res) => categoryController.createCategory(req, res)
);

export default router;
