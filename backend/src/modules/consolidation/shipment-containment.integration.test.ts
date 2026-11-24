import {beforeAll,afterAll,beforeEach,describe,it,expect,vi} from 'vitest';

import Fastify from 'fastify';
import {OrderStatus} from '@prisma/client';
import {httpErrorHandler} from '../../utils/http-error-handler';
import {jwtService} from '../auth/services/jwt.service';
import {shipmentRoutes} from '../shipments/shipment.routes';
import {shipmentService} from '../shipments/shipment.service';
const spies=vi.hoisted(()=>({create:vi.fn().mockResolvedValue({trackingNumber:'synthetic-new-label',labelUrl:'https://example.invalid/synthetic-label',estimatedDeliveryDate:new Date('2026-12-01T00:00:00Z')}),track:vi.fn().mockResolvedValue({status:'in_transit'}),email:vi.fn(),notice:vi.fn(),verify:vi.fn().mockResolvedValue({status:'in_transit',rawStatus:'in transit'})}));
vi.mock('../../integrations/shipping/registry',()=>({getShippingProvider:()=>({createShipment:spies.create,trackShipment:spies.track})}));
vi.mock('../../integrations/dhl/dhl.service',()=>({dhlService:{fetchVerifiedShipmentState:spies.verify}}));
vi.mock('../../services/email/email.service',()=>({emailService:{sendEmail:spies.email}}));
vi.mock('../notifications/notifications.service',()=>({notificationService:{createIfUnseen:spies.notice}}));
import {prisma} from '../../lib/prisma';


describe.skipIf(process.env.PACKAGEPRO_CONSOLIDATION_DB!=='yes')('local new-shipment containment candidate',()=>{
 const app=Fastify();
 let actor:any,stranger:any,order:any,po:any,item:any,hub:any,allocations:any[];let validated=false;
 beforeAll(async()=>{
  app.setErrorHandler(httpErrorHandler);await app.register(shipmentRoutes,{prefix:"/api"});await app.ready();
  const u=new URL(process.env.DATABASE_URL||'');
  if(!['localhost','127.0.0.1'].includes(u.hostname)||!/^\/packagepro_e2e_consolidation_[a-z0-9]+$/.test(u.pathname)||process.env.NODE_ENV!=='test'||process.env.EMAIL_PROVIDER!=='test')throw Error('Fresh disposable local DB required');
  if(await prisma.user.count()||await prisma.order.count())throw Error('Empty business DB required');
  validated=true;
 });
 beforeEach(async()=>{
  vi.clearAllMocks();
  await prisma.shipment.deleteMany();
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
 afterAll(async()=>{await app.close();if(validated)await prisma.$disconnect();});




 const auth=(user=stranger)=>({authorization:'Bearer '+jwtService.generateAccessToken(user.id,user.email,user.role)});
 const create=()=>app.inject({method:'POST',url:'/api/shipments/create/'+order.id,headers:auth()});
 const state=async()=>({order:await prisma.order.findUnique({where:{id:order.id}}),shipments:await prisma.shipment.findMany(),payments:await prisma.payment.findMany(),notices:await prisma.notification.findMany()});
 it.each(Object.values(OrderStatus))('HTTP new shipment paused for recorded parent %s without any effect',async status=>{await prisma.order.update({where:{id:order.id},data:{status}});await prisma.payment.create({data:{orderId:order.id,amount:114,currency:'EGP',status:'captured'}});const before=await state();const r=await create();expect.soft(r.statusCode,r.body).toBe(409);expect.soft(r.json().message).toContain('release is not integrated');expect.soft(await state()).toEqual(before);expect.soft(spies.create).not.toHaveBeenCalled();expect(spies.email).not.toHaveBeenCalled();expect(spies.notice).not.toHaveBeenCalled();});
 it.each(['created','failed','label_generated'] as const)('existing %s reservation stays untouched on repeated new-create attempts',async status=>{await prisma.order.update({where:{id:order.id},data:{status:'ready_to_ship'}});await prisma.shipment.create({data:{orderId:order.id,status,dhlTrackingNumber:'synthetic-track'}});const before=await state();expect((await create()).statusCode).toBe(409);expect((await create()).statusCode).toBe(409);expect(await state()).toEqual(before);expect(spies.create).not.toHaveBeenCalled();});
 it('direct service call cannot bypass paused release',async()=>{await prisma.order.update({where:{id:order.id},data:{status:'ready_to_ship'}});await expect(shipmentService.createShipment(order.id,{userId:stranger.id,role:'ADMIN'})).rejects.toMatchObject({statusCode:409});expect(await prisma.shipment.count()).toBe(0);expect(spies.create).not.toHaveBeenCalled();});
 it('authentication/role/not-found retain their boundaries',async()=>{expect((await app.inject({method:'POST',url:'/api/shipments/create/'+order.id})).statusCode).toBe(401);expect((await app.inject({method:'POST',url:'/api/shipments/create/'+order.id,headers:auth(actor)})).statusCode).toBe(403);expect((await app.inject({method:'POST',url:'/api/shipments/create/missing',headers:auth()})).statusCode).toBe(404);expect(spies.create).not.toHaveBeenCalled();});
 it('existing order shipment read and tracking still work for owner/admin, not stranger',async()=>{const sh=await prisma.shipment.create({data:{orderId:order.id,status:'in_transit',dhlTrackingNumber:'synthetic-track'}});for(const user of [actor,stranger]){expect((await app.inject({url:'/api/orders/'+order.id+'/shipment',headers:auth(user)})).statusCode).toBe(200);expect((await app.inject({url:'/api/shipments/'+sh.id+'/tracking',headers:auth(user)})).statusCode).toBe(200)}expect(spies.track).toHaveBeenCalledTimes(2);const other=await prisma.user.create({data:{email:'other@test.invalid',passwordHash:'synthetic',role:'CUSTOMER'}});expect((await app.inject({url:'/api/shipments/'+sh.id+'/tracking',headers:auth(other)})).statusCode).toBe(403);expect(spies.create).not.toHaveBeenCalled();});
 it('unknown carrier webhook stays separate and creates no shipment',async()=>{const before=await state();const r=await app.inject({method:'POST',url:'/api/webhooks/dhl',payload:{trackingNumber:'unknown-synthetic',eventType:'delivered'}});expect(r.statusCode,r.body).toBe(200);expect(await state()).toEqual(before);expect(spies.create).not.toHaveBeenCalled();});
 it('known existing label can still advance from verified carrier refresh',async()=>{const sh=await prisma.shipment.create({data:{orderId:order.id,status:'label_generated',dhlTrackingNumber:'synthetic-known'}});const r=await app.inject({method:'POST',url:'/api/webhooks/dhl',payload:{trackingNumber:'synthetic-known',eventType:'in_transit'}});expect(r.statusCode,r.body).toBe(200);expect((await prisma.shipment.findUniqueOrThrow({where:{id:sh.id}})).status).toBe('in_transit');expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('in_production');expect(spies.verify).toHaveBeenCalledWith('synthetic-known');expect(spies.create).not.toHaveBeenCalled();});

});
