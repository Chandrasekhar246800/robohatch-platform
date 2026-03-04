import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';

export class CustomPhotoController {
  /**
   * Upload a custom photo for personalized products
   * Used for products like:
   * - Custom name keychains (logo upload)
   * - Photo lamps
   * - Self miniatures
   */
  async uploadPhoto(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - Please login to upload photos',
        });
      }

      // File is uploaded via multer middleware to S3
      const file = (req as any).file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No photo file provided',
        });
      }

      // Get S3 URL from multer-s3
      const photoUrl = file.location; // S3 URL
      const photoKey = file.key; // S3 key

      console.log(`✅ Photo uploaded successfully for user ${userId}:`, {
        url: photoUrl,
        key: photoKey,
        size: file.size,
        mimetype: file.mimetype,
      });

      return res.status(201).json({
        success: true,
        message: 'Photo uploaded successfully',
        data: {
          url: photoUrl,
          key: photoKey,
          size: file.size,
          mimetype: file.mimetype,
        },
      });
    } catch (error: any) {
      console.error('❌ Photo upload error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload photo',
        message: error.message,
      });
    }
  }
}
