import { Router } from 'express';
import { authenticate } from '../middlewares';
import {
  createCustomDesign,
  getUserCustomDesigns,
  getCustomDesignById,
  updateCustomDesignStatus,
  getAllCustomDesigns,
} from '../controllers/customDesign.controller';

const router = Router();

// User routes
router.post('/', authenticate, createCustomDesign);
router.get('/my-designs', authenticate, getUserCustomDesigns);
router.get('/:id', authenticate, getCustomDesignById);

// Admin routes
router.get('/', authenticate, getAllCustomDesigns); // Admin only
router.patch('/:id/status', authenticate, updateCustomDesignStatus); // Admin only

export default router;
