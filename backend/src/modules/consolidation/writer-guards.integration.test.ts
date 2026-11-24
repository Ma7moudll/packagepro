import {beforeAll,afterAll,beforeEach,describe,it,expect,vi} from 'vitest';

vi.mock('../notifications/notifications.service',()=>({notificationService:{createIfUnseenInTx:vi.fn().mockResolvedValue({created:false})}}));
import {productionService} from '../production/production.service';
import {qaService} from '../production/qa.service';
import {handshakeService} from '../handshakes/handshake.service';
import {orderService} from '../orders/order.service';
import {prisma} from '../../lib/prisma';


describe.skipIf(process.env.PACKAGEPRO_CONSOLIDATION_DB!=='yes')('local writer guards candidate',()=>{
 let actor:any,stranger:any,order:any,po:any,item:any,hub:any,allocations:any[];let validated=false;
 beforeAll(async()=>{
  const u=new URL(process.env.DATABASE_URL||'');
  if(!['localhost','127.0.0.1'].includes(u.hostname)||!/^\/packagepro_e2e_consolidation_[a-z0-9]+$/.test(u.pathname)||process.env.NODE_ENV!=='test'||process.env.EMAIL_PROVIDER!=='test')throw Error('Fresh disposable local DB required');
  if(await prisma.user.count()||await prisma.order.count())throw Error('Empty business DB required');
  validated=true;
 });
 beforeEach(async()=>{
  // Truncate only the validated disposable fixture, not a service operation.
  await prisma.$executeRawUnsafe('TRUNCATE consolidation_confirmations, consolidation_receipt_events');await prisma.consolidationManifest.deleteMany();await prisma.consolidationCapability.deleteMany();await prisma.consolidationHub.deleteMany();
  await prisma.orderItem.updateMany({data:{designId:null}});await prisma.design.deleteMany();
  await prisma.settlement.deleteMany();await prisma.notification.deleteMany();await prisma.handshake.deleteMany();await prisma.payment.deleteMany();await prisma.sample.deleteMany();await prisma.production.deleteMany();await prisma.purchaseOrder.deleteMany();await prisma.orderItem.deleteMany();await prisma.order.deleteMany();await prisma.vendor.deleteMany();await prisma.customer.deleteMany();await prisma.user.deleteMany();
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
 afterAll(async()=>{if(validated)await prisma.$disconnect();});



 const admin=()=>({userId:stranger.id,role:'ADMIN'});
 const run=(p=po)=>prisma.production.create({data:{poId:p.id,vendorId:p.vendorId,status:'in_progress',progressPercent:50}});
 const second=()=>prisma.purchaseOrder.create({data:{orderId:order.id,vendorId:po.vendorId,poNumber:'QA-SECOND',productType:'box',status:'confirmed',vendorCost:30}});
 it('first factory completion leaves parent in production and second run can start',async()=>{
  const p2=await second(),r1=await run();await productionService.updateProgress(r1.id,100,undefined,admin());expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('in_production');const r2=await productionService.startProduction(p2.id,admin());expect(r2.status).toBe('in_progress');await productionService.updateProgress(r2.id,100,undefined,admin());expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('quality_check');expect(await prisma.shipment.count()).toBe(0);expect(await prisma.payment.count()).toBe(0);
 });
 it('single factory completion still yields factory quality stage, not ready or shipped',async()=>{const r=await run();await productionService.updateProgress(r.id,100,undefined,admin());expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('quality_check');});
 it('unconfirmed other PO blocks aggregate completion',async()=>{const p2=await second();await prisma.purchaseOrder.update({where:{id:p2.id},data:{status:'pending'}});await prisma.production.create({data:{poId:p2.id,vendorId:p2.vendorId,status:'completed',progressPercent:100}});const r=await run();await productionService.updateProgress(r.id,100,undefined,admin());expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('in_production');});
 it('QA of a single run never writes parent ready_to_ship',async()=>{const r=await run();await qaService.completeQA(r.id,{dimensionalAccuracy:true,materialQuality:true,printQuality:true,colorAccuracy:true,finishQuality:true,packaging:true},stranger.id);expect((await prisma.production.findUniqueOrThrow({where:{id:r.id}})).status).toBe('completed');expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('in_production');});
 it.each(['in_production','quality_check','ready_to_ship','shipped','delivered','completed','cancelled'] as const)('late handshake cannot regress %s',async status=>{await prisma.order.update({where:{id:order.id},data:{status}});const h=await prisma.handshake.create({data:{poId:po.id,vendorId:po.vendorId,status:'pending',expiresAt:new Date(Date.now()+60000)}});await handshakeService.acceptHandshake(h.id);expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe(status);});
 it('first handshake advances only ready_for_routing',async()=>{await prisma.order.update({where:{id:order.id},data:{status:'ready_for_routing'}});const h=await prisma.handshake.create({data:{poId:po.id,vendorId:po.vendorId,status:'pending',expiresAt:new Date(Date.now()+60000)}});await handshakeService.acceptHandshake(h.id);expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('vendor_confirmed');});
 it.each([['in_production','quality_check'],['quality_check','ready_to_ship'],['ready_to_ship','shipped']] as const)('generic internal status cannot manufacture %s to %s',async(from,to)=>{await prisma.order.update({where:{id:order.id},data:{status:from}});await expect(orderService.updateOrderStatusInternal(order.id,to)).rejects.toMatchObject({statusCode:409});expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe(from);});
 it('concurrent factory completions serialize and advance once after both finish',async()=>{const p2=await second(),r1=await run(),r2=await run(p2);await Promise.all([productionService.updateProgress(r1.id,100,undefined,admin()),productionService.updateProgress(r2.id,100,undefined,admin())]);expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('quality_check');});
 it('late completion cannot regress a later ready parent',async()=>{const r=await run();await prisma.order.update({where:{id:order.id},data:{status:'ready_to_ship'}});await productionService.updateProgress(r.id,100,undefined,admin());expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('ready_to_ship');});
 it.each([['in_production','quality_check'],['quality_check','ready_to_ship'],['ready_to_ship','shipped']] as const)('generic ADMIN cannot manufacture %s to %s',async(from,to)=>{await prisma.order.update({where:{id:order.id},data:{status:from}});await expect(orderService.updateOrderStatus(order.id,to,stranger.id)).rejects.toMatchObject({statusCode:409});expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe(from);});

 it('late handshake and factory completion use compatible order-first locks',async()=>{const p2=await second(),r1=await run(),r2=await run(p2);await prisma.production.update({where:{id:r2.id},data:{status:'quality_review',progressPercent:100}});const h=await prisma.handshake.create({data:{poId:p2.id,vendorId:p2.vendorId,status:'pending',expiresAt:new Date(Date.now()+60000)}});await Promise.all([productionService.updateProgress(r1.id,100,undefined,admin()),handshakeService.acceptHandshake(h.id)]);expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('quality_check');});

 it('closed other run at99 cannot advance parent until exactly100',async()=>{const p2=await second();await prisma.production.create({data:{poId:p2.id,vendorId:p2.vendorId,status:'quality_review',progressPercent:99}});const r=await run();await productionService.updateProgress(r.id,100,undefined,admin());expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('in_production');});
 it.each(['po','production','handshake'] as const)('barrier: %s lock blocks a nonparticipating writer until commit',async kind=>{
  const p2=await second(),r1=await run(),r2=await run(p2);await prisma.production.update({where:{id:r2.id},data:{status:'quality_review',progressPercent:100}});
  const h=await prisma.handshake.create({data:{poId:p2.id,vendorId:p2.vendorId,status:'pending',expiresAt:new Date(Date.now()+60000)}});
  let release!:()=>void,entered!:()=>void;const wait=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r);const original=prisma.$transaction.bind(prisma);
  const delegateName=kind==='handshake'?'handshake':'purchaseOrder',methodName=kind==='handshake'?'update':'findMany';
  const spy=vi.spyOn(prisma,'$transaction').mockImplementationOnce(((callback:any,...options:any[])=>original(async(tx:any)=>callback(new Proxy(tx,{get(target,key){if(key!==delegateName)return target[key];return new Proxy(target[key],{get(delegate,method){if(method!==methodName)return delegate[method];return async(args:any)=>{entered();await wait;return delegate[method](args)}}})}})),...options)) as any);
  const operation=kind==='handshake'?handshakeService.acceptHandshake(h.id):productionService.updateProgress(r1.id,100,undefined,admin());
  await ready;
  const writer=Promise.resolve(kind==='po'?prisma.purchaseOrder.update({where:{id:p2.id},data:{status:'pending'}}):kind==='production'?prisma.production.update({where:{id:r2.id},data:{progressPercent:99}}):prisma.order.update({where:{id:order.id},data:{status:'cancelled'}}));let blocked=false;
  try{for(let n=0;n<100;n++){const rows=await prisma.$queryRaw<Array<{n:bigint}>>`SELECT count(*)::bigint AS n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE ${'%'+(kind==='po'?'purchase_orders':kind==='production'?'productions':'orders')+'%'}`;if(Number(rows[0].n)>0){blocked=true;break}await new Promise(r=>setTimeout(r,10))}}finally{release()}
  try{await operation;await writer;expect(blocked).toBe(true);expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe(kind==='handshake'?'cancelled':'quality_check');if(kind==='po')expect((await prisma.purchaseOrder.findUniqueOrThrow({where:{id:p2.id}})).status).toBe('pending');if(kind==='production')expect((await prisma.production.findUniqueOrThrow({where:{id:r2.id}})).progressPercent).toBe(99)}finally{spy.mockRestore()}
 });

});
