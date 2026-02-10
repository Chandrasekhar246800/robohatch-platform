import { Router } from 'express';
import { seedController } from '../controllers/seed.controller';
import { authMiddleware, adminMiddleware } from '../middlewares';

const router = Router();

// POST /api/admin/seed-categories - Seed initial categories (admin only)
router.post('/seed-categories', authMiddleware, adminMiddleware, seedController.seedCategories.bind(seedController));

export default router;
