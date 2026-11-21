import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({findDesign:vi.fn(),findCustomer:vi.fn(),findCart:vi.fn(),createItem:vi.fn(),price:vi.fn()}));
vi.mock('../../lib/prisma',()=>({prisma:{design:{findUnique:mocks.findDesign},customer:{findUnique:mocks.findCustomer},cart:{findUnique:mocks.findCart},cartItem:{create:mocks.createItem}}}));
vi.mock('../../services/pricing-engine/pricing.service',()=>({pricingService:{calculatePrice:mocks.price}}));
import {cartService} from './cart.service';
const input={productType:'box' as const,quantity:50,dimensions:{length:20,width:15,height:10,unit:'cm' as const},sessionId:'design-session'};
beforeEach(()=>{vi.clearAllMocks();mocks.findCart.mockResolvedValue({id:'cart',currency:'EGP',items:[]});mocks.findCustomer.mockResolvedValue({userId:'buyer'});mocks.price.mockResolvedValue({});});
describe('cart design association ownership',()=>{
 it('refuses another user artwork before persisting a line',async()=>{mocks.findDesign.mockResolvedValue({id:'design',ownerId:'other'});await expect(cartService.addItem('customer',input)).rejects.toThrow(/not owned/);expect(mocks.createItem).not.toHaveBeenCalled()});
 it('refuses anonymous/unowned artwork',async()=>{mocks.findDesign.mockResolvedValue({id:'design',ownerId:null});await expect(cartService.addItem('customer',input)).rejects.toThrow(/not owned/);expect(mocks.createItem).not.toHaveBeenCalled()});
 it('refuses unknown session instead of silently detaching artwork',async()=>{mocks.findDesign.mockResolvedValue(null);await expect(cartService.addItem('customer',input)).rejects.toThrow(/not owned/);expect(mocks.createItem).not.toHaveBeenCalled()});
});
describe('custom specification quote gate',()=>{
 it.each([{model:{boardSpecification:{version:1}}},{layers:[{raisedPrint:{text:'word',method:'unspecified'}}]}])('blocks owned custom design before pricing or persisting',async designData=>{mocks.findDesign.mockResolvedValue({id:'design',ownerId:'buyer',designData});await expect(cartService.addItem('customer',input)).rejects.toThrow(/QUOTE_REQUIRED/);expect(mocks.price).not.toHaveBeenCalled();expect(mocks.createItem).not.toHaveBeenCalled()});
});
