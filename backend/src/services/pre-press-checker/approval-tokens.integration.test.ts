import {afterAll,beforeAll,describe,it,expect,vi} from 'vitest';
import {prisma} from '../../lib/prisma';
import {issueApprovalToken,verifyApprovalToken,hashApprovalToken} from './approval-tokens';
import {approvalService} from '../../modules/orders/approval.service';
vi.mock('../email/email.service',()=>({emailService:{}}));
vi.mock('../../lib/queues',()=>({getReminderQueue:()=>null}));
// No Redis mocking is needed: this token path only uses durable PostgreSQL.
describe('durable approval capability',()=>{
 let userId:string,customerId:string;const orders:string[]=[];
 beforeAll(async()=>{const u=await prisma.user.create({data:{email:`approval-durable-${Date.now()}@test.local`,passwordHash:'unused',customer:{create:{}}},include:{customer:true}});userId=u.id;customerId=u.customer!.id});
 afterAll(async()=>{await prisma.order.deleteMany({where:{id:{in:orders}}});await prisma.user.delete({where:{id:userId}})});
 async function order(){const o=await prisma.order.create({data:{orderNumber:`durable-${Date.now()}-${orders.length}`,customerId,status:'awaiting_approval',subtotal:20,total:20,tax:0,shippingCost:0,shippingAddress:{},shippingName:'Test',shippingPhone:'local'}});orders.push(o.id);return o}
 it('persists only a token hash and verifies with Redis absent',async()=>{const o=await order();const token=await issueApprovalToken(o.id);const row=await prisma.orderApprovalToken.findUniqueOrThrow({where:{tokenHash:hashApprovalToken(token)}});expect(row.tokenHash).not.toBe(token);expect(JSON.stringify(row)).not.toContain(token);expect(await verifyApprovalToken(token)).toEqual({orderId:o.id})});
 it('refuses expired, unknown and malformed tokens',async()=>{const o=await order();const token=await issueApprovalToken(o.id);await prisma.orderApprovalToken.update({where:{tokenHash:hashApprovalToken(token)},data:{expiresAt:new Date(0)}});expect(await verifyApprovalToken(token)).toBeNull();expect(await verifyApprovalToken('a'.repeat(64))).toBeNull();expect(await verifyApprovalToken('bad')).toBeNull()});
 it('concurrent approval consumes once and atomically advances order',async()=>{const o=await order();const token=await issueApprovalToken(o.id);const r=await Promise.allSettled([approvalService.approveOrder(o.id,token),approvalService.approveOrder(o.id,token)]);expect(r.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect((await prisma.order.findUniqueOrThrow({where:{id:o.id}})).status).toBe('ready_for_routing');expect(await verifyApprovalToken(token)).toBeNull()});
 it('never returns a capability if durable storage cannot save it',async()=>{await expect(issueApprovalToken('nonexistent-order')).rejects.toThrow()});
});
