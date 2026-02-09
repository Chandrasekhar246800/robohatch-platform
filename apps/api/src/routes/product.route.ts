import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

/**
 * @route   POST /api/admin/products
 * @desc    Create a new product with images (uploads to S3)
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  upload.array('images', 10), // Max 10 images per product
  (req, res) => productController.createProduct(req, res)
);

/**
 * @route   GET /api/products
 * @desc    Get all products
 * @access  Public
 */
router.get('/all', (req, res) => productController.getAllProducts(req, res));

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Public
 */
router.get('/:id', (req, res) => productController.getProductById(req, res));

export default router;
