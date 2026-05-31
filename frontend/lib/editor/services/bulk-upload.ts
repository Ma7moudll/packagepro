// Bulk Upload Service
// Handle multiple file uploads with progress tracking and error handling

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  url?: string;
  thumbnail?: string;
}

export interface BulkUploadOptions {
  maxFiles?: number;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
  autoStart?: boolean;
  chunkSize?: number; // for large files
}

export interface BulkUploadResult {
  successful: UploadFile[];
  failed: UploadFile[];
  totalSize: number;
  totalTime: number;
}

export class BulkUploadService {
  private static readonly DEFAULT_OPTIONS: BulkUploadOptions = {
    maxFiles: 20,
    maxFileSize: 50, // 50MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    autoStart: true,
    chunkSize: 1024 * 1024, // 1MB chunks
  };

  private uploads: Map<string, UploadFile> = new Map();
  private options: BulkUploadOptions;
  private onProgress?: (file: UploadFile) => void;
  private onComplete?: (result: BulkUploadResult) => void;
  private onError?: (file: UploadFile, error: string) => void;

  constructor(options: Partial<BulkUploadOptions> = {}) {
    this.options = { ...BulkUploadService.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Add files to upload queue
   */
  addFiles(files: FileList | File[]): UploadFile[] {
    const fileArray = Array.from(files);
    const validFiles: UploadFile[] = [];
    const invalidFiles: string[] = [];

    for (const file of fileArray) {
      const validation = this.validateFile(file);

      if (validation.isValid) {
        const uploadFile: UploadFile = {
          id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'pending',
          progress: 0,
        };

        this.uploads.set(uploadFile.id, uploadFile);
        validFiles.push(uploadFile);
      } else {
        invalidFiles.push(`${file.name}: ${validation.errors.join(', ')}`);
      }
    }

    // Check max files limit
    if (this.uploads.size > (this.options.maxFiles || 20)) {
      throw new Error(`Maximum ${this.options.maxFiles} files allowed`);
    }

    if (invalidFiles.length > 0) {
      console.warn('Invalid files:', invalidFiles);
    }

    if (this.options.autoStart) {
      this.startUpload();
    }

    return validFiles;
  }

  /**
   * Start uploading all queued files
   */
  async startUpload(): Promise<BulkUploadResult> {
    const startTime = Date.now();
    const promises: Promise<void>[] = [];

    for (const [id, uploadFile] of this.uploads) {
      if (uploadFile.status === 'pending') {
        promises.push(this.uploadFile(uploadFile));
      }
    }

    await Promise.allSettled(promises);

    const successful = Array.from(this.uploads.values()).filter(f => f.status === 'completed');
    const failed = Array.from(this.uploads.values()).filter(f => f.status === 'error');

    const result: BulkUploadResult = {
      successful,
      failed,
      totalSize: successful.reduce((sum, f) => sum + f.size, 0),
      totalTime: Date.now() - startTime,
    };

    this.onComplete?.(result);
    return result;
  }

  /**
   * Upload single file with progress tracking
   */
  private async uploadFile(uploadFile: UploadFile): Promise<void> {
    uploadFile.status = 'uploading';
    this.onProgress?.(uploadFile);

    try {
      if (uploadFile.size > (this.options.maxFileSize || 50) * 1024 * 1024) {
        // Use chunked upload for large files
        await this.uploadInChunks(uploadFile);
      } else {
        // Regular upload
        await this.uploadRegular(uploadFile);
      }

      uploadFile.status = 'completed';
      uploadFile.progress = 100;
      this.onProgress?.(uploadFile);

    } catch (error) {
      uploadFile.status = 'error';
      uploadFile.error = error instanceof Error ? error.message : 'Upload failed';
      this.onError?.(uploadFile, uploadFile.error);
      this.onProgress?.(uploadFile);
    }
  }

  /**
   * Regular file upload
   */
  private async uploadRegular(uploadFile: UploadFile): Promise<void> {
    const formData = new FormData();
    formData.append('file', uploadFile.file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          uploadFile.progress = Math.round((event.loaded / event.total) * 100);
          this.onProgress?.(uploadFile);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            uploadFile.url = response.url;
            uploadFile.thumbnail = response.thumbnail;
            resolve();
          } catch (error) {
            reject(new Error('Invalid response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  }

  /**
   * Chunked upload for large files
   */
  private async uploadInChunks(uploadFile: UploadFile): Promise<void> {
    const chunkSize = this.options.chunkSize || 1024 * 1024;
    const totalChunks = Math.ceil(uploadFile.size / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, uploadFile.size);
      const chunk = uploadFile.file.slice(start, end);

      await this.uploadChunk(uploadFile, chunk, i, totalChunks);

      uploadFile.progress = Math.round(((i + 1) / totalChunks) * 100);
      this.onProgress?.(uploadFile);
    }
  }

  /**
   * Upload single chunk
   */
  private async uploadChunk(
    uploadFile: UploadFile,
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number
  ): Promise<void> {
    const formData = new FormData();
    formData.append('file', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('fileName', uploadFile.name);
    formData.append('fileId', uploadFile.id);

    const response = await fetch('/api/upload/chunk', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Chunk upload failed: ${response.status}`);
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file size
    const maxSize = (this.options.maxFileSize || 50) * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`File size exceeds ${this.options.maxFileSize}MB`);
    }

    // Check file type
    const allowedTypes = this.options.allowedTypes || [];
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed`);
    }

    // Check file name
    if (!file.name || file.name.trim() === '') {
      errors.push('File name is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Remove file from queue
   */
  removeFile(fileId: string): void {
    this.uploads.delete(fileId);
  }

  /**
   * Cancel upload
   */
  cancelUpload(fileId: string): void {
    const uploadFile = this.uploads.get(fileId);
    if (uploadFile && uploadFile.status === 'uploading') {
      uploadFile.status = 'pending';
      uploadFile.progress = 0;
      this.onProgress?.(uploadFile);
    }
  }

  /**
   * Get all uploads
   */
  getUploads(): UploadFile[] {
    return Array.from(this.uploads.values());
  }

  /**
   * Set event handlers
   */
  on(event: 'progress' | 'complete' | 'error', handler: any): void {
    switch (event) {
      case 'progress':
        this.onProgress = handler;
        break;
      case 'complete':
        this.onComplete = handler;
        break;
      case 'error':
        this.onError = handler;
        break;
    }
  }

  /**
   * Generate thumbnail for image files
   */
  static async generateThumbnail(file: File, maxSize: number = 150): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        resolve(''); // No thumbnail for non-images
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate thumbnail size
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // Draw thumbnail
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to data URL
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnail);
      };

      img.onerror = () => {
        reject(new Error('Failed to generate thumbnail'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get file icon based on type
   */
  static getFileIcon(fileType: string): string {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📄';
    return '📎';
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}