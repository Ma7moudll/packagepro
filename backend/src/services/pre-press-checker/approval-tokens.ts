import {randomBytes,createHash} from 'crypto';
import {prisma} from '../../lib/prisma';
export const hashApprovalToken = (token: string): string => createHash('sha256').update(token).digest('hex');
export async function issueApprovalToken(orderId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  // Persist before returning a usable capability to any email caller.
  await prisma.orderApprovalToken.create({data:{tokenHash:hashApprovalToken(token),orderId,expiresAt:new Date(Date.now()+7*24*60*60*1000)}});
  return token;
}
export async function verifyApprovalToken(token: string): Promise<{orderId:string}|null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row=await prisma.orderApprovalToken.findUnique({where:{tokenHash:hashApprovalToken(token)}});
  return row && !row.consumedAt && row.expiresAt>new Date() ? {orderId:row.orderId} : null;
}
