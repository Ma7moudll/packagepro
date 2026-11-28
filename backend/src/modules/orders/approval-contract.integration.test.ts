import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import sharp from 'sharp';
import {prisma} from '../../lib/prisma';
import {designService} from '../designs/design.service';
import {fileUploadService} from '../../services/file-upload/upload.service';
import {fetchStoredFile} from '../../services/file-upload/stored-file-fetch';
import {proofGeneratorService} from '../../services/pre-press-checker/proof-generator';
import {emailService} from '../../services/email/email.service';
import {approvalService} from './approval.service';
import {poService} from '../purchase-orders/po.service';
import {vendorRouterService} from '../../services/vendor-router/router.service';
import {approvalBytesHash,approvalContentHash} from './approval-snapshot';
const priorFrontendUrl=process.env.FRONTEND_URL;
beforeAll(()=>{process.env.FRONTEND_URL='http://localhost:3001'});
afterAll(()=>{if(priorFrontendUrl===undefined)delete process.env.FRONTEND_URL;else process.env.FRONTEND_URL=priorFrontendUrl});
vi.mock('../../services/email/email.service',()=>({emailService:{sendApprovalRequest:vi.fn().mockResolvedValue(undefined),sendEmail:vi.fn().mockResolvedValue(undefined)}}));
describe('real saved-design approval snapshot contract',()=>{
 let userId:string,customerId:string;const orders:string[]=[];
 beforeAll(async()=>{const u=await prisma.user.create({data:{email:`approval-save-${Date.now()}@test.local`,passwordHash:'unused',customer:{create:{}}},include:{customer:true}});userId=u.id;customerId=u.customer!.id});
 afterAll(async()=>{await prisma.handshake.deleteMany({where:{purchaseOrder:{orderId:{in:orders}}}});await prisma.purchaseOrder.deleteMany({where:{orderId:{in:orders}}});await prisma.design.deleteMany({where:{ownerId:userId}});await prisma.order.deleteMany({where:{id:{in:orders}}});await prisma.user.delete({where:{id:userId}})});
 async function setup(){
  const sessionId=`approval-save-${Date.now()}-${Math.random()}`;const designData={marker:'A',layers:[]};
  const bytes=await sharp({create:{width:20,height:20,channels:3,background:'#ff0000'}}).png().toBuffer();
  const d0=await designService.saveDesign({sessionId,designData},userId);const upload=await fileUploadService.uploadFile(bytes,'red.png','image/png',`designs/${d0.id}`);
  const d=await designService.saveDesign({sessionId,designData,files:[{fileType:'print_file',fileName:'red.png',fileUrl:upload.fileUrl,mimeType:'image/png'}]},userId);
  const o=await prisma.order.create({data:{orderNumber:sessionId,customerId,status:'pending_review',subtotal:20,total:20,tax:0,shippingCost:0,shippingAddress:{},shippingName:'Test',shippingPhone:'local'}});orders.push(o.id);
  await prisma.design.update({where:{id:d.id},data:{orderId:o.id}});
  const file=await prisma.designFile.findFirstOrThrow({where:{designId:d.id,fileType:'print_file'}});return {sessionId,d,o,file,bytes,designData};
 }
 async function request(s:Awaited<ReturnType<typeof setup>>,renew=false){
  const n=vi.mocked(emailService.sendApprovalRequest).mock.calls.length;
  const result=await approvalService.requestApproval(s.o.id,{role:'ADMIN'},{printFileId:s.file.id,dielineFileId:null,renew});
  const call=vi.mocked(emailService.sendApprovalRequest).mock.calls[n];const token=call?new URL(call[1]).searchParams.get('token')!:'';return {result,token};
 }
 it('real save binds file to saved hash; proof+production copy use those exact bytes and approve once',async()=>{
  const s=await setup();expect((s.file.metadata as any).approvalContentHash).toBe(approvalContentHash(s.d));
  const {result,token}=await request(s);const r=await prisma.approvalRequest.findUniqueOrThrow({where:{id:result.requestId}});
  expect(r.printSha256).toBe(approvalBytesHash(s.bytes));expect(await fetchStoredFile(r.printSnapshotUrl)).toEqual(s.bytes);expect(r.proofFileId).toBeTruthy();expect(r.proofSha256).toBe(approvalBytesHash(await fetchStoredFile(r.proofUrl!)));
  expect(await proofGeneratorService.getProof(s.o.id)).toEqual({proofUrl:r.proofUrl});await approvalService.approveOrder(s.o.id,token);await expect(approvalService.approveOrder(s.o.id,token)).rejects.toThrow();
 });
 it('edit through real save stales old proof; old input cannot be silently reused',async()=>{
  const s=await setup();const {token}=await request(s);await designService.saveDesign({sessionId:s.sessionId,designData:{marker:'B',layers:[]}},userId);
  await expect(approvalService.approveOrder(s.o.id,token)).rejects.toThrow(/changed/);
  await expect(request(s,true)).rejects.toThrow(/Legacy or stale/);
  expect((await prisma.order.findUniqueOrThrow({where:{id:s.o.id}})).status).toBe('awaiting_approval');
 });
 it('explicit renewal supersedes old token and idempotent duplicate does not resend',async()=>{
  const s=await setup();const a=await request(s);const count=vi.mocked(emailService.sendApprovalRequest).mock.calls.length;
  const duplicate=await request(s);expect(duplicate.result.reused).toBe(true);expect(vi.mocked(emailService.sendApprovalRequest).mock.calls.length).toBe(count);
  const b=await request(s,true);expect(b.result.requestId).not.toBe(a.result.requestId);await expect(approvalService.approveOrder(s.o.id,a.token)).rejects.toThrow();await approvalService.approveOrder(s.o.id,b.token);
 });
 it('file insertion failure rolls back design content, rather than returning a partial save',async()=>{
  const s=await setup();
  // Required-field validation fails inside the real transaction, rolling back its prior design update.
  await expect(designService.saveDesign({sessionId:s.sessionId,designData:{marker:'SHOULD_ROLL_BACK'},files:[{fileType:'print_file',fileName:null as any,fileUrl:s.file.fileUrl}]},userId)).rejects.toThrow();
  expect((await prisma.design.findUniqueOrThrow({where:{id:s.d.id}})).designData).toEqual(s.designData);
 });
 it('uncertain provider result is durable and never auto-resends',async()=>{
  const s=await setup();vi.mocked(emailService.sendApprovalRequest).mockRejectedValueOnce(new Error('ambiguous timeout'));
  const a=await request(s);expect(a.result.deliveryState).toBe('uncertain');const n=vi.mocked(emailService.sendApprovalRequest).mock.calls.length;
  const b=await request(s);expect(b.result.reused).toBe(true);expect(b.result.deliveryState).toBe('uncertain');expect(vi.mocked(emailService.sendApprovalRequest).mock.calls.length).toBe(n);
 });
 it('PO and PDF consume approved frozen bytes, not a newly appended first/latest input',async()=>{
  const s=await setup();await prisma.orderItem.create({data:{orderId:s.o.id,productType:'box',quantity:10,dimensions:{length:20,width:20,height:20},unitPrice:2,totalPrice:20,designId:s.d.id}});
  const {result,token}=await request(s);await approvalService.approveOrder(s.o.id,token);
  const r=await prisma.approvalRequest.findUniqueOrThrow({where:{id:result.requestId}});
  const vu=await prisma.user.create({data:{email:`approval-vendor-${Date.now()}@test.local`,passwordHash:'unused',role:'VENDOR',vendor:{create:{companyName:'Test vendor',address:'Test',city:'Test',country:'EG'}}},include:{vendor:true}});
  const route=vi.spyOn(vendorRouterService,'routeOrder').mockResolvedValue({selectedVendor:vu.vendor!} as any);
  try{
   await prisma.designFile.create({data:{designId:s.d.id,fileType:'print_file',fileName:'unselected.png',fileUrl:'/api/files/not-selected.png'}});
   const pos=await poService.createPO(s.o.id,'ADMIN');
   const rows=await prisma.purchaseOrder.findMany({where:{orderId:s.o.id}});expect(rows).toHaveLength(1);expect(rows[0].printFileUrl).toBe(r.printSnapshotUrl);expect(rows[0].poDocumentUrl).toBeTruthy();expect(await fetchStoredFile(rows[0].poDocumentUrl!)).toEqual(expect.any(Buffer));expect(pos).toBeTruthy();
   await expect(approvalService.reopenApproval(s.o.id,{role:'ADMIN'},'Completed PO must prevent reopening')).rejects.toMatchObject({statusCode:409});
  }finally{route.mockRestore();await prisma.handshake.deleteMany({where:{vendorId:vu.vendor!.id}});await prisma.purchaseOrder.deleteMany({where:{vendorId:vu.vendor!.id}});await prisma.user.delete({where:{id:vu.id}})}
 });

 it('barrier: save while proof is staged makes finalization fail with no usable token/email',async()=>{
  const s=await setup();let staged!:()=>void,release!:()=>void;
  const entered=new Promise<void>(r=>staged=r);const gate=new Promise<void>(r=>release=r);
  const original=fileUploadService.uploadFile.bind(fileUploadService);
  const upload=vi.spyOn(fileUploadService,'uploadFile').mockImplementation(async(...args)=>{const result=await original(...args);if(args[1].startsWith('proof-')){staged();await gate}return result});
  const before=vi.mocked(emailService.sendApprovalRequest).mock.calls.length;
  const pending=approvalService.requestApproval(s.o.id,{role:'ADMIN'},{printFileId:s.file.id,dielineFileId:null});
  try{await entered;await designService.saveDesign({sessionId:s.sessionId,designData:{marker:'B'}},userId);release();await expect(pending).rejects.toThrow(/changed/);expect(await prisma.orderApprovalToken.count({where:{orderId:s.o.id}})).toBe(0);expect(vi.mocked(emailService.sendApprovalRequest).mock.calls.length).toBe(before);expect((await prisma.approvalRequest.findFirstOrThrow({where:{orderId:s.o.id}})).status).toBe('failed')}finally{release();upload.mockRestore()}
 });
 it('barrier: renewed generation cannot finalize or email after its replacement',async()=>{
  const s=await setup();let staged!:()=>void,release!:()=>void;let blocked=false;
  const entered=new Promise<void>(r=>staged=r);const gate=new Promise<void>(r=>release=r);const original=fileUploadService.uploadFile.bind(fileUploadService);
  const upload=vi.spyOn(fileUploadService,'uploadFile').mockImplementation(async(...args)=>{const result=await original(...args);if(args[1].startsWith('proof-')&&!blocked){blocked=true;staged();await gate}return result});
  const pending=approvalService.requestApproval(s.o.id,{role:'ADMIN'},{printFileId:s.file.id,dielineFileId:null});
  try{await entered;const b=await request(s,true);release();await expect(pending).rejects.toThrow(/changed/);expect(await prisma.orderApprovalToken.count({where:{orderId:s.o.id}})).toBe(1);await approvalService.approveOrder(s.o.id,b.token)}finally{release();upload.mockRestore()}
 });
 it('snapshot bytes altered after finalization fail approval without consuming token',async()=>{
  const s=await setup();const {result,token}=await request(s);const r=await prisma.approvalRequest.findUniqueOrThrow({where:{id:result.requestId}});
  const {writeFile}=await import('fs/promises');const path=await import('path');await writeFile(path.resolve('.data/uploads',r.printSnapshotUrl.replace('/api/files/','')),Buffer.from('tampered'));
  await expect(approvalService.approveOrder(s.o.id,token)).rejects.toThrow(/changed/);expect((await prisma.orderApprovalToken.findFirstOrThrow({where:{orderId:s.o.id}})).consumedAt).toBeNull();
 });

 it('admin reopens approved edited content before PO, invalidates old approval and requires a fresh explicit request',async()=>{
  const s=await setup();const a=await request(s);await approvalService.approveOrder(s.o.id,a.token);await designService.saveDesign({sessionId:s.sessionId,designData:{marker:'B'}},userId);
  const sent=vi.mocked(emailService.sendApprovalRequest).mock.calls.length;
  await expect(approvalService.reopenApproval(s.o.id,{role:'CUSTOMER'},'Customer should not reopen')).rejects.toMatchObject({statusCode:403});
  await approvalService.reopenApproval(s.o.id,{role:'ADMIN'},'Artwork changed after approval');
  expect(vi.mocked(emailService.sendApprovalRequest).mock.calls.length).toBe(sent);const order=await prisma.order.findUniqueOrThrow({where:{id:s.o.id}});expect(order.status).toBe('pending_review');expect(order.approvedAt).toBeNull();expect((await prisma.approvalRequest.findUniqueOrThrow({where:{id:a.result.requestId}})).status).toBe('superseded');
  await expect(approvalService.approveOrder(s.o.id,a.token)).rejects.toThrow();await expect(request(s,true)).rejects.toThrow(/Legacy or stale/);
  await designService.saveDesign({sessionId:s.sessionId,designData:{marker:'B'},files:[{fileType:'print_file',fileName:'fresh.png',fileUrl:s.file.fileUrl,mimeType:'image/png'}]},userId);
  const fresh=await prisma.designFile.findFirstOrThrow({where:{designId:s.d.id,fileType:'print_file'},orderBy:{createdAt:'desc'}});const b=await request({...s,file:fresh},true);await approvalService.approveOrder(s.o.id,b.token);expect((await prisma.order.findUniqueOrThrow({where:{id:s.o.id}})).status).toBe('ready_for_routing');
 });
 it('PO creation vs explicit reopening serialize on the order; any PO row blocks reopening',async()=>{
  const s=await setup();await prisma.orderItem.create({data:{orderId:s.o.id,productType:'box',quantity:10,dimensions:{length:20,width:20,height:20},unitPrice:2,totalPrice:20,designId:s.d.id}});const a=await request(s);await approvalService.approveOrder(s.o.id,a.token);
  const vu=await prisma.user.create({data:{email:`reopen-vendor-${Date.now()}@test.local`,passwordHash:'unused',role:'VENDOR',vendor:{create:{companyName:'Test',address:'Test',city:'Test',country:'EG'}}},include:{vendor:true}});
  const route=vi.spyOn(vendorRouterService,'routeOrder').mockResolvedValue({selectedVendor:vu.vendor!} as any);
  try{
   const results=await Promise.allSettled([poService.createPO(s.o.id,'ADMIN'),approvalService.reopenApproval(s.o.id,{role:'ADMIN'},'Admin explicitly requests fresh review')]);
   expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);const rows=await prisma.purchaseOrder.findMany({where:{orderId:s.o.id}});const o=await prisma.order.findUniqueOrThrow({where:{id:s.o.id}});
   if(rows.length){expect(o.status).toBe('ready_for_routing');await expect(approvalService.reopenApproval(s.o.id,{role:'ADMIN'},'No reopen after PO exists')).rejects.toMatchObject({statusCode:409})}else{expect(o.status).toBe('pending_review');await expect(poService.createPO(s.o.id,'ADMIN')).rejects.toThrow()}
   // Independently cover the incomplete-row guard, regardless of which racer won.
   if(!rows.length)await prisma.purchaseOrder.create({data:{orderId:s.o.id,vendorId:vu.vendor!.id,poNumber:`incomplete-${Date.now()}`,vendorCost:1}});
   await prisma.order.update({where:{id:s.o.id},data:{status:'ready_for_routing'}});
   await expect(approvalService.reopenApproval(s.o.id,{role:'ADMIN'},'Incomplete PO still prevents reopening')).rejects.toMatchObject({statusCode:409});
  }finally{route.mockRestore();await prisma.handshake.deleteMany({where:{vendorId:vu.vendor!.id}});await prisma.purchaseOrder.deleteMany({where:{vendorId:vu.vendor!.id}});await prisma.user.delete({where:{id:vu.id}})}
 });

 it('barrier: reopening while renewal proof is staged invalidates both old token and staged generation without a send',async()=>{
  const s=await setup();const old=await request(s);let staged!:()=>void,release!:()=>void;const entered=new Promise<void>(r=>staged=r),gate=new Promise<void>(r=>release=r);const original=fileUploadService.uploadFile.bind(fileUploadService);
  const upload=vi.spyOn(fileUploadService,'uploadFile').mockImplementation(async(...args)=>{const result=await original(...args);if(args[1].startsWith('proof-')){staged();await gate}return result});
  const sent=vi.mocked(emailService.sendApprovalRequest).mock.calls.length;const pending=request(s,true);
  try{await entered;await approvalService.reopenApproval(s.o.id,{role:'ADMIN'},'Admin reopens while new proof is staged');release();await expect(pending).rejects.toThrow(/changed/);await expect(approvalService.approveOrder(s.o.id,old.token)).rejects.toThrow();expect(vi.mocked(emailService.sendApprovalRequest).mock.calls.length).toBe(sent);expect(await prisma.orderApprovalToken.count({where:{orderId:s.o.id,consumedAt:null}})).toBe(0);expect((await prisma.order.findUniqueOrThrow({where:{id:s.o.id}})).status).toBe('pending_review')}finally{release();upload.mockRestore()}
 });
 it('barrier: PO preflight cannot commit after admin reopening wins the order boundary',async()=>{
  const s=await setup();await prisma.orderItem.create({data:{orderId:s.o.id,productType:'box',quantity:10,dimensions:{length:20,width:20,height:20},unitPrice:2,totalPrice:20,designId:s.d.id}});const a=await request(s);await approvalService.approveOrder(s.o.id,a.token);
  let entered!:()=>void,release!:()=>void;const staged=new Promise<void>(r=>entered=r),gate=new Promise<void>(r=>release=r);
  const route=vi.spyOn(vendorRouterService,'routeOrder').mockImplementation(async()=>{entered();await gate;return {selectedVendor:{id:'should-never-be-used'}} as any});const pending=poService.createPO(s.o.id,'ADMIN');
  try{await staged;await approvalService.reopenApproval(s.o.id,{role:'ADMIN'},'Admin reopening wins before PO commit');release();await expect(pending).rejects.toThrow(/status changed/);expect(await prisma.purchaseOrder.count({where:{orderId:s.o.id}})).toBe(0)}finally{release();route.mockRestore()}
 });
 it('zz-race: PO claimed and uncommitted blocks reopen; after commit reopen must 409',async()=>{
  const s=await setup();await prisma.orderItem.create({data:{orderId:s.o.id,productType:'box',quantity:10,dimensions:{length:20,width:20,height:20},unitPrice:2,totalPrice:20,designId:s.d.id}});const a=await request(s);await approvalService.approveOrder(s.o.id,a.token);
  const vu=await prisma.user.create({data:{email:`zzrace-${Date.now()}@test.local`,passwordHash:'unused',role:'VENDOR',vendor:{create:{companyName:'Test',address:'Test',city:'Test',country:'EG'}}},include:{vendor:true}});
  let locked!:()=>void,release!:()=>void;const lk=new Promise<void>(r=>locked=r),gate=new Promise<void>(r=>release=r);
  const po=prisma.$transaction(async tx=>{await tx.order.updateMany({where:{id:s.o.id,status:'ready_for_routing'},data:{status:'ready_for_routing'}});await tx.purchaseOrder.create({data:{orderId:s.o.id,vendorId:vu.vendor!.id,poNumber:`zzrace-${Date.now()}`,vendorCost:1}});locked();await gate},{timeout:30000});
  try{
   await lk;let state='pending';const re=approvalService.reopenApproval(s.o.id,{role:'ADMIN'},'Race control reopen attempt').then(()=>state='fulfilled',e=>state='rejected:'+(e.statusCode||e.message));
   await new Promise(r=>setTimeout(r,1500));const mid=state;release();await po;await re;
   const rows=await prisma.purchaseOrder.count({where:{orderId:s.o.id}});const o=await prisma.order.findUniqueOrThrow({where:{id:s.o.id}});
   console.log('ZZRACE mid:',mid,'final:',state,'poRows:',rows,'order:',o.status);
   expect(rows).toBe(1);expect(state).toBe('rejected:409');expect(o.status).toBe('ready_for_routing');
  }finally{release();await prisma.handshake.deleteMany({where:{vendorId:vu.vendor!.id}});await prisma.purchaseOrder.deleteMany({where:{vendorId:vu.vendor!.id}});await prisma.user.delete({where:{id:vu.id}}).catch(()=>{})}
 },60000);

 it('unsafe approval frontend configuration fails before durable or external issuance effects',async()=>{
  const s=await setup();const sent=vi.mocked(emailService.sendApprovalRequest).mock.calls.length;const upload=vi.spyOn(fileUploadService,'uploadFile');const previous=process.env.FRONTEND_URL;
  try{for(const bad of [undefined,'','relative/path','javascript:alert(1)','https://user:pass@example.test','https://example.test/?secret=yes','https://example.test/#fragment']){if(bad===undefined)delete process.env.FRONTEND_URL;else process.env.FRONTEND_URL=bad;await expect(request(s)).rejects.toMatchObject({statusCode:500});expect(await prisma.approvalRequest.count({where:{orderId:s.o.id}})).toBe(0);expect(await prisma.orderApprovalToken.count({where:{orderId:s.o.id}})).toBe(0);expect((await prisma.order.findUniqueOrThrow({where:{id:s.o.id}})).status).toBe('pending_review')}
   expect(upload).not.toHaveBeenCalled();expect(vi.mocked(emailService.sendApprovalRequest).mock.calls.length).toBe(sent);
  }finally{process.env.FRONTEND_URL=previous;upload.mockRestore()}
 });
 it('valid configured frontend subpath produces a usable absolute bound approval URL',async()=>{
  const s=await setup(),previous=process.env.FRONTEND_URL;try{process.env.FRONTEND_URL='https://review.example.test/shop/';const a=await request(s);const call=vi.mocked(emailService.sendApprovalRequest).mock.calls.at(-1)!;expect(new URL(call[1]).pathname).toBe(`/shop/orders/${s.o.id}/approve`);expect(a.token).toHaveLength(64);await approvalService.approveOrder(s.o.id,a.token)}finally{process.env.FRONTEND_URL=previous}
 });

});
