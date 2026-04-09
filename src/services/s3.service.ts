import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  // AWS SDK v3 (>=3.729) injects x-amz-checksum-crc32 into presigned PUT URLs
  // by default. Browsers can't produce that header, so the signature fails
  // before S3 even looks at the payload. Keep checksums opt-in so browser
  // uploads via PUT just work.
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const BUCKET = process.env.S3_BUCKET || 'blendedagents-uploads';

export const S3Service = {
  async getUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(s3, command, { expiresIn });
  },

  async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    return getSignedUrl(s3, command, { expiresIn });
  },

  generateKey(type: 'screenshot' | 'recording' | 'annotation', testCaseId: string, suffix: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `${type}s/${date}/${testCaseId}/${suffix}`;
  },
};
