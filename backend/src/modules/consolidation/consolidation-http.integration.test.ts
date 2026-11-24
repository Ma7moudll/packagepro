import {beforeAll,afterAll,beforeEach,describe,it,expect} from 'vitest';
import Fastify from 'fastify';
import {httpErrorHandler} from '../../utils/http-error-handler';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {jwtService} from '../auth/services/jwt.service';
import {consolidationRoutes} from './consolidation.routes';
describe.skipIf(process.env.PACKAGEPRO_CONSOLIDATION_DB!=='yes')('consolidation HTTP candidate',()=>{
 const app=Fastify();
 let actor:any,stranger:any,order:any,po:any,item:any,hub:any,allocations:any[];let validated=false;
 beforeAll(async()=>{
  process.env.CONSOLIDATION_RECEIPTS_ENABLED="true";
  app.setErrorHandler(httpErrorHandler);await app.register(consolidationRoutes,{prefix:"/api"});await app.ready();
  const u=new URL(process.env.DATABASE_URL||'');
  if(!['localhost','127.0.0.1'].includes(u.hostname)||!/^\/packagepro_e2e_consolidation_[a-z0-9]+$/.test(u.pathname)||process.env.NODE_ENV!=='test'||process.env.EMAIL_PROVIDER!=='test')throw Error('Fresh disposable local DB required');
  if(await prisma.user.count()||await prisma.order.count())throw Error('Empty business DB required');
  validated=true;
 });
 beforeEach(async()=>{
  // Truncate only the validated disposable fixture, not a service operation.
  process.env.CONSOLIDATION_RECEIPTS_ENABLED="true";
  await prisma.$executeRawUnsafe('TRUNCATE consolidation_confirmations, consolidation_receipt_events');await prisma.consolidationManifest.deleteMany();await prisma.consolidationCapability.deleteMany();await prisma.consolidationHub.deleteMany();
  await prisma.orderItem.updateMany({data:{designId:null}});await prisma.design.deleteMany();
  await prisma.purchaseOrder.deleteMany();await prisma.orderItem.deleteMany();await prisma.order.deleteMany();await prisma.vendor.deleteMany();await prisma.customer.deleteMany();await prisma.user.deleteMany();
  actor=await prisma.user.create({data:{email:'receiver@test.invalid',passwordHash:'synthetic',role:'CUSTOMER',customer:{create:{}}},include:{customer:true}});
  stranger=await prisma.user.create({data:{email:'unassigned-admin@test.invalid',passwordHash:'synthetic',role:'ADMIN'}});
  const vendor=await prisma.user.create({data:{email:'factory@test.invalid',passwordHash:'synthetic',role:'VENDOR',vendor:{create:{companyName:'Synthetic factory',address:'Synthetic',city:'Test',country:'EG'}}},include:{vendor:true}});
  order=await prisma.order.create({data:{customerId:actor.customer.id,orderNumber:'QA-CONSOLIDATION',status:'in_production',subtotal:100,tax:14,shippingCost:0,total:114,currency:'EGP',shippingAddress:{synthetic:true},shippingName:'Synthetic',shippingPhone:'synthetic'}});
  item=await prisma.orderItem.create({data:{orderId:order.id,productType:'box',quantity:100,dimensions:{length:1},unitPrice:1,totalPrice:100}});
  po=await prisma.purchaseOrder.create({data:{orderId:order.id,vendorId:vendor.vendor!.id,poNumber:'QA-PO',status:'confirmed',productType:'box',vendorCost:50}});
  hub=await prisma.consolidationHub.create({data:{id:'synthetic-hub',enabled:true}});
  await prisma.consolidationCapability.create({data:{userId:actor.id,hubId:hub.id,canPlan:true,canReceive:true}});
  allocations=[{id:'part-a',orderItemId:item.id,poId:po.id,unit:'piece',required:100}];
 });
 afterAll(async()=>{delete process.env.CONSOLIDATION_RECEIPTS_ENABLED;await app.close();if(validated)await prisma.$disconnect();});

 const headers=(user=actor)=>({authorization:'Bearer '+jwtService.generateAccessToken(user.id,user.email,user.role)});
 const base=()=>'/api/consolidation/orders/'+order.id;
 const makePlan=()=>app.inject({method:'POST',url:base()+'/manifest',headers:headers(),payload:{hubId:hub.id,expectedRevision:0,allocations}});
 const counts={received:100,accepted:100,rejected:0};
 const receipt=()=>({manifestRevision:1,receiptRevision:0,allocationId:'part-a',eventKey:'http-synthetic-event-001',counts,reason:'Synthetic receiving review'});
 it('full HTTP receipt/review requires explicit confirmation and never changes order or buys shipment',async()=>{
  const before=await prisma.order.findUnique({where:{id:order.id}});
  const snapshot=await app.inject({url:base()+'?hubId='+hub.id,headers:headers()});expect(snapshot.statusCode,snapshot.body).toBe(200);expect(snapshot.json().data.manifest).toBe(null);
  expect((await makePlan()).statusCode).toBe(200);
  const event=await app.inject({method:'POST',url:base()+'/receipts',headers:headers(),payload:receipt()});expect(event.statusCode,event.body).toBe(200);
  const pending=await app.inject({url:base()+'/eligibility',headers:headers()});expect(pending.json().data.eligible).toBe(false);
  const confirmed=await app.inject({method:'POST',url:base()+'/confirm',headers:headers(),payload:{manifestRevision:1,receiptRevision:1}});expect(confirmed.statusCode,confirmed.body).toBe(200);
  const eligible=await app.inject({url:base()+'/eligibility',headers:headers()});expect(eligible.json().data.eligible).toBe(true);
  expect(await prisma.order.findUnique({where:{id:order.id}})).toEqual(before);expect(await prisma.shipment.count()).toBe(0);expect(await prisma.payment.count()).toBe(0);
 });
 it('disabled surface refuses every endpoint even a valid granted token',async()=>{
  delete process.env.CONSOLIDATION_RECEIPTS_ENABLED;
  for(const [method,path,payload] of [['GET','?hubId='+hub.id,undefined],['POST','/manifest',{hubId:hub.id,expectedRevision:0,allocations}],['POST','/receipts',receipt()],['POST','/confirm',{manifestRevision:1,receiptRevision:1}],['GET','/eligibility',undefined]] as const){const r=await app.inject({method,url:base()+path,headers:headers(),payload});expect(r.statusCode).toBe(403);}
  expect(await prisma.consolidationManifest.count()).toBe(0);
 });
 it.each(['none','invalid'] as const)('missing or invalid token %s gets401 without mutation',async(kind)=>{
  const r=await app.inject({method:'POST',url:base()+'/manifest',headers:kind==='invalid'?{authorization:'Bearer invalid'}:{},payload:{hubId:hub.id,expectedRevision:0,allocations}});expect(r.statusCode).toBe(401);expect(await prisma.consolidationManifest.count()).toBe(0);
 });
 it('unassigned ADMIN cannot read or mutate; forged userId and role are rejected',async()=>{
  const r=await app.inject({url:base()+'?hubId='+hub.id,headers:headers(stranger)});expect(r.statusCode).toBe(403);
  const forbidden=await app.inject({method:'POST',url:base()+'/manifest',headers:headers(stranger),payload:{hubId:hub.id,expectedRevision:0,allocations}});expect(forbidden.statusCode).toBe(403);
  const forged=await app.inject({method:'POST',url:base()+'/manifest',headers:headers(),payload:{hubId:hub.id,expectedRevision:0,allocations,userId:stranger.id,role:'ADMIN'}});expect(forged.statusCode).toBe(400);expect(await prisma.consolidationManifest.count()).toBe(0);
 });
 it('planner-only can plan but cannot inspect receiver ledger, receive or confirm',async()=>{
  await prisma.consolidationCapability.update({where:{userId_hubId:{userId:actor.id,hubId:hub.id}},data:{canReceive:false}});
  expect((await makePlan()).statusCode).toBe(200);expect((await app.inject({url:base()+'?hubId='+hub.id,headers:headers()})).statusCode).toBe(403);
  expect((await app.inject({method:'POST',url:base()+'/receipts',headers:headers(),payload:receipt()})).statusCode).toBe(403);
  expect((await app.inject({method:'POST',url:base()+'/confirm',headers:headers(),payload:{manifestRevision:1,receiptRevision:0}})).statusCode).toBe(403);
 });
 it('receiver-only cannot plan and cross-hub capability cannot expose manifest',async()=>{
  await makePlan();await prisma.consolidationCapability.update({where:{userId_hubId:{userId:actor.id,hubId:hub.id}},data:{canPlan:false}});expect((await makePlan()).statusCode).toBe(403);
  await prisma.consolidationHub.create({data:{id:'other-hub',enabled:true}});await prisma.consolidationCapability.create({data:{userId:stranger.id,hubId:'other-hub',canReceive:true}});
  const r=await app.inject({url:base()+'?hubId=other-hub',headers:headers(stranger)});expect(r.statusCode).toBe(403);expect(r.body).not.toContain('part-a');
 });
 it('keyed HTTP retry returns same event, changed replay and stale confirm get409',async()=>{
  await makePlan();const send=(payload:any)=>app.inject({method:'POST',url:base()+'/receipts',headers:headers(),payload});
  const first=await send(receipt()), retry=await send(receipt());expect(first.statusCode).toBe(200);expect(retry.json().data.id).toBe(first.json().data.id);
  expect((await send({...receipt(),counts:{received:99,accepted:99,rejected:0}})).statusCode).toBe(409);
  expect((await app.inject({method:'POST',url:base()+'/confirm',headers:headers(),payload:{manifestRevision:1,receiptRevision:0}})).statusCode).toBe(409);expect(await prisma.consolidationReceiptEvent.count()).toBe(1);
 });
 it.each([null,{}, {received:-1,accepted:0,rejected:0},{received:1.5,accepted:0,rejected:0},{received:'100',accepted:100,rejected:0},{received:100,accepted:100,rejected:0,userId:'forged'}])('invalid counts body gets400',async(bad)=>{
  await makePlan();const r=await app.inject({method:'POST',url:base()+'/receipts',headers:headers(),payload:{...receipt(),counts:bad}});expect(r.statusCode).toBe(400);expect(await prisma.consolidationReceiptEvent.count()).toBe(0);
 });
 it('snapshot minimizes unrelated PII and reflects current receipts without false readiness',async()=>{
  await makePlan();await app.inject({method:'POST',url:base()+'/receipts',headers:headers(),payload:receipt()});
  const r=await app.inject({url:base()+'?hubId='+hub.id,headers:headers()});expect(r.statusCode).toBe(200);const data=r.json().data;expect(data.manifest.current).toBe(true);expect(data.receipts).toHaveLength(1);expect(data.items[0].quantity).toBe(100);expect(r.body).not.toContain('password');expect(data.shippingAddress).toBeUndefined();expect(data.customer).toBeUndefined();
 });
 it('all endpoints require verified token, not just manifest creation',async()=>{
  for(const [method,path,payload] of [['GET','?hubId='+hub.id,undefined],['POST','/manifest',{hubId:hub.id,expectedRevision:0,allocations}],['POST','/receipts',receipt()],['POST','/confirm',{manifestRevision:1,receiptRevision:1}],['GET','/eligibility',undefined]] as const){const r=await app.inject({method,url:base()+path,payload});expect(r.statusCode).toBe(401);}
 });
 it('read validation refuses forged actor/query scope and no deleted-user token grants access',async()=>{
  expect((await app.inject({url:base()+'?hubId='+hub.id+'&userId='+stranger.id,headers:headers()})).statusCode).toBe(400);
  const token=headers(stranger);await prisma.user.delete({where:{id:stranger.id}});expect((await app.inject({url:base()+'?hubId='+hub.id,headers:token})).statusCode).toBe(403);
 });
 it('stale source snapshot is marked not current, ledger unchanged by inspection',async()=>{
  await makePlan();await prisma.orderItem.update({where:{id:item.id},data:{quantity:101}});
  const before=await prisma.consolidationManifest.findUnique({where:{orderId:order.id}});const r=await app.inject({url:base()+'?hubId='+hub.id,headers:headers()});expect(r.statusCode).toBe(200);expect(r.json().data.manifest.current).toBe(false);expect(await prisma.consolidationManifest.findUnique({where:{orderId:order.id}})).toEqual(before);
 });

 it('receipt ledger pagination is bounded, stable and explicit about more history',async()=>{
  await makePlan();for(let n=0;n<2;n++)expect((await app.inject({method:'POST',url:base()+'/receipts',headers:headers(),payload:{...receipt(),receiptRevision:n,eventKey:'http-page-event-000'+n}})).statusCode).toBe(200);
  const read=(q:string)=>app.inject({url:base()+'?hubId='+hub.id+q,headers:headers()});
  const first=(await read('&limit=1')).json().data;expect(first.receipts).toHaveLength(1);expect(first.receiptPage).toEqual({after:0,hasMore:true,nextAfter:1});
  const second=(await read('&limit=1&after=1')).json().data;expect(second.receipts).toHaveLength(1);expect(second.receipts[0].receiptRevision).toBe(2);expect(second.receiptPage.hasMore).toBe(false);
  for(const q of ['&limit=101','&after=-1','&after=2147483648','&limit=1e2'])expect((await read(q)).statusCode).toBe(400);
 });

 it('strict validation covers eligibility query, allocation fields and confirmation inputs',async()=>{
  await makePlan();
  expect((await app.inject({url:base()+'/eligibility?role=ADMIN',headers:headers()})).statusCode).toBe(400);
  for(const extra of [{actorId:actor.id},{unit:'kg'},{required:0},{required:2147483648}])expect((await app.inject({method:'POST',url:base()+'/manifest',headers:headers(),payload:{hubId:hub.id,expectedRevision:1,allocations:[{...allocations[0],...extra}]}})).statusCode).toBe(400);
  for(const body of [{manifestRevision:1,receiptRevision:0,actorId:actor.id},{manifestRevision:0,receiptRevision:0},{manifestRevision:1,receiptRevision:-1},{manifestRevision:'1',receiptRevision:0}])expect((await app.inject({method:'POST',url:base()+'/confirm',headers:headers(),payload:body})).statusCode).toBe(400);
 });
 it('HTTP DTOs omit internal actors, reasons, hashes and idempotency keys',async()=>{
  const plan=await makePlan();const event=await app.inject({method:'POST',url:base()+'/receipts',headers:headers(),payload:receipt()});const confirmed=await app.inject({method:'POST',url:base()+'/confirm',headers:headers(),payload:{manifestRevision:1,receiptRevision:1}});const snapshot=await app.inject({url:base()+'?hubId='+hub.id,headers:headers()});
  for(const r of [plan,event,confirmed,snapshot]){expect(r.statusCode).toBe(200);for(const k of ['actorId','createdBy','reason','eventKey','requestHash','sourceHash'])expect(JSON.stringify(r.json().data)).not.toContain('"'+k+'"');}
 });
 it('multiple receipt rows page in ascending revision order without omissions',async()=>{
  await makePlan();for(let n=0;n<4;n++)await app.inject({method:'POST',url:base()+'/receipts',headers:headers(),payload:{...receipt(),receiptRevision:n,eventKey:'http-order-event-00'+n}});
  const page=async(after:number)=>(await app.inject({url:base()+'?hubId='+hub.id+'&limit=2&after='+after,headers:headers()})).json().data;
  const first=await page(0),second=await page(first.receiptPage.nextAfter);expect(first.receipts.map((e:any)=>e.receiptRevision)).toEqual([1,2]);expect(second.receipts.map((e:any)=>e.receiptRevision)).toEqual([3,4]);expect(second.receiptPage.hasMore).toBe(false);
 });
 it('emitted real app registers enabled/disabled endpoints and maps actual network errors',async()=>{
  await makePlan();
  for(const enabled of [false,true]){
  const port=await new Promise<number>((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=(s.address() as any).port;s.close(()=>resolve(p));});});
  const child=spawn(process.execPath,['dist/index.js'],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1',REDIS_ENABLED:'false',REDIS_URL:'',CONSOLIDATION_RECEIPTS_ENABLED:String(enabled)},stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
  try{let ready=false;for(let n=0;n<100;n++){if(child.exitCode!==null)throw Error('Local app boot failed: '+logs);try{if((await fetch('http://127.0.0.1:'+port+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}expect(ready,logs).toBe(true);
   for(const [method,path,payload] of [['GET','?hubId='+hub.id,undefined],['POST','/manifest',{hubId:hub.id,expectedRevision:0,allocations}],['POST','/receipts',receipt()],['POST','/confirm',{manifestRevision:1,receiptRevision:0}],['GET','/eligibility',undefined]] as const){const r=await fetch('http://127.0.0.1:'+port+base()+path,{method,headers:{...headers(),'content-type':'application/json'},body:payload?JSON.stringify(payload):undefined});expect(r.status).toBe(enabled?(method==='GET'||path==='/receipts'?200:409):403);const body=await r.json();if(!enabled)expect(body.error).toBe('AUTHORIZATION_ERROR');}
   if(enabled){const root='http://127.0.0.1:'+port+base();expect((await fetch(root+'?hubId='+hub.id)).status).toBe(401);const invalid=await fetch(root+'/confirm',{method:'POST',headers:{...headers(),'content-type':'application/json'},body:JSON.stringify({manifestRevision:1,receiptRevision:0,role:'ADMIN'})});expect(invalid.status).toBe(400);const missing=await fetch('http://127.0.0.1:'+port+'/api/consolidation/orders/missing/eligibility',{headers:headers()});expect(missing.status).toBe(404);}
  }finally{child.kill('SIGTERM');await new Promise<void>(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',()=>resolve());});writeFileSync('/tmp/consolidation-http-realapp-'+enabled+'.log',logs);}
  }
 });

});
