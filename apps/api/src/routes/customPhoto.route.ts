import { Router, Request, Response } from 'express';
import { CustomPhotoController } from '../controllers/customPhoto.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadCustomPhoto, handlePhotoUploadError } from '../middlewares/uploadCustomPhoto.middleware';

const router = Router();
const customPhotoController = new CustomPhotoController();

/**
 * @route   POST /api/custom-photos/upload
 * @desc    Upload a custom photo for personalized products
 * @access  Private (requires authentication)
 */
router.post(
  '/upload',
  authMiddleware,
  uploadCustomPhoto.single('photo'),
  handlePhotoUploadError,
  (req: Request, res: Response) => customPhotoController.uploadPhoto(req, res)
);

export default router;
