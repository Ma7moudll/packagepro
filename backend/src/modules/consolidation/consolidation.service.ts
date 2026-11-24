import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '../../utils/errors';

type Allocation = { id: string; orderItemId: string; poId: string; unit: 'piece'; required: number };
type Receipt = { received: number; accepted: number; rejected: number };
function hash(value: unknown): string { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function integer(n: number): boolean { return Number.isSafeInteger(n) && n >= 0 && n <= 2147483647; }
const closed = ['cancelled', 'shipped', 'delivered', 'completed'];

/** Local receipt/review candidate. userId must come from authenticated server context.
 * No carrier, shipment, payment, parent-status writes or capability assignment API.
 */
export class ConsolidationService {
  private async context(tx: Prisma.TransactionClient, orderId: string, userId: string, hubId: string, planning: boolean = false) {
    await tx.$queryRaw`SELECT id FROM orders WHERE id=${orderId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM consolidation_hubs WHERE id=${hubId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM consolidation_capabilities WHERE "userId"=${userId} AND "hubId"=${hubId} FOR UPDATE`;
    const user = await tx.user.findUnique({where:{id:userId},select:{id:true}});
    const hub = await tx.consolidationHub.findUnique({where:{id:hubId}});
    const cap = await tx.consolidationCapability.findUnique({where:{userId_hubId:{userId,hubId}}});
    if (!user || !hub?.enabled || !(planning ? cap?.canPlan : cap?.canReceive))
      throw new AuthorizationError('Explicit consolidation capability at an enabled hub required');
    // Lock current source rows too: ordinary item/PO updates need not cooperate
    // with the parent-order protocol. New item/PO inserts reference the locked order.
    await tx.$queryRaw`SELECT id FROM order_items WHERE "orderId"=${orderId} ORDER BY id FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM purchase_orders WHERE "orderId"=${orderId} ORDER BY id FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM designs WHERE id IN (SELECT "designId" FROM order_items WHERE "orderId"=${orderId}) ORDER BY id FOR SHARE`;
    const designs = await tx.design.findMany({where:{orderItems:{some:{orderId}}},orderBy:{id:'asc'},select:{id:true,designData:true,lifecycleStatus:true,approvedAt:true,updatedAt:true}});
    const order = await tx.order.findUnique({where:{id:orderId},include:{items:{orderBy:{id:'asc'}},purchaseOrders:{orderBy:{id:'asc'}}}});
    if (!order) throw new NotFoundError('Order');
    if (closed.includes(order.status)) throw new ConflictError('Order closed for consolidation');
    const sourceHash = hash({designs,items:order.items.map(i=>({id:i.id,quantity:i.quantity,productType:i.productType,productId:i.productId,variantId:i.variantId,config:i.config,designId:i.designId,dimensions:i.dimensions,material:i.material,color:i.color,finish:i.finish})),pos:order.purchaseOrders.map(p=>({id:p.id,vendorId:p.vendorId,status:p.status,productType:p.productType,printFileUrl:p.printFileUrl,dielineFileUrl:p.dielineFileUrl,specsFileUrl:p.specsFileUrl})),approvedAt:order.approvedAt});
    return {order,hub,sourceHash};
  }
  private async manifestContext(tx: Prisma.TransactionClient, orderId: string, userId: string) {
    const lookup = await tx.consolidationManifest.findUnique({where:{orderId}});
    if (!lookup) throw new NotFoundError('Consolidation manifest');
    const context = await this.context(tx,orderId,userId,lookup.hubId);
    const manifest = await tx.consolidationManifest.findUniqueOrThrow({where:{orderId}});
    if (manifest.hubId !== lookup.hubId || manifest.hubRevision !== context.hub.revision || manifest.sourceHash !== context.sourceHash)
      throw new ConflictError('Manifest source or hub changed; explicit replanning required');
    return {...context,manifest};
  }
  async snapshot(orderId:string,userId:string,hubId:string,after=0,limit=50) {
    if(!integer(after) || !Number.isInteger(limit) || limit<1 || limit>100) throw new ValidationError('Invalid receipt page');
    return prisma.$transaction(async tx=>{
      const {order,hub,sourceHash}=await this.context(tx,orderId,userId,hubId);
      const manifest=await tx.consolidationManifest.findUnique({where:{orderId}});
      // A capability on one hub must not reveal another hub's ledger.
      if(manifest && manifest.hubId!==hubId) throw new AuthorizationError('Manifest belongs to another hub');
      const current=!!manifest && manifest.hubRevision===hub.revision && manifest.sourceHash===sourceHash;
      const receipts=manifest ? await tx.consolidationReceiptEvent.findMany({where:{manifestId:manifest.id,receiptRevision:{gt:after}},take:limit+1,orderBy:{receiptRevision:'asc'},select:{id:true,manifestRevision:true,receiptRevision:true,allocationId:true,snapshot:true,createdAt:true}}):[];
      return {orderId,hubId,hubRevision:hub.revision,
        items:order.items.map(i=>({id:i.id,quantity:i.quantity,productType:i.productType})),
        purchaseOrders:order.purchaseOrders.map(p=>({id:p.id,status:p.status,productType:p.productType})),
        manifest:manifest?{id:manifest.id,revision:manifest.revision,receiptRevision:manifest.receiptRevision,allocations:manifest.allocations,current}:null,receipts:receipts.slice(0,limit),receiptPage:{after,hasMore:receipts.length>limit,nextAfter:receipts.length>limit?receipts[limit-1].receiptRevision:null}};
    });
  }
  /** Local prototype fence. Caller already holds the parent order lock. */
  private async fenceDispatchReceiptWrite(tx:Prisma.TransactionClient,orderId:string) {
    const intent=await tx.dispatchPrototypeReservation.findUnique({where:{orderId}});
    if(!intent)return;
    if(['attempt_started','reconciliation_required','label_created'].includes(intent.state))throw new ConflictError('Dispatch attempt may exist; receipt/source correction requires reconciliation');
    if(intent.state==='reserved'){
      await tx.dispatchPrototypeReservation.update({where:{id:intent.id},data:{state:'invalidated_before_start',version:{increment:1}}});
      await tx.dispatchPrototypeEvent.create({data:{reservationId:intent.id,kind:'receiving_changed_before_start'}});
    }
  }
  async plan(orderId: string, userId: string, hubId: string, expectedRevision: number, allocations: Allocation[]) {
    return prisma.$transaction(async tx=>{
      const {order,hub,sourceHash} = await this.context(tx,orderId,userId,hubId,true);
      await this.fenceDispatchReceiptWrite(tx,orderId);
      const existing = await tx.consolidationManifest.findUnique({where:{orderId}});
      if (expectedRevision !== (existing?.revision ?? 0)) throw new ConflictError('Manifest revision changed');
      if (!Array.isArray(allocations) || !allocations.length) throw new ValidationError('Explicit allocations required');
      const ids = new Set<string>(), totals = new Map<string,number>();
      for (const allocation of allocations) {
        const item = order.items.find(i=>i.id===allocation.orderItemId);
        const po = order.purchaseOrders.find(p=>p.id===allocation.poId);
        if (!allocation.id || ids.has(allocation.id) || allocation.unit !== 'piece' || !integer(allocation.required) || allocation.required===0
          || !item || !po || po.status !== 'confirmed' || po.productType !== item.productType)
          throw new ValidationError('Allocation must identify a current item and confirmed same-order PO with matching product type');
        ids.add(allocation.id);totals.set(item.id,(totals.get(item.id)??0)+allocation.required);
      }
      if (!order.items.length || order.items.some(i=>!integer(i.quantity) || i.quantity===0 || totals.get(i.id)!==i.quantity))
        throw new ValidationError('Allocations must cover exactly every server-read ordered quantity');
      const data={hubId,hubRevision:hub.revision,sourceHash,allocations:allocations.map(a=>({id:a.id,orderItemId:a.orderItemId,poId:a.poId,unit:a.unit,required:a.required})) as Prisma.InputJsonValue,createdBy:userId};
      if (existing) return tx.consolidationManifest.update({where:{id:existing.id},data:{...data,revision:{increment:1}}});
      return tx.consolidationManifest.create({data:{...data,orderId}});
    });
  }
  async recordReceipt(orderId: string, userId: string, input: {manifestRevision:number; receiptRevision:number; allocationId:string; eventKey:string; counts:Receipt; reason:string}) {
    return prisma.$transaction(async tx=>{
      const {manifest}=await this.manifestContext(tx,orderId,userId);
      if (!/^[A-Za-z0-9._:-]{16,128}$/.test(input.eventKey) || !input.reason?.trim() || input.reason.length>1000)
        throw new ValidationError('Stable event key and correction/review reason required');
      const requestHash=hash({actor:userId,manifestRevision:input.manifestRevision,receiptRevision:input.receiptRevision,allocationId:input.allocationId,eventKey:input.eventKey,counts:{received:input.counts?.received,accepted:input.counts?.accepted,rejected:input.counts?.rejected},reason:input.reason});
      const prior=await tx.consolidationReceiptEvent.findUnique({where:{manifestId_eventKey:{manifestId:manifest.id,eventKey:input.eventKey}}});
      if (prior) { if (prior.requestHash!==requestHash) throw new ConflictError('Event key reused with different facts'); return prior; }
      if (manifest.revision!==input.manifestRevision || manifest.receiptRevision!==input.receiptRevision)
        throw new ConflictError('Receipt or manifest revision changed');
      const entry=(manifest.allocations as unknown as Allocation[]).find(a=>a.id===input.allocationId);
      const c=input.counts;
      if (!entry || !c || ![c.received,c.accepted,c.rejected].every(integer) || c.accepted+c.rejected>c.received)
        throw new ValidationError('Valid allocation receipt/review counts required');
      await this.fenceDispatchReceiptWrite(tx,orderId);
      const next=manifest.receiptRevision+1;
      const event=await tx.consolidationReceiptEvent.create({data:{manifestId:manifest.id,manifestRevision:manifest.revision,receiptRevision:next,eventKey:input.eventKey,requestHash,actorId:userId,allocationId:entry.id,snapshot:{...entry,...c},reason:input.reason.trim()}});
      await tx.consolidationManifest.update({where:{id:manifest.id},data:{receiptRevision:next}});
      return event;
    });
  }
  private async blockers(tx: Prisma.TransactionClient, manifest: {id:string;revision:number;allocations:Prisma.JsonValue}) {
    const events=await tx.consolidationReceiptEvent.findMany({where:{manifestId:manifest.id,manifestRevision:manifest.revision},orderBy:{receiptRevision:'desc'}});
    const blockers:string[]=[];
    for (const entry of manifest.allocations as unknown as Allocation[]) {
      const event=events.find(e=>e.allocationId===entry.id);
      const receipt=event?.snapshot as unknown as Receipt | undefined;
      if (!receipt) {blockers.push('parts_missing');continue;}
      if (receipt.rejected>0) blockers.push('rejected_parts');
      if (receipt.received>entry.required) blockers.push('overreceipt_requires_reconciliation');
      if (receipt.received<entry.required || receipt.accepted!==entry.required) blockers.push('parts_not_fully_accepted');
    }
    return [...new Set(blockers)];
  }
  async confirm(orderId:string,userId:string,expected:{manifestRevision:number;receiptRevision:number}) {
    return prisma.$transaction(async tx=>{
      const {manifest}=await this.manifestContext(tx,orderId,userId);
      if (manifest.revision!==expected.manifestRevision || manifest.receiptRevision!==expected.receiptRevision)
        throw new ConflictError('Confirmation snapshot changed');
      const blockers=await this.blockers(tx,manifest);
      if (blockers.length) throw new ConflictError(`Consolidation blocked: ${blockers.join(', ')}`);
      return tx.consolidationConfirmation.upsert({where:{manifestId_manifestRevision_receiptRevision:{manifestId:manifest.id,manifestRevision:manifest.revision,receiptRevision:manifest.receiptRevision}},update:{},create:{manifestId:manifest.id,manifestRevision:manifest.revision,receiptRevision:manifest.receiptRevision,sourceHash:manifest.sourceHash,hubRevision:manifest.hubRevision,actorId:userId}});
    });
  }
  /** Local-only observation, not registered over HTTP and never consumed by dispatch. */
  async observeAggregateReadiness(orderId:string,userId:string,hubId:string) {
    return prisma.$transaction(async tx=>{
      const {order,hub,sourceHash}=await this.context(tx,orderId,userId,hubId);
      await tx.$queryRaw`SELECT id FROM productions WHERE "poId" IN (SELECT id FROM purchase_orders WHERE "orderId"=${orderId}) ORDER BY id FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM payments WHERE "orderId"=${orderId} FOR SHARE`;
      const productions=await tx.production.findMany({where:{purchaseOrder:{orderId}},orderBy:{id:'asc'},select:{id:true,poId:true,vendorId:true,status:true,progressPercent:true}});
      const payment=await tx.payment.findUnique({where:{orderId},select:{status:true}});
      const manifest=await tx.consolidationManifest.findUnique({where:{orderId}});
      if(manifest&&manifest.hubId!==hubId)throw new AuthorizationError('Manifest belongs to another hub');
      const productionBlockers:string[]=[];
      if(!order.purchaseOrders.length)productionBlockers.push('no_purchase_orders');
      for(const po of order.purchaseOrders){
        if(po.status!=='confirmed')productionBlockers.push('purchase_order_not_confirmed');
        const run=productions.find(p=>p.poId===po.id);
        if(!run)productionBlockers.push('production_missing');
        else if(run.vendorId!==po.vendorId)productionBlockers.push('production_vendor_mismatch');
        else if(!['quality_review','completed'].includes(run.status)||run.progressPercent!==100)productionBlockers.push('production_not_finished');
      }
      const receivingBlockers:string[]=[];
      const current=!!manifest&&manifest.hubRevision===hub.revision&&manifest.sourceHash===sourceHash;
      if(!manifest)receivingBlockers.push('manifest_missing');
      else if(!current)receivingBlockers.push('manifest_source_or_hub_changed');
      else{
        receivingBlockers.push(...await this.blockers(tx,manifest));
        const confirmation=await tx.consolidationConfirmation.findUnique({where:{manifestId_manifestRevision_receiptRevision:{manifestId:manifest.id,manifestRevision:manifest.revision,receiptRevision:manifest.receiptRevision}}});
        if(!confirmation)receivingBlockers.push('team_confirmation_required');
        else{
          await tx.$queryRaw`SELECT id FROM consolidation_capabilities WHERE "userId"=${confirmation.actorId} AND "hubId"=${hubId} FOR SHARE`;
          const cap=await tx.consolidationCapability.findUnique({where:{userId_hubId:{userId:confirmation.actorId,hubId}}});
          if(!cap?.canReceive)receivingBlockers.push('confirming_capability_revoked');
        }
      }
      return {orderId,hubId,orderStatus:order.status,
        approval:{timestampRecorded:!!order.approvedAt},
        production:{allFinished:productionBlockers.length===0,blockers:[...new Set(productionBlockers)],qaEvidence:'not_durably_recorded' as const},
        receiving:{eligible:receivingBlockers.length===0,blockers:[...new Set(receivingBlockers)],manifestRevision:manifest?.revision??null,receiptRevision:manifest?.receiptRevision??null,current},
        payment:{recordedStatus:payment?.status??null,releasePolicyEvaluated:false},
        dispatch:{available:false,reserved:false,blockers:['dispatch_not_integrated','hub_pickup_and_measured_parcels_unconfigured','payment_release_policy_not_evaluated']}};
    });
  }
  /** Unregistered prototype seam. One owning transaction must include its reservation writes. */
  async withCurrentWholeOrderReview<T>(tx:Prisma.TransactionClient,orderId:string,userId:string,hubId:string,expected:{manifestRevision:number;receiptRevision:number},consume:(facts:{sourceHash:string;hubRevision:number;confirmationId:string})=>Promise<T>):Promise<T> {
    const {manifest,hub}=await this.manifestContext(tx,orderId,userId);
    if(manifest.hubId!==hubId)throw new AuthorizationError('Review belongs to another hub');
    if(manifest.revision!==expected.manifestRevision||manifest.receiptRevision!==expected.receiptRevision)throw new ConflictError('Review snapshot changed');
    if((await this.blockers(tx,manifest)).length)throw new ConflictError('Whole-order receipt/review blocked');
    const confirmation=await tx.consolidationConfirmation.findUnique({where:{manifestId_manifestRevision_receiptRevision:{manifestId:manifest.id,manifestRevision:manifest.revision,receiptRevision:manifest.receiptRevision}}});
    if(!confirmation)throw new ConflictError('Team confirmation required');
    await tx.$queryRaw`SELECT id FROM consolidation_capabilities WHERE "userId"=${confirmation.actorId} AND "hubId"=${hubId} FOR SHARE`;
    const cap=await tx.consolidationCapability.findUnique({where:{userId_hubId:{userId:confirmation.actorId,hubId}}});
    if(!cap?.canReceive||confirmation.sourceHash!==manifest.sourceHash||confirmation.hubRevision!==hub.revision)throw new ConflictError('Team confirmation no longer current');
    return consume({sourceHash:manifest.sourceHash,hubRevision:hub.revision,confirmationId:confirmation.id});
  }
  async inspectEligibility(orderId:string,userId:string) {
    return prisma.$transaction(async tx=>{
      const {manifest}=await this.manifestContext(tx,orderId,userId);
      const blockers=await this.blockers(tx,manifest);
      const confirmation=await tx.consolidationConfirmation.findUnique({where:{manifestId_manifestRevision_receiptRevision:{manifestId:manifest.id,manifestRevision:manifest.revision,receiptRevision:manifest.receiptRevision}}});
      if (!confirmation) blockers.push('team_confirmation_required');
      else {
        const confirmer=await tx.consolidationCapability.findUnique({where:{userId_hubId:{userId:confirmation.actorId,hubId:manifest.hubId}}});
        if (!confirmer?.canReceive) blockers.push('confirming_capability_revoked');
      }
      return {eligible:blockers.length===0,blockers,manifestRevision:manifest.revision,receiptRevision:manifest.receiptRevision};
    });
  }
}
export const consolidationService=new ConsolidationService();
