import { createHash } from 'crypto';
import { PDFDocument, PDFName, PDFArray } from 'pdf-lib';
import { prisma } from '../../lib/prisma';
import { designOwnerMatches } from '../../middleware/auth.middleware';
import { fileUploadService } from '../../services/file-upload/upload.service';
import { AppError } from '../../utils/errors';
import { assertReviewInput, stableJson, reviewSnapshot, REVIEW_ROLE, REVIEW_FILE_TYPE, F42_GEOMETRY_SHA256 } from './artwork-review-contract';

const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const conflict = () => new AppError(409, 'Saved artwork changed. Save and create a new review PDF.');

function verifyDesign(design: any, ownerId: string, snapshotHash?: string): string {
  if (!design || !designOwnerMatches(design.ownerId, design.order?.customer?.userId ?? null, ownerId)) throw new AppError(403, 'Only the design owner can access artwork reviews');
  try { assertReviewInput(design.designData); } catch (error) { throw new AppError(422, (error as Error).message); }
  if (sha(stableJson(design.designData.manifest.dieline)) !== F42_GEOMETRY_SHA256) throw new AppError(422, 'Geometry does not match the verified F42 preset');
  const current=sha(reviewSnapshot(design.designData));
  if (snapshotHash && snapshotHash !== current) throw conflict();
  return current;
}

export class ArtworkReviewService {
  async create(designId: string, ownerId: string, body: {snapshotHash:string;pdfBase64:string}) {
    if (!/^[a-f0-9]{64}$/.test(body.snapshotHash) || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.pdfBase64) || body.pdfBase64.length > 14_000_000) throw new AppError(400,'Invalid review payload');
    const bytes=Buffer.from(body.pdfBase64,'base64');
    if (bytes.length > 10*1024*1024 || !bytes.subarray(0,5).equals(Buffer.from('%PDF-'))) throw new AppError(400,'Review must be a PDF of at most 10MB');
    let pdf: PDFDocument;
    try { pdf=await PDFDocument.load(bytes); } catch { throw new AppError(422,'Review PDF cannot be parsed'); }
    const pages=pdf.getPages();
    if (pages.length !== 1 || Math.abs(pages[0].getWidth()-390*72/25.4)>0.05 || Math.abs(pages[0].getHeight()-218*72/25.4)>0.05 || pdf.getSubject() !== `${REVIEW_ROLE}:${body.snapshotHash}` || (pdf.catalog.has(PDFName.of('OpenAction')) && !(pdf.catalog.get(PDFName.of('OpenAction')) instanceof PDFArray)) || pdf.catalog.has(PDFName.of('AA')) || pdf.catalog.has(PDFName.of('Names'))) throw new AppError(422,'Invalid F42 review PDF layout or metadata');
    let storageKey: string | null=null;
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM designs WHERE id = ${designId} FOR UPDATE`;
        const design=await tx.design.findUnique({where:{id:designId},include:{order:{include:{customer:true}}}});
        verifyDesign(design,ownerId,body.snapshotHash);
        if (design!.lifecycleStatus !== 'DRAFT') throw new AppError(409,'Create review PDFs while the design is DRAFT');
        const existing=await tx.designFile.findFirst({where:{designId,fileType:REVIEW_FILE_TYPE,metadata:{path:['snapshotHash'],equals:body.snapshotHash}},orderBy:{createdAt:'desc'}});
        if (existing) return {id:existing.id,designId,snapshotHash:body.snapshotHash,fileName:existing.fileName,sha256:(existing.metadata as any).sha256};
        storageKey=await fileUploadService.writePrivateReview(bytes,designId);
        const file=await tx.designFile.create({data:{designId,fileType:REVIEW_FILE_TYPE,fileName:'f42-outside-artwork-review.pdf',fileUrl:'owner-authorized-review',fileSize:bytes.length,mimeType:'application/pdf',metadata:{artifactRole:REVIEW_ROLE,snapshotHash:body.snapshotHash,sha256:sha(bytes),storageKey,ownerId,colorMode:'RGB',samplingDpi:300,widthMm:390,heightMm:218,productionReady:false}}});
        return {id:file.id,designId,snapshotHash:body.snapshotHash,fileName:file.fileName,sha256:sha(bytes)};
      },{timeout:20000});
    } catch (error) {
      if (storageKey) await fileUploadService.deletePrivateReview(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async get(designId: string, fileId: string, ownerId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM designs WHERE id = ${designId} FOR UPDATE`;
      const design=await tx.design.findUnique({where:{id:designId},include:{order:{include:{customer:true}}}});
      const current=verifyDesign(design,ownerId);
      const file=await tx.designFile.findFirst({where:{id:fileId,designId,fileType:REVIEW_FILE_TYPE}});
      const meta=file?.metadata as any;
      if (!file || meta?.artifactRole !== REVIEW_ROLE || meta?.ownerId !== ownerId || typeof meta?.storageKey !== 'string' || !meta.storageKey.startsWith(`private-artwork-reviews/${designId}/`)) throw new AppError(404,'Review artifact not found');
      if (meta.snapshotHash !== current) throw conflict();
      const bytes=await fileUploadService.readPrivateReview(meta.storageKey);
      if (sha(bytes)!==meta.sha256) throw new AppError(422,'Stored review checksum mismatch');
      return {id:file.id,fileName:file.fileName,snapshotHash:meta.snapshotHash,sha256:meta.sha256,pdfBase64:bytes.toString('base64'),productionReady:false};
    },{timeout:20000});
  }
}
export const artworkReviewService = new ArtworkReviewService();
