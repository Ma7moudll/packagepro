import {Prisma} from '@prisma/client';
import {ConflictError} from '../../utils/errors';
/** Caller must own the order row lock; no external work inside this boundary. */
export async function fenceDispatchWriter(tx:Prisma.TransactionClient,orderId:string,kind:string) {
 const r=await tx.dispatchPrototypeReservation.findUnique({where:{orderId}});if(!r)return;
 if(['attempt_started','reconciliation_required','label_created'].includes(r.state))throw new ConflictError('Dispatch attempt may exist; order/source edit requires reconciliation');
 if(r.state==='reserved'){
  await tx.dispatchPrototypeReservation.update({where:{id:r.id},data:{state:'invalidated_before_start',version:{increment:1}}});
  await tx.dispatchPrototypeEvent.create({data:{reservationId:r.id,kind}});
 }
}
