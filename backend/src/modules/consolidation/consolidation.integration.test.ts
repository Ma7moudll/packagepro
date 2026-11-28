import {beforeAll,afterAll,beforeEach,describe,it,expect,vi} from 'vitest';
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
 afterAll(async()=>{if(validated)await prisma.$disconnect();});
 const plan=()=>service.plan(order.id,actor.id,hub.id,0,allocations);
 const receive=(rev=0,key='synthetic-event-key-0001',counts={received:100,accepted:100,rejected:0})=>service.recordReceipt(order.id,actor.id,{manifestRevision:1,receiptRevision:rev,allocationId:'part-a',eventKey:key,counts,reason:'Synthetic receiving review'});
 it('derives exact quantities from order and refuses understated manifest',async()=>{
  allocations[0].required=1;await expect(plan()).rejects.toMatchObject({statusCode:400});expect(await prisma.consolidationManifest.count()).toBe(0);
 });
 it('requires explicit capability, ADMIN alone is insufficient',async()=>{
  await expect(service.plan(order.id,stranger.id,hub.id,0,allocations)).rejects.toMatchObject({statusCode:403});await plan();
  await expect(service.confirm(order.id,stranger.id,{manifestRevision:1,receiptRevision:0})).rejects.toMatchObject({statusCode:403});
 });
 it('same-order PO and item are required, no productType-only allocation',async()=>{
  allocations[0].poId='missing-po';await expect(plan()).rejects.toMatchObject({statusCode:400});allocations[0].poId=po.id;allocations[0].orderItemId='missing-item';await expect(plan()).rejects.toMatchObject({statusCode:400});
 });
 it('missing receipt and received without review cannot confirm',async()=>{
  await plan();await expect(service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:0})).rejects.toMatchObject({statusCode:409});
  await receive(0,undefined,{received:100,accepted:0,rejected:0});await expect(service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1})).rejects.toMatchObject({statusCode:409});
 });
 it('rejection and excess require reconciliation, never automatic release',async()=>{
  await plan();await receive(0,undefined,{received:100,accepted:99,rejected:1});await expect(service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1})).rejects.toMatchObject({statusCode:409});
  await receive(1,'synthetic-event-key-0002',{received:101,accepted:100,rejected:0});await expect(service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:2})).rejects.toMatchObject({statusCode:409});
 });
 it('receipt retry is idempotent but changed replay is refused',async()=>{
  await plan();const first=await receive();const retry=await receive();expect(retry.id).toBe(first.id);expect(await prisma.consolidationReceiptEvent.count()).toBe(1);
  await expect(receive(0,undefined,{received:99,accepted:99,rejected:0})).rejects.toMatchObject({statusCode:409});
 });
 it('team confirmation is required, bound to current revisions, and read-only toward order/shipping',async()=>{
  const before=await prisma.order.findUnique({where:{id:order.id}});await plan();await receive();expect((await service.inspectEligibility(order.id,actor.id)).eligible).toBe(false);
  const first=await service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1});const repeat=await service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1});expect(first.id).toBe(repeat.id);
  expect((await service.inspectEligibility(order.id,actor.id)).eligible).toBe(true);expect(await prisma.order.findUnique({where:{id:order.id}})).toEqual(before);expect(await prisma.shipment.count()).toBe(0);expect(await prisma.payment.count()).toBe(0);
 });
 it('receipt correction invalidates prior confirmation and preserves old event',async()=>{
  await plan();await receive();await service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1});await receive(1,'synthetic-event-key-0002',{received:99,accepted:99,rejected:0});expect((await service.inspectEligibility(order.id,actor.id)).eligible).toBe(false);expect(await prisma.consolidationReceiptEvent.count()).toBe(2);expect(await prisma.consolidationConfirmation.count()).toBe(1);
 });
 it('replanning invalidates receipts and confirmation instead of silently migrating them',async()=>{
  await plan();await receive();await service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1});await service.plan(order.id,actor.id,hub.id,1,allocations);
  expect((await service.inspectEligibility(order.id,actor.id)).eligible).toBe(false);await expect(receive(1,'synthetic-event-key-0002')).rejects.toMatchObject({statusCode:409});
 });
 it('ordered quantity and item configuration changes stale the manifest',async()=>{
  await plan();await prisma.orderItem.update({where:{id:item.id},data:{quantity:101}});await expect(receive()).rejects.toMatchObject({statusCode:409});
  await prisma.orderItem.update({where:{id:item.id},data:{quantity:100,config:{newRevision:true}}});await expect(receive()).rejects.toMatchObject({statusCode:409});
 });
 it('hub revision and revoked receiver capability stop operations',async()=>{
  await plan();await prisma.consolidationHub.update({where:{id:hub.id},data:{revision:2}});await expect(receive()).rejects.toMatchObject({statusCode:409});
  await prisma.consolidationHub.update({where:{id:hub.id},data:{revision:1}});await prisma.consolidationCapability.update({where:{userId_hubId:{userId:actor.id,hubId:hub.id}},data:{canReceive:false}});await expect(receive()).rejects.toMatchObject({statusCode:403});
 });
 it('concurrent same event creates one immutable receipt revision',async()=>{
  await plan();const events=await Promise.all(Array.from({length:6},()=>receive()));expect(new Set(events.map(e=>e.id)).size).toBe(1);expect(await prisma.consolidationReceiptEvent.count()).toBe(1);expect((await prisma.consolidationManifest.findUniqueOrThrow({where:{orderId:order.id}})).receiptRevision).toBe(1);
 });
 it('concurrent different events with same expected revision cannot overwrite each other',async()=>{
  await plan();const results=await Promise.allSettled([receive(),receive(0,'synthetic-event-key-0002')]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
 });
 it('receipt event and manifest counter roll back together on actual DB failure',async()=>{
  await plan();await prisma.$executeRawUnsafe(`CREATE FUNCTION synthetic_receipt_counter_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic receipt rollback'; END $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER synthetic_receipt_counter BEFORE UPDATE ON consolidation_manifests FOR EACH ROW EXECUTE FUNCTION synthetic_receipt_counter_fail()`);
  try{await expect(receive()).rejects.toThrow();expect(await prisma.consolidationReceiptEvent.count()).toBe(0);}finally{await prisma.$executeRawUnsafe('DROP TRIGGER synthetic_receipt_counter ON consolidation_manifests');await prisma.$executeRawUnsafe('DROP FUNCTION synthetic_receipt_counter_fail()');}
 });
 it('closed order refuses consolidation and does not change existing lifecycle status',async()=>{
  await prisma.order.update({where:{id:order.id},data:{status:'cancelled'}});await expect(plan()).rejects.toMatchObject({statusCode:409});expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('cancelled');
 });
 it('planner and receiver capabilities are separate, disabled hub denied',async()=>{
  await prisma.consolidationCapability.update({where:{userId_hubId:{userId:actor.id,hubId:hub.id}},data:{canReceive:false}});await plan();await expect(receive()).rejects.toMatchObject({statusCode:403});
  await prisma.consolidationCapability.update({where:{userId_hubId:{userId:actor.id,hubId:hub.id}},data:{canPlan:false,canReceive:true}});await expect(service.plan(order.id,actor.id,hub.id,1,allocations)).rejects.toMatchObject({statusCode:403});await receive();
  await prisma.consolidationHub.update({where:{id:hub.id},data:{enabled:false}});await expect(service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1})).rejects.toMatchObject({statusCode:403});
 });
 it('plan checks confirmed PO, matching product type and expected revision',async()=>{
  await prisma.purchaseOrder.update({where:{id:po.id},data:{status:'pending'}});await expect(plan()).rejects.toMatchObject({statusCode:400});
  await prisma.purchaseOrder.update({where:{id:po.id},data:{status:'confirmed',productType:'bag'}});await expect(plan()).rejects.toMatchObject({statusCode:400});
  await prisma.purchaseOrder.update({where:{id:po.id},data:{productType:'box'}});await plan();await expect(plan()).rejects.toMatchObject({statusCode:409});
 });
 it('same event key cannot be replayed by a different authorized actor',async()=>{
  await plan();await receive();await prisma.consolidationCapability.create({data:{userId:stranger.id,hubId:hub.id,canReceive:true}});
  await expect(service.recordReceipt(order.id,stranger.id,{manifestRevision:1,receiptRevision:0,allocationId:'part-a',eventKey:'synthetic-event-key-0001',counts:{received:100,accepted:100,rejected:0},reason:'Synthetic receiving review'})).rejects.toMatchObject({statusCode:409});
 });
 it.each([-1,1.5,2147483648])('invalid receipt count %s is refused',async(n)=>{
  await plan();await expect(receive(0,undefined,{received:n,accepted:0,rejected:0})).rejects.toMatchObject({statusCode:400});expect(await prisma.consolidationReceiptEvent.count()).toBe(0);
 });
 it('confirm expected revisions and revoked confirmer are enforced',async()=>{
  await plan();await receive();await expect(service.confirm(order.id,actor.id,{manifestRevision:2,receiptRevision:1})).rejects.toMatchObject({statusCode:409});
  await expect(service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:0})).rejects.toMatchObject({statusCode:409});
  await service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1});await prisma.consolidationCapability.create({data:{userId:stranger.id,hubId:hub.id,canReceive:true}});
  await prisma.consolidationCapability.update({where:{userId_hubId:{userId:actor.id,hubId:hub.id}},data:{canReceive:false}});
  expect((await service.inspectEligibility(order.id,stranger.id)).blockers).toContain('confirming_capability_revoked');
 });
 it('complete receipt without explicit confirmation is not eligible',async()=>{
  await plan();await receive();const result=await service.inspectEligibility(order.id,actor.id);expect(result.eligible).toBe(false);expect(result.blockers).toEqual(['team_confirmation_required']);
 });
 it('database rejects ledger edits/deletes and broken counters independently of service',async()=>{
  await plan();const event=await receive();
  await expect(prisma.consolidationReceiptEvent.update({where:{id:event.id},data:{reason:'tamper'}})).rejects.toThrow();
  await expect(prisma.consolidationReceiptEvent.delete({where:{id:event.id}})).rejects.toThrow();
  await expect(prisma.consolidationManifest.update({where:{orderId:order.id},data:{receiptRevision:5}})).rejects.toThrow();
  const confirm=await service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1});await expect(prisma.consolidationConfirmation.delete({where:{id:confirm.id}})).rejects.toThrow();
 });
 it('database rejects invalid count insertion bypassing service',async()=>{
  await plan();const manifest=await prisma.consolidationManifest.findUniqueOrThrow({where:{orderId:order.id}});
  await expect(prisma.consolidationReceiptEvent.create({data:{manifestId:manifest.id,manifestRevision:1,receiptRevision:1,eventKey:'synthetic-direct-invalid',requestHash:'synthetic',actorId:actor.id,allocationId:'part-a',snapshot:{...allocations[0],received:-1,accepted:0,rejected:0},reason:'Synthetic invalid direct insert'}})).rejects.toThrow();expect(await prisma.consolidationReceiptEvent.count()).toBe(0);
 });

 async function gateConfirmation() {
  let release!:()=>void, entered!:()=>void;
  const wait=new Promise<void>(r=>release=r), ready=new Promise<void>(r=>entered=r);
  const original=(service as any).blockers.bind(service);
  const spy=vi.spyOn(service as any,'blockers').mockImplementationOnce(async(...args:any[])=>{entered();await wait;return original(...args);});
  const confirmation=service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1});
  await ready;return {release,confirmation,spy};
 }
 async function waitForBlockedQuery(fragment:string) {
  const until=Date.now()+3000;
  while(Date.now()<until){
   const rows=await prisma.$queryRaw<Array<{n:bigint}>>`SELECT count(*)::bigint AS n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE ${'%'+fragment+'%'}`;
   if(Number(rows[0].n)>0)return;
   await new Promise(r=>setTimeout(r,10));
  }
  throw Error('Expected actual blocked database writer: '+fragment);
 }
 it('barrier: confirmation holds order lock before receipt correction, which invalidates eligibility afterward',async()=>{
  await plan();await receive();const gate=await gateConfirmation();
  const correction=receive(1,'synthetic-event-key-0002',{received:99,accepted:99,rejected:0});
  try{await waitForBlockedQuery('orders');}finally{gate.release();}
  await gate.confirmation;await correction;gate.spy.mockRestore();expect((await service.inspectEligibility(order.id,actor.id)).eligible).toBe(false);
 });
 it('barrier: confirmation then queued replan leaves no current confirmation or reused receipts',async()=>{
  await plan();await receive();const gate=await gateConfirmation();const replan=service.plan(order.id,actor.id,hub.id,1,allocations);
  try{await waitForBlockedQuery('orders');}finally{gate.release();}
  await gate.confirmation;await replan;gate.spy.mockRestore();const result=await service.inspectEligibility(order.id,actor.id);expect(result.eligible).toBe(false);expect(result.blockers).toContain('team_confirmation_required');
 });
 it.each(['item','po'] as const)('barrier: nonparticipating %s writer waits on its source row, then stales confirmation',async(kind)=>{
  await plan();await receive();const gate=await gateConfirmation();
  const update=kind==='item'?prisma.orderItem.update({where:{id:item.id},data:{quantity:101}}):prisma.purchaseOrder.update({where:{id:po.id},data:{productType:'bag'}});
  // Prisma promises are lazy: explicitly begin the independent writer.
  const writer=Promise.resolve(update);
  try{await waitForBlockedQuery(kind==='item'?'order_items':'purchase_orders');}finally{gate.release();}
  await gate.confirmation;await writer;gate.spy.mockRestore();await expect(service.inspectEligibility(order.id,actor.id)).rejects.toMatchObject({statusCode:409});
 });
 it('design content mutation invalidates the receipt source fingerprint',async()=>{
  const design=await prisma.design.create({data:{name:'Synthetic',designData:{layers:[]}}});await prisma.orderItem.update({where:{id:item.id},data:{designId:design.id}});await plan();await receive();await service.confirm(order.id,actor.id,{manifestRevision:1,receiptRevision:1});
  await prisma.design.update({where:{id:design.id},data:{designData:{layers:[{changed:true}]}}});await expect(service.inspectEligibility(order.id,actor.id)).rejects.toMatchObject({statusCode:409});
 });

 it.each(['hub','capability','design'] as const)('barrier: %s mutation waits during confirmation and blocks later eligibility',async(kind)=>{
  if(kind==='design') {const design=await prisma.design.create({data:{name:'Synthetic lock',designData:{layers:[]}}});await prisma.orderItem.update({where:{id:item.id},data:{designId:design.id}});}
  await plan();await receive();const gate=await gateConfirmation();
  let writer:Promise<unknown>;
  if(kind==='hub')writer=Promise.resolve(prisma.consolidationHub.update({where:{id:hub.id},data:{enabled:false}}));
  else if(kind==='capability')writer=Promise.resolve(prisma.consolidationCapability.update({where:{userId_hubId:{userId:actor.id,hubId:hub.id}},data:{canReceive:false}}));
  else writer=Promise.resolve(prisma.design.updateMany({data:{designData:{layers:[{changed:true}]}}}));
  try{await waitForBlockedQuery(kind==='hub'?'consolidation_hubs':kind==='capability'?'consolidation_capabilities':'designs');}finally{gate.release();}
  await gate.confirmation;await writer;gate.spy.mockRestore();await expect(service.inspectEligibility(order.id,actor.id)).rejects.toMatchObject({statusCode:kind==='design'?409:403});
 });
 it('barrier: capability revocation queued before receipt is rechecked, not cached',async()=>{
  await plan();let release!:()=>void,entered!:()=>void;const ready=new Promise<void>(r=>entered=r),wait=new Promise<void>(r=>release=r);
  const revocation=prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM consolidation_capabilities WHERE "userId"=${actor.id} FOR UPDATE`;await tx.consolidationCapability.update({where:{userId_hubId:{userId:actor.id,hubId:hub.id}},data:{canReceive:false}});entered();await wait;});
  await ready;const outcome=receive().then(()=>({ok:true}),error=>({ok:false,error}));
  try{await waitForBlockedQuery('consolidation_capabilities');}finally{release();}
  await revocation;const result=await outcome;expect(result.ok).toBe(false);if('error' in result)expect(result.error).toMatchObject({statusCode:403});expect(await prisma.consolidationReceiptEvent.count()).toBe(0);
 });
 it.each(['entry','missing-count','string-count','fractional-count'] as const)('DB validate-receipt rejects %s independently',async(kind)=>{
  await plan();const manifest=await prisma.consolidationManifest.findUniqueOrThrow({where:{orderId:order.id}});
  const snapshot:any={...allocations[0],received:100,accepted:100,rejected:0};
  if(kind==='missing-count')delete snapshot.received;if(kind==='string-count')snapshot.received='100';if(kind==='fractional-count')snapshot.received=100.5;
  await expect(prisma.$transaction(async tx=>{await tx.consolidationReceiptEvent.create({data:{manifestId:manifest.id,manifestRevision:1,receiptRevision:1,eventKey:'synthetic-direct-invalid',requestHash:'synthetic',actorId:actor.id,allocationId:kind==='entry'?'foreign': 'part-a',snapshot,reason:'Synthetic trigger check'}});await tx.consolidationManifest.update({where:{id:manifest.id},data:{receiptRevision:1}});})).rejects.toThrow();expect(await prisma.consolidationReceiptEvent.count()).toBe(0);
 });
 it('receipt-side deferred counter trigger refuses a valid event without matching manifest counter',async()=>{
  await plan();const manifest=await prisma.consolidationManifest.findUniqueOrThrow({where:{orderId:order.id}});
  await expect(prisma.consolidationReceiptEvent.create({data:{manifestId:manifest.id,manifestRevision:1,receiptRevision:1,eventKey:'synthetic-orphan-event',requestHash:'synthetic',actorId:actor.id,allocationId:'part-a',snapshot:{...allocations[0],received:100,accepted:100,rejected:0},reason:'Synthetic orphan ledger entry'}})).rejects.toThrow();expect(await prisma.consolidationReceiptEvent.count()).toBe(0);
 });

});
