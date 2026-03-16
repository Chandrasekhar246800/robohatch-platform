import { S3Client } from "@aws-sdk/client-s3";
import environment from "./environment";

// Initialize S3 Client with credentials from centralized environment config
import { logger } from '../utils/logger';

export const s3 = new S3Client({
  region: environment.AWS_REGION,
  credentials: {
    accessKeyId: environment.AWS_ACCESS_KEY_ID,
    secretAccessKey: environment.AWS_SECRET_ACCESS_KEY,
  },
});

// Log S3 configuration (without exposing secrets)
logger.info('✓ S3 Client initialized');
logger.info(`  Region: ${environment.AWS_REGION}`);
logger.info(`  Bucket: ${environment.AWS_S3_BUCKET}`);
logger.info('  S3 uploads ready - credentials will be verified on first upload');
