import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { s3 } from '../config/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { validateImageSignatureFromS3 } from '../utils/fileSignature';
import { getSignedS3UrlFromUrlOrKey } from '../utils/s3SignedUrl';

import { logger } from '../utils/logger';

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

      const signatureResult = await validateImageSignatureFromS3(photoKey || photoUrl);
      if (!signatureResult.valid) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: env.awsS3Bucket,
            Key: photoKey,
          })
        );

        return res.status(400).json({
          success: false,
          error: signatureResult.reason || 'Invalid image file',
        });
      }

      const signedPhotoUrl = await getSignedS3UrlFromUrlOrKey(photoKey || photoUrl, 3600);

      logger.info({
        event: 'custom_photo_upload_success',
        userId,
        url: photoUrl,
        key: photoKey,
        size: file.size,
        mimetype: file.mimetype,
      });

      return res.status(201).json({
        success: true,
        message: 'Photo uploaded successfully',
        data: {
          url: signedPhotoUrl,
          key: photoKey,
          size: file.size,
          mimetype: file.mimetype,
        },
      });
    } catch (error: any) {
      logger.error({ event: 'custom_photo_upload_error', message: error?.message });
      return res.status(500).json({
        success: false,
        error: 'Failed to upload photo',
      });
    }
  }
}
