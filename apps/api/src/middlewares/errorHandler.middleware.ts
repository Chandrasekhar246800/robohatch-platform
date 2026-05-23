import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

import { logger } from '../utils/logger';

/**
 * Production Error Handler
 * ✅ NO STACK TRACES in production (information disclosure risk)
 * ✅ Sanitized error messages
 * ✅ Request ID for debugging
 * ✅ Security event logging
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.requestId || 'N/A';
  const isDevelopment = env.isDevelopment;

  // 🔒 AUDIT LOG: All errors logged with request ID
  logger.error('❌ Error:', {
    requestId,
    message: err.message,
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id || 'anonymous',
    timestamp: new Date().toISOString(),
    // Only log stack in development
    ...(isDevelopment && { stack: err.stack }),
  });

  // 🔒 SECURITY: Detect security-critical errors
  const securityKeywords = [
    'unauthorized',
    'forbidden',
    'signature',
    'token',
    'authentication',
    'authorization',
  ];

  const isSecurityRelated = securityKeywords.some((keyword) =>
    err.message?.toLowerCase().includes(keyword)
  );

  if (isSecurityRelated) {
    logger.error('🚨 SECURITY ALERT:', {
      requestId,
      message: err.message,
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userId: (req as any).user?.id || 'anonymous',
      timestamp: new Date().toISOString(),
    });
  }

  // Determine status code
  const statusCode = err.statusCode || 500;

  // 🔒 SANITIZE: Generic messages in production
  const sanitizedMessage = isDevelopment
    ? err.message
    : statusCode === 500
    ? 'Internal server error'
    : err.message || 'An error occurred';

  // Response
  res.status(statusCode).json({
    success: false,
    message: sanitizedMessage,
    requestId,
    // Only include stack in development
    ...(isDevelopment && { stack: err.stack }),
  });
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const requestId = req.requestId || 'N/A';

  logger.warn('⚠️ 404 Not Found:', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
  });

  res.status(404).json({
    success: false,
    message: 'Resource not found',
    requestId,
  });
};
