import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Request ID Middleware
 * ✅ Assigns unique ID to each request for audit logging
 * ✅ Helps trace requests across distributed systems
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Use client-provided ID if valid, otherwise generate new
  const clientRequestId = req.headers['x-request-id'];
  
  const requestId = 
    typeof clientRequestId === 'string' && clientRequestId.length <= 64
      ? clientRequestId
      : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
};
