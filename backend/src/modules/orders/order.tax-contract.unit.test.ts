import {beforeEach,describe,expect,it,vi} from 'vitest';

const mocks=vi.hoisted(()=>({customer:vi.fn(),create:vi.fn(),generic:vi.fn(),catalog:vi.fn(),notify:vi.fn()}));
vi.mock('../../lib/prisma',()=>({prisma:{customer:{findUnique:mocks.customer},order:{create:mocks.create}}}));
vi.mock('../../services/pricing-engine/pricing.service',()=>({pricingService:{calculatePrice:mocks.generic,quoteCatalog:mocks.catalog}}));
vi.mock('../notifications/notifications.service',()=>({notificationService:{createIfUnseen:mocks.notify}}));
import {orderService,serializeOrder} from './order.service';

const round=(n:number)=>Math.round(n*100)/100;
const address={name:'Synthetic order test',phone:'synthetic',street:'Test',city:'Cairo',postalCode:'00000',country:'EG'};
function item(quantity=2,catalog=false,productType:'box'|'bag'='box'){
 return {productType,quantity,dimensions:{length:10,width:10,height:10,unit:'mm' as const},materialCode:'synthetic',...(catalog?{productId:'synthetic-product',variantId:'synthetic-variant',sku:'synthetic-sku',config:{print:'none'}}:{})};
}
function quote(subtotal:number,tax:number,shipping:number){return {material:{code:'synthetic',currency:'EGP'},breakdown:{subtotal,tax,shippingEstimate:shipping,total:round(subtotal+tax+shipping)}};}
let quoteFor:(r:any)=>any;
let written:any;
beforeEach(()=>{
 vi.clearAllMocks();written=null;
 mocks.customer.mockResolvedValue({id:'synthetic-customer'});
 quoteFor=()=>quote(100,10,5);
 mocks.generic.mockImplementation(async r=>quoteFor(r));mocks.catalog.mockImplementation(async r=>quoteFor(r));
 mocks.create.mockImplementation(async({data})=>{written=structuredClone(data);return {id:'memory-only',...data,items:data.items.create,customer:{user:{id:'memory-user'}}}});
 mocks.notify.mockResolvedValue(undefined);
});
async function create(items:any[]){return orderService.createOrder({customerId:'synthetic-customer',items,shippingAddress:address});}

describe('prospective tax-exclusive order contract',()=>{
 it.each([false,true])('counts positive tax once for catalog=%s',async catalog=>{
  const result=await create([item(2,catalog)]);
  expect(written).toMatchObject({subtotal:100,tax:10,shippingCost:5,total:115});
  expect(written.items.create[0]).toMatchObject({unitPrice:50,totalPrice:100});
  expect(result.total).toBe(115);expect(catalog?mocks.catalog:mocks.generic).toHaveBeenCalledOnce();
 });
 it.each([false,true])('retains zero-tax amounts for catalog=%s',async catalog=>{
  quoteFor=()=>quote(100,0,5);await create([item(2,catalog)]);
  expect(written).toMatchObject({subtotal:100,tax:0,shippingCost:5,total:105});
 });
 it('sums mixed lines and retains the existing shipping grouping',async()=>{
  quoteFor=r=>r.quantity===2?quote(100,10,5):quote(50,5,7);
  await create([item(2,true),item(4,false,'bag')]);
  expect(written).toMatchObject({subtotal:150,tax:15,shippingCost:12,total:177,metadata:{shippingBreakdown:[{productType:'box',shipping:5},{productType:'bag',shipping:7}]}});
  expect(written.items.create.map((x:any)=>x.totalPrice)).toEqual([100,50]);
 });
 it('does not apply the quoted discount or margin twice and preserves catalog configuration',async()=>{
  quoteFor=()=>({...quote(85,8.5,5),breakdown:{...quote(85,8.5,5).breakdown,discountFactor:0.85,discountApplied:15,marginAmount:5}});
  await create([item(2,true)]);
  expect(written).toMatchObject({subtotal:85,tax:8.5,shippingCost:5,total:98.5});
  expect(written.items.create[0]).toMatchObject({productId:'synthetic-product',variantId:'synthetic-variant',sku:'synthetic-sku',config:{print:'none'},unitPrice:42.5,totalPrice:85});
 });
 it('rounds summary cents without reconstructing lines from display units',async()=>{
  quoteFor=r=>r.quantity===3?quote(10.01,1,0.03):quote(20.02,2,0.04);
  await create([item(3,true),item(6,false)]);
  expect(written.items.create.map((x:any)=>[x.unitPrice,x.totalPrice])).toEqual([[3.34,10.01],[3.34,20.02]]);
  expect(written).toMatchObject({subtotal:30.03,tax:3,shippingCost:0.07,total:33.1});
  expect(written.metadata.shippingBreakdown).toEqual([{productType:'box',shipping:0.07}]);
 });
 it('uses rounded components rather than a potentially differently rounded quote total',async()=>{
  quoteFor=()=>({...quote(1,0.14,0),breakdown:{...quote(1,0.14,0).breakdown,total:1.15}});
  await create([item(3,true)]);expect(written).toMatchObject({subtotal:1,tax:0.14,shippingCost:0,total:1.14});
 });
 it('marks only new writes with an explicit pricing convention',async()=>{
  await create([item()]);expect(written.metadata).toEqual({pricingContract:'tax-exclusive-v1',shippingBreakdown:[{productType:'box',shipping:5}]});
 });
 it('serializes unmarked historical monetary values without repricing or adding a marker',()=>{
  const legacy={subtotal:'110.00',tax:'10.00',shippingCost:'5.00',total:'125.00',items:[{unitPrice:'55.00',totalPrice:'110.00'}],metadata:{shippingBreakdown:[{productType:'box',shipping:5}]}};
  expect(serializeOrder(legacy)).toMatchObject(legacy);expect((serializeOrder(legacy).metadata as any).pricingContract).toBeUndefined();
  expect(mocks.create).not.toHaveBeenCalled();
 });
});
