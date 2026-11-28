import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import Fastify from 'fastify';
import sharp from 'sharp';
import {prisma} from '../../lib/prisma';
import {approvalRoutes,orderRoutes} from './order.routes';
import {jwtService} from '../auth/services/jwt.service';
import {designService} from '../designs/design.service';
import {fileUploadService} from '../../services/file-upload/upload.service';
import {emailService} from '../../services/email/email.service';
const priorFrontendUrl=process.env.FRONTEND_URL;
beforeAll(()=>{process.env.FRONTEND_URL='http://localhost:3001'});
afterAll(()=>{if(priorFrontendUrl===undefined)delete process.env.FRONTEND_URL;else process.env.FRONTEND_URL=priorFrontendUrl});
vi.mock('../../services/email/email.service',()=>({emailService:{sendApprovalRequest:vi.fn().mockResolvedValue(undefined)}}));
describe('HTTP approval boundary with real DB and storage',()=>{
 const app=Fastify();let owner:any,admin:any,order:any,design:any,file:any;let token='';
 beforeAll(async()=>{
  app.setErrorHandler((e:any,_req,reply)=>reply.code(e.statusCode||(e.name==='ZodError'?400:500)).send({success:false,error:e.message}));await app.register(orderRoutes,{prefix:'/api'});await app.register(approvalRoutes,{prefix:'/api'});await app.ready();
  owner=await prisma.user.create({data:{email:`approval-http-owner-${Date.now()}@test.local`,passwordHash:'x',emailVerified:true,customer:{create:{}}},include:{customer:true}});admin=await prisma.user.create({data:{email:`approval-http-admin-${Date.now()}@test.local`,passwordHash:'x',emailVerified:true,role:'ADMIN'}});
  order=await prisma.order.create({data:{orderNumber:`approval-http-${Date.now()}`,customerId:owner.customer.id,status:'pending_review',subtotal:20,total:20,tax:0,shippingCost:0,shippingAddress:{},shippingName:'Test',shippingPhone:'local'}});
  const bytes=await sharp({create:{width:20,height:20,channels:3,background:'#fff'}}).png().toBuffer();const sessionId=`approval-http-${Date.now()}`;const d0=await designService.saveDesign({sessionId,designData:{layers:[]}},owner.id);const upload=await fileUploadService.uploadFile(bytes,'http.png','image/png',`designs/${d0.id}`);
  design=await designService.saveDesign({sessionId,designData:{layers:[]},files:[{fileType:'print_file',fileName:'http.png',fileUrl:upload.fileUrl,mimeType:'image/png'}]},owner.id);await prisma.design.update({where:{id:design.id},data:{orderId:order.id}});file=await prisma.designFile.findFirstOrThrow({where:{designId:design.id,fileType:'print_file'}});
 });
 afterAll(async()=>{await app.close();await prisma.design.delete({where:{id:design.id}});await prisma.order.delete({where:{id:order.id}});await prisma.user.deleteMany({where:{id:{in:[owner.id,admin.id]}}})});
 function auth(user:any){return {authorization:`Bearer ${jwtService.generateAccessToken(user.id,user.email,user.role)}`}}
 it('rejects unauthenticated/customer, requires explicit body and returns current request to authorized owner',async()=>{
  const url=`/api/orders/${order.id}/request-approval`,payload={printFileId:file.id,dielineFileId:null};
  expect((await app.inject({method:'POST',url,payload})).statusCode).toBe(401);
  expect((await app.inject({method:'POST',url,payload,headers:auth(owner)})).statusCode).toBe(403);
  expect((await app.inject({method:'POST',url,payload:{},headers:auth(admin)})).statusCode).toBe(400);
  const r=await app.inject({method:'POST',url,payload,headers:auth(admin)});expect(r.statusCode).toBe(200);expect(r.json().data.deliveryState).toBe('sent');token=new URL(vi.mocked(emailService.sendApprovalRequest).mock.calls[0][1]).searchParams.get('token')!;
  const read=await app.inject({method:'GET',url:`/api/orders/${order.id}`,headers:auth(owner)});expect(read.statusCode).toBe(200);expect(read.json().data.currentApprovalRequest.proofUrl).toBeTruthy();expect(read.json().data.approvalRequests).toBeUndefined();
 });
 it('public approval still requires exact valid token, once only',async()=>{
  const url=`/api/orders/${order.id}/approve`;expect((await app.inject({method:'POST',url,payload:{token:'bad'}})).statusCode).toBe(400);
  expect((await app.inject({method:'POST',url,payload:{token}})).statusCode).toBe(200);
  expect((await app.inject({method:'POST',url,payload:{token}})).statusCode).toBe(400);
 });
 it('HTTP reopen is admin-only, validates reason, invalidates approval, and sends no email',async()=>{
  const url=`/api/orders/${order.id}/reopen-approval`,payload={reason:'Artwork needs a fresh review'};const sent=vi.mocked(emailService.sendApprovalRequest).mock.calls.length;
  expect((await app.inject({method:'POST',url,payload})).statusCode).toBe(401);expect((await app.inject({method:'POST',url,payload,headers:auth(owner)})).statusCode).toBe(403);expect((await app.inject({method:'POST',url,payload:{reason:'short'},headers:auth(admin)})).statusCode).toBe(400);
  expect((await app.inject({method:'POST',url,payload,headers:auth(admin)})).statusCode).toBe(200);expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('pending_review');expect(vi.mocked(emailService.sendApprovalRequest).mock.calls.length).toBe(sent);
  expect((await app.inject({method:'POST',url:`/api/orders/${order.id}/approve`,payload:{token}})).statusCode).toBe(400);
 });

});
