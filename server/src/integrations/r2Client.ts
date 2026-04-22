import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

export const s3 = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
}

export function getPublicUrl(key: string): string {
  return `${env.R2_PUBLIC_URL}/${key}`;
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key });
  const response = await s3.send(command);
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
