import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import Fastify from 'fastify';
import { PDFDocument } from 'pdf-lib';
import fixture from './fixtures/f42-artwork-review.json';
import { prisma } from '../../lib/prisma';
import { artworkReviewService } from './artwork-review.service';
import { reviewSnapshot, REVIEW_ROLE, REVIEW_FILE_TYPE } from './artwork-review-contract';
import { designService } from './design.service';
import { designRoutes } from './design.routes';
import { jwtService } from '../auth/services/jwt.service';
import { fileUploadService } from '../../services/file-upload/upload.service';

const marker=`review-${Date.now()}`;
let ownerId='',otherId='';
const ids:string[]=[];
const app=Fastify();
const hash=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex');
async function setup(data:any=fixture) {
  const design=await prisma.design.create({data:{ownerId,sessionId:`${marker}-${ids.length}`,designData:data}});ids.push(design.id);
  const snapshotHash=hash(reviewSnapshot(data));
  const pdf=await PDFDocument.create();pdf.addPage([390*72/25.4,218*72/25.4]);pdf.setSubject(`${REVIEW_ROLE}:${snapshotHash}`);
  const bytes=Buffer.from(await pdf.save());
  return {design,body:{snapshotHash,pdfBase64:bytes.toString('base64')},bytes};
}
beforeAll(async()=>{
  ownerId=(await prisma.user.create({data:{email:`${marker}-owner@test.local`,passwordHash:'local-test',role:'CUSTOMER'}})).id;
  otherId=(await prisma.user.create({data:{email:`${marker}-other@test.local`,passwordHash:'local-test',role:'CUSTOMER'}})).id;
  app.setErrorHandler((error:any,_request,reply)=>reply.status(error.statusCode||500).send({success:false,error:error.message}));
  await app.register(designRoutes,{prefix:'/api'});await app.ready();
});
afterAll(async()=>{
  const files=await prisma.designFile.findMany({where:{designId:{in:ids},fileType:REVIEW_FILE_TYPE}});
  for(const f of files) {const key=(f.metadata as any)?.storageKey;if(key) await fileUploadService.deletePrivateReview(key).catch(()=>undefined);}
  await prisma.design.deleteMany({where:{id:{in:ids}}});await prisma.user.deleteMany({where:{id:{in:[ownerId,otherId]}}});await app.close();
});

describe('saved review artifact on real Postgres and private storage',()=>{
  it('stores/retrieves exactly the bytes and checksum, with no design-state transition',async()=>{
    const {design,body,bytes}=await setup();
    const record=await artworkReviewService.create(design.id,ownerId,body);
    const stored=await artworkReviewService.get(design.id,record.id,ownerId);
    expect(Buffer.from(stored.pdfBase64,'base64')).toEqual(bytes);expect(stored.sha256).toBe(hash(bytes));expect(stored.productionReady).toBe(false);
    const current=await prisma.design.findUniqueOrThrow({where:{id:design.id},include:{files:true}});
    expect(current.lifecycleStatus).toBe('DRAFT');expect(current.updatedAt).toEqual(design.updatedAt);
    expect(current.files.map(f=>f.fileType)).toEqual([REVIEW_FILE_TYPE]);expect(current.files[0].fileUrl).not.toMatch(/^https?:/);
    const key=(current.files[0].metadata as any).storageKey;
    expect(await fileUploadService.readLocalFile(`../${key}`)).toBeNull();
  });
  it('concurrent retry is idempotent for a saved snapshot',async()=>{
    const {design,body}=await setup();
    const records=await Promise.all(Array.from({length:8},()=>artworkReviewService.create(design.id,ownerId,body)));
    expect(new Set(records.map(r=>r.id)).size).toBe(1);expect(await prisma.designFile.count({where:{designId:design.id}})).toBe(1);
  });
  it('denies another owner on both creation and retrieval',async()=>{
    const {design,body}=await setup();const a=await artworkReviewService.create(design.id,ownerId,body);
    await expect(artworkReviewService.create(design.id,otherId,body)).rejects.toMatchObject({statusCode:403});
    await expect(artworkReviewService.get(design.id,a.id,otherId)).rejects.toMatchObject({statusCode:403});
  });
  it('rejects stale upload and retrieval after printable artwork changes',async()=>{
    const {design,body}=await setup();const a=await artworkReviewService.create(design.id,ownerId,body);
    const changed=structuredClone(fixture);changed.layers[0].textProperties.content='new artwork';
    await prisma.design.update({where:{id:design.id},data:{designData:changed}});
    await expect(artworkReviewService.create(design.id,ownerId,body)).rejects.toMatchObject({statusCode:409});
    await expect(artworkReviewService.get(design.id,a.id,ownerId)).rejects.toMatchObject({statusCode:409});
  });
  it('rejects unsupported geometry and malformed/wrong-layout PDFs without attaching files',async()=>{
    const changed=structuredClone(fixture);changed.manifest.dieline.panels.front.x++;
    const {design,body}=await setup(changed);
    await expect(artworkReviewService.create(design.id,ownerId,body)).rejects.toMatchObject({statusCode:422});
    const valid=await setup();
    await expect(artworkReviewService.create(valid.design.id,ownerId,{...valid.body,pdfBase64:'bm90IGEgcGRm'})).rejects.toMatchObject({statusCode:400});
    const wrong=await PDFDocument.create();wrong.addPage();wrong.setSubject(`${REVIEW_ROLE}:${valid.body.snapshotHash}`);
    await expect(artworkReviewService.create(valid.design.id,ownerId,{...valid.body,pdfBase64:Buffer.from(await wrong.save()).toString('base64')})).rejects.toMatchObject({statusCode:422});
    expect(await prisma.designFile.count({where:{designId:{in:[design.id,valid.design.id]}}})).toBe(0);
  });
  it('reserved review file records cannot be injected through generic save',async()=>{
    const {design}=await setup();
    await expect(designService.saveDesign({sessionId:design.sessionId!,designData:fixture,files:[{fileType:REVIEW_FILE_TYPE,fileName:'forged.pdf',fileUrl:'x'}]},ownerId)).rejects.toMatchObject({statusCode:400});
    expect(await prisma.designFile.count({where:{designId:design.id}})).toBe(0);
  });
  it('HTTP retrieval needs authentication and returns exact bytes with no-store',async()=>{
    const {design,body,bytes}=await setup();const record=await artworkReviewService.create(design.id,ownerId,body);
    const url=`/api/designs/${design.id}/artwork-reviews/${record.id}`;
    expect((await app.inject({method:'GET',url})).statusCode).toBe(401);
    const other=jwtService.generateAccessToken(otherId,'other@test.local','CUSTOMER');
    expect((await app.inject({method:'GET',url,headers:{authorization:`Bearer ${other}`}})).statusCode).toBe(403);
    const token=jwtService.generateAccessToken(ownerId,'owner@test.local','CUSTOMER');
    const response=await app.inject({method:'GET',url,headers:{authorization:`Bearer ${token}`}});
    expect(response.statusCode).toBe(200);expect(response.headers['cache-control']).toBe('private, no-store');
    expect(Buffer.from(response.json().data.pdfBase64,'base64')).toEqual(bytes);
  });
});
