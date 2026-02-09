import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Explicitly handle OPTIONS for CORS preflight
router.options('/register', (req, res) => {
  res.status(204).end();
});

router.options('/login', (req, res) => {
  res.status(204).end();
});

router.options('/profile', (req, res) => {
  res.status(204).end();
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', (req, res) => authController.register(req, res));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', (req, res) => authController.login(req, res));

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, (req, res) => authController.getProfile(req, res));

export default router;
