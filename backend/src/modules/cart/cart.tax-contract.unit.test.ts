import {beforeEach,describe,expect,it,vi} from 'vitest';

const mocks=vi.hoisted(()=>({findCart:vi.fn(),create:vi.fn(),update:vi.fn(),remove:vi.fn(),clear:vi.fn(),findProduct:vi.fn(),generic:vi.fn(),catalog:vi.fn()}));
vi.mock('../../lib/prisma',()=>({prisma:{cart:{findUnique:mocks.findCart},cartItem:{create:mocks.create,update:mocks.update,delete:mocks.remove,deleteMany:mocks.clear},product:{findFirst:mocks.findProduct}}}));
vi.mock('../../services/pricing-engine/pricing.service',()=>({pricingService:{calculatePrice:mocks.generic,quoteCatalog:mocks.catalog}}));
import {cartService} from './cart.service';

const round=(n:number)=>Math.round(n*100)/100;
let stored:any;
let quoteFor:(request:any)=>any;
function quote(subtotal:number,tax:number,shipping:number){return {material:{code:'synthetic',currency:'EGP'},breakdown:{subtotal,tax,shippingEstimate:shipping,total:round(subtotal+tax+shipping)}}}
function input(quantity=2,catalog=false,productType:'box'|'bag'='box'){
 return {productType,quantity,dimensions:{length:10,width:10,height:10,unit:'mm' as const},materialCode:'synthetic',...(catalog?{productId:'product',variantId:'variant',sku:'synthetic-sku'}:{})};
}
function line(quantity=2,catalog=false,productType:'box'|'bag'='box',id='line'){return {id,cartId:'cart',...input(quantity,catalog,productType)}}

beforeEach(()=>{
 vi.clearAllMocks();stored={id:'cart',currency:'EGP',items:[]};
 // Synthetic test prices, not a change to the business tax configuration.
 quoteFor=r=>quote(round(r.quantity*10),round(r.quantity),r.productType==='bag'?7:5);
 mocks.findCart.mockImplementation(async()=>structuredClone(stored));
 mocks.findProduct.mockResolvedValue({id:'product',name:'Synthetic preset'});
 mocks.generic.mockImplementation(async r=>quoteFor(r));mocks.catalog.mockImplementation(async r=>quoteFor(r));
 mocks.create.mockImplementation(async({data})=>{const value={id:'created-'+stored.items.length,...data};stored.items.push(value);return value});
 mocks.update.mockImplementation(async({where,data})=>{const value=stored.items.find((i:any)=>i.id===where.id);Object.assign(value,data);return value});
 mocks.remove.mockImplementation(async({where})=>{stored.items=stored.items.filter((i:any)=>i.id!==where.id);return {id:where.id}});
 mocks.clear.mockImplementation(async()=>{stored.items=[];return {count:0}});
});

describe('pre-tax cart response contract',()=>{
 it.each([false,true])('counts positive tax once for catalog=%s',async catalog=>{
  stored.items=[line(2,catalog)];const cart=await cartService.getCart('customer');
  expect(cart.items[0]).toMatchObject({quantity:2,unitPrice:10,totalPrice:20,tax:2,shipping:5});
  expect(cart.summary).toMatchObject({subtotal:20,tax:2,shipping:5,total:27,itemsCount:2});
  expect(cart.summary.total).toBe(quoteFor({quantity:2}).breakdown.total);
  expect(catalog?mocks.catalog:mocks.generic).toHaveBeenCalled();
 });
 it.each([false,true])('preserves zero-tax amounts for catalog=%s',async catalog=>{
  quoteFor=r=>quote(r.quantity*10,0,5);stored.items=[line(2,catalog)];
  const cart=await cartService.getCart('customer');expect(cart.items[0]).toMatchObject({unitPrice:10,totalPrice:20,tax:0});expect(cart.summary).toMatchObject({subtotal:20,tax:0,shipping:5,total:25});
 });
 it('sums mixed catalog/generic lines and preserves shipping group totals',async()=>{
  stored.items=[line(2,true,'box','catalog-box'),line(3,false,'box','generic-box'),line(4,false,'bag','generic-bag')];
  const cart=await cartService.getCart('customer');
  expect(cart.items.map(i=>i.totalPrice)).toEqual([20,30,40]);
  expect(cart.summary).toMatchObject({subtotal:90,tax:9,shipping:17,total:116,itemsCount:9,shippingByGroup:[{productType:'box',shipping:10},{productType:'bag',shipping:7}]});
  expect(round(cart.summary.shippingByGroup.reduce((n,g)=>n+g.shipping,0))).toBe(cart.summary.shipping);
 });
 it('preserves the quoted post-discount subtotal and adjustment breakdown',async()=>{
  quoteFor=()=>{const value=quote(72,7.2,5);return {...value,breakdown:{...value.breakdown,discountFactor:0.8,discountApplied:20,marginAmount:8}}};
  stored.items=[line(2,true)];const cart=await cartService.getCart('customer');
  expect(cart.items[0]).toMatchObject({totalPrice:72,unitPrice:36,tax:7.2,breakdown:{discountFactor:0.8,discountApplied:20,marginAmount:8}});
  expect(cart.summary).toMatchObject({subtotal:72,tax:7.2,shipping:5,total:84.2});
 });
 it('rounds line amounts separately from displayed unit prices, then aggregates cents',async()=>{
  quoteFor=r=>r.quantity===3?quote(10.01,1,0.03):quote(20.02,2,0.04);
  stored.items=[line(3,true,'box','a'),line(6,false,'box','b')];const cart=await cartService.getCart('customer');
  expect(cart.items[0]).toMatchObject({unitPrice:3.34,totalPrice:10.01,tax:1});
  expect(cart.items[1]).toMatchObject({unitPrice:3.34,totalPrice:20.02,tax:2});
  expect(cart.summary).toMatchObject({subtotal:30.03,tax:3,shipping:0.07,total:33.1});
  expect(cart.summary.subtotal).toBe(round(cart.items.reduce((n,i)=>n+i.totalPrice,0)));
 });
 it.each([false,true])('add, dedupe, quantity update and removal retain the contract for catalog=%s',async catalog=>{
  const first=await cartService.addItem('customer',input(2,catalog));expect(first.summary).toMatchObject({subtotal:20,tax:2,shipping:5,total:27});
  const merged=await cartService.addItem('customer',input(2,catalog));expect(merged.items).toHaveLength(1);expect(merged.items[0].quantity).toBe(4);expect(merged.summary).toMatchObject({subtotal:40,tax:4,shipping:5,total:49});
  const changed=await cartService.updateItem('customer',merged.items[0].id,{quantity:3});expect(changed.items[0]).toMatchObject({quantity:3,totalPrice:30,unitPrice:10,tax:3});expect(changed.summary).toMatchObject({subtotal:30,tax:3,shipping:5,total:38});
  const removed=await cartService.removeItem('customer',changed.items[0].id);expect(removed.items).toEqual([]);expect(removed.summary).toMatchObject({subtotal:0,tax:0,shipping:0,total:0,shippingByGroup:[]});
 });
 it('clear and zero-quantity removal return a zeroed summary',async()=>{
  stored.items=[line(2,true)];const removed=await cartService.updateItem('customer','line',{quantity:0});expect(removed.summary).toMatchObject({subtotal:0,tax:0,shipping:0,total:0});
  stored.items=[line(2,true)];const cleared=await cartService.clear('customer');expect(cleared.items).toEqual([]);expect(cleared.summary).toMatchObject({subtotal:0,tax:0,shipping:0,total:0,shippingByGroup:[]});
 });
});
