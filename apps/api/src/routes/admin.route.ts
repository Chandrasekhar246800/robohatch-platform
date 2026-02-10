import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin only)
 */
router.get(
  '/dashboard/stats',
  authMiddleware,
  adminMiddleware,
  (req, res) => adminController.getDashboardStats(req, res)
);

export default router;
