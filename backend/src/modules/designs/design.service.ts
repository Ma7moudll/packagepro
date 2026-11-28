import {approvalContentHash} from '../orders/approval-snapshot';
import { prisma } from '../../lib/prisma';
import { NotFoundError, AppError } from '../../utils/errors';
import { randomUUID } from 'crypto';
import { getRedisClient } from '../../lib/redis';
import { fileUploadService } from '../../services/file-upload/upload.service';
import { DesignLifecycleService, DesignLifecycleState } from '../../services/design-lifecycle/design-lifecycle.service';
import { isDesignOwner } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';
import { certifiedDielineReceipt } from './dieline-delivery';
import { prePressCheckService } from '../../services/pre-press-checker/prepress.service';
import { deriveUnsupportedArtwork, unsupportedArtworkOutputMessage } from '../../services/pre-press-checker/unsupported-artwork';

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

    // An authenticated user may only attach a design to an order they own.
    // This first check is a read; order ownership is not enforced as immutable
    // by the database, so the claim below repeats it inside its guarded WHERE.
    // A first insert still uses this read snapshot. Concurrent direct database
    // reassignment before that insert is an operator-writer boundary, not an
    // application guarantee. Current app paths do not reassign these relations.
    // Unknown and foreign orders give the same 403 (no oracle).
    if (data.orderId && ownerId) {
      const order = await prisma.order.findUnique({
        where: { id: data.orderId },
        select: { customer: { select: { userId: true } } },
      });
      if (!order || order.customer?.userId !== ownerId) {
        throw new AppError(403, 'You do not have access to this order');
      }
    }

    // Durable database record (owner-scoped). Without an order the design sits
    // in `draft` until it is saved or eventually linked to an order.
    let design: any;
    if (data.orderId && ownerId) {
      // Order-bound: Design.orderId is unique. Try to create; if one exists,
      // take over its session ONLY through one guarded UPDATE whose WHERE
      // clause holds the ownership rule (unowned, or already this user), so
      // two concurrent callers cannot both pass a stale check.
      try {
        design = await prisma.design.create({
          data: { orderId: data.orderId, ownerId, sessionId, name: data.name, description: data.description },
        });
      } catch (error: any) {
        if (error?.code === 'P2003') {
          // The order was deleted between the check and the insert.
          throw new AppError(403, 'You do not have access to this order');
        }
        if (error?.code !== 'P2002') throw error;
        const claimed = await prisma.design.updateMany({
          where: {
            orderId: data.orderId,
            OR: [{ ownerId: null }, { ownerId }],
            // Order membership is part of the same guarded write.
            order: { is: { customer: { is: { userId: ownerId } } } },
          },
          data: { sessionId, ownerId, updatedAt: new Date() },
        });
        if (claimed.count !== 1) {
          throw new AppError(403, 'You do not have access to this order');
        }
        design = await prisma.design.findUnique({ where: { orderId: data.orderId } });
        if (!design) {
          // Deleted right after the claim: never report success with no design.
          throw new AppError(409, 'Design was removed while the session was being created; retry');
        }
      }
    } else {
      design = await prisma.design.create({
        data: {
          orderId: data.orderId ?? null,
          ownerId: ownerId ?? null,
          sessionId,
          name: data.name,
          description: data.description,
        },
      });
    }

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
        designId: design.id,
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
  async saveDesign(data: SaveDesignData, ownerId?: string, opts: { strictSession?: boolean } = {}): Promise<any> {
    // strictSession (set by the HTTP controller): the session must already exist (made by createSession, which
    // issues a random id), and an ownerless draft is not claimed by whoever saves first.
    if (data.files?.some((file) => file.fileType === 'artwork_review')) throw new AppError(400, 'Review artifacts must use the owner-bound review endpoint');
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

    const design = await prisma.$transaction(async (tx) => {
      // Serialize the first-save session race, then existing design content.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${data.sessionId}, 0))`;
      const row = await tx.design.findUnique({where:{sessionId:data.sessionId},select:{id:true}});
      if (row) await tx.$queryRaw`SELECT id FROM designs WHERE id = ${row.id} FOR UPDATE`;
    // Upsert the design record. The editor session is self-sufficient (no
    // order required); if an orderId is attached later the record is linked.
    let design = await tx.design.findUnique({
      where: { sessionId: data.sessionId },
      include: { files: true },
    });

    if (design) {
      // M8-H: lifecycle save gate — only DRAFT designs are editable. The editor
      // mirrors this via isReadOnly(), but the backend is authoritative: a
      // SUBMITTED/IN_REVIEW/APPROVED session must reject saves (AC4). The client
      // surfaces the rejection message; no route change.
      const currentState: DesignLifecycleState = design.lifecycleStatus || 'DRAFT';
      if (!DesignLifecycleService.isEditableState(currentState)) {
        throw new AppError(
          400,
          `Cannot save design in ${currentState} status. Only DRAFT designs can be edited.`
        );
      }

      // Ownership and write happen in ONE guarded UPDATE. The WHERE clause is
      // the rule, evaluated by the database under the row lock, so concurrent
      // savers cannot both pass: the first claims an unowned design, the second
      // matches 0 rows. An existing owner is never reassigned.
      const ownerGuard: any = ownerId
        ? {
            OR: opts.strictSession && !design.orderId ? [{ ownerId }] : [{ ownerId: null }, { ownerId }],
            // Order-bound designs must also belong to the caller's order.
            ...(design.orderId
              ? { orderId: design.orderId, order: { is: { customer: { is: { userId: ownerId } } } } }
              : { orderId: null }),
          }
        : { ownerId: null };
      const written = await tx.design.updateMany({
        where: { id: design.id, lifecycleStatus: 'DRAFT', ...ownerGuard },
        data: {
          designData: data.designData as any,
          status: 'saved',
          ...(ownerId ? { ownerId } : {}),
          ...(data.productId ? { productId: data.productId } : {}),
          ...(data.variantId ? { variantId: data.variantId } : {}),
          ...(data.sku ? { sku: data.sku } : {}),
          ...(data.designConfig ? { designConfig: data.designConfig as any } : {}),
        },
      });
      if (written.count !== 1) {
        // Distinguish a lost race on state from an ownership refusal.
        const current = await tx.design.findUnique({ where: { id: design.id }, select: { lifecycleStatus: true } });
        if (current && current.lifecycleStatus !== 'DRAFT') {
          throw new AppError(400, `Cannot save design in ${current.lifecycleStatus} status. Only DRAFT designs can be edited.`);
        }
        throw new AppError(403, 'You do not have access to this design');
      }
      design = await tx.design.findUnique({ where: { id: design.id }, include: { files: true } });
      if (!design) {
        // Deleted right after the guarded write: never report success with no design.
        throw new AppError(409, 'Design was removed while saving; retry');
      }
    } else {
      if (opts.strictSession) throw new AppError(404, 'Design session not found');
      try {
      design = await tx.design.create({
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
      } catch (error: any) {
        // Two first-saves of the same session raced: the loser must retry
        // (it then goes through the guarded update), never overwrite.
        if (error?.code === 'P2002') throw new AppError(409, 'Design session is being saved by another request; retry');
        // The referenced order disappeared before the insert.
        if (error?.code === 'P2003') throw new AppError(409, 'Design could not be saved because a linked record no longer exists');
        throw error;
      }
    }

    // Save files if provided
    if (data.files && data.files.length > 0 && design) {
      await Promise.all(
        data.files.map((file) =>
          tx.designFile.create({
            data: {
              designId: design.id,
              fileType: file.fileType,
              fileName: file.fileName,
              fileUrl: file.fileUrl,
              fileSize: file.fileSize,
              mimeType: file.mimeType,
              metadata: { ...(file.metadata as any), approvalContentHash: approvalContentHash(design) },
            },
          })
        )
      );
    }

      return design;
    });

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
    if (file.fileType === 'artwork_review') throw new AppError(400, 'Review artifacts must use the owner-bound review endpoint');
    // Verify design exists
    const initialDesign = await this.getDesign(designId);
    const initialHash = approvalContentHash(initialDesign);

    // Upload to S3
    const uploadResult = await fileUploadService.uploadFile(
      file.buffer,
      file.fileName,
      file.mimeType,
      `designs/${designId}`
    );

    // Save file record
    const designFile = await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM designs WHERE id = ${designId} FOR UPDATE`;
      const current=await tx.design.findUniqueOrThrow({where:{id:designId}});
      if(approvalContentHash(current)!==initialHash)throw new AppError(409,'Design changed while uploading; retry against the saved design');
    const result = await tx.designFile.create({
      data: {
        designId,
        fileType: file.fileType,
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.fileUrl,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        metadata: {approvalContentHash:approvalContentHash(current)},
      },
    });

      return result;
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
   * svg returns the certified dieline receipt; other formats are not implemented server-side
   */
  async exportDesign(
    designId: string,
    userId: string,
    options: {
      format: 'png' | 'pdf' | 'ai' | 'eps' | 'svg';
      options?: {
        dpi?: number;
        colorMode?: 'rgb' | 'cmyk';
        bleedMargin?: number;
        dieline?: boolean;
      };
    }
  ): Promise<any> {
    // Verify design exists
    const design = await this.getDesign(designId);

    // Only the design owner can export.
    const isOwner = await isDesignOwner(userId, designId);
    if (!isOwner) {
      throw new AppError(403, 'Only the design owner can export');
    }

    // Shared output boundary, derived from the saved layers and structure
    // (not the optional manifest flag alone): a two-face sheet carrying
    // inside-face artwork gets no export of any format — including the
    // certified dieline receipt below — until the user resolves it.
    const unsupported = deriveUnsupportedArtwork(design.designData);
    if (unsupported) {
      throw new AppError(400, `Export blocked: ${unsupportedArtworkOutputMessage(unsupported)}`);
    }

    // Check if design can be exported
    const currentState = design.lifecycleStatus || 'DRAFT';
    if (!DesignLifecycleService.canExport(currentState)) {
       throw new AppError(
        400,
        `Cannot export design in ${currentState} status. Only DRAFT and APPROVED designs can be exported.`
      );
    }

    // M8-J: certified dieline delivery is synchronous — the geometry lives in the
    // frontend canonical pipeline (resolveDieline -> serializeSVG), so the server
    // returns an explicit delivery receipt grounded in the persisted M8-I result
    // and the design lifecycle, never a fabricated artifact. Other formats
    // return 501 until a real server-side exporter exists.
    if (options.format === 'svg') {
      const boxType = (design.designData as any)?.manifest?.product?.boxType ?? (design.designData as any)?.product?.boxType;
      const prepress = design.orderId
        ? await prePressCheckService.getPrePressResults(design.orderId)
        : null;
      return certifiedDielineReceipt({
        orderId: design.orderId ?? null,
        designUpdatedAt: design.updatedAt,
        prepress,
        boxType,
      });
    }

    // png/pdf/ai/eps: the server has no real renderer yet (the queue worker is
    // never started and only produces placeholder bytes), so do not queue a job
    // that can only end as a fake success. Browser previews and the certified
    // dieline (svg) are unaffected.
    throw new AppError(
      501,
      `Server-side ${options.format} export is not available yet. Use the editor's browser export, or the certified dieline (svg).`
    );
  }

  /**
   * Get design for review (mark as IN_REVIEW)
   */
  async getDesignForReview(designId: string, opts: { startReview?: boolean } = {}): Promise<any> {
    const design = await this.getDesign(designId);

    // Auto-transition from SUBMITTED to IN_REVIEW on the reviewer's first view. Only an explicit reviewer
    // (the controller passes startReview for ADMIN) moves the state; a read by anyone else changes nothing.
    if (opts.startReview === true && design.lifecycleStatus === 'SUBMITTED') {
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
  async approveDesign(designId: string, actorId: string, _notes?: string): Promise<any> {
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

    logger.info('design review decision', { designId, actorId, decision: 'approved' });
    return updatedDesign;
  }

  /**
   * Reject a design
   */
  async rejectDesign(designId: string, actorId: string, _reason: string): Promise<any> {
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

    logger.info('design review decision', { designId, actorId, decision: 'rejected' });
    return updatedDesign;
  }

  /**
   * Request changes to design (adds revision_request comments but keeps IN_REVIEW)
   */
  async requestChanges(designId: string, actorId: string, changes: string[]): Promise<any> {
    const design = await this.getDesign(designId);

    // Verify design is in review
    if (design.lifecycleStatus !== 'IN_REVIEW') {
      throw new AppError(400, 'Can only request changes for designs in review');
    }

    // Add revision request comments
    // TODO: Create multiple comments with type: 'revision_request'

    logger.info('design review decision', { designId, actorId, decision: 'changes_requested' });
    return {
      designId,
      requestedChanges: changes,
      status: 'IN_REVIEW', // Stays in review, owner can make changes and resubmit
    };
  }
}

export const designService = new DesignService();
