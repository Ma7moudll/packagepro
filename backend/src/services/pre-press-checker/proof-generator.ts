import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';
import { fileUploadService } from '../file-upload/upload.service';
import axios from 'axios';
import PDFDocument from 'pdfkit';

export interface ProofResult {
  proofUrl: string;
  mockupUrl?: string;
  approvalToken: string;
}

export class ProofGeneratorService {
  /**
   * Generate soft proof PDF
   */
  async generateProof(orderId: string): Promise<ProofResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        design: {
          include: {
            files: true,
          },
        },
        items: true,
        customer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!order || !order.design) {
      throw new NotFoundError('Order or design not found');
    }

    // Find print file
    const printFile = order.design.files.find(
      (f) => f.fileType === 'print_file'
    );

    if (!printFile) {
      throw new NotFoundError('Print file not found');
    }

    // Download print file
    const response = await axios.get(printFile.fileUrl, {
      responseType: 'arraybuffer',
    });
    const fileBuffer = Buffer.from(response.data);

    // Create flattened PDF proof
    const proofBuffer = await this.createFlattenedPDF(fileBuffer, order);

    // Upload proof
    const proofUpload = await fileUploadService.uploadFile(
      proofBuffer,
      `proof-${order.orderNumber}.pdf`,
      'application/pdf',
      `proofs/${orderId}`
    );

    // Save proof file record
    await prisma.designFile.create({
      data: {
        designId: order.design.id,
        fileType: 'proof',
        fileName: proofUpload.fileName,
        fileUrl: proofUpload.fileUrl,
        fileSize: proofUpload.fileSize,
        mimeType: proofUpload.mimeType,
      },
    });

    // Generate approval token
    const approvalToken = this.generateApprovalToken(orderId);

    // Store token in Redis (7 days expiration) if available
    const redis = require('../../lib/redis').getRedisClient();
    if (redis) {
      try {
        await redis.setex(
          `approval:token:${approvalToken}`,
          7 * 24 * 60 * 60,
          JSON.stringify({
            orderId,
            createdAt: new Date().toISOString(),
          })
        );
      } catch (error) {
        // Redis not available - continue without it
      }
    }

    return {
      proofUrl: proofUpload.fileUrl,
      approvalToken,
    };
  }

  /**
   * Create flattened PDF proof with watermark and legal text
   */
  private async createFlattenedPDF(
    _sourceBuffer: Buffer, // eslint-disable-line @typescript-eslint/no-unused-vars
    order: { orderNumber: string }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add header
      doc.fontSize(20).text('SOFT PROOF - APPROVAL REQUIRED', {
        align: 'center',
      });
      doc.moveDown();
      doc.fontSize(12).text(`Order Number: ${order.orderNumber}`, {
        align: 'center',
      });
      doc.moveDown(2);

      // Add watermark
      doc.fontSize(50)
        .fillColor('gray', 0.1)
        .text('PROOF', {
          align: 'center',
        });

      // Add legal text
      doc.fillColor('black')
        .fontSize(10)
        .text(
          'By approving this proof, you confirm that:\n' +
          '1. All colors, text, and images are correct\n' +
          '2. Dimensions and specifications match your requirements\n' +
          '3. You accept responsibility for any errors after approval\n' +
          '4. You understand that changes after approval may incur additional charges',
          {
            align: 'left',
            indent: 20,
          }
        );

      doc.moveDown(3);

      // Note: In production, embed the actual print file
      doc.text('Print file will be embedded here', { align: 'center' });

      doc.end();
    });
  }

  /**
   * Generate approval token
   */
  private generateApprovalToken(_orderId: string): string { // eslint-disable-line @typescript-eslint/no-unused-vars
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    return token;
  }

  /**
   * Get proof by order ID
   */
  async getProof(orderId: string): Promise<ProofResult | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        design: {
          include: {
            files: {
              where: { fileType: 'proof' },
            },
          },
        },
      },
    });

    if (!order || !order.design || order.design.files.length === 0) {
      return null;
    }

    const proofFile = order.design.files[0];
    const approvalToken = this.generateApprovalToken(orderId);

    return {
      proofUrl: proofFile.fileUrl,
      approvalToken,
    };
  }

  /**
   * Verify approval token
   */
  async verifyApprovalToken(token: string): Promise<{ orderId: string } | null> {
    const redis = require('../../lib/redis').getRedisClient();
    if (!redis) {
      return null;
    }

    try {
      const data = await redis.get(`approval:token:${token}`);
      if (!data) {
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }
}

export const proofGeneratorService = new ProofGeneratorService();
