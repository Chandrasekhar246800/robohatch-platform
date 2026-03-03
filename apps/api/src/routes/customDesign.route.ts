import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import { upload3d, handleUploadError } from '../middlewares/upload3d.middleware';
import {
  createCustomDesign,
  getUserCustomDesigns,
  getCustomDesignById,
  updateCustomDesignStatus,
  getAllCustomDesigns,
} from '../controllers/customDesign.controller';

const router = Router();

// User routes - with 3D file upload
router.post('/', authMiddleware, upload3d.single('file'), handleUploadError, createCustomDesign);
router.get('/my-designs', authMiddleware, getUserCustomDesigns);
router.get('/:id', authMiddleware, getCustomDesignById);

// Admin routes - 🔒 ADMIN ONLY
router.get('/', authMiddleware, adminMiddleware, getAllCustomDesigns);
router.patch('/:id/status', authMiddleware, adminMiddleware, updateCustomDesignStatus);

export default router;
