import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';
import { randomUUID } from 'crypto';
import { getRedisClient } from '../../lib/redis';
import { fileUploadService } from '../../services/file-upload/upload.service';

export interface CreateDesignSessionData {
  orderId?: string;
  name?: string;
  description?: string;
}

export interface SaveDesignData {
  sessionId: string;
  designData?: unknown; // Editor JSON state (optional)
  files?: Array<{
    fileType: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    metadata?: unknown;
  }>;
}

export class DesignService {
  /**
   * Create a new design session
   */
  async createSession(data: CreateDesignSessionData): Promise<{
    sessionId: string;
    design: any;
  }> {
    const sessionId = randomUUID();
    const redis = getRedisClient();

    // Store session in Redis (24 hour expiration) if available
    if (redis) {
      try {
        await redis.setex(
          `design:session:${sessionId}`,
          24 * 60 * 60,
          JSON.stringify({
            orderId: data.orderId,
            name: data.name,
            description: data.description,
            createdAt: new Date().toISOString(),
          })
        );
      } catch (error) {
        // Redis not available - continue without it
      }
    }

    // Create design record if orderId provided
    let design = null;
    if (data.orderId) {
      design = await prisma.design.upsert({
        where: { orderId: data.orderId },
        update: { sessionId },
        create: {
          orderId: data.orderId,
          sessionId,
          name: data.name,
          description: data.description,
        },
      });
    }

    return {
      sessionId,
      design,
    };
  }

  /**
   * Get design session
   */
  async getSession(sessionId: string): Promise<any> {
    const redis = getRedisClient();

    if (redis) {
      try {
        const sessionData = await redis.get(`design:session:${sessionId}`);
        if (sessionData) {
          return JSON.parse(sessionData);
        }
      } catch (error) {
        // Redis not available - continue
      }
    }

    throw new NotFoundError('Design session');
  }

  /**
   * Save design data
   */
  async saveDesign(data: SaveDesignData): Promise<any> {
    // Update session in Redis if available
    let session: any = {};
    const redis = getRedisClient();

    if (redis) {
      try {
        const sessionData = await redis.get(`design:session:${data.sessionId}`);
        if (sessionData) {
          session = JSON.parse(sessionData);
        }
      } catch (error) {
        // Session not in Redis, create new
      }

      try {
        await redis.setex(
          `design:session:${data.sessionId}`,
          24 * 60 * 60,
          JSON.stringify({
            ...session,
            designData: data.designData,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (error) {
        // Redis not available - continue
      }
    }

    // Update or create design record
    let design = await prisma.design.findUnique({
      where: { sessionId: data.sessionId },
      include: { files: true },
    });

    if (design) {
      // Update existing design
      design = await prisma.design.update({
        where: { id: design.id },
        data: {
          designData: data.designData as any,
          status: 'saved',
        },
        include: { files: true },
      });
    } else if (session.orderId) {
      // Create new design linked to order
      design = await prisma.design.create({
        data: {
          orderId: session.orderId,
          sessionId: data.sessionId,
          name: session.name,
          description: session.description,
          designData: data.designData as any,
          status: 'saved',
        },
        include: { files: true },
      });
    }

    // Save files if provided
    if (data.files && data.files.length > 0 && design) {
      await Promise.all(
        data.files.map((file) =>
          prisma.designFile.create({
            data: {
              designId: design.id,
              fileType: file.fileType,
              fileName: file.fileName,
              fileUrl: file.fileUrl,
              fileSize: file.fileSize,
              mimeType: file.mimeType,
              metadata: file.metadata as any,
            },
          })
        )
      );
    }

    return design;
  }

  /**
   * Get design by ID
   */
  async getDesign(designId: string): Promise<any> {
    const design = await prisma.design.findUnique({
      where: { id: designId },
      include: {
        files: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
    });

    if (!design) {
      throw new NotFoundError('Design');
    }

    return design;
  }

  /**
   * Get design files
   */
  async getDesignFiles(designId: string): Promise<any[]> {
    const design = await this.getDesign(designId);
    return design.files || [];
  }

  /**
   * Upload design file
   */
  async uploadFile(
    designId: string,
    file: {
      buffer: Buffer;
      fileName: string;
      mimeType: string;
      fileType: string;
    }
  ): Promise<any> {
    // Verify design exists
    await this.getDesign(designId);

    // Upload to S3
    const uploadResult = await fileUploadService.uploadFile(
      file.buffer,
      file.fileName,
      file.mimeType,
      `designs/${designId}`
    );

    // Save file record
    const designFile = await prisma.designFile.create({
      data: {
        designId,
        fileType: file.fileType,
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.fileUrl,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
      },
    });

    return designFile;
  }
}

export const designService = new DesignService();
