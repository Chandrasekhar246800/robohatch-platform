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

/**
 * @route   PATCH /api/admin/categories/:id
 * @desc    Update a category
 * @access  Private (Admin only)
 */
router.patch(
  '/:id',
  authMiddleware,
  adminMiddleware,
  (req, res) => categoryController.updateCategory(req, res)
);

/**
 * @route   DELETE /api/admin/categories/:id
 * @desc    Delete a category
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  (req, res) => categoryController.deleteCategory(req, res)
);

/**
 * @route   POST /api/admin/categories/seed
 * @desc    Seed initial categories (one-time setup)
 * @access  Private (Admin only)
 */
router.post(
  '/seed',
  authMiddleware,
  adminMiddleware,
  (req, res) => categoryController.seedCategories(req, res)
);

export default router;
