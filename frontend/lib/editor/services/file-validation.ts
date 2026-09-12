"use client"

/**
 * Design Editor File Processing and Validation Service
 * Handles file uploads, validation, and error handling
 */

export const FILE_CONSTRAINTS = {
  MAX_SIZE_MB: 50,
  MAX_SIZE_BYTES: 50 * 1024 * 1024,
  SUPPORTED_FORMATS: ['image/png', 'image/jpeg'],
  SUPPORTED_EXTENSIONS: ['.png', '.jpg', '.jpeg'],
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  file?: File;
}

/**
 * Validate uploaded file
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > FILE_CONSTRAINTS.MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds ${FILE_CONSTRAINTS.MAX_SIZE_MB}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check MIME type
  if (!FILE_CONSTRAINTS.SUPPORTED_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file format: ${file.type}. Supported: ${FILE_CONSTRAINTS.SUPPORTED_EXTENSIONS.join(', ')}`,
    };
  }

  // Check file extension
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!FILE_CONSTRAINTS.SUPPORTED_EXTENSIONS.includes(fileExtension)) {
    return {
      valid: false,
      error: `Unsupported file extension: ${fileExtension}. Supported: ${FILE_CONSTRAINTS.SUPPORTED_EXTENSIONS.join(', ')}`,
    };
  }

  return {
    valid: true,
    file,
  };
}

/**
 * Handle file upload with validation
 */
export async function handleFileUpload(file: File): Promise<FileValidationResult> {
  // Client-side validation
  const validation = validateFile(file);
  if (!validation.valid) {
    return validation;
  }

  // Additional checks could go here (e.g., image dimensions, color profile)

  return {
    valid: true,
    file,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
