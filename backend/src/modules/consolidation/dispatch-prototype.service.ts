import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {prisma} from '../../lib/prisma';
import {AuthorizationError,ConflictError,NotFoundError,ValidationError} from '../../utils/errors';
import {consolidationService} from './consolidation.service';

export type PrototypeInputs={revision:number;pickup:{name:string;address:string;city:string;country:string;phone:string};parcels:{id:string;grams:number;lengthMm:number;widthMm:number;heightMm:number}[];paymentRule:'unconfigured'|'synthetic_clearance';dispatchAuthorized:boolean};
// Injection is deliberately synthetic-only. This is NOT a production policy adapter.
export interface SyntheticDispatchAdapter {
 readonly kind:'synthetic_no_network';
 inputs(tx:Prisma.TransactionClient,orderId:string):Promise<PrototypeInputs>;
 create(reference:string,packet:unknown):Promise<{trackingNumber:string;labelReference:string}>;
}
function canonical(value:any):string {if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}'}
function hash(value:unknown){return createHash('sha256').update(canonical(value)).digest('hex')}
export class DispatchPrototypeService {
 private async event(tx:Prisma.TransactionClient,reservationId:string,kind:string,attemptId?:string,evidence?:Prisma.InputJsonValue){return tx.dispatchPrototypeEvent.create({data:{reservationId,kind,attemptId,evidence}});}
 constructor(private readonly adapter:SyntheticDispatchAdapter){}
 private sandbox(){const u=new URL(process.env.DATABASE_URL||'');if(process.env.NODE_ENV!=='test'||process.env.PACKAGEPRO_CONSOLIDATION_DB!=='yes'||!['localhost','127.0.0.1'].includes(u.hostname)||!/^\/packagepro_e2e_consolidation_[a-z0-9]+$/.test(u.pathname)||this.adapter.kind!=='synthetic_no_network')throw new ConflictError('Unregistered synthetic dispatch prototype only');}
 private async packet(tx:Prisma.TransactionClient,orderId:string,actorId:string,hubId:string,expected:{manifestRevision:number;receiptRevision:number}) {
  return consolidationService.withCurrentWholeOrderReview(tx,orderId,actorId,hubId,expected,async facts=>{
   const inputs=await this.adapter.inputs(tx,orderId);
   if(!inputs.dispatchAuthorized)throw new ConflictError('Dispatch authority not configured');
   if(inputs.paymentRule!=='synthetic_clearance')throw new ConflictError('Payment release rule unconfigured');
   if(!Number.isSafeInteger(inputs.revision)||inputs.revision<1||!Object.values(inputs.pickup).every(x=>typeof x==='string'&&x.trim()))throw new ValidationError('Explicit pickup and packing revision required');
   if(!inputs.parcels.length||new Set(inputs.parcels.map(p=>p.id)).size!==inputs.parcels.length||inputs.parcels.some(p=>!p.id||![p.grams,p.lengthMm,p.widthMm,p.heightMm].every(n=>Number.isSafeInteger(n)&&n>0)))throw new ValidationError('Measured parcels required');
   if(await tx.shipment.findUnique({where:{orderId}}))throw new ConflictError('Existing shipment requires reconciliation');
   const order=await tx.order.findUniqueOrThrow({where:{id:orderId},select:{shippingAddress:true,shippingName:true,shippingPhone:true}});
   return {format:1,orderId,hubId,...expected,...facts,inputs,delivery:order,provider:'synthetic_no_network'};
  });
 }
 async savePacking(orderId:string,actorId:string,hubId:string,expectedRevision:number,pickup:PrototypeInputs['pickup'],parcels:PrototypeInputs['parcels']){
  this.sandbox();return prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM orders WHERE id=${orderId} FOR UPDATE`;
   await tx.$queryRaw`SELECT id FROM consolidation_hubs WHERE id=${hubId} FOR UPDATE`;
   await tx.$queryRaw`SELECT id FROM consolidation_capabilities WHERE "userId"=${actorId} AND "hubId"=${hubId} FOR UPDATE`;
   const hub=await tx.consolidationHub.findUnique({where:{id:hubId}});if(!hub?.enabled)throw new AuthorizationError('Enabled hub required');
   const cap=await tx.consolidationCapability.findUnique({where:{userId_hubId:{userId:actorId,hubId}}});
   if(!cap?.canReceive)throw new AuthorizationError('Explicit hub receiver required for prototype packing');
   const order=await tx.order.findUniqueOrThrow({where:{id:orderId}});if(['cancelled','shipped','delivered','completed'].includes(order.status))throw new ConflictError('Order closed');
   const prior=await tx.dispatchPrototypeInputs.findUnique({where:{orderId}});if((prior?.revision??0)!==expectedRevision)throw new ConflictError('Packing revision changed');
   if(prior&&prior.hubId!==hubId)throw new ConflictError('Packing hub changed; explicit reconciliation required');
   if(!Object.values(pickup).every(v=>typeof v==='string'&&v.trim())||!parcels.length||new Set(parcels.map(p=>p.id)).size!==parcels.length||parcels.some(p=>!p.id||![p.grams,p.lengthMm,p.widthMm,p.heightMm].every(n=>Number.isSafeInteger(n)&&n>0)))throw new ValidationError('Explicit pickup and measured parcels required');
   const intent=await tx.dispatchPrototypeReservation.findUnique({where:{orderId}});
   if(intent&&intent.state!=='reserved'&&intent.state!=='invalidated_before_start'&&intent.state!=='cancelled_before_start')throw new ConflictError('Attempt may have started; packing edit requires reconciliation');
   if(intent&&intent.state==='reserved'){await tx.dispatchPrototypeReservation.update({where:{id:intent.id},data:{state:'invalidated_before_start',version:{increment:1}}});await this.event(tx,intent.id,'packing_changed_before_start');}
   const data={hubId,pickup,parcels,updatedBy:actorId};return prior?tx.dispatchPrototypeInputs.update({where:{orderId},data:{...data,revision:{increment:1}}}):tx.dispatchPrototypeInputs.create({data:{...data,orderId}});
  });
 }
 async persistedInputs(tx:Prisma.TransactionClient,orderId:string):Promise<PrototypeInputs>{
  await tx.$queryRaw`SELECT id FROM dispatch_prototype_inputs WHERE "orderId"=${orderId} FOR SHARE`;
  const r=await tx.dispatchPrototypeInputs.findUnique({where:{orderId}});if(!r)throw new ConflictError('Persistent packing input missing');
  return {revision:r.revision,pickup:r.pickup as PrototypeInputs['pickup'],parcels:r.parcels as PrototypeInputs['parcels'],paymentRule:'unconfigured',dispatchAuthorized:false};
 }
 async reserve(orderId:string,actorId:string,hubId:string,expected:{manifestRevision:number;receiptRevision:number},requestKey:string){
  this.sandbox();if(!/^[A-Za-z0-9_-]{16,100}$/.test(requestKey))throw new ValidationError('Stable request key required');
  try{return await prisma.$transaction(async tx=>{
   const packet=await this.packet(tx,orderId,actorId,hubId,expected),packetHash=hash(packet);
   const prior=await tx.dispatchPrototypeReservation.findUnique({where:{orderId}});
   if(prior){if(prior.requestKey!==requestKey||prior.packetHash!==packetHash)throw new ConflictError('Existing dispatch intent differs');return prior;}
   const r=await tx.dispatchPrototypeReservation.create({data:{orderId,requestKey,packetHash,packet:packet as unknown as Prisma.InputJsonValue,createdBy:actorId}});await this.event(tx,r.id,'reserved');return r;
  });}catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')throw new ConflictError('Dispatch intent already reserved; reload current state');throw e;}
 }
 /** Explicit local replacement of never-started intent only. Not an external retry. */
 async replaceBeforeStart(id:string,actorId:string,expectedVersion:number,expected:{manifestRevision:number;receiptRevision:number},requestKey:string){
  this.sandbox();if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1||!/^[A-Za-z0-9_-]{16,100}$/.test(requestKey))throw new ValidationError('Expected version and new stable request key required');
  return prisma.$transaction(async tx=>{
   const lookup=await tx.dispatchPrototypeReservation.findUniqueOrThrow({where:{id}});
   await tx.$queryRaw`SELECT id FROM orders WHERE id=${lookup.orderId} FOR UPDATE`;
   const r=await tx.dispatchPrototypeReservation.findUniqueOrThrow({where:{id}});
   if(r.createdBy!==actorId)throw new AuthorizationError('Prototype reservation actor differs');
   if(r.version!==expectedVersion||!['invalidated_before_start','cancelled_before_start'].includes(r.state))throw new ConflictError('Only current never-started invalidation/cancellation may be replaced');
   if(await tx.dispatchPrototypeAttempt.findUnique({where:{reservationId:id}}))throw new ConflictError('Attempt history forbids replacement');
   if(requestKey===r.requestKey)throw new ConflictError('Explicit replacement needs a different request key');
   const manifest=await tx.consolidationManifest.findUniqueOrThrow({where:{orderId:r.orderId}});
   const packet=await this.packet(tx,r.orderId,actorId,manifest.hubId,expected),packetHash=hash(packet);
   const changed=await tx.dispatchPrototypeReservation.updateMany({where:{id,version:expectedVersion,state:r.state},data:{state:'reserved',requestKey,packetHash,packet:packet as unknown as Prisma.InputJsonValue,version:{increment:1}}});
   if(changed.count!==1)throw new ConflictError('Dispatch replacement changed concurrently');
   await this.event(tx,id,'reserved_replaced_before_start',undefined,{priorVersion:r.version,priorPacketHash:r.packetHash,priorState:r.state,packetHash});
   return tx.dispatchPrototypeReservation.findUniqueOrThrow({where:{id}});
  });
 }
 async claim(id:string,actorId:string){
  this.sandbox();return prisma.$transaction(async tx=>{
   const lookup=await tx.dispatchPrototypeReservation.findUnique({where:{id}});if(!lookup)throw new NotFoundError('Dispatch reservation');
   await tx.$queryRaw`SELECT id FROM orders WHERE id=${lookup.orderId} FOR UPDATE`;
   const r=await tx.dispatchPrototypeReservation.findUniqueOrThrow({where:{id}});
   if(r.createdBy!==actorId)throw new AuthorizationError('Prototype reservation actor differs');
   if(r.state!=='reserved')throw new ConflictError('Dispatch already claimed or closed');
   const prior=r.packet as any;
   let current:unknown;
   try{current=await this.packet(tx,r.orderId,actorId,prior.hubId,prior)}catch(e){if(!(e instanceof ConflictError)&&!(e instanceof ValidationError)&&!(e instanceof AuthorizationError))throw e;await tx.dispatchPrototypeReservation.update({where:{id},data:{state:'invalidated_before_start',version:{increment:1}}});await this.event(tx,id,'invalidated_before_start');return {invalidated:true as const};}
   if(hash(current)!==r.packetHash){await tx.dispatchPrototypeReservation.update({where:{id},data:{state:'invalidated_before_start',version:{increment:1}}});await this.event(tx,id,'invalidated_before_start');return {invalidated:true as const};}
   const claimed=await tx.dispatchPrototypeReservation.updateMany({where:{id,state:'reserved',version:r.version},data:{state:'attempt_started',version:{increment:1}}});
   if(claimed.count!==1)throw new ConflictError('Dispatch claim lost');
   const attempt=await tx.dispatchPrototypeAttempt.create({data:{reservationId:id,packetHash:r.packetHash,providerReference:'synthetic-dispatch-'+id}});
   await this.event(tx,id,'attempt_started',attempt.id);return {invalidated:false as const,attempt,packet:r.packet};
  });
 }
 async executeOnce(id:string,actorId:string){
  const claim=await this.claim(id,actorId);if(claim.invalidated)return claim;
  let result:{trackingNumber:string;labelReference:string};
  try{result=await this.adapter.create(claim.attempt.providerReference,claim.packet);if(!result?.trackingNumber||!result?.labelReference)throw Error('Malformed synthetic provider result');}
  catch{await this.markUnknown(claim.attempt.id);return {reconciliationRequired:true as const};}
  try{return await this.finalize(claim.attempt.id,result)}catch{let evidenceRecorded=true;try{await this.recordEvidence(claim.attempt.id,result)}catch{evidenceRecorded=false}await this.markUnknown(claim.attempt.id);return evidenceRecorded?{reconciliationRequired:true as const}:{reconciliationRequired:true as const,evidenceRecorded:false};}
 }
 async finalize(attemptId:string,result:{trackingNumber:string;labelReference:string}){
  this.sandbox();return prisma.$transaction(async tx=>{
   const lookup=await tx.dispatchPrototypeAttempt.findUniqueOrThrow({where:{id:attemptId}});
   const reservation=await tx.dispatchPrototypeReservation.findUniqueOrThrow({where:{id:lookup.reservationId}});
   await tx.$queryRaw`SELECT id FROM orders WHERE id=${reservation.orderId} FOR UPDATE`;
   const a=await tx.dispatchPrototypeAttempt.findUniqueOrThrow({where:{id:attemptId}});
   if(a.packetHash!==reservation.packetHash||!result.trackingNumber||!result.labelReference)throw new ConflictError('Attempt packet/result mismatch');
   if(a.state==='label_created'){if(canonical(a.result)!==canonical(result))throw new ConflictError('Provider result differs');return a;}
   if(!['attempt_started','reconciliation_required'].includes(a.state))throw new ConflictError('Attempt closed');
   await tx.dispatchPrototypeReservation.update({where:{id:reservation.id},data:{state:'label_created',version:{increment:1}}});
   const done=await tx.dispatchPrototypeAttempt.update({where:{id:attemptId},data:{state:'label_created',result,failureCode:null}});await this.event(tx,reservation.id,'label_created',attemptId,result);return done;
  });
 }
 async expireStarted(attemptId:string,olderThan:Date){this.sandbox();if(!Number.isFinite(olderThan.getTime())||olderThan.getTime()>Date.now()-60000)throw new ValidationError('Explicit past timeout cutoff required');const a=await prisma.dispatchPrototypeAttempt.findUniqueOrThrow({where:{id:attemptId}});if(a.state==='attempt_started'&&a.createdAt<=olderThan)await this.markUnknown(attemptId);}
 async recordEvidence(attemptId:string,result:{trackingNumber:string;labelReference:string}){this.sandbox();return prisma.$transaction(async tx=>{const a=await tx.dispatchPrototypeAttempt.findUniqueOrThrow({where:{id:attemptId}});await this.event(tx,a.reservationId,'provider_result_observed',attemptId,result);});}
 async markUnknown(attemptId:string){this.sandbox();return prisma.$transaction(async tx=>{const a=await tx.dispatchPrototypeAttempt.findUniqueOrThrow({where:{id:attemptId}});const r=await tx.dispatchPrototypeReservation.findUniqueOrThrow({where:{id:a.reservationId}});await tx.$queryRaw`SELECT id FROM orders WHERE id=${r.orderId} FOR UPDATE`;const changed=await tx.dispatchPrototypeAttempt.updateMany({where:{id:attemptId,state:'attempt_started'},data:{state:'reconciliation_required',failureCode:'external_outcome_unknown'}});if(changed.count){await tx.dispatchPrototypeReservation.update({where:{id:a.reservationId},data:{state:'reconciliation_required',version:{increment:1}}});await this.event(tx,a.reservationId,'reconciliation_required',attemptId);}});}
 async cancelBeforeStart(id:string){this.sandbox();return prisma.$transaction(async tx=>{const r=await tx.dispatchPrototypeReservation.findUniqueOrThrow({where:{id}});await tx.$queryRaw`SELECT id FROM orders WHERE id=${r.orderId} FOR UPDATE`;const c=await tx.dispatchPrototypeReservation.updateMany({where:{id,state:'reserved'},data:{state:'cancelled_before_start',version:{increment:1}}});if(!c.count)throw new ConflictError('Attempt may have started; reconciliation required');await this.event(tx,id,'cancelled_before_start');});}
}
