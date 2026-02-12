import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { Response } from 'express';

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
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password with configurable rounds (default: 12 for 2026 standards)
    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
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
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: input.email },
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
      sameSite: 'lax', // ✅ CSRF protection + Razorpay redirect compatibility
      maxAge: maxAge,
      path: '/',
    });

    console.log(`✅ Auth cookie set (httpOnly: true, secure: ${isProduction})`);
  }

  /**
   * Clear authentication cookie (logout)
   */
  clearAuthCookie(res: Response): void {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
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
}

export const authService = new AuthService();
