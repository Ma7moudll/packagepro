'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {projectReceiptRelease} = require('./consolidation-contract.cjs');
function fixture() {
  return {
    manifest: {orderId:'synthetic-order', revision:'manifest-2', entries:[
      {id:'boxes',orderItemId:'line-1',poId:'factory-a-po',unit:'piece',required:100},
      {id:'labels',orderItemId:'line-2',poId:'factory-b-po',unit:'piece',required:200},
    ]},
    receipts:[
      {entryId:'boxes',poId:'factory-a-po',orderItemId:'line-1',unit:'piece',manifestRevision:'manifest-2',hubId:'synthetic-hub',received:100,accepted:100,rejected:0},
      {entryId:'labels',poId:'factory-b-po',orderItemId:'line-2',unit:'piece',manifestRevision:'manifest-2',hubId:'synthetic-hub',received:200,accepted:200,rejected:0},
    ],
    orderItems:[{id:'line-1',unit:'piece',quantity:100},{id:'line-2',unit:'piece',quantity:200}],
    receiptRevision:4, hubId:'synthetic-hub', assignedActors:['synthetic-receiver'],
    confirmation:{orderId:'synthetic-order',actorId:'synthetic-receiver',manifestRevision:'manifest-2',receiptRevision:4,hubId:'synthetic-hub'},
  };
}
test('both factories received and reviewed plus current team confirmation makes necessary gate eligible',()=>{
  assert.deepEqual(projectReceiptRelease(fixture()),{eligible:true,blockers:[]});
});
const cases = [
  ['manifest understates ordered quantity', x=>{x.manifest.entries[0].required=1;x.receipts[0].received=1;x.receipts[0].accepted=1;}, 'incomplete_or_excess_allocation'],
  ['manifest omits entire order item', x=>{x.manifest.entries.pop();x.receipts.pop();}, 'incomplete_or_excess_allocation'],
  ['manifest overallocates item', x=>x.manifest.entries[0].required=101, 'incomplete_or_excess_allocation'],
  ['missing authoritative items', x=>delete x.orderItems, 'order_items_unavailable'],
  ['duplicate authoritative item', x=>x.orderItems.push({...x.orderItems[0]}), 'invalid_order_items'],
  ['missing source PO', x=>delete x.manifest.entries[0].poId, 'invalid_manifest'],
  ['wrong receipt PO', x=>x.receipts[0].poId='foreign-po', 'receipt_identity_mismatch'],
  ['wrong receipt item', x=>x.receipts[0].orderItemId='line-2', 'receipt_identity_mismatch'],
  ['wrong receipt unit', x=>x.receipts[0].unit='carton', 'receipt_identity_mismatch'],
  ['manifest unit differs from order', x=>x.manifest.entries[0].unit='carton', 'allocation_identity_mismatch'],
  ['extra stock requires reconciliation without deciding its disposition', x=>x.receipts[0].received=101, 'overreceipt_requires_reconciliation'],
  ['order item missing unit', x=>delete x.orderItems[0].unit, 'invalid_order_items'],
  ['order item fractional quantity', x=>x.orderItems[0].quantity=1.5, 'invalid_order_items'],
  ['order item zero quantity', x=>x.orderItems[0].quantity=0, 'invalid_order_items'],
  ['order item negative quantity', x=>x.orderItems[0].quantity=-1, 'invalid_order_items'],
  ['one factory missing', x=>x.receipts.pop(), 'parts_missing'],
  ['physical receipt without review', x=>x.receipts[1].accepted=0, 'parts_not_fully_accepted'],
  ['rejected part', x=>{x.receipts[1].accepted=199;x.receipts[1].rejected=1;}, 'rejected_parts'],
  ['no team confirmation', x=>x.confirmation=null, 'team_confirmation_required'],
  ['actor not explicitly assigned', x=>x.assignedActors=[], 'unassigned_actor'],
  ['manifest changed after confirmation', x=>x.confirmation.manifestRevision='manifest-1', 'stale_or_wrong_confirmation'],
  ['receipt correction after confirmation', x=>x.receiptRevision++, 'stale_or_wrong_confirmation'],
  ['hub changed after confirmation', x=>x.confirmation.hubId='other-hub', 'stale_or_wrong_confirmation'],
  ['old manifest receipt', x=>x.receipts[1].manifestRevision='manifest-1', 'stale_or_wrong_receipt'],
  ['receipt at wrong hub', x=>x.receipts[1].hubId='other-hub', 'stale_or_wrong_receipt'],
  ['empty manifest never vacuously releases', x=>x.manifest.entries=[], 'manifest_unavailable'],
  ['missing item allocation', x=>delete x.manifest.entries[0].orderItemId, 'invalid_manifest'],
  ['duplicate manifest entry', x=>x.manifest.entries.push({...x.manifest.entries[0]}), 'invalid_manifest'],
  ['duplicate receipt snapshot', x=>x.receipts.push({...x.receipts[0]}), 'invalid_receipt'],
  ['receipt outside manifest', x=>x.receipts.push({...x.receipts[0],entryId:'foreign'}), 'invalid_receipt'],
  ['invalid accepted quantities', x=>x.receipts[0].accepted=101, 'invalid_quantities'],
  ['negative quantity', x=>x.receipts[0].received=-1, 'invalid_quantities'],
  ['fractional required quantity', x=>x.manifest.entries[0].required=0.5, 'invalid_manifest'],
  ['missing hub', x=>x.hubId=null, 'invalid_snapshot'],
  ['different order confirmation', x=>x.confirmation.orderId='other-order', 'stale_or_wrong_confirmation'],
];
for (const [name, mutate, blocker] of cases) test(name,()=>{
  const x=fixture();mutate(x);const actual=projectReceiptRelease(x);
  assert.equal(actual.eligible,false);assert.ok(actual.blockers.includes(blocker));
});
test('projection is read-only and does not produce a carrier action or shipped status',()=>{
  const x=fixture(), before=JSON.stringify(x), result=projectReceiptRelease(x);
  assert.equal(JSON.stringify(x),before);assert.deepEqual(Object.keys(result).sort(),['blockers','eligible']);
});

test('two POs can explicitly allocate one ordered item without double counting',()=>{
 const x=fixture();x.manifest.entries[0].required=40;x.receipts[0].received=40;x.receipts[0].accepted=40;
 x.manifest.entries.push({...x.manifest.entries[0],id:'boxes-other',poId:'factory-c-po',required:60});
 x.receipts.push({...x.receipts[0],entryId:'boxes-other',poId:'factory-c-po',received:60,accepted:60});
 assert.equal(projectReceiptRelease(x).eligible,true);
});
