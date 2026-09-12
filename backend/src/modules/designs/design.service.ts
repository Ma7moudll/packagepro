import { prisma } from '../../lib/prisma';
import { NotFoundError, AppError } from '../../utils/errors';
import { randomUUID } from 'crypto';
import { getRedisClient } from '../../lib/redis';
import { fileUploadService } from '../../services/file-upload/upload.service';
import { DesignLifecycleService } from '../../services/design-lifecycle/design-lifecycle.service';
import { isDesignOwner } from '../../middleware/auth.middleware';
import { enqueueExport, ExportJobData } from '../../workers/export-queue/export.worker';

export interface CreateDesignSessionData {
  orderId?: string;
  name?: string;
  description?: string;
}

export interface SaveDesignData {
  sessionId: string;
  designData?: unknown;
  files?: Array<{
    fileType: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    metadata?: unknown;
  }>;
  // M7: Product identity fields
  productId?: string;
  variantId?: string;
  sku?: string;
  designConfig?: unknown;
}

export class DesignService {
  /**
   * Create a new design session
   */
  async createSession(
    data: CreateDesignSessionData,
    ownerId?: string
  ): Promise<{
    sessionId: string;
    design: any;
  }> {
    const sessionId = randomUUID();
    const redis = getRedisClient();

    // Durable database record (owner-scoped). Without an order the design sits
    // in `draft` until it is saved or eventually linked to an order.
    const design =
      data.orderId && ownerId
        ? await prisma.design.upsert({
            where: { orderId: data.orderId },
            update: { sessionId, updatedAt: new Date() },
            create: {
              orderId: data.orderId,
              ownerId,
              sessionId,
              name: data.name,
              description: data.description,
            },
          })
        : await prisma.design.create({
            data: {
              orderId: data.orderId ?? null,
              ownerId: ownerId ?? null,
              sessionId,
              name: data.name,
              description: data.description,
            },
          });

    // Mirror session in Redis (24 hour TTL) for fast lookups
    if (redis) {
      try {
        await redis.setex(
          `design:session:${sessionId}`,
          24 * 60 * 60,
          JSON.stringify({
            sessionId,
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

    return {
      sessionId,
      design,
    };
  }

  /**
   * Get design session (database-first; falls back to Redis for legacy
   * Redis-only sessions).
   */
  async getSession(sessionId: string): Promise<any> {
    const design = await prisma.design.findUnique({
      where: { sessionId },
      include: { files: true },
    });

    if (design) {
      const session: any = {
        sessionId,
        orderId: design.orderId,
        name: design.name,
        description: design.description,
        designData: design.designData,
        status: design.status,
        createdAt: design.createdAt,
        updatedAt: design.updatedAt,
      };
      if (design.files?.length) session.files = design.files;
      return session;
    }

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
   * List designs owned by a user
   */
  async listDesigns(ownerId?: string): Promise<any[]> {
    if (!ownerId) return [];
    const designs = await prisma.design.findMany({
      where: { ownerId },
      include: { files: true, order: true },
      orderBy: { updatedAt: 'desc' },
    });
    return designs;
  }

  /**
   * Save design data (durable database persistence)
   */
  async saveDesign(data: SaveDesignData, ownerId?: string): Promise<any> {
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
    }

    // Upsert the design record. The editor session is self-sufficient (no
    // order required); if an orderId is attached later the record is linked.
    let design = await prisma.design.findUnique({
      where: { sessionId: data.sessionId },
      include: { files: true },
    });

    if (design) {
      design = await prisma.design.update({
        where: { id: design.id },
        data: {
          designData: data.designData as any,
          status: 'saved',
          ...(ownerId ? { ownerId } : {}),
          ...(data.productId ? { productId: data.productId } : {}),
          ...(data.variantId ? { variantId: data.variantId } : {}),
          ...(data.sku ? { sku: data.sku } : {}),
          ...(data.designConfig ? { designConfig: data.designConfig as any } : {}),
        },
        include: { files: true },
      });
    } else {
      design = await prisma.design.create({
        data: {
          orderId: session.orderId ?? null,
          ownerId: ownerId ?? null,
          sessionId: data.sessionId,
          name: session.name,
          description: session.description,
          designData: data.designData as any,
          status: 'saved',
          ...(data.productId ? { productId: data.productId } : {}),
          ...(data.variantId ? { variantId: data.variantId } : {}),
          ...(data.sku ? { sku: data.sku } : {}),
          ...(data.designConfig ? { designConfig: data.designConfig as any } : {}),
        },
        include: { files: true },
      });
    }

    // Mirror session in Redis
    if (redis) {
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

  /**
   * Submit design for review
   * Transitions from DRAFT to SUBMITTED
   * Only design owner can submit
   */
  async submitDesign(designId: string, userId: string): Promise<any> {
    // Verify design exists
    const design = await this.getDesign(designId);

    // Check if user is the design owner
    const isOwner = await isDesignOwner(userId, designId);
    if (!isOwner) {
      throw new AppError(403, 'Only the design owner can submit for review');
    }

    // Validate state transition
    const currentState = design.lifecycleStatus || 'DRAFT';
    const validation = DesignLifecycleService.canTransition(currentState, 'SUBMITTED', 'CUSTOMER');
    if (!validation.allowed) {
      throw new AppError(400, validation.reason || 'Invalid state transition');
    }

    // Update design status
    const updatedDesign = await prisma.design.update({
      where: { id: designId },
      data: {
        lifecycleStatus: 'SUBMITTED',
        updatedAt: new Date(),
      },
      include: { files: true, order: true },
    });

    return updatedDesign;
  }

  /**
   * Recall design submission
   * Transitions from SUBMITTED back to DRAFT
   * Only design owner can recall
   */
  async recallDesign(designId: string, userId: string): Promise<any> {
    // Verify design exists
    const design = await this.getDesign(designId);

    // Check if user is the design owner
    const isOwner = await isDesignOwner(userId, designId);
    if (!isOwner) {
      throw new AppError(403, 'Only the design owner can recall a submission');
    }

    // Validate state transition
    const currentState = design.lifecycleStatus || 'SUBMITTED';
    const validation = DesignLifecycleService.canTransition(currentState, 'DRAFT', 'CUSTOMER');
    if (!validation.allowed) {
      throw new AppError(400, validation.reason || 'Invalid state transition');
    }

    // Update design status
    const updatedDesign = await prisma.design.update({
      where: { id: designId },
      data: {
        lifecycleStatus: 'DRAFT',
        updatedAt: new Date(),
      },
      include: { files: true, order: true },
    });

    return updatedDesign;
  }

  /**
   * Export design in specified format
   * Enqueues an async export job
   */
  async exportDesign(
    designId: string,
    userId: string,
    options: {
      format: 'png' | 'pdf' | 'ai' | 'eps';
      options?: {
        dpi?: number;
        colorMode?: 'rgb' | 'cmyk';
        bleedMargin?: number;
      };
    }
  ): Promise<any> {
    // Verify design exists
    const design = await this.getDesign(designId);

    // Check if user can export (owner or admin)
    const isOwner = await isDesignOwner(userId, designId);
    if (!isOwner) {
      throw new AppError(403, 'Only the design owner can export');
    }

    // Check if design can be exported
    const currentState = design.lifecycleStatus || 'DRAFT';
    if (!DesignLifecycleService.canExport(currentState)) {
       throw new AppError(
        400,
        `Cannot export design in ${currentState} status. Only DRAFT and APPROVED designs can be exported.`
      );
    }

    // Enqueue export job
    const exportData: ExportJobData = {
      designId,
      format: options.format,
      options: options.options,
    };

    try {
      const job = await enqueueExport(exportData);
      
      return {
        jobId: job.id,
        status: 'queued',
        format: options.format,
        message: `Export job queued. Check status with jobId: ${job.id}`,
      };
    } catch (error) {
      throw new AppError(500, 'Failed to queue export job');
    }
  }

  /**
   * Get design for review (mark as IN_REVIEW)
   */
  async getDesignForReview(designId: string): Promise<any> {
    const design = await this.getDesign(designId);

    // Auto-transition from SUBMITTED to IN_REVIEW on first view
    if (design.lifecycleStatus === 'SUBMITTED') {
      return await prisma.design.update({
        where: { id: designId },
        data: { lifecycleStatus: 'IN_REVIEW' },
        include: { files: true, order: true },
      });
    }

    return design;
  }

  /**
   * Add comment to design
   */
  async addCommentToDesign(
    designId: string,
    userId: string,
    data: {
      elementRef?: string;
      commentText: string;
      commentType?: 'general' | 'revision_request' | 'approval_note';
    }
  ): Promise<any> {
    // Verify design exists
    await this.getDesign(designId);

    // TODO: When DesignComment model is added to Prisma schema, create comment:
    // return await prisma.designComment.create({
    //   data: {
    //     designId,
    //     userId,
    //     elementRef: data.elementRef,
    //     commentText: data.commentText,
    //     commentType: data.commentType || 'general',
    //   },
    // });

    return {
      id: 'comment-' + Date.now(),
      designId,
      userId,
      commentText: data.commentText,
      elementRef: data.elementRef,
      commentType: data.commentType || 'general',
      createdAt: new Date(),
    };
  }

  /**
   * Approve a design
   */
  async approveDesign(designId: string, _userId: string, _notes?: string): Promise<any> {
    const design = await this.getDesign(designId);

    // Validate state transition
    const currentState = design.lifecycleStatus || 'DRAFT';
    const validation = DesignLifecycleService.canTransition(currentState, 'APPROVED', 'ADMIN');
    if (!validation.allowed) {
      throw new AppError(400, validation.reason || 'Cannot approve design in current state');
    }

    // Update design status
    const updatedDesign = await prisma.design.update({
      where: { id: designId },
      data: {
        lifecycleStatus: 'APPROVED',
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
      include: { files: true, order: true },
    });

    return updatedDesign;
  }

  /**
   * Reject a design
   */
  async rejectDesign(designId: string, _userId: string, _reason: string): Promise<any> {
    const design = await this.getDesign(designId);

    // Validate state transition
    const currentState = design.lifecycleStatus || 'DRAFT';
    const validation = DesignLifecycleService.canTransition(currentState, 'REJECTED', 'ADMIN');
    if (!validation.allowed) {
      throw new AppError(400, validation.reason || 'Cannot reject design in current state');
    }

    // Update design status
    const updatedDesign = await prisma.design.update({
      where: { id: designId },
      data: {
        lifecycleStatus: 'REJECTED',
        updatedAt: new Date(),
      },
      include: { files: true, order: true },
    });

    return updatedDesign;
  }

  /**
   * Request changes to design (adds revision_request comments but keeps IN_REVIEW)
   */
  async requestChanges(designId: string, _userId: string, changes: string[]): Promise<any> {
    const design = await this.getDesign(designId);

    // Verify design is in review
    if (design.lifecycleStatus !== 'IN_REVIEW') {
      throw new AppError(400, 'Can only request changes for designs in review');
    }

    // Add revision request comments
    // TODO: Create multiple comments with type: 'revision_request'

    return {
      designId,
      requestedChanges: changes,
      status: 'IN_REVIEW', // Stays in review, owner can make changes and resubmit
    };
  }
}

export const designService = new DesignService();
