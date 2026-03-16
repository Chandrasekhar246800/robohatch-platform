import { GetObjectCommand } from '@aws-sdk/client-s3';
import { fileTypeFromBuffer } from 'file-type';
import { s3 } from '../config/s3';
import environment from '../config/environment';
import { Readable } from 'stream';

export interface SignatureValidationResult {
  valid: boolean;
  reason?: string;
}

const getS3KeyFromUrlOrKey = (value: string): string => {
  if (!value) return '';

  if (value.includes('amazonaws.com')) {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.replace(/^\//, ''));
  }

  return value.replace(/^\//, '');
};

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const readFirstBytesFromS3 = async (value: string, bytes = 4096): Promise<Buffer> => {
  const key = getS3KeyFromUrlOrKey(value);
  const command = new GetObjectCommand({
    Bucket: environment.AWS_S3_BUCKET,
    Key: key,
    Range: `bytes=0-${bytes - 1}`,
  });

  const response = await s3.send(command);
  const body = response.Body as Readable;
  return streamToBuffer(body);
};

export const validateImageSignatureFromS3 = async (
  value: string
): Promise<SignatureValidationResult> => {
  const header = await readFirstBytesFromS3(value);
  const detected = await fileTypeFromBuffer(header);
  const allowed = new Set(['jpg', 'jpeg', 'png', 'webp']);

  if (!detected || !allowed.has(detected.ext)) {
    return { valid: false, reason: 'Invalid image signature' };
  }

  return { valid: true };
};

export const validate3DFileSignatureFromS3 = async (
  value: string,
  originalName: string
): Promise<SignatureValidationResult> => {
  const extension = originalName.toLowerCase().split('.').pop() || '';
  const header = await readFirstBytesFromS3(value);
  const detected = await fileTypeFromBuffer(header);
  const headerText = header.toString('utf8').trim().toLowerCase();

  if (extension === '3mf') {
    // 3MF is a ZIP-based container format.
    const zipMagic = header.length >= 4 && header[0] === 0x50 && header[1] === 0x4b;
    if (!zipMagic && detected?.ext !== 'zip') {
      return { valid: false, reason: 'Invalid 3MF signature' };
    }
    return { valid: true };
  }

  if (extension === 'stl') {
    const looksAsciiStl = headerText.startsWith('solid') && headerText.includes('facet');
    const looksBinaryStl = header.length >= 84;
    if (!looksAsciiStl && !looksBinaryStl) {
      return { valid: false, reason: 'Invalid STL signature' };
    }
    return { valid: true };
  }

  if (extension === 'obj') {
    const looksObj = /^(v|vn|vt|f|o|g|usemtl|mtllib)\s/m.test(headerText);
    if (!looksObj) {
      return { valid: false, reason: 'Invalid OBJ signature' };
    }
    return { valid: true };
  }

  if (extension === 'gcode') {
    const looksGcode = /(^|\n)(g\d+|m\d+|;)/i.test(headerText);
    if (!looksGcode) {
      return { valid: false, reason: 'Invalid GCODE signature' };
    }
    return { valid: true };
  }

  return { valid: false, reason: 'Unsupported 3D file type' };
};
