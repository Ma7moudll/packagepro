import {
  hashApprovalToken,
  newApprovalToken,
  verifyApprovalToken,
} from "../../services/pre-press-checker/approval-tokens";
import { prisma } from "../../lib/prisma";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  InternalServerError,
} from "../../utils/errors";
import { emailService } from "../../services/email/email.service";
import {
  composeProofPdf,
  readManifest,
} from "../../services/pre-press-checker/proof-generator";
import { fetchStoredFile } from "../../services/file-upload/stored-file-fetch";
import { fileUploadService } from "../../services/file-upload/upload.service";
import { approvalContentHash, approvalBytesHash } from "./approval-snapshot";
import { isStoredFileOfDesign } from "../files/file-access";

// Validate once before staging anything, then retain this base across async work.
export function approvalFrontendBase(value=process.env.FRONTEND_URL,production=process.env.NODE_ENV==='production'):string{
  try{
    if(!value?.trim())throw new Error();
    const url=new URL(value);
    if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password||url.search||url.hash||(production&&url.protocol!=='https:'))throw new Error();
    return url.href.replace(/\/+$/,'');
  }catch{throw new InternalServerError('Approval frontend URL is not configured safely; no review request was started')}
}

type Selection = {
  printFileId: string;
  dielineFileId: string | null;
  renew?: boolean;
};
export class ApprovalService {
  /** Explicit admin policy: reopen only before ANY purchase order exists.
   * Shares the order lock with PO creation, so exactly one boundary wins. */
  async reopenApproval(orderId:string,actor:{role:string;id?:string},reason:string):Promise<void>{
    if(actor.role!=='ADMIN')throw new AuthorizationError('Only admins may reopen approval');
    if(reason.trim().length<10)throw new ValidationError('A review reason of at least 10 characters is required');
    await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      const order=await tx.order.findUnique({where:{id:orderId}});
      if(!order)throw new NotFoundError('Order');
      if(!['awaiting_approval','ready_for_routing'].includes(order.status))throw new ConflictError('Order is not eligible for approval reopening');
      if(await tx.purchaseOrder.count({where:{orderId}}))throw new ConflictError('An existing purchase order prevents reopening, including incomplete purchase orders');
      await tx.approvalRequest.updateMany({where:{orderId,status:{in:['generating','pending','approved']}},data:{status:'superseded'}});
      await tx.orderApprovalToken.updateMany({where:{orderId,consumedAt:null},data:{consumedAt:new Date()}});
      await tx.order.update({where:{id:orderId},data:{status:'pending_review',approvedAt:null,metadata:{...(order.metadata as any),approval:null,approvalReopen:{actorId:actor.id,reason:reason.trim(),reopenedAt:new Date().toISOString()}}}});
    });
    // Reopening is not an email/send action. Admin must select fresh files and request review explicitly.
  }

  async requestApproval(
    orderId: string,
    actor: { role: string },
    selection?: Selection,
  ) {
    if (actor.role !== "ADMIN")
      throw new AuthorizationError("Only admins may request approval");
    if (!selection?.printFileId || selection.dielineFileId === undefined)
      throw new ValidationError(
        "Explicit print file and dieline selection (or null) required; legacy requests need admin renewal",
      );
    const frontendBase=approvalFrontendBase();
    const claim = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          design: { include: { files: true } },
          items: true,
          customer: { include: { user: true } },
        },
      });
      if (!order?.design) throw new NotFoundError("Order or design");
      if (!["pending_review", "awaiting_approval"].includes(order.status))
        throw new ValidationError("Order is not reviewable");
      await tx.$queryRaw`SELECT id FROM designs WHERE id = ${order.design.id} FOR UPDATE`;
      const design = await tx.design.findUniqueOrThrow({
        where: { id: order.design.id },
        include: { files: true },
      });
      const hash = approvalContentHash(design);
      const latest = await tx.approvalRequest.findFirst({
        where: { orderId },
        orderBy: { createdAt: "desc" },
      });
      if (latest && !selection.renew) {
        if (
          latest.status === "pending" &&
          latest.contentHash === hash &&
          latest.printFileId === selection.printFileId &&
          latest.dielineFileId === selection.dielineFileId &&
          latest.expiresAt > new Date()
        )
          return { existing: latest } as const;
        throw new ConflictError(
          latest.deliveryState === "not_sent" ? "Previous generation failed before delivery. Explicit renewal required" : "Explicit renewal required. A prior delivery may have reached the customer",
        );
      }
      const print = design.files.find(
        (f) => f.id === selection.printFileId && f.fileType === "print_file",
      );
      const dieline = selection.dielineFileId
        ? design.files.find(
            (f) => f.id === selection.dielineFileId && f.fileType === "dieline",
          )
        : null;
      if (!print || (selection.dielineFileId && !dieline))
        throw new ValidationError(
          "Selected files do not belong to this design",
        );
      // A local key is read only if it sits under this design's own folder (see isStoredFileOfDesign).
      for (const file of [print, dieline].filter(Boolean))
        if (!isStoredFileOfDesign(file!.fileUrl, design.id))
          throw new ValidationError("Selected file is not stored under this design");
      for (const file of [print, dieline].filter(Boolean))
        if ((file!.metadata as any)?.approvalContentHash !== hash)
          throw new ValidationError(
            "Legacy or stale file association. Re-upload against the current saved design, then select explicitly",
          );
      await tx.approvalRequest.updateMany({
        where: { orderId, status: { in: ["generating", "pending"] } },
        data: { status: "superseded" },
      });
      const request = await tx.approvalRequest.create({
        data: {
          orderId,
          designId: design.id,
          contentHash: hash,
          designSnapshot: {
            designData: design.designData,
            productId: design.productId,
            variantId: design.variantId,
            sku: design.sku,
            designConfig: design.designConfig,
          } as any,
          printFileId: print.id,
          printSha256: "",
          printSnapshotUrl: "",
          dielineFileId: dieline?.id,
          expiresAt: new Date(Date.now() + 7 * 86400000),
        },
      });
      return { order, design, print, dieline, request } as const;
    });
    if ("existing" in claim)
      return {
        requestId: claim.existing!.id,
        deliveryState: claim.existing!.deliveryState,
        reused: true,
      };
    const { order, design, print, dieline, request } = claim;
    try {
      const printBytes = await fetchStoredFile(print.fileUrl);
      const dielineBytes = dieline
        ? await fetchStoredFile(dieline.fileUrl)
        : null;
      const frozenPrint = await fileUploadService.uploadFile(
        printBytes,
        print.fileName,
        print.mimeType || "application/octet-stream",
        `approval-snapshots/${request.id}`,
      );
      const frozenDieline =
        dieline && dielineBytes
          ? await fileUploadService.uploadFile(
              dielineBytes,
              dieline.fileName,
              dieline.mimeType || "application/octet-stream",
              `approval-snapshots/${request.id}`,
            )
          : null;
      const proofBytes = await composeProofPdf(printBytes, {
        orderNumber: order.orderNumber,
        items: order.items.map((i) => ({
          description: i.productType,
          quantity: i.quantity,
        })),
        manifest: readManifest(design.designData),
      });
      const proof = await fileUploadService.uploadFile(
        proofBytes,
        `proof-${order.orderNumber}.pdf`,
        "application/pdf",
        `approval-snapshots/${request.id}`,
      );
      const token = newApprovalToken();
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM designs WHERE id = ${design.id} FOR UPDATE`;
        const current = await tx.design.findUniqueOrThrow({
          where: { id: design.id },
        });
        const currentOrder = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          include: { design: true },
        });
        const active = await tx.approvalRequest.findUniqueOrThrow({
          where: { id: request.id },
        });
        if (
          active.status !== "generating" ||
          currentOrder.design?.id !== design.id ||
          !["pending_review", "awaiting_approval"].includes(
            currentOrder.status,
          ) ||
          approvalContentHash(current) !== request.contentHash
        )
          throw new ConflictError(
            "Design or request changed during proof generation; renew after saving",
          );
        const file = await tx.designFile.create({
          data: {
            designId: design.id,
            fileType: "proof",
            fileName: proof.fileName,
            fileUrl: proof.fileUrl,
            fileSize: proof.fileSize,
            mimeType: proof.mimeType,
            metadata: { requestId: request.id },
          },
        });
        await tx.approvalRequest.update({
          where: { id: request.id },
          data: {
            status: "pending",
            printSha256: approvalBytesHash(printBytes),
            printSnapshotUrl: frozenPrint.fileUrl,
            dielineSha256: dielineBytes
              ? approvalBytesHash(dielineBytes)
              : null,
            dielineSnapshotUrl: frozenDieline?.fileUrl,
            proofFileId: file.id,
            proofSha256: approvalBytesHash(proofBytes),
            proofUrl: proof.fileUrl,
            deliveryState: "not_sent",
          },
        });
        await tx.orderApprovalToken.create({
          data: {
            orderId,
            requestId: request.id,
            tokenHash: hashApprovalToken(token),
            expiresAt: request.expiresAt,
          },
        });
        await tx.order.update({
          where: { id: orderId },
          data: { status: "awaiting_approval" },
        });
      });
      // Persist uncertainty before crossing the provider boundary. Never auto-resend.
      const sending = await prisma.approvalRequest.updateMany({
        where: { id: request.id, status: "pending", deliveryState: "not_sent" },
        data: { deliveryState: "sending" },
      });
      if (sending.count === 1) {
        try {
          await emailService.sendApprovalRequest(
            order,
            `${frontendBase}/orders/${encodeURIComponent(orderId)}/approve?token=${encodeURIComponent(token)}`,
          );
          await prisma.approvalRequest.update({
            where: { id: request.id },
            data: { deliveryState: "sent" },
          });
        } catch {
          await prisma.approvalRequest.update({
            where: { id: request.id },
            data: {
              deliveryState: "uncertain",
              failureCode: "DELIVERY_UNCERTAIN",
            },
          });
        }
      }
      const result = await prisma.approvalRequest.findUniqueOrThrow({
        where: { id: request.id },
      });
      return {
        requestId: result.id,
        deliveryState: result.deliveryState,
        reused: false,
      };
    } catch (error) {
      await prisma.approvalRequest.updateMany({
        where: { id: request.id, status: "generating" },
        data: { status: "failed", failureCode: "GENERATION_FAILED" },
      });
      throw error;
    }
  }
  async approveOrder(
    orderId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const capability = await verifyApprovalToken(token);
    if (!capability || capability.orderId !== orderId)
      throw new ValidationError(
        "Invalid, superseded or expired approval link. Request a new admin review",
      );
    const request = await prisma.approvalRequest.findUniqueOrThrow({
      where: { id: capability.requestId },
    });
    await this.verifyBytes(request);
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM designs WHERE id = ${request.designId} FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { design: true },
      });
      const active = await tx.approvalRequest.findUniqueOrThrow({
        where: { id: request.id },
      });
      if (
        order.status !== "awaiting_approval" ||
        active.status !== "pending" ||
        active.expiresAt <= new Date() ||
        order.design?.id !== active.designId ||
        approvalContentHash(order.design) !== active.contentHash
      )
        throw new ConflictError(
          "Design changed or approval was renewed. Request a new proof",
        );
      const consumed = await tx.orderApprovalToken.updateMany({
        where: {
          tokenHash: hashApprovalToken(token),
          requestId: active.id,
          orderId,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1)
        throw new ValidationError("Invalid or used approval link");
      await tx.approvalRequest.update({
        where: { id: active.id },
        data: { status: "approved", approvedAt: new Date() },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "ready_for_routing",
          approvedAt: new Date(),
          metadata: {
            ...(order.metadata as any),
            approval: {
              requestId: active.id,
              ipAddress,
              userAgent,
              approvedAt: new Date().toISOString(),
            },
          },
        },
      });
    });
  }
  async verifyBytes(request: {
    printSnapshotUrl: string;
    printSha256: string;
    dielineSnapshotUrl: string | null;
    dielineSha256: string | null;
    proofUrl: string | null;
    proofSha256: string | null;
  }) {
    for (const [url, hash] of [
      [request.printSnapshotUrl, request.printSha256],
      [request.dielineSnapshotUrl, request.dielineSha256],
      [request.proofUrl, request.proofSha256],
    ]) {
      if (!url && !hash) continue;
      if (
        !url ||
        !hash ||
        approvalBytesHash(await fetchStoredFile(url)) !== hash
      )
        throw new ConflictError(
          "Approved snapshot bytes are unavailable or changed; manual review required",
        );
    }
  }
  // Old queue jobs have no request identity. They must never cancel a renewal.
  async autoCancelOrder(_orderId: string): Promise<void> {
    return;
  }
}
export const approvalService = new ApprovalService();
