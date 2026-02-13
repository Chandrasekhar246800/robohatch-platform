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
 * @route   POST /api/auth/logout
 * @desc    Logout user (clears httpOnly cookie)
 * @access  Public
 */
router.post('/logout', (req, res) => authController.logout(req, res));

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, (req, res) => authController.getProfile(req, res));

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authMiddleware, (req, res) => authController.updateProfile(req, res));

export default router;
