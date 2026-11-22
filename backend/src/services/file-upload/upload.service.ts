import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { constants as fsConstants } from 'fs';
import { mkdir, open, readFile, realpath, writeFile, unlink } from 'fs/promises';
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
  // Review artifacts never receive a CDN/public URL. Local bytes live outside
  // the generic /files upload root; S3 bytes require private bucket policy.
  async writePrivateReview(buffer: Buffer, designId: string): Promise<string> {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(designId)) throw new ValidationError('Invalid review design');
    if (buffer.length > 10 * 1024 * 1024) throw new ValidationError('Review PDF exceeds 10MB');
    const key = `private-artwork-reviews/${designId}/${randomUUID()}.pdf`;
    if (isS3Configured()) {
      await s3Client.send(new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, Body: buffer, ContentType: 'application/pdf', ACL: 'private' }));
    } else {
      const dest = path.join(LOCAL_UPLOAD_DIR, '..', key);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, buffer, { flag: 'wx', mode: 0o600 });
    }
    return key;
  }

  async readPrivateReview(key: string): Promise<Buffer> {
    if (!/^private-artwork-reviews\/[a-zA-Z0-9_-]{1,100}\/[a-f0-9-]{36}\.pdf$/.test(key)) throw new ValidationError('Invalid review storage key');
    if (!isS3Configured()) return readFile(path.join(LOCAL_UPLOAD_DIR, '..', key));
    const result = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    if (!result.Body || (result.ContentLength ?? 0) > 10 * 1024 * 1024) throw new ValidationError('Review PDF unavailable');
    const bytes = await result.Body.transformToByteArray();
    if (bytes.length > 10 * 1024 * 1024) throw new ValidationError('Review PDF exceeds 10MB');
    return Buffer.from(bytes);
  }

  async deletePrivateReview(key: string): Promise<void> {
    if (!/^private-artwork-reviews\/[a-zA-Z0-9_-]{1,100}\/[a-f0-9-]{36}\.pdf$/.test(key)) throw new ValidationError('Invalid review storage key');
    if (isS3Configured()) await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    else await unlink(path.join(LOCAL_UPLOAD_DIR, '..', key));
  }
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
    fileKey: string,
    options: { maxBytes?: number } = {}
  ): Promise<{ buffer: Buffer; extension: string } | null> {
    try {
      // Containment: resolve symlinks on both sides before opening.
      // Threat boundary: this stops client-supplied keys (traversal, links
      // that already exist). It does not defend against a second local writer
      // swapping path components between this check and the open; the upload
      // directory is only written by this service, so that is out of scope.
      const safeRoot = await realpath(LOCAL_UPLOAD_DIR);
      const dest = await realpath(path.resolve(safeRoot, fileKey));
      if (!dest.startsWith(safeRoot + path.sep)) {
        return null;
      }
      const extension = path.extname(dest).replace('.', '');
      if (options.maxBytes === undefined) {
        return { buffer: await readFile(dest), extension };
      }
      // Bounded read from one descriptor: the cap is enforced on the bytes
      // actually read, so a file that grows after the check still cannot
      // exceed it. O_NOFOLLOW refuses a final-component symlink at open.
      const fh = await open(dest, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
      try {
        const info = await fh.stat();
        if (!info.isFile() || info.size > options.maxBytes) return null;
        const chunks: Buffer[] = [];
        let total = 0;
        for (;;) {
          const chunk = Buffer.allocUnsafe(Math.min(1024 * 1024, options.maxBytes + 1 - total));
          const { bytesRead } = await fh.read(chunk, 0, chunk.length, null);
          if (bytesRead === 0) break;
          total += bytesRead;
          if (total > options.maxBytes) return null;
          chunks.push(chunk.subarray(0, bytesRead));
        }
        return { buffer: Buffer.concat(chunks, total), extension };
      } finally {
        await fh.close();
      }
    } catch {
      return null;
    }
  }
}

export const fileUploadService = new FileUploadService();
