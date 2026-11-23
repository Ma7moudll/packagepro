import {describe,it,expect,afterAll} from 'vitest';
import {prisma} from '../../lib/prisma';
import {orderService} from './order.service';
const marker=`custom-spec-${Date.now()}`;
let userId:string,customerId:string;
const designIds:string[]=[];
afterAll(async()=>{await prisma.design.deleteMany({where:{id:{in:designIds}}});if(userId)await prisma.user.delete({where:{id:userId}})});
describe('saved custom specifications cannot bypass order quote requirement',()=>{
 it('checks every item and order-level design reference, without creating orders',async()=>{
  const user=await prisma.user.create({data:{email:`${marker}@test.local`,passwordHash:'local-test',role:'CUSTOMER',customer:{create:{}}},include:{customer:true}});userId=user.id;customerId=user.customer!.id;
  const legacy=await prisma.design.create({data:{ownerId:userId,sessionId:`${marker}-legacy`,designData:{model:{material:'cardboard-kraft'},layers:[]}}});designIds.push(legacy.id);
  for(const designData of [{model:{boardSpecification:{version:1,outside:'brown-dark',inside:'white-imported-matte'}}},{layers:[{raisedPrint:{text:'word',method:'unspecified'}}]}]){
   const custom=await prisma.design.create({data:{ownerId:userId,sessionId:`${marker}-${designIds.length}`,designData}});designIds.push(custom.id);
   for(const ref of [{designId:custom.id},{sessionId:custom.sessionId!}]){
    await expect(orderService.createOrder({customerId,items:[{productType:'box',quantity:50,dimensions:{length:200,width:150,height:100,unit:'mm'},...ref}],shippingAddress:{name:'Local QA',street:'Test',city:'Cairo',country:'EG'}})).rejects.toThrow(/QUOTE_REQUIRED/);
   }
   await expect(orderService.createOrder({customerId,designSessionId:custom.sessionId!,items:[{productType:'box',quantity:50,dimensions:{length:200,width:150,height:100,unit:'mm'},designId:legacy.id}],shippingAddress:{name:'Local QA',street:'Test',city:'Cairo',country:'EG'}})).rejects.toThrow(/QUOTE_REQUIRED/);
  }
  expect(await prisma.order.count({where:{customerId}})).toBe(0);
 });
});
