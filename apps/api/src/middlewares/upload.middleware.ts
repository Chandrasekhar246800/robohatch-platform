import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../config/s3";
import environment from "../config/environment";

/**
 * Multer configuration for uploading images to AWS S3
 * - Accepts images only (jpg, jpeg, png, gif, webp)
 * - Max file size: 5MB per image
 * - Max files: 10 images per upload
 * - Auto-generates unique filenames with timestamp
 * - Uploads to: s3://bucket-name/products/timestamp-filename.jpg
 */
export const upload = multer({
  storage: multerS3({
    s3,
    bucket: environment.AWS_S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (_, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
      });
    },
    key: (_, file, cb) => {
      // Generate unique filename: products/1707480000000-product-image.jpg
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-');
      const fileName = `products/${timestamp}-${sanitizedName}`;
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 10, // Max 10 files per upload
  },
  fileFilter: (_, file, cb) => {
    // Accept images only
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  },
});
