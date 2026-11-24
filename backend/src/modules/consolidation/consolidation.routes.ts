import {FastifyPluginAsync, FastifyRequest, FastifyReply} from 'fastify';
import {z} from 'zod';
import {authenticate, AuthenticatedRequest} from '../../middleware/auth.middleware';
import {AuthorizationError, ValidationError} from '../../utils/errors';
import {consolidationService} from './consolidation.service';

const id=z.string().trim().min(1).max(128);
const revision=z.number().int().min(0).max(2147483647);
const cursor=z.string().regex(/^(0|[1-9][0-9]{0,9})$/).transform(Number).pipe(revision);
const pageSize=z.string().regex(/^[1-9][0-9]{0,2}$/).transform(Number).pipe(z.number().int().min(1).max(100));
const count=z.number().int().min(0).max(2147483647);
const allocation=z.object({id,orderItemId:id,poId:id,unit:z.literal('piece'),required:count.positive()}).strict();
const plan=z.object({hubId:id,expectedRevision:revision,allocations:z.array(allocation).min(1).max(500)}).strict();
const receipt=z.object({manifestRevision:revision.positive(),receiptRevision:revision,allocationId:id,eventKey:z.string().regex(/^[A-Za-z0-9._:-]{16,128}$/),counts:z.object({received:count,accepted:count,rejected:count}).strict(),reason:z.string().trim().min(1).max(1000)}).strict();
const confirmation=z.object({manifestRevision:revision.positive(),receiptRevision:revision}).strict();
function parse<T>(schema:z.ZodType<T>,value:unknown):T {
 const result=schema.safeParse(value);
 if(!result.success)throw new ValidationError('Invalid consolidation request');
 return result.data;
}
async function actor(request:FastifyRequest,reply:FastifyReply) {
 // No route bypass, even when called outside index.ts or after startup.
 if(process.env.CONSOLIDATION_RECEIPTS_ENABLED!=='true')throw new AuthorizationError('Consolidation receipt HTTP surface is disabled');
 await authenticate(request,reply);
 return (request as AuthenticatedRequest).user.userId;
}
// HTTP DTOs expose revisions/facts, never internal actor IDs, reasons, source hashes or keys.
function manifestDto(m:any){return {id:m.id,revision:m.revision,receiptRevision:m.receiptRevision,hubId:m.hubId,hubRevision:m.hubRevision,allocations:m.allocations};}
function receiptDto(e:any){return {id:e.id,manifestRevision:e.manifestRevision,receiptRevision:e.receiptRevision,allocationId:e.allocationId,snapshot:e.snapshot,createdAt:e.createdAt};}
function confirmationDto(c:any){return {id:c.id,manifestRevision:c.manifestRevision,receiptRevision:c.receiptRevision,hubRevision:c.hubRevision};}
function orderId(request:FastifyRequest):string {return parse(z.object({orderId:id}).strict(),request.params).orderId;}

/** Default-off receipt/review only. No capability assignment or dispatch routes. */
export const consolidationRoutes:FastifyPluginAsync=async server=>{
 server.get('/consolidation/orders/:orderId',async(request,reply)=>{
  const userId=await actor(request,reply), order=orderId(request);
  const query=parse(z.object({hubId:id,after:cursor.optional(),limit:pageSize.optional()}).strict(),request.query);
  return reply.send({success:true,data:await consolidationService.snapshot(order,userId,query.hubId,query.after,query.limit)});
 });
 server.post('/consolidation/orders/:orderId/manifest',async(request,reply)=>{
  const userId=await actor(request,reply), order=orderId(request),body=parse(plan,request.body);
  return reply.send({success:true,data:manifestDto(await consolidationService.plan(order,userId,body.hubId,body.expectedRevision,body.allocations))});
 });
 server.post('/consolidation/orders/:orderId/receipts',async(request,reply)=>{
  const userId=await actor(request,reply), order=orderId(request),body=parse(receipt,request.body);
  return reply.send({success:true,data:receiptDto(await consolidationService.recordReceipt(order,userId,body))});
 });
 server.post('/consolidation/orders/:orderId/confirm',async(request,reply)=>{
  const userId=await actor(request,reply), order=orderId(request),body=parse(confirmation,request.body);
  return reply.send({success:true,data:confirmationDto(await consolidationService.confirm(order,userId,body))});
 });
 server.get('/consolidation/orders/:orderId/eligibility',async(request,reply)=>{
  const userId=await actor(request,reply), order=orderId(request);
  parse(z.object({}).strict(),request.query);
  return reply.send({success:true,data:await consolidationService.inspectEligibility(order,userId)});
 });
};
