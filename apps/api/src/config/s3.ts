import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import environment from "./environment";

// Initialize S3 Client with credentials from centralized environment config
export const s3 = new S3Client({
  region: environment.AWS_REGION,
  credentials: {
    accessKeyId: environment.AWS_ACCESS_KEY_ID,
    secretAccessKey: environment.AWS_SECRET_ACCESS_KEY,
  },
});

// Log S3 configuration (without exposing secrets)
console.log('✓ S3 Client initialized');
console.log(`  Region: ${environment.AWS_REGION}`);
console.log(`  Bucket: ${environment.AWS_S3_BUCKET}`);

// Verify S3 credentials on startup (non-blocking)
(async () => {
  try {
    console.log('🔍 Verifying S3 credentials...');
    const command = new HeadBucketCommand({ Bucket: environment.AWS_S3_BUCKET });
    await s3.send(command);
    console.log('✅ S3 credentials verified - bucket accessible');
  } catch (error: any) {
    console.error('❌ S3 CREDENTIALS ERROR:', error.message || error.name || 'Unknown');
    console.error('   Error details:', {
      name: error.name,
      code: error.$metadata?.httpStatusCode,
      message: error.message,
      region: environment.AWS_REGION,
      bucket: environment.AWS_S3_BUCKET,
    });
    
    if (error.name === 'SignatureDoesNotMatch') {
      console.error('   🔐 AWS credentials are invalid or expired');
      console.error('   ↪️  Update AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    } else if (error.name === 'NoSuchBucket') {
      console.error(`   🪣 Bucket "${environment.AWS_S3_BUCKET}" does not exist`);
    } else if (error.name === 'InvalidAccessKeyId') {
      console.error('   🔑 AWS Access Key ID is invalid');
    } else if (error.name === 'AccessDenied') {
      console.error('   🚫 Access denied - check IAM permissions');
    } else {
      console.error('   ⚠️  Check AWS credentials and bucket permissions');
      console.error('   📝 Full error:', JSON.stringify(error, null, 2));
    }
  }
})();
