import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../config/s3";
import environment from "../config/environment";
import { Request, Response, NextFunction } from "express";

import { logger } from '../utils/logger';

/**
 * Multer configuration for uploading custom product photos to AWS S3
 * - Accepts image files: .jpg, .jpeg, .png, .webp
 * - Max file size: 10MB per file
 * - Max files: 1 file per upload
 * - Auto-generates unique filenames with timestamp
 * - Uploads to: s3://bucket-name/custom-photos/timestamp-filename.jpg
 */
export const uploadCustomPhoto = multer({
  storage: multerS3({
    s3,
    bucket: environment.AWS_S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (_, file, cb) => {
      logger.info(`📤 Starting S3 upload for custom photo: ${file.originalname}`);
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        fileType: 'custom-photo',
      });
    },
    key: (_, file, cb) => {
      // Generate unique filename: custom-photos/1707480000000-photo.jpg
      const timestamp = Date.now();
      const extension = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `custom-photos/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
      logger.info(`🔑 S3 key: ${fileName}`);
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 1, // Only 1 photo per upload
  },
  fileFilter: (_, file, cb) => {
    if (file.fieldname !== 'photo') {
      cb(new Error('Invalid upload field name'));
      return;
    }

    // Accept image files only
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileNameParts = file.originalname.toLowerCase().split('.');
    const fileExtension = '.' + (fileNameParts.pop() || '');
    const secondLastExtension = fileNameParts.length > 1 ? `.${fileNameParts[fileNameParts.length - 1]}` : '';
    const dangerousExtensions = ['.php', '.js', '.ts', '.py', '.rb', '.sh', '.exe', '.bat', '.cmd'];

    if (dangerousExtensions.includes(secondLastExtension)) {
      logger.info(`❌ Suspicious double extension rejected: ${file.originalname}`);
      cb(new Error('Suspicious filename rejected'));
      return;
    }

    const extensionAllowed = allowedExtensions.includes(fileExtension);
    const mimeAllowed = allowedMimes.includes(file.mimetype);
    
    if (extensionAllowed && mimeAllowed) {
      logger.info(`✅ Image file validated: ${file.originalname} (${file.mimetype})`);
      cb(null, true);
    } else {
      logger.info(`❌ Invalid file type rejected: ${file.originalname} (${file.mimetype})`);
      cb(new Error('Only image files (.jpg, .jpeg, .png, .webp) are allowed'));
    }
  },
});

/**
 * Error handler for multer/S3 upload errors
 */
export const handlePhotoUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    logger.error('❌ Photo upload middleware error:', err);
    logger.error('Error details:', {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
    });

    // Multer errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `File upload error: ${err.message}`,
      });
    }

    // S3/AWS errors
    if (err.name === 'SignatureDoesNotMatch' || err.message?.includes('signature')) {
      logger.error('🔐 AWS S3 Authentication Error - Check credentials and region');
      return res.status(500).json({
        success: false,
        message: 'Storage service authentication error. Please contact support.',
      });
    }

    // Custom errors (e.g., from fileFilter)
    if (err.message.includes('Only image files')) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message: 'Photo upload failed. Please try again.',
    });
  }

  next();
};
