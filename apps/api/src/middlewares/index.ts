import { Request, Response, NextFunction } from 'express';

// Example middleware
export const exampleMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add your middleware logic here
  next();
};

// Export auth middleware
export { authMiddleware, authMiddleware as authenticate, adminMiddleware, AuthRequest } from './auth.middleware';
export { upload } from './upload.middleware';
