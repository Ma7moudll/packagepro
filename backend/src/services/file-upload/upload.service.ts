import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
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

// When S3 credentials are absent — or still template placeholders (local dev,
// CI) — uploads are written to disk under LOCAL_UPLOAD_DIR and served back
// through GET /api/files/<key>.
const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), '.data/uploads');
const isPlaceholder = (value?: string) =>
  !value || /^(your|change[-_]?me|<|example)/i.test(value.trim());
export function isS3Configured(): boolean {
  return (
    !isPlaceholder(process.env.S3_ACCESS_KEY_ID) &&
    !isPlaceholder(process.env.S3_SECRET_ACCESS_KEY)
  );
}

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
   * Upload file buffer to S3 (or local disk when S3 is not configured)
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

    if (!isS3Configured()) {
      const dest = path.join(LOCAL_UPLOAD_DIR, key);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, buffer);
      return {
        fileId,
        fileName,
        fileUrl: `/api/files/${key}`,
        fileSize: buffer.length,
        mimeType,
      };
    }

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
    if (!isS3Configured()) {
      return `/api/files/${fileKey}`;
    }
    if (CDN_URL) {
      return `${CDN_URL}/${fileKey}`;
    }
    return `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;
  }

  /**
   * Read a previously uploaded file from local disk (local-storage mode).
   * Returns null when the file does not exist or the key escapes the
   * upload root (path traversal guard).
   */
  async readLocalFile(
    fileKey: string
  ): Promise<{ buffer: Buffer; extension: string } | null> {
    const safeRoot = path.resolve(LOCAL_UPLOAD_DIR);
    const dest = path.resolve(safeRoot, fileKey);
    if (!dest.startsWith(safeRoot + path.sep)) {
      return null;
    }
    try {
      const buffer = await readFile(dest);
      return { buffer, extension: path.extname(dest).replace('.', '') };
    } catch {
      return null;
    }
  }
}

export const fileUploadService = new FileUploadService();
