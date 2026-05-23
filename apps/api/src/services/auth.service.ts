import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { Response } from 'express';
import { emailService } from './email.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { Request } from 'express';

const JWT_SECRET = env.jwtSecret;
const JWT_EXPIRES_IN = env.jwtExpiresIn;
const JWT_REFRESH_SECRET = env.jwtRefreshSecret;
const JWT_REFRESH_EXPIRES_IN = env.jwtRefreshExpiresIn;
const BCRYPT_ROUNDS = env.bcryptRounds;

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

const normalizeCookieDomain = (hostname: string): string | undefined => {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, '');

  if (!normalizedHostname || normalizedHostname === 'localhost' || normalizedHostname.endsWith('.localhost')) {
    return undefined;
  }

  return normalizedHostname.startsWith('www.')
    ? `.${normalizedHostname.slice(4)}`
    : `.${normalizedHostname}`;
};

const getCookieDomain = (req?: Request): string | undefined => {
  if (!env.isProduction) {
    return 'localhost';
  }

  // In production, prefer host-only cookies so the browser binds the session
  // to the actual public site origin served through the Vercel proxy.
  // Only use an explicit COOKIE_DOMAIN override when it is intentionally set.
  const configuredDomain = env.cookieDomain?.trim();
  if (configuredDomain) {
    return configuredDomain.startsWith('.') ? configuredDomain : `.${configuredDomain}`;
  }

  if (req) {
    const origin = req.headers.origin || req.headers.referer;
    if (typeof origin === 'string' && origin.length > 0) {
      try {
        return normalizeCookieDomain(new URL(origin).hostname);
      } catch {
        // Fall through to forwarded host and configured domain.
      }
    }

    const forwardedHost = req.headers['x-forwarded-host'];
    if (typeof forwardedHost === 'string' && forwardedHost.length > 0) {
      return normalizeCookieDomain(forwardedHost.split(',')[0].trim());
    }
  }

  const configuredDomain = env.cookieDomain?.trim();
  if (configuredDomain) {
    return configuredDomain.startsWith('.') ? configuredDomain : `.${configuredDomain}`;
  }

  try {
    const hostname = new URL(env.frontendUrl).hostname.toLowerCase();


  return undefined;

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

logger.info('✅ Authentication service configured');
logger.info(`🔐 Bcrypt rounds: ${BCRYPT_ROUNDS}`);

class RefreshTokenReuseError extends Error {
  constructor(message = 'Invalid or revoked refresh token') {
    super(message);
    this.name = 'RefreshTokenReuseError';
  }
}

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

  private async createRotatedRefreshToken(
    tx: typeof prisma,
    userId: string,
    email: string,
    role: string
  ): Promise<string> {
    const rotatedRefreshToken = this.generateRefreshToken(userId, email, role);
    const rotatedRefreshHash = hashToken(rotatedRefreshToken);

    await tx.refreshToken.create({
      data: {
        userId,
        tokenHash: rotatedRefreshHash,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return rotatedRefreshToken;
  }

  /**
   * Set authentication cookie in response
   * 🔒 SECURITY: httpOnly + secure + sameSite protection
   */
  setAuthCookie(res: Response, token: string, req?: Request): void {
    const isProduction = env.isProduction;
    const maxAge = 15 * 60 * 1000; // 15 minutes
    const cookieDomain = getCookieDomain(req);

    res.cookie('auth_token', token, {
      httpOnly: true, // ✅ Prevents JavaScript access (XSS protection)
      secure: isProduction, // ✅ HTTPS only in production
      sameSite: isProduction ? 'none' : 'lax', // ✅ 'none' for cross-domain in prod, 'lax' for localhost
      maxAge: maxAge,
      path: '/',
      domain: cookieDomain, // ✅ Share cookie across the app domain in production
    });

    logger.info(`✅ Auth cookie set (httpOnly: true, secure: ${isProduction}, sameSite: ${isProduction ? 'none' : 'lax'}, domain: ${cookieDomain ?? 'host-only'})`);
  }

  setRefreshCookie(res: Response, refreshToken: string, req?: Request): void {
    const isProduction = env.isProduction;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cookieDomain = getCookieDomain(req);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge,
      path: '/api/auth/refresh',
      domain: cookieDomain,
    });
  }

  setCsrfCookie(res: Response, csrfToken: string, req?: Request): void {
    const isProduction = env.isProduction;
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const cookieDomain = getCookieDomain(req);

    // The CSRF cookie stays httpOnly so browser JavaScript cannot read it.
    // The frontend receives the same token in the JSON response and keeps it in memory only.
    res.cookie('csrf_token', csrfToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge,
      path: '/',
      domain: cookieDomain,
    });
  }

  rotateCsrfToken(res: Response, req?: Request): string {
    const csrfToken = this.generateCSRFToken();
    this.setCsrfCookie(res, csrfToken, req);
    return csrfToken;
  }

  /**
   * Clear authentication cookie (logout)
   */
  clearAuthCookie(res: Response, req?: Request): void {
    const isProduction = env.isProduction;
    const cookieDomain = getCookieDomain(req);
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // ✅ Must match cookie settings
      path: '/',
      domain: cookieDomain, // ✅ Must match the domain used when setting
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/api/auth/refresh',
      domain: cookieDomain,
    });

    res.clearCookie('csrf_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      domain: cookieDomain,
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

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Atomic consume: exactly one concurrent request can flip revokedAt from null to now.
        // Any loser sees count = 0 and must fail, which closes the replay window.
        const consumed = await tx.refreshToken.updateMany({
          where: {
            tokenHash,
            userId: decoded.userId,
            revokedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
          data: {
            revokedAt: new Date(),
            lastUsedAt: new Date(),
          },
        });

        if (consumed.count !== 1) {
          throw new RefreshTokenReuseError();
        }

        const user = await tx.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) {
          throw new Error('User not found');
        }

        const token = this.generateToken(user.id, user.email, user.role);
        const rotatedRefreshToken = await this.createRotatedRefreshToken(tx as typeof prisma, user.id, user.email, user.role);
        const csrfToken = this.generateCSRFToken();

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
      });

      logger.info({
        event: 'refresh_token_rotated',
        userId: decoded.userId,
      });

      return result;
    } catch (error: any) {
      if (error instanceof RefreshTokenReuseError) {
        logger.warn({
          event: 'refresh_token_reuse_detected',
          userId: decoded.userId,
        });
      }

      throw error;
    }
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
