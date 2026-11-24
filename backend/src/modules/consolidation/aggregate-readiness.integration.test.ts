import {beforeAll,afterAll,beforeEach,describe,it,expect,vi} from 'vitest';
import {ProductionStatus} from '@prisma/client';
import {prisma} from '../../lib/prisma';
import {consolidationService as service} from './consolidation.service';

describe.skipIf(process.env.PACKAGEPRO_CONSOLIDATION_DB!=='yes')('local consolidation receipt candidate',()=>{
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
  await prisma.payment.deleteMany();await prisma.sample.deleteMany();await prisma.production.deleteMany();await prisma.purchaseOrder.deleteMany();await prisma.orderItem.deleteMany();await prisma.order.deleteMany();await prisma.vendor.deleteMany();await prisma.customer.deleteMany();await prisma.user.deleteMany();
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
 const plan=()=>service.plan(order.id,actor.id,hub.id,0,allocations);
 const receive=(rev=0,key='synthetic-event-key-0001',counts={received:100,accepted:100,rejected:0})=>service.recordReceipt(order.id,actor.id,{manifestRevision:1,receiptRevision:rev,allocationId:'part-a',eventKey:key,counts,reason:'Synthetic receiving review'});

 const observe=()=>service.observeAggregateReadiness(order.id,actor.id,hub.id);
 const run=(p=po,status='quality_review',progressPercent=100)=>prisma.production.create({data:{poId:p.id,vendorId:p.vendorId,status:status as any,progressPercent}});
 it('missing manifest/production never derives readiness from parent status or approval',async()=>{
  await prisma.order.update({where:{id:order.id},data:{status:'ready_to_ship',approvedAt:new Date()}});const r=await observe();expect(r.production.allFinished).toBe(false);expect(r.production.blockers).toContain('production_missing');expect(r.receiving.blockers).toContain('manifest_missing');expect(r.dispatch.available).toBe(false);expect(r.approval.timestampRecorded).toBe(true);
 });
 it('one completed factory cannot represent all factories',async()=>{
  const other=await prisma.purchaseOrder.create({data:{orderId:order.id,vendorId:po.vendorId,poNumber:'QA-SECOND',productType:'box',status:'confirmed',vendorCost:30}});await run(po,'completed');await run(other,'in_progress',75);const r=await observe();expect(r.production.allFinished).toBe(false);expect(r.production.blockers).toContain('production_not_finished');expect(r.receiving.eligible).toBe(false);
 });
 it('finished production has no inferred QA, receiving or dispatch authority',async()=>{
  await run(po,'completed');const r=await observe();expect(r.production.allFinished).toBe(true);expect(r.production.qaEvidence).toBe('not_durably_recorded');expect(r.receiving.eligible).toBe(false);expect(r.dispatch.available).toBe(false);expect(r.payment.releasePolicyEvaluated).toBe(false);
 });
 it('full receiving confirmation remains distinct from production and dispatch',async()=>{
  await plan();await receive();await service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1});const before=await prisma.order.findUnique({where:{id:order.id}});const r=await observe();expect(r.receiving.eligible).toBe(true);expect(r.production.allFinished).toBe(false);expect(r.dispatch.available).toBe(false);expect(r.dispatch.reserved).toBe(false);expect(await prisma.order.findUnique({where:{id:order.id}})).toEqual(before);expect(await prisma.shipment.count()).toBe(0);expect(await prisma.payment.count()).toBe(0);
 });
 it('rejected/unreviewed/missing receipt blocks receiving independent of production',async()=>{
  await run();await plan();expect((await observe()).receiving.blockers).toContain('parts_missing');await receive(0,undefined,{received:100,accepted:99,rejected:1});const r=await observe();expect(r.production.allFinished).toBe(true);expect(r.receiving.blockers).toContain('rejected_parts');expect(r.receiving.blockers).toContain('team_confirmation_required');
 });
 it('source change labels stale instead of leaking old eligibility',async()=>{
  await plan();await receive();await service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1});await prisma.orderItem.update({where:{id:item.id},data:{quantity:101}});const r=await observe();expect(r.receiving.current).toBe(false);expect(r.receiving.eligible).toBe(false);expect(r.receiving.blockers).toContain('manifest_source_or_hub_changed');
 });
 it('revoked confirmer blocks another currently authorized observer',async()=>{
  await plan();await receive();await service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1});await prisma.consolidationCapability.create({data:{userId:stranger.id,hubId:hub.id,canReceive:true}});await prisma.consolidationCapability.update({where:{userId_hubId:{userId:actor.id,hubId:hub.id}},data:{canReceive:false}});const r=await service.observeAggregateReadiness(order.id,stranger.id,hub.id);expect(r.receiving.blockers).toContain('confirming_capability_revoked');expect(r.receiving.eligible).toBe(false);
 });
 it('ADMIN and planner-only cannot inspect receiver observations',async()=>{
  await expect(service.observeAggregateReadiness(order.id,stranger.id,hub.id)).rejects.toMatchObject({statusCode:403});await prisma.consolidationCapability.update({where:{userId_hubId:{userId:actor.id,hubId:hub.id}},data:{canReceive:false}});await expect(observe()).rejects.toMatchObject({statusCode:403});
 });
 it('crosshub observation denied',async()=>{
  await plan();await prisma.consolidationHub.create({data:{id:'other',enabled:true}});await prisma.consolidationCapability.create({data:{userId:actor.id,hubId:'other',canReceive:true}});await expect(service.observeAggregateReadiness(order.id,actor.id,'other')).rejects.toMatchObject({statusCode:403});
 });
 it('payment captured status is fact only, no invented release policy',async()=>{
  await prisma.payment.create({data:{orderId:order.id,amount:114,currency:'EGP',status:'captured'}});const before=await prisma.payment.findUnique({where:{orderId:order.id}});const r=await observe();expect(r.payment.recordedStatus).toBe('captured');expect(r.payment.releasePolicyEvaluated).toBe(false);expect(r.dispatch.available).toBe(false);expect(await prisma.payment.findUnique({where:{orderId:order.id}})).toEqual(before);expect(JSON.stringify(r)).not.toMatch(/shippingPhone|shippingAddress|passwordHash|amount/);
 });
 it('unconfirmed PO/mismatched vendor/invalid completion remain blockers',async()=>{
  await run(po,'completed',99);expect((await observe()).production.blockers).toContain('production_not_finished');await prisma.purchaseOrder.update({where:{id:po.id},data:{status:'pending'}});expect((await observe()).production.blockers).toContain('purchase_order_not_confirmed');
 });
 it.each(['production','payment'] as const)('barrier: aggregate observation locks %s facts until its read ends',async(kind)=>{
  const production=await run();await prisma.payment.create({data:{orderId:order.id,amount:114,currency:'EGP',status:'captured'}});await plan();await receive();
  let release!:()=>void,entered!:()=>void;const wait=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r);const original=(service as any).blockers.bind(service);const spy=vi.spyOn(service as any,'blockers').mockImplementationOnce(async(...args:any[])=>{entered();await wait;return original(...args)});
  const observation=observe();await ready;const writer=Promise.resolve(kind==='production'?prisma.production.update({where:{id:production.id},data:{status:'in_progress',progressPercent:50}}):prisma.payment.update({where:{orderId:order.id},data:{status:'refunded'}}));
  let blocked=false;try{for(let n=0;n<100;n++){const rows=await prisma.$queryRaw<Array<{n:bigint}>>`SELECT count(*)::bigint AS n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE ${'%'+(kind==='production'?'productions':'payments')+'%'}`;if(Number(rows[0].n)>0){blocked=true;break}await new Promise(r=>setTimeout(r,10))}}finally{release()}
  const result=await observation;await writer;spy.mockRestore();expect(blocked).toBe(true);if(kind==='production'){expect(result.production.allFinished).toBe(true);expect((await observe()).production.allFinished).toBe(false)}else{expect(result.payment.recordedStatus).toBe('captured');expect((await observe()).payment.recordedStatus).toBe('refunded')}
 });

 it('zero PO cannot vacuously count as all finished',async()=>{await prisma.purchaseOrder.delete({where:{id:po.id}});const r=await observe();expect(r.production.allFinished).toBe(false);expect(r.production.blockers).toContain('no_purchase_orders');});
 it('production for another vendor is not completion evidence',async()=>{const other=await prisma.vendor.create({data:{userId:stranger.id,companyName:'Synthetic second vendor',address:'Test',city:'Test',country:'EG'}});await prisma.production.create({data:{poId:po.id,vendorId:other.id,status:'completed',progressPercent:100}});const r=await observe();expect(r.production.allFinished).toBe(false);expect(r.production.blockers).toContain('production_vendor_mismatch');});
 it.each(Object.values(ProductionStatus))('finished status set at100 is exact: %s',async status=>{await run(po,status,100);const r=await observe();expect(r.production.allFinished).toBe(['quality_review','completed'].includes(status));if(!['quality_review','completed'].includes(status))expect(r.production.blockers).toContain('production_not_finished');});
 it('approvedAt observation follows both directions without implying verified approval',async()=>{expect((await observe()).approval).toEqual({timestampRecorded:false});await prisma.order.update({where:{id:order.id},data:{approvedAt:new Date()}});expect((await observe()).approval).toEqual({timestampRecorded:true});await prisma.order.update({where:{id:order.id},data:{approvedAt:null}});expect((await observe()).approval).toEqual({timestampRecorded:false});});
 it('barrier: confirmer revocation waits for aggregate capability read',async()=>{
  await plan();await receive();await service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1});await prisma.consolidationCapability.create({data:{userId:stranger.id,hubId:hub.id,canReceive:true}});
  let release!:()=>void,entered!:()=>void;const wait=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r);const original=prisma.$transaction.bind(prisma);
  const spy=vi.spyOn(prisma,'$transaction').mockImplementationOnce(((callback:any,...options:any[])=>original(async(tx:any)=>callback(new Proxy(tx,{get(target,key){if(key!=='consolidationCapability')return target[key];return new Proxy(target[key],{get(delegate,method){if(method!=='findUnique')return delegate[method];return async(args:any)=>{const result=await delegate.findUnique(args);if(args.where?.userId_hubId?.userId===actor.id){entered();await wait}return result}}})}})),...options)) as any);
  const observation=service.observeAggregateReadiness(order.id,stranger.id,hub.id);await ready;const writer=Promise.resolve(prisma.consolidationCapability.update({where:{userId_hubId:{userId:actor.id,hubId:hub.id}},data:{canReceive:false}}));let blocked=false;
  try{for(let n=0;n<100;n++){const rows=await prisma.$queryRaw<Array<{n:bigint}>>`SELECT count(*)::bigint AS n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%consolidation_capabilities%'`;if(Number(rows[0].n)>0){blocked=true;break}await new Promise(r=>setTimeout(r,10))}}finally{release()}
  const r=await observation;await writer;spy.mockRestore();expect(blocked).toBe(true);expect(r.receiving.eligible).toBe(true);expect((await service.observeAggregateReadiness(order.id,stranger.id,hub.id)).receiving.blockers).toContain('confirming_capability_revoked');
 });

});
