import { Router } from 'express';
import contactController from '../controllers/contact.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();

/**
 * @route   POST /api/contact
 * @desc    Submit contact form
 * @access  Public
 */
router.post('/', contactController.submitContactForm.bind(contactController));

/**
 * @route   GET /api/contact
 * @desc    Get all contact submissions (admin only)
 * @access  Admin
 */
router.get(
  '/',
  authMiddleware,
  adminMiddleware,
  contactController.getContactSubmissions.bind(contactController)
);

export default router;
