import { NextFunction, Request, Response } from 'express';

const CSRF_EXEMPT_PATH_PREFIXES = ['/api/webhook'];
const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-reset-token',
  '/api/auth/refresh',
]);

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    return next();
  }

  if (CSRF_EXEMPT_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  if (CSRF_EXEMPT_PATHS.has(req.path)) {
    return next();
  }

  const hasSessionCookie = Boolean(req.cookies?.auth_token || req.cookies?.refresh_token);
  if (!hasSessionCookie) {
    return next();
  }

  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || typeof headerToken !== 'string' || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
    });
  }

  return next();
};
