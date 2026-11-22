import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { createHash } from 'crypto';
import Fastify from 'fastify';
import { PDFDocument, PDFName, PDFDict, PDFString } from 'pdf-lib';
import fixture from './fixtures/f42-artwork-review.json';
import { prisma } from '../../lib/prisma';
import { registerReviewFileRedaction } from './artwork-review-response';
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
  registerReviewFileRedaction(app);
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
  it('redacts private metadata from every generic design response, without losing owner retrieval',async()=>{
    const {design,body}=await setup();const record=await artworkReviewService.create(design.id,ownerId,body);
    const token=jwtService.generateAccessToken(ownerId,'owner@test.local','CUSTOMER');
    for (const url of [`/api/designs/${design.id}`,`/api/designs/${design.id}/files`,`/api/designs/session/${design.sessionId}`,'/api/designs']) {
      const response=await app.inject({method:'GET',url,headers:{authorization:`Bearer ${token}`}});
      expect(response.statusCode).toBe(200);
      const text=response.body;
      expect(text).toContain(record.id);expect(text).not.toContain('storageKey');expect(text).not.toContain('private-artwork-reviews/');expect(text).not.toContain(record.sha256);expect(text).not.toContain(body.snapshotHash);
    }
    const saved=await app.inject({method:'POST',url:'/api/designs/save',headers:{authorization:`Bearer ${token}`},payload:{sessionId:design.sessionId,designData:fixture}});
    expect(saved.statusCode).toBe(200);expect(saved.body).not.toContain('storageKey');expect(saved.body).not.toContain(record.sha256);
    expect((await artworkReviewService.get(design.id,record.id,ownerId)).sha256).toBe(record.sha256);
  });
  it('fails closed for S3 review storage regardless of ACL or bucket claims',async()=>{
    vi.stubEnv('S3_ACCESS_KEY_ID','configured-test-key');vi.stubEnv('S3_SECRET_ACCESS_KEY','configured-test-secret');
    try {
      await expect(fileUploadService.writePrivateReview(Buffer.from('test'),'test')).rejects.toThrow('disabled');
      await expect(fileUploadService.readPrivateReview('private-artwork-reviews/test/00000000-0000-0000-0000-000000000000.pdf')).rejects.toThrow('disabled');
      await expect(fileUploadService.deletePrivateReview('private-artwork-reviews/test/00000000-0000-0000-0000-000000000000.pdf')).rejects.toThrow('disabled');
    } finally {vi.unstubAllEnvs();}
  });
  it.each(['AA','Annots','AcroForm','XFA','nested-action','action-name'])('rejects %s interactive structures beyond catalog checks',async(kind)=>{
    const {design,body,bytes}=await setup();const pdf=await PDFDocument.load(bytes);
    if(kind==='AA') pdf.getPages()[0].node.set(PDFName.of('AA'),pdf.context.obj({}));
    else if(kind==='Annots') pdf.getPages()[0].node.set(PDFName.of('Annots'),pdf.context.obj([{Type:'Annot',Subtype:'Link',A:{S:'URI',URI:PDFString.of('https://example.invalid')}}]));
    else if(kind==='action-name') pdf.context.register(pdf.context.obj({S:'Launch'}));
    else if(kind==='nested-action') {
      const dict=PDFDict.withContext(pdf.context);dict.set(PDFName.of('A'),pdf.context.obj({S:'Launch'}));pdf.context.register(dict);
    } else pdf.catalog.set(PDFName.of(kind),pdf.context.obj({}));
    await expect(artworkReviewService.create(design.id,ownerId,{...body,pdfBase64:Buffer.from(await pdf.save()).toString('base64')})).rejects.toMatchObject({statusCode:422});
    expect(await prisma.designFile.count({where:{designId:design.id}})).toBe(0);
  });
  it('caps retained records per design and owner before writing bytes',async()=>{
    const {design,body,bytes}=await setup();
    const existing=await artworkReviewService.create(design.id,ownerId,body);
    const rows=Array.from({length:9},(_,i)=>({designId:design.id,fileType:REVIEW_FILE_TYPE,fileName:`old-${i}.pdf`,fileUrl:'owner-authorized-review',metadata:{ownerId,snapshotHash:'old'}}));
    await prisma.designFile.createMany({data:rows});
    expect((await artworkReviewService.create(design.id,ownerId,body)).id).toBe(existing.id);
    const changed=structuredClone(fixture);changed.layers[0].textProperties.content='quota change';
    await prisma.design.update({where:{id:design.id},data:{designData:changed}});
    const snapshotHash=hash(reviewSnapshot(changed));const pdf=await PDFDocument.load(bytes);pdf.setSubject(`${REVIEW_ROLE}:${snapshotHash}`);
    const nextBody={snapshotHash,pdfBase64:Buffer.from(await pdf.save()).toString('base64')};
    await expect(artworkReviewService.create(design.id,ownerId,nextBody)).rejects.toMatchObject({statusCode:409});
    expect(await prisma.designFile.count({where:{designId:design.id}})).toBe(10);
    await prisma.designFile.createMany({data:Array.from({length:90},(_,i)=>({...rows[0],fileName:`older-${i}.pdf`}))});
    const another=await setup();
    await expect(artworkReviewService.create(another.design.id,ownerId,another.body)).rejects.toMatchObject({statusCode:409});
    expect(await prisma.designFile.count({where:{designId:another.design.id}})).toBe(0);
  });

});
