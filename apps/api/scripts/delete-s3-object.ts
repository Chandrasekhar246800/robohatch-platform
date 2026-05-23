import 'dotenv/config';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const objectUrl = process.argv[2];
if (!objectUrl) {
  console.error('Usage: tsx scripts/delete-s3-object.ts "https://..."');
  process.exit(1);
}

async function parseS3Url(url: string) {
  const u = new URL(url);
  const hostParts = u.hostname.split('.');

  if (hostParts[0] && hostParts[1] === 's3') {
    const bucket = hostParts[0];
    const key = u.pathname.replace(/^\//, '');
    if (bucket && key) return { bucket, key };
  }

  if (u.hostname.includes('s3') && u.pathname.startsWith('/')) {
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const bucket = parts[0];
      const key = parts.slice(1).join('/');
      return { bucket, key };
    }
  }

  if (hostParts.length > 0 && !hostParts[0].startsWith('s3')) {
    const bucket = hostParts[0];
    const key = u.pathname.slice(1);
    if (bucket && key) return { bucket, key };
  }

  return null;
}

(async () => {
  const parsed = await parseS3Url(objectUrl);
  if (!parsed) {
    console.error('Could not parse S3 URL:', objectUrl);
    process.exit(1);
  }

  const client = new S3Client({ region: process.env.AWS_REGION });
  await client.send(
    new DeleteObjectCommand({
      Bucket: parsed.bucket,
      Key: parsed.key,
    })
  );

  console.log('Deleted S3 object:', `${parsed.bucket}/${parsed.key}`);
  process.exit(0);
})();
