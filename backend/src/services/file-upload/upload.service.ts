import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { ValidationError } from '../../utils/errors';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'packagepro-files';
const CDN_URL = process.env.CDN_URL || '';

export interface UploadResult {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export class FileUploadService {
  /**
   * Generate presigned URL for direct upload from client
   */
  async generatePresignedUploadUrl(
    fileName: string,
    mimeType: string,
    maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
  ): Promise<{ uploadUrl: string; fileId: string; fileUrl: string }> {
    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'application/pdf',
      'application/postscript',
      'application/illustrator',
    ];

    if (!allowedTypes.includes(mimeType)) {
      throw new ValidationError(
        `File type ${mimeType} not allowed. Allowed types: ${allowedTypes.join(', ')}`
      );
    }

    // Validate file size
    if (maxSizeBytes > 50 * 1024 * 1024) {
      throw new ValidationError('File size cannot exceed 50MB');
    }

    const fileId = randomUUID();
    const extension = fileName.split('.').pop() || '';
    const key = `uploads/${fileId}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: mimeType,
      ContentLength: maxSizeBytes,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    const fileUrl = CDN_URL
      ? `${CDN_URL}/${key}`
      : `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

    return {
      uploadUrl,
      fileId,
      fileUrl,
    };
  }

  /**
   * Upload file buffer to S3
   */
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = 'uploads'
  ): Promise<UploadResult> {
    const fileId = randomUUID();
    const extension = fileName.split('.').pop() || '';
    const key = `${folder}/${fileId}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    const fileUrl = CDN_URL
      ? `${CDN_URL}/${key}`
      : `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

    return {
      fileId,
      fileName,
      fileUrl,
      fileSize: buffer.length,
      mimeType,
    };
  }

  /**
   * Generate presigned URL for file download
   */
  async generatePresignedDownloadUrl(
    fileKey: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Get public URL for file
   */
  getPublicUrl(fileKey: string): string {
    if (CDN_URL) {
      return `${CDN_URL}/${fileKey}`;
    }
    return `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;
  }
}

export const fileUploadService = new FileUploadService();
