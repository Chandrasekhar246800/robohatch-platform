import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { Response } from 'express';
import { emailService } from './email.service';

// =��� SECURITY: NO FALLBACK - Crash if JWT_SECRET missing
import { logger } from '../utils/logger';

if (!process.env.JWT_SECRET) {
  logger.error('🚨 CRITICAL: JWT_SECRET environment variable is not set!');
  logger.error('Server cannot start without JWT_SECRET');
  throw new Error('JWT_SECRET is required for authentication');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

const durationToMs = (value: string): number => {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d+)([smhd])$/);

  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
};

const REFRESH_TTL_MS = durationToMs(JWT_REFRESH_EXPIRES_IN);

logger.info('✅ JWT_SECRET loaded successfully');
logger.info(`🔐 Bcrypt rounds: ${BCRYPT_ROUNDS}`);

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  token: string;
  refreshToken: string;
  csrfToken: string;
}

export class AuthService {
  /**
   * Register new user with strong password hashing
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Normalize email to lowercase for case-insensitive lookup
    const normalizedEmail = input.email.toLowerCase();
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password with configurable rounds (default: 12 for 2026 standards)
    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    // Create user with normalized email
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: input.name,
      },
    });

    // Generate JWT tokens
    const token = this.generateToken(user.id, user.email, user.role);
    const refreshToken = await this.issueRefreshToken(user.id, user.email, user.role);
    const csrfToken = this.generateCSRFToken();

    logger.info('✅ User registered:', user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      refreshToken,
      csrfToken,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    // Normalize email to lowercase for case-insensitive lookup
    const normalizedEmail = input.email.toLowerCase();
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT tokens
    const token = this.generateToken(user.id, user.email, user.role);
    const refreshToken = await this.issueRefreshToken(user.id, user.email, user.role);
    const csrfToken = this.generateCSRFToken();

    logger.info('✅ User logged in:', user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      refreshToken,
      csrfToken,
    };
  }

  private generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate JWT token (centralized)
   * @private
   */
  private generateToken(userId: string, email: string, role: string): string {
    try {
      const token = jwt.sign(
        { userId, email, role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      );

      if (!token) {
        throw new Error('Token generation returned empty value');
      }

      return token;
    } catch (error) {
      logger.error('❌ Failed to generate JWT token:', error);
      throw new Error('Authentication failed: Could not generate token');
    }
  }

  private generateRefreshToken(userId: string, email: string, role: string): string {
    try {
      const token = jwt.sign(
        { userId, email, role, tokenType: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
      );

      if (!token) {
        throw new Error('Refresh token generation returned empty value');
      }

      return token;
    } catch (error) {
      logger.error('❌ Failed to generate refresh token:', error);
      throw new Error('Authentication failed: Could not generate refresh token');
    }
  }

  private async issueRefreshToken(userId: string, email: string, role: string): Promise<string> {
    const refreshToken = this.generateRefreshToken(userId, email, role);
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return refreshToken;
  }

  /**
   * Set authentication cookie in response
   * 🔒 SECURITY: httpOnly + secure + sameSite protection
   */
  setAuthCookie(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = 15 * 60 * 1000; // 15 minutes

    res.cookie('auth_token', token, {
      httpOnly: true, // ✅ Prevents JavaScript access (XSS protection)
      secure: isProduction, // ✅ HTTPS only in production
      sameSite: isProduction ? 'none' : 'lax', // ✅ 'none' for cross-domain in prod, 'lax' for localhost
      maxAge: maxAge,
      path: '/',
      domain: isProduction ? undefined : 'localhost', // ✅ Share cookie across localhost ports in dev
    });

    logger.info(`✅ Auth cookie set (httpOnly: true, secure: ${isProduction}, sameSite: ${isProduction ? 'none' : 'lax'}, domain: ${isProduction ? 'auto' : 'localhost'})`);
  }

  setRefreshCookie(res: Response, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge,
      path: '/api/auth/refresh',
      domain: isProduction ? undefined : 'localhost',
    });
  }

  setCsrfCookie(res: Response, csrfToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = 7 * 24 * 60 * 60 * 1000;

    res.cookie('csrf_token', csrfToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge,
      path: '/',
      domain: isProduction ? undefined : 'localhost',
    });
  }

  rotateCsrfToken(res: Response): string {
    const csrfToken = this.generateCSRFToken();
    this.setCsrfCookie(res, csrfToken);
    return csrfToken;
  }

  /**
   * Clear authentication cookie (logout)
   */
  clearAuthCookie(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // ✅ Must match cookie settings
      path: '/',
      domain: isProduction ? undefined : 'localhost', // ✅ Must match the domain used when setting
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/api/auth/refresh',
      domain: isProduction ? undefined : 'localhost',
    });

    res.clearCookie('csrf_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      domain: isProduction ? undefined : 'localhost',
    });

    logger.info('✅ Auth cookie cleared');
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async verifyRefreshToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
      if (decoded?.tokenType !== 'refresh') {
        throw new Error('Invalid refresh token type');
      }
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async refreshSession(refreshToken: string): Promise<AuthResponse> {
    const decoded = await this.verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const currentStored = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        userId: decoded.userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!currentStored) {
      throw new Error('Invalid or revoked refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const token = this.generateToken(user.id, user.email, user.role);
    const rotatedRefreshToken = this.generateRefreshToken(user.id, user.email, user.role);
    const rotatedRefreshHash = hashToken(rotatedRefreshToken);
    const csrfToken = this.generateCSRFToken();

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: currentStored.id },
        data: {
          revokedAt: new Date(),
          lastUsedAt: new Date(),
        },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: rotatedRefreshHash,
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        },
      }),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      refreshToken: rotatedRefreshToken,
      csrfToken,
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);

    await prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, data: { name?: string }) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      logger.info('✅ User profile updated:', user.id);

      return user;
    } catch (error) {
      logger.error('❌ Update profile error:', error);
      throw new Error('Failed to update profile');
    }
  }

  /**
   * Verify if a reset token is valid
   * ✅ SECURITY: Checks token validity without revealing email
   */
  async verifyResetToken(token: string): Promise<boolean> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    return !!resetToken;
  }

  /**
   * Initiate password reset process
   * ✅ SECURITY: Generates secure token and sends email
   */
  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't reveal if email exists - prevents email enumeration attack
      logger.info('⚠️  Password reset requested for non-existent account');
      return;
    }

    // Generate secure random token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token before storing (prevents token theft from database)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    });

    // Store hashed token
    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token: hashedToken,
        expiresAt,
      },
    });

    // Send email with unhashed token (only seen by user)
    await emailService.sendPasswordReset(normalizedEmail, resetToken);

    logger.info('✅ Password reset token generated');
  }

  /**
   * Reset password using token
   * ✅ SECURITY: Validates token, prevents reuse
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Hash the provided token to match database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token (not used, not expired)
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password and mark token as used (atomic transaction)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    logger.info(`✅ Password reset successful for: ${user.id}`);
  }
}

export const authService = new AuthService();
