import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../config/s3";
import environment from "../config/environment";
import { Request, Response, NextFunction } from "express";

import { logger } from '../utils/logger';

/**
 * Multer configuration for uploading 3D files to AWS S3
 * - Accepts 3D files: .stl, .3mf, .obj, .gcode
 * - Max file size: 50MB per file
 * - Max files: 1 file per upload
 * - Auto-generates unique filenames with timestamp
 * - Uploads to: s3://bucket-name/3d-designs/timestamp-filename.stl
 */
export const upload3d = multer({
  storage: multerS3({
    s3,
    bucket: environment.AWS_S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (_, file, cb) => {
      logger.info(`📤 Starting S3 upload for: ${file.originalname}`);
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        fileType: 'custom-3d-design',
      });
    },
    key: (_, file, cb) => {
      // Generate unique filename: 3d-designs/1707480000000-custom-model.stl
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-');
      const fileName = `3d-designs/${timestamp}-${sanitizedName}`;
      logger.info(`🔑 S3 key: ${fileName}`);
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 1, // Only 1 3D file per upload
  },
  fileFilter: (_, file, cb) => {
    if (file.fieldname !== 'file') {
      cb(new Error('Invalid upload field name'));
      return;
    }

    // Accept 3D files only
    const allowedMimes = [
      'model/stl',
      'model/obj',
      'application/sla', // STL
      'application/vnd.ms-package.3dmanufacturing-3dmodel+xml', // 3MF
      'text/plain', // Some .gcode files
      'application/octet-stream', // fallback for many 3D exporters
    ];
    
    const allowedExtensions = ['.stl', '.3mf', '.obj', '.gcode'];
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
      logger.info(`✅ File type validated: ${file.originalname} (${file.mimetype})`);
      cb(null, true);
    } else {
      logger.info(`❌ Invalid file type rejected: ${file.originalname} (${file.mimetype})`);
      cb(new Error('Only 3D files (.stl, .3mf, .obj, .gcode) are allowed'));
    }
  },
});

/**
 * Error handler for multer/S3 upload errors
 */
export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    logger.error('❌ Upload middleware error:', err);
    logger.error('Error details:', {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
    });

    // Multer errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 50MB.',
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

    // Custom errors from fileFilter
    if (err.message?.includes('Only 3D files')) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Generic upload error
    return res.status(500).json({
      success: false,
      message: 'File upload failed. Please try again.',
    });
  }
  next();
};
