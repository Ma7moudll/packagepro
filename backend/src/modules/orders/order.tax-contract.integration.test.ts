// Synthetic fixtures in the isolated test database only. No checkout/provider,
// real PO, payout, commercial rate or historical-order migration is exercised.
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {invoicePdfText} from './invoice-pdf.test-helper';
import {writeFile} from 'node:fs/promises';
import {prisma} from '../../lib/prisma';

const mocks=vi.hoisted(()=>({generic:vi.fn(),catalog:vi.fn(),notify:vi.fn()}));
vi.mock('../../services/pricing-engine/pricing.service',()=>({pricingService:{calculatePrice:mocks.generic,quoteCatalog:mocks.catalog}}));
vi.mock('../notifications/notifications.service',()=>({notificationService:{createIfUnseen:mocks.notify}}));
import {orderService} from './order.service';
import {invoiceService} from '../finance/invoice.service';
import {groupOrderItemsByProductType} from '../purchase-orders/po.service';
import {orderTotal,subtotalOf,taxOf,shippingOf} from '../../../../frontend/lib/orders/projections';

const marker=`order-tax-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const address={name:'Synthetic tax fixture',phone:'synthetic-only',street:'Test',city:'Cairo',postalCode:'00000',country:'EG'};
let userId:string,customerId:string,variant:any,legacy:any;
let quoteFor:(r:any)=>any;
const round=(n:number)=>Math.round(n*100)/100;
function quote(subtotal:number,tax:number,shipping:number){return {material:{code:'synthetic',currency:'EGP'},breakdown:{subtotal,tax,shippingEstimate:shipping,total:round(subtotal+tax+shipping)}};}
function item(quantity=2,catalog=false,productType:'box'|'bag'='box'){
 return {productType,quantity,dimensions:{length:10,width:10,height:10,unit:'mm' as const},materialCode:'synthetic',...(catalog?{productId:variant.productId,variantId:variant.id,sku:variant.sku,config:{print:'none'}}:{})};
}
async function create(items:any[]){return orderService.createOrder({customerId,items,shippingAddress:address});}
async function stored(id:string){return prisma.order.findUniqueOrThrow({where:{id},include:{items:true,payment:true,purchaseOrders:true}});}
function amounts(order:any){return {subtotal:Number(order.subtotal),tax:Number(order.tax),shipping:Number(order.shippingCost),total:Number(order.total)};}

beforeAll(async()=>{
 const url=new URL(process.env.DATABASE_URL||'');
 if(!['127.0.0.1','localhost'].includes(url.hostname)||!/(test|detail)/.test(url.pathname))throw new Error('Synthetic order-tax fixtures require a local isolated test database');
 variant=await prisma.productVariant.findFirst({where:{isActive:true}});
 if(!variant)throw new Error('Seed an isolated catalog before running catalog persistence coverage');
 const user=await prisma.user.create({data:{email:`${marker}@test.local`,passwordHash:'synthetic-only',role:'CUSTOMER',customer:{create:{}}},include:{customer:true}});
 userId=user.id;customerId=user.customer!.id;
 legacy=await prisma.order.create({data:{customerId,orderNumber:`${marker}-unmarked`,status:'pending_review',subtotal:110,tax:10,shippingCost:5,total:125,shippingAddress:address,shippingName:address.name,shippingPhone:address.phone,metadata:{shippingBreakdown:[{productType:'box',shipping:5}]},items:{create:[{productType:'box',quantity:2,dimensions:item().dimensions,unitPrice:55,totalPrice:110}]}},include:{items:true}});
});
beforeEach(()=>{
 vi.clearAllMocks();quoteFor=()=>quote(100,10,5);
 mocks.generic.mockImplementation(async r=>quoteFor(r));mocks.catalog.mockImplementation(async r=>quoteFor(r));mocks.notify.mockResolvedValue(undefined);
});
afterAll(async()=>{
 if(customerId)await prisma.order.deleteMany({where:{customerId,customer:{user:{email:`${marker}@test.local`}}}});
 if(userId)await prisma.user.deleteMany({where:{id:userId,email:`${marker}@test.local`}});
});

describe('prospective order tax persistence and consumers',()=>{
 it.each([false,true])('persists and reads pre-tax cents for catalog=%s',async catalog=>{
  const created=await create([item(2,catalog)]);const read=await stored(created.id);
  expect(amounts(read)).toEqual({subtotal:100,tax:10,shipping:5,total:115});
  expect(Number(read.items[0].unitPrice)).toBe(50);expect(Number(read.items[0].totalPrice)).toBe(100);
  expect(read.metadata).toMatchObject({pricingContract:'tax-exclusive-v1',shippingBreakdown:[{productType:'box',shipping:5}]});
  if(catalog)expect(read.items[0]).toMatchObject({productId:variant.productId,variantId:variant.id,sku:variant.sku,config:{print:'none'}});
  const api=await orderService.getOrder(read.id,userId);
  expect([subtotalOf(api),taxOf(api),shippingOf(api),orderTotal(api)]).toEqual([100,10,5,115]);
  expect(read.payment).toBeNull();expect(read.purchaseOrders).toHaveLength(0);
 });
 it('round-trips mixed rounded lines and independent authoritative totals',async()=>{
  quoteFor=r=>r.quantity===3?quote(10.01,1,0.03):quote(20.02,2,0.04);
  const read=await stored((await create([item(3,true),item(6,false,'bag')])).id);
  expect(amounts(read)).toEqual({subtotal:30.03,tax:3,shipping:0.07,total:33.1});
  expect([...read.items].sort((a,b)=>a.quantity-b.quantity).map(i=>[Number(i.unitPrice),Number(i.totalPrice)])).toEqual([[3.34,10.01],[3.34,20.02]]);
  expect((read.metadata as any).shippingBreakdown).toEqual([{productType:'box',shipping:0.03},{productType:'bag',shipping:0.04}]);
 });
 it('keeps zero-tax and already-discounted component contracts on read-back',async()=>{
  quoteFor=()=>quote(100,0,5);expect(amounts(await stored((await create([item()])).id))).toEqual({subtotal:100,tax:0,shipping:5,total:105});
  quoteFor=()=>({...quote(85,8.5,5),breakdown:{...quote(85,8.5,5).breakdown,discountFactor:0.85,discountApplied:15}});
  expect(amounts(await stored((await create([item(2,true)])).id))).toEqual({subtotal:85,tax:8.5,shipping:5,total:98.5});
 });
 it('projects stored invoice amounts without adding tax or reconstructing line totals',async()=>{
  const created=await create([item()]);const invoice=await invoiceService.getOrderForCustomer(created.id,userId);
  const pdf=await invoiceService.generateInvoice(invoice);const text=await invoicePdfText(pdf);
  expect(pdf.subarray(0,4).toString()).toBe('%PDF');
  for(const expected of ['EGP 100.00','Subtotal: EGP 100.00','Tax: EGP 10.00','Shipping: EGP 5.00','Total: EGP 115.00'])expect(text).toContain(expected);
  expect(text).not.toContain('EGP 125.00');
  if(process.env.ORDER_TAX_INVOICE_PATH)await writeFile(process.env.ORDER_TAX_INVOICE_PATH,pdf);
 });
 it('uses pre-tax line value as the PO grouping basis without creating any PO',async()=>{
  const read=await stored((await create([item()])).id);const groups=groupOrderItemsByProductType(read.items);
  expect(groups).toHaveLength(1);expect(groups[0].subtotal).toBe(100);expect(groups[0].subtotal).not.toBe(110);
  // The existing 60% prototype formula is unchanged, not commercially approved.
  expect(Math.round(groups[0].subtotal*60)/100).toBe(60);
  expect(read.purchaseOrders).toHaveLength(0);expect(read.payment).toBeNull();
 });
 it('does not reinterpret or mutate the unmarked legacy sentinel',async()=>{
  await create([item()]);const read=await stored(legacy.id);const api=await orderService.getOrder(legacy.id,userId);
  expect(amounts(read)).toEqual({subtotal:110,tax:10,shipping:5,total:125});
  expect(read.items.map(i=>[Number(i.unitPrice),Number(i.totalPrice)])).toEqual([[55,110]]);
  expect(read.metadata).toEqual(legacy.metadata);expect((read.metadata as any).pricingContract).toBeUndefined();
  expect([subtotalOf(api),taxOf(api),shippingOf(api),orderTotal(api)]).toEqual([110,10,5,125]);
 });
});
