import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { Response } from 'express';
import { emailService } from './email.service';

// 🔒 SECURITY: NO FALLBACK - Crash if JWT_SECRET missing
if (!process.env.JWT_SECRET) {
  console.error('🚨 CRITICAL: JWT_SECRET environment variable is not set!');
  console.error('Server cannot start without JWT_SECRET');
  throw new Error('JWT_SECRET is required for authentication');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

console.log('✅ JWT_SECRET loaded successfully');
console.log(`🔐 Bcrypt rounds: ${BCRYPT_ROUNDS}`);

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

    // Generate JWT token
    const token = this.generateToken(user.id, user.email, user.role);

    console.log('✅ User registered:', user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
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

    // Generate JWT token
    const token = this.generateToken(user.id, user.email, user.role);

    console.log('✅ User logged in:', user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
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
      console.error('❌ Failed to generate JWT token:', error);
      throw new Error('Authentication failed: Could not generate token');
    }
  }

  /**
   * Set authentication cookie in response
   * 🔒 SECURITY: httpOnly + secure + sameSite protection
   */
  setAuthCookie(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    res.cookie('auth_token', token, {
      httpOnly: true, // ✅ Prevents JavaScript access (XSS protection)
      secure: isProduction, // ✅ HTTPS only in production
      sameSite: isProduction ? 'none' : 'lax', // ✅ 'none' for cross-domain in prod, 'lax' for localhost
      maxAge: maxAge,
      path: '/',
      domain: isProduction ? undefined : 'localhost', // ✅ Share cookie across localhost ports in dev
    });

    console.log(`✅ Auth cookie set (httpOnly: true, secure: ${isProduction}, sameSite: ${isProduction ? 'none' : 'lax'}, domain: ${isProduction ? 'auto' : 'localhost'})`);
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

    console.log('✅ Auth cookie cleared');
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
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

      console.log('✅ User profile updated:', user.email);

      return user;
    } catch (error) {
      console.error('❌ Update profile error:', error);
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
      console.log(`⚠️  Password reset requested for non-existent email: ${normalizedEmail}`);
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

    console.log(`✅ Password reset token generated for: ${normalizedEmail}`);
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
    ]);

    console.log(`✅ Password reset successful for: ${user.email}`);
  }
}

export const authService = new AuthService();
