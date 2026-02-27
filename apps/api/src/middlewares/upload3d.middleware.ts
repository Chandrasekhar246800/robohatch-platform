import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../config/s3";
import environment from "../config/environment";

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
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 1, // Only 1 3D file per upload
  },
  fileFilter: (_, file, cb) => {
    // Accept 3D files only
    const allowedMimes = [
      'application/octet-stream', // .stl, .3mf, .obj, .gcode
      'model/stl',
      'model/obj',
      'application/sla', // STL
      'text/plain', // Some .gcode files
    ];
    
    const allowedExtensions = ['.stl', '.3mf', '.obj', '.gcode'];
    const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only 3D files (.stl, .3mf, .obj, .gcode) are allowed'));
    }
  },
});
