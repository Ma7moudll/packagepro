import {Prisma} from '@prisma/client';
import {ConflictError} from '../../utils/errors';
import {fenceDispatchWriter} from '../consolidation/dispatch-writer-fence';
async function orders(tx:Prisma.TransactionClient,id:string){
 const d=await tx.design.findUnique({where:{id},select:{orderId:true,orderItems:{select:{orderId:true}}}});
 return [...new Set([...(d?.orderId?[d.orderId]:[]),...(d?.orderItems.map(i=>i.orderId)||[])])].sort();
}
/** Order-first locks, then design; reject binding changes rather than acquiring backwards. */
export async function lockDesignDispatchSources(tx:Prisma.TransactionClient,id:string){
 const ids=await orders(tx,id);
 for(const orderId of ids)await tx.$queryRaw`SELECT id FROM orders WHERE id=${orderId} FOR UPDATE`;
 await tx.$queryRaw`SELECT id FROM designs WHERE id=${id} FOR UPDATE`;
 if(JSON.stringify(await orders(tx,id))!==JSON.stringify(ids))throw new ConflictError('Design order bindings changed; retry');
 return ids;
}
export async function fenceDesignDispatchSources(tx:Prisma.TransactionClient,ids:string[]){for(const id of ids)await fenceDispatchWriter(tx,id,'design_changed_before_start');}
