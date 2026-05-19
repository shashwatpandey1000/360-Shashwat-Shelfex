import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = process.env.AWS_S3_REGION ?? 'us-west-2';
const BUCKET = process.env.AWS_S3_BUCKET ?? '';

// Lazy singleton — created only when the function is first called.
// This avoids crashing at startup if AWS env vars are absent in dev without S3.
let _client: S3Client | null = null;
function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
  }
  return _client;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  expiresIn: number;
  isMock: false;
}

/**
 * Generates a real S3 presigned PUT URL.
 * Expires in 1 hour (3600 seconds).
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<PresignedUrlResult> {
  const client = getClient();

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  const fileUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl, key, expiresIn: 3600, isMock: false };
}
