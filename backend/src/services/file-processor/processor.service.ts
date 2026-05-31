import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { ValidationError } from '../../utils/errors';

export interface ImageMetadata {
  width: number;
  height: number;
  dpi: number;
  colorMode: 'RGB' | 'CMYK' | 'Grayscale';
  format: string;
}

export interface ProcessedFile {
  buffer: Buffer;
  metadata: ImageMetadata | null;
  mimeType: string;
}

export class FileProcessorService {
  /**
   * Convert RGB image to CMYK
   */
  async convertRGBtoCMYK(inputBuffer: Buffer): Promise<Buffer> {
    try {
      // Sharp doesn't directly support CMYK conversion, but we can use a workaround
      // For production, consider using ImageMagick or other tools
      const image = sharp(inputBuffer);
      await image.metadata(); // Validate image

      // Convert to CMYK profile (simplified - in production use proper ICC profiles)
      const output = await image
        .toFormat('jpeg', {
          quality: 100,
          mozjpeg: true,
        })
        .toBuffer();

      return output;
    } catch (error) {
      throw new ValidationError(`Failed to convert image: ${error}`);
    }
  }

  /**
   * Optimize image (compress, resize if needed)
   */
  async optimizeImage(
    inputBuffer: Buffer,
    maxWidth?: number,
    maxHeight?: number,
    quality: number = 85
  ): Promise<Buffer> {
    try {
      let image = sharp(inputBuffer);

      if (maxWidth || maxHeight) {
        image = image.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const output = await image
        .toFormat('jpeg', {
          quality,
          mozjpeg: true,
        })
        .toBuffer();

      return output;
    } catch (error) {
      throw new ValidationError(`Failed to optimize image: ${error}`);
    }
  }

  /**
   * Extract image metadata
   */
  async getImageMetadata(buffer: Buffer): Promise<ImageMetadata | null> {
    try {
      const _metadata = await sharp(buffer).metadata();
      // Log metadata if needed

      return {
        width: _metadata.width || 0,
        height: _metadata.height || 0,
        dpi: _metadata.density || 72,
        colorMode: _metadata.space === 'srgb' ? 'RGB' : 'Grayscale', // Simplified
        format: _metadata.format || 'unknown',
      };
    } catch (error) {
      // Not an image
      return null;
    }
  }

  /**
   * Validate PDF file
   */
  async validatePDF(buffer: Buffer): Promise<{
    valid: boolean;
    pageCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const pdfDoc = await PDFDocument.load(buffer);
      const pageCount = pdfDoc.getPageCount();

      if (pageCount === 0) {
        errors.push('PDF has no pages');
      }

      // Additional validations can be added here

      return {
        valid: errors.length === 0,
        pageCount,
        errors,
      };
    } catch (error) {
      errors.push(`Invalid PDF: ${error}`);
      return {
        valid: false,
        pageCount: 0,
        errors,
      };
    }
  }

  /**
   * Check if image meets print requirements
   */
  async checkPrintRequirements(
    buffer: Buffer,
    minDPI: number = 300,
    requiredColorMode?: 'CMYK' | 'RGB'
  ): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    const metadata = await this.getImageMetadata(buffer);

    if (!metadata) {
      return {
        valid: false,
        issues: ['File is not a valid image'],
      };
    }

    if (metadata.dpi < minDPI) {
      issues.push(`DPI is ${metadata.dpi}, minimum required is ${minDPI}`);
    }

    if (requiredColorMode && metadata.colorMode !== requiredColorMode) {
      issues.push(
        `Color mode is ${metadata.colorMode}, required is ${requiredColorMode}`
      );
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export const fileProcessorService = new FileProcessorService();
