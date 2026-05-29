import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import { env } from '../config/env';

import { logger } from '../utils/logger';
import type { AuthRequest } from './auth.middleware';

/**
 * Helmet.js configuration for security headers
 * Protects against common web vulnerabilities
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', '*.amazonaws.com'],
      connectSrc: ["'self'", env.frontendUrl],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow AWS S3 images
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

/**
 * General API rate limiter
 * Limits requests to prevent abuse
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  statusCode: 429, // Explicitly set status code
  // Skip rate limiting for OPTIONS requests (CORS preflight)
  skip: (req: Request) => {
    return req.method === 'OPTIONS';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 1 minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const clientIp = req.ip ?? req.socket?.remoteAddress;
    const clientKey = email || (clientIp ? ipKeyGenerator(clientIp) : 'ip:unknown');

    return `auth:${req.path}:${clientKey}`;
  },
  skip: (req: Request) => req.method === 'OPTIONS', // Skip OPTIONS
  handler: (req: Request, res: Response) => {
    logger.warn(`⚠️  Rate limit exceeded for auth: ${req.method} ${req.path} from ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again after 1 minute.',
    });
  },
});

/**
 * Rate limiter for sensitive operations (orders, payments)
 */
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit to 10 requests per minute
  message: {
    success: false,
    message: 'Too many requests, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  skip: (req: Request) => req.method === 'OPTIONS', // Skip OPTIONS
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please slow down.',
    });
  },
});

/**
 * Rate limiter for webhook endpoint to reduce abuse and DB amplification.
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  skip: (req: Request) => req.method === 'OPTIONS',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Webhook rate limit exceeded',
    });
  },
});

const getClientRateLimitKey = (req: Request): string => {
  const authRequest = req as AuthRequest;
  const userId = authRequest.user?.userId;

  if (userId) {
    return `user:${userId}`;
  }

  const clientIp = req.ip ?? req.socket?.remoteAddress;

  if (!clientIp) {
    return 'ip:unknown';
  }

  return ipKeyGenerator(clientIp);
};

/**
 * Upload rate limiter (per user if authenticated, else per IP).
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  keyGenerator: getClientRateLimitKey,
  skip: (req: Request) => req.method === 'OPTIONS',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Upload rate limit exceeded. Try again in a minute.',
    });
  },
});

/**
 * Request logger middleware
 * Logs all incoming requests for monitoring
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`;
    
    if (res.statusCode >= 500) {
      logger.error(`❌ ${logMessage}`);
    } else if (res.statusCode >= 400) {
      logger.warn(`⚠️  ${logMessage}`);
    } else if (env.isDevelopment) {
      logger.info(`✓ ${logMessage}`);
    }
  });
  
  next();
};

/**
 * Security headers for production
 */
export const productionSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (env.isProduction) {
    // Strict Transport Security
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()'
    );
  }
  
  next();
};

/**
 * Error handler for rate limit errors
 */
export const rateLimitErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err && err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded. Please try again later.',
    });
  }
  next(err);
};
