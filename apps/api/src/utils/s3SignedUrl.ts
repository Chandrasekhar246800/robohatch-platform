import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from '../config/s3';
import environment from '../config/environment';

const getS3KeyFromUrlOrKey = (value: string): string => {
  if (!value) return '';

  if (value.includes('amazonaws.com')) {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.replace(/^\//, ''));
  }

  return value.replace(/^\//, '');
};

export const getSignedS3UrlFromUrlOrKey = async (
  value: string,
  expiresInSeconds = 3600
): Promise<string> => {
  if (!value) return value;

  const key = getS3KeyFromUrlOrKey(value);
  if (!key) return value;

  const command = new GetObjectCommand({
    Bucket: environment.AWS_S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
};
