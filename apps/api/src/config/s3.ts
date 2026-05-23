import { S3Client } from "@aws-sdk/client-s3";
import { env } from './env';

// Initialize S3 Client with credentials from centralized environment config
import { logger } from '../utils/logger';

export const s3 = new S3Client({
  region: env.awsRegion,
  credentials: {
    accessKeyId: env.awsAccessKeyId,
    secretAccessKey: env.awsSecretAccessKey,
  },
});

// Log S3 configuration (without exposing secrets)
logger.info('✓ S3 Client initialized');
logger.info(`  Region: ${env.awsRegion}`);
logger.info(`  Bucket: ${env.awsS3Bucket}`);
logger.info('  S3 uploads ready - credentials will be verified on first upload');
