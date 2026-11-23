import {beforeAll,afterAll,beforeEach,describe,it,expect,vi} from 'vitest';
import Fastify from 'fastify';
const db=vi.hoisted(()=>({order:{findUnique:vi.fn()}}));
vi.mock('../../lib/prisma',()=>({prisma:db}));
import {financeRoutes} from './finance.routes';
import {httpErrorHandler} from '../../utils/http-error-handler';
import {jwtService} from '../auth/services/jwt.service';
// Real route/plugin, auth, role gate, JWT signing/verification, error envelope,
// and reporting service; only persistence is a synthetic fixture.
const app=Fastify();
const syntheticOrder={id:'synthetic-order',customerId:'own-customer',orderNumber:'QA-SECURITY',total:100,tax:14,shippingCost:5,payment:{status:'paid'},purchaseOrders:[{vendorId:'associated-vendor',vendorCost:60}],settlements:[{status:'completed'}]};
function token(id:string,role:string){return jwtService.generateAccessToken(id,`${id}@test.local`,role)}
async function request(id:string,authorization?:string){return app.inject({method:'GET',url:`/api/orders/${id}/financial-summary`,headers:authorization?{authorization}:{}})}
beforeAll(async()=>{app.setErrorHandler(httpErrorHandler);await app.register(financeRoutes,{prefix:'/api'});await app.ready()});
afterAll(async()=>{await app.close()});
beforeEach(()=>{db.order.findUnique.mockReset();db.order.findUnique.mockImplementation(async({where}:any)=>where.id===syntheticOrder.id?syntheticOrder:null)});
describe('financial summary ADMIN-only HTTP boundary',()=>{
 for(const [name,id,role] of [
  ['own customer','own-customer','CUSTOMER'],
  ['cross-account customer','other-customer','CUSTOMER'],
  ['associated vendor','associated-vendor','VENDOR'],
  ['unassociated vendor','other-vendor','VENDOR'],
  ['unrecognized signed role','qa-unknown','OTHER'],
 ])it(`denies ${name} without finance data or order lookup`,async()=>{
  const authorization=`Bearer ${token(id,role)}`;
  for(const orderId of [syntheticOrder.id,'unknown-order']){
   const res=await request(orderId,authorization);
   expect(res.statusCode).toBe(403);expect(res.json()).toMatchObject({success:false,error:'AUTHORIZATION_ERROR'});
   for(const field of ['data','orderNumber','revenue','vendorCost','profit','profitMargin','tax','shipping','paymentStatus','settlementStatus'])expect(res.json()).not.toHaveProperty(field);
   expect(res.body).not.toContain('QA-SECURITY');
  }
  expect(db.order.findUnique).not.toHaveBeenCalled();
 });
 for(const [name,authorization] of [
  ['unauthenticated',undefined],['malformed header','Basic invalid'],['malformed token','Bearer invalid.token'],
 ])it(`rejects ${name}`,async()=>{
  const res=await request(syntheticOrder.id,authorization);
  expect(res.statusCode).toBe(401);expect(res.json()).toMatchObject({success:false,error:'AUTHENTICATION_ERROR'});
  expect(res.json()).not.toHaveProperty('data');expect(db.order.findUnique).not.toHaveBeenCalled();
 });
 it('returns existing summary for admin with the actual service computation',async()=>{
  const res=await request(syntheticOrder.id,`Bearer ${token('qa-admin','ADMIN')}`);
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({success:true,data:{orderNumber:'QA-SECURITY',revenue:100,vendorCost:60,profit:40,profitMargin:40,tax:14,shipping:5,paymentStatus:'paid',settlementStatus:'completed'}});
  expect(db.order.findUnique).toHaveBeenCalledTimes(1);
 });
 it('uses existing NOT_FOUND envelope for admin unknown order',async()=>{
  const res=await request('unknown-order',`Bearer ${token('qa-admin','ADMIN')}`);
  expect(res.statusCode).toBe(404);expect(res.json()).toMatchObject({success:false,error:'NOT_FOUND',message:'Order not found',requestId:expect.any(String)});
  expect(res.json()).not.toHaveProperty('data');
 });
});
