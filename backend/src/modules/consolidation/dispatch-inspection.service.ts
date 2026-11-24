import {Prisma} from '@prisma/client';
import {prisma} from '../../lib/prisma';
import {AuthorizationError,NotFoundError,ValidationError} from '../../utils/errors';
const states=new Set(['reserved','invalidated_before_start','cancelled_before_start','attempt_started','reconciliation_required','label_created']);
const kinds=new Set(['reserved','attempt_started','provider_result_observed','reconciliation_required','label_created','invalidated_before_start','cancelled_before_start','packing_changed_before_start','receipt_changed_before_start','manifest_changed_before_start','order_status_changed_before_start','production_changed_before_start','production_started_before_start','design_changed_before_start','design_created_before_start','handshake_accepted_before_start','po_confirmed_before_start']);
/** Read-only projection. No synthetic adapter, raw packet, external lookup or recovery command. */
export async function inspectDispatch(orderId:string,userId:string,after?:string){
 let cursor:{at:Date;id:string}|undefined;
 if(after){const split=after.indexOf('|');const at=new Date(after.slice(0,split));const id=after.slice(split+1);if(split<0||!Number.isFinite(at.getTime())||at.toISOString()!==after.slice(0,split)||!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw new ValidationError('Invalid inspection cursor');cursor={at,id};}
 return prisma.$transaction(async tx=>{
  const manifest=await tx.consolidationManifest.findUnique({where:{orderId},select:{hubId:true}});
  if(!manifest)throw new AuthorizationError('Explicit receiving scope required');
  const cap=await tx.consolidationCapability.findUnique({where:{userId_hubId:{userId,hubId:manifest.hubId}},select:{canReceive:true}});
  const hub=await tx.consolidationHub.findUnique({where:{id:manifest.hubId},select:{enabled:true}});
  if(!cap?.canReceive||!hub?.enabled)throw new AuthorizationError('Explicit receiving scope at enabled hub required');
  const r=await tx.dispatchPrototypeReservation.findUnique({where:{orderId}});
  if(!r)throw new NotFoundError('Dispatch inspection');
  if((r.packet as any)?.hubId!==manifest.hubId)throw new AuthorizationError('Dispatch hub binding differs; inspection unavailable');
  const a=await tx.dispatchPrototypeAttempt.findUnique({where:{reservationId:r.id}});
  const events=await tx.dispatchPrototypeEvent.findMany({where:{reservationId:r.id,...(cursor?{OR:[{createdAt:{lt:cursor.at}},{createdAt:cursor.at,id:{lt:cursor.id}}]}:{})},orderBy:[{createdAt:'desc'},{id:'desc'}],take:21,select:{id:true,kind:true,createdAt:true}});
  const state=states.has(r.state)?r.state:'unknown';
  const blocked=!['reserved','invalidated_before_start','cancelled_before_start'].includes(state);
  return {prototype:true,readOnly:true,state,version:r.version,updatedAt:r.updatedAt,operatorHoldRequired:blocked,disposition:blocked?'manual_reconciliation_required':'no_attempt_resolution_in_this_view',paymentPolicy:'unconfigured',dispatchEnabled:false,availableActions:[],attempt:a?{state:states.has(a.state)?a.state:'unknown',createdAt:a.createdAt,updatedAt:a.updatedAt,storedResultPresent:a.result!==null}:null,events:events.slice(0,20).map(e=>({id:e.id,kind:kinds.has(e.kind)?e.kind:'other',createdAt:e.createdAt})),nextCursor:events.length>20?events[19].createdAt.toISOString()+'|'+events[19].id:null};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
