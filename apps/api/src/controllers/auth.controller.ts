import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { validateRegister, validateLogin } from '../validators/auth.validator';

export class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(req: Request, res: Response) {
    try {
      // ✅ VALIDATION: Using Zod schema
      const validatedData = validateRegister(req.body);

      // Register user
      const result = await authService.register(validatedData);

      // 🔒 Set httpOnly cookie
      authService.setAuthCookie(res, result.token);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          // ❌ DO NOT send token in response body (cookie only)
        },
      });
    } catch (error: any) {
      console.error('Register error:', error);

      // Sanitize error message for production
      const message = error.message === 'Email already registered'
        ? error.message
        : 'Registration failed';

      res.status(400).json({
        success: false,
        message: message,
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: Request, res: Response) {
    try {
      // ✅ VALIDATION: Using Zod schema
      const validatedData = validateLogin(req.body);

      // Authenticate user
      const result = await authService.login(validatedData);

      // 🔒 Set httpOnly cookie
      authService.setAuthCookie(res, result.token);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          // ❌ DO NOT send token in response body (cookie only)
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);

      // Generic error message for security
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response) {
    try {
      // 🔒 Clear httpOnly cookie
      authService.clearAuthCookie(res);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      const user = await authService.getUserById(userId);

      res.json({
        success: true,
        data: user, // ✅ Return user directly, not nested in { user: ... }
      });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
      });
    }
  }

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name is required',
        });
      }

      const user = await authService.updateProfile(userId, { name: name.trim() });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
      });
    }
  }
}

export const authController = new AuthController();
