import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { validateRegister, validateLogin } from '../validators/auth.validator';

import { logger } from '../utils/logger';

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
      authService.setAuthCookie(res, result.token, req);
      authService.setRefreshCookie(res, result.refreshToken, req);
      authService.setCsrfCookie(res, result.csrfToken, req);
      logger.info({ event: 'register_success', userId: result.user.id });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          csrfToken: result.csrfToken,
          // ❌ DO NOT send token in response body (cookie only)
        },
      });
    } catch (error: any) {
      logger.error('Register error:', error);

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
      authService.setAuthCookie(res, result.token, req);
      authService.setRefreshCookie(res, result.refreshToken, req);
      authService.setCsrfCookie(res, result.csrfToken, req);
      logger.info({ event: 'login_success', userId: result.user.id, ip: req.ip });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          csrfToken: result.csrfToken,
          // ❌ DO NOT send token in response body (cookie only)
        },
      });
    } catch (error: any) {
      logger.warn({ event: 'login_failed', ip: req.ip, message: error?.message });

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
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) {
        await authService.revokeRefreshToken(refreshToken);
      }

      // 🔒 Clear httpOnly cookie
      authService.clearAuthCookie(res, req);
      logger.info({ event: 'logout_success', ip: req.ip });

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error: any) {
      logger.error({ event: 'logout_error', message: error?.message });
      res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }
  }

  /**
   * Refresh access session using refresh token cookie
   * POST /api/auth/refresh
   */
  async refresh(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies?.refresh_token;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is required',
        });
      }

      const result = await authService.refreshSession(refreshToken);
      authService.setAuthCookie(res, result.token, req);
      authService.setRefreshCookie(res, result.refreshToken, req);
      authService.setCsrfCookie(res, result.csrfToken, req);
      logger.info({ event: 'refresh_token_used', userId: result.user.id, ip: req.ip });

      return res.json({
        success: true,
        message: 'Session refreshed',
        data: {
          user: result.user,
          csrfToken: result.csrfToken,
        },
      });
    } catch (error: any) {
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) {
        await authService.revokeRefreshToken(refreshToken);
      }
      authService.clearAuthCookie(res, req);
      logger.warn({ event: 'refresh_failed', ip: req.ip, message: error?.message });
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }
  }

  /**
   * Rotate CSRF token for authenticated cookie sessions
   * GET /api/auth/csrf
   */
  async getCsrfToken(req: Request, res: Response) {
    const hasSession = Boolean(req.cookies?.auth_token || req.cookies?.refresh_token);

    if (!hasSession) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const csrfToken = authService.rotateCsrfToken(res, req);
    return res.json({
      success: true,
      data: { csrfToken },
    });
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
      const csrfToken = authService.rotateCsrfToken(res, req);

      res.json({
        success: true,
        data: {
          user,
          csrfToken,
        },
      });
    } catch (error: any) {
      logger.error('Get profile error:', error);
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
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
      });
    }
  }

  /**
   * Request password reset
   * ✅ NEW: Forgot password functionality
   */
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      // Always return success to prevent email enumeration
      await authService.forgotPassword(email);

      res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    } catch (error: any) {
      logger.error('Forgot password error:', error);
      // Always return success for security (prevent email enumeration)
      res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    }
  }

  /**
   * Verify reset token validity
   * ✅ NEW: Check if token is valid before showing reset form
   */
  async verifyResetToken(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required',
        });
      }

      const isValid = await authService.verifyResetToken(token);

      res.json({
        success: true,
        valid: isValid,
      });
    } catch (error: any) {
      logger.error('Verify reset token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify token',
      });
    }
  }

  /**
   * Reset password with token
   * ✅ NEW: Reset password functionality
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password are required',
        });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
        });
      }

      await authService.resetPassword(token, password);

      res.json({
        success: true,
        message: 'Password reset successful. You can now log in with your new password.',
      });
    } catch (error: any) {
      logger.error('Reset password error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Invalid or expired reset token',
      });
    }
  }
}

export const authController = new AuthController();
