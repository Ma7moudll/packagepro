import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import Fastify from 'fastify';
import {prisma} from '../../lib/prisma';
import {adminRoutes} from '../admin/admin.routes';
import {financeRoutes} from './finance.routes';
import {httpErrorHandler} from '../../utils/http-error-handler';
import {jwtService} from '../auth/services/jwt.service';
// Explicit local gate only. Normal test discovery is safe without a database URL.
const enabled=process.env.PACKAGEPRO_ADMIN_CURRENCY_ISOLATED_DB==='yes';
const suite=enabled?describe:describe.skip;
suite('isolated admin currency PostgreSQL HTTP gate',()=>{
beforeAll(()=>{
 let url:URL;
 try{url=new URL(process.env.DATABASE_URL||'')}catch{throw new Error('Gate requires a dedicated local DATABASE_URL')}
 if(!['localhost','127.0.0.1'].includes(url.hostname)||!/^\/packagepro_e2e_admin_currency_[a-z0-9]+$/.test(url.pathname))throw new Error('Gate requires a dedicated local packagepro_e2e_admin_currency_<unique> database');
});
let baselineOverview:any,baselineReport:any;
const amount=(groups:any[],currency:string,key='amount')=>groups.find(g=>g.currency===currency)?.[key]??0;
let fixtureStarted=false;
const app=Fastify();let customerId='';let userId='';const ids:string[]=[];const marker=`currency-qa-${Date.now()}`;
const start=new Date('2026-11-01T00:00:00Z'),end=new Date('2026-11-30T23:59:59Z');
const headers={authorization:`Bearer ${jwtService.generateAccessToken('synthetic-admin','admin@test.local','ADMIN')}`};
beforeAll(async()=>{
 if(await prisma.order.count()!==0||await prisma.customer.count()!==0)throw new Error('Dedicated gate database must have no orders or customers; no broad cleanup is performed');
 app.setErrorHandler(httpErrorHandler);await app.register(adminRoutes,{prefix:'/api'});await app.register(financeRoutes,{prefix:'/api'});await app.ready();
 baselineOverview=(await app.inject({url:'/api/admin/overview',headers})).json().data;
 baselineReport=(await app.inject({url:`/api/finance/reports?start=${start.toISOString()}&end=${end.toISOString()}`,headers})).json().data;
 fixtureStarted=true;
 const user=await prisma.user.create({data:{email:`${marker}@test.local`,passwordHash:'fixture-not-login',role:'CUSTOMER'}});userId=user.id;
 const customer=await prisma.customer.create({data:{userId}});customerId=customer.id;
 for(const [currency,total,status,completedAt] of [['EGP',100,'completed',start],['USD',10,'completed',start],[null,7,'completed',start],[null,8,'completed',start],['EGP',99,'cancelled',start],['EGP',50,'completed',new Date('2026-10-01')]] as const){
  const order=await prisma.order.create({data:{customerId,orderNumber:`${marker}-${ids.length}`,currency,total,subtotal:total,tax:0,shippingCost:0,status,completedAt,shippingAddress:{},shippingName:'QA',shippingPhone:'test'}});ids.push(order.id);
 }
});
afterAll(async()=>{if(!fixtureStarted){await app.close();await prisma.$disconnect();return;}await prisma.order.deleteMany({where:{id:{in:ids}}});if(customerId)await prisma.customer.delete({where:{id:customerId}});if(userId)await prisma.user.delete({where:{id:userId}});await app.close();await prisma.$disconnect()});
describe('admin currency real PostgreSQL HTTP contracts',()=>{
 it('overview uses grouped known amounts and bounded unknown count',async()=>{
  const res=await app.inject({url:'/api/admin/overview',headers});expect(res.statusCode).toBe(200);const data=res.json().data;
  expect(amount(data.revenueByCurrency,'EGP')-amount(baselineOverview.revenueByCurrency,'EGP')).toBe(150);
  expect(amount(data.revenueByCurrency,'USD')-amount(baselineOverview.revenueByCurrency,'USD')).toBe(10);
  expect(data.revenueByCurrency.every((g:any)=>g.currency!==null)).toBe(true);expect(data.unclassifiedOrderCount-baselineOverview.unclassifiedOrderCount).toBe(2);
 });
 it('customer search/pagination and LTV preserve currencies, unknown count, cancellation exclusion',async()=>{
  const res=await app.inject({url:`/api/admin/customers?search=${marker}&page=1&limit=1`,headers});expect(res.statusCode).toBe(200);const body=res.json();
  expect(body.pagination).toMatchObject({total:1,totalPages:1,page:1,limit:1});expect(body.data).toHaveLength(1);
  expect(body.data[0]).toMatchObject({ordersCount:5,unclassifiedOrderCount:2,lifetimeValueByCurrency:[{currency:'EGP',amount:150},{currency:'USD',amount:10}]});
  const page2=await app.inject({url:`/api/admin/customers?search=${marker}&page=2&limit=1`,headers});expect(page2.json().data).toEqual([]);
 });
 it('order list status/search filters and pagination return true per-order currency including null',async()=>{
  const res=await app.inject({url:`/api/admin/orders?search=${marker}&status=completed&page=1&limit=2`,headers});expect(res.statusCode).toBe(200);expect(res.json().pagination.total).toBe(5);expect(res.json().data).toHaveLength(2);
  const all=await app.inject({url:`/api/admin/orders?search=${marker}&limit=20`,headers});expect(all.json().data.map((o:any)=>o.currency)).toContain(null);expect(all.json().data.map((o:any)=>o.currency)).toContain('USD');
 });
 it('finance limits completed orders by completion date, excludes unknown amounts and does not infer absent costs',async()=>{
  const res=await app.inject({url:`/api/finance/reports?start=${start.toISOString()}&end=${end.toISOString()}`,headers});expect(res.statusCode).toBe(200);const data=res.json().data;
  expect(data.unclassifiedOrderCount-baselineReport.unclassifiedOrderCount).toBe(2);expect(data.byCurrency.every((g:any)=>g.currency!==null)).toBe(true);
  expect(amount(data.byCurrency,'EGP','revenue')-amount(baselineReport.byCurrency,'EGP','revenue')).toBe(100);expect(data.byCurrency.find((g:any)=>g.currency==='EGP')).toMatchObject({profit:null,costStatus:'unreconciled'});
  expect(amount(data.byCurrency,'USD','revenue')-amount(baselineReport.byCurrency,'USD','revenue')).toBe(10);expect(data.byCurrency.find((g:any)=>g.currency==='USD').profit).toBeNull();
 });
});

});
