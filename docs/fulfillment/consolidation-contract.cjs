'use strict';
// Documentation-only reference model. No runtime imports or side effects.
// Authorization and snapshot completeness are inputs to investigate, not proven here.
function projectReceiptRelease({manifest, receipts, confirmation, assignedActors, receiptRevision, hubId, orderItems}) {
  const blockers = [];
  if (!manifest || !manifest.revision || !manifest.orderId || !Array.isArray(manifest.entries) || !manifest.entries.length)
    return {eligible: false, blockers: ['manifest_unavailable']};
  // The real service must derive these ordered quantities from the locked order,
  // not accept either list as client-authoritative input.
  const authoritative = new Map();
  if (!Array.isArray(orderItems) || !orderItems.length) blockers.push('order_items_unavailable');
  for (const item of orderItems || []) {
    if (!item.id || authoritative.has(item.id) || !item.unit || !Number.isSafeInteger(item.quantity) || item.quantity <= 0)
      blockers.push('invalid_order_items');
    authoritative.set(item.id, item);
  }
  const allocated = new Map();
  const ids = new Set();
  for (const entry of manifest.entries) {
    if (!entry.id || ids.has(entry.id) || !entry.orderItemId || !entry.poId || !entry.unit || !Number.isSafeInteger(entry.required) || entry.required <= 0)
      blockers.push('invalid_manifest');
    ids.add(entry.id);
    const item = authoritative.get(entry.orderItemId);
    if (!item || item.unit !== entry.unit) blockers.push('allocation_identity_mismatch');
    allocated.set(entry.orderItemId, (allocated.get(entry.orderItemId) || 0) + entry.required);
  }
  for (const item of authoritative.values())
    if (allocated.get(item.id) !== item.quantity) blockers.push('incomplete_or_excess_allocation');
  if (!hubId || !Number.isSafeInteger(receiptRevision) || receiptRevision < 0) blockers.push('invalid_snapshot');
  const receiptIds = new Set();
  for (const receipt of receipts || []) {
    if (!receipt.entryId || receiptIds.has(receipt.entryId) || !ids.has(receipt.entryId)) blockers.push('invalid_receipt');
    receiptIds.add(receipt.entryId);
  }
  for (const entry of manifest.entries) {
    const receipt = (receipts || []).find(r => r.entryId === entry.id);
    if (!receipt) { blockers.push('parts_missing'); continue; }
    if (receipt.poId !== entry.poId || receipt.orderItemId !== entry.orderItemId || receipt.unit !== entry.unit)
      blockers.push('receipt_identity_mismatch');
    if (receipt.manifestRevision !== manifest.revision || receipt.hubId !== hubId) blockers.push('stale_or_wrong_receipt');
    if (![receipt.received, receipt.accepted, receipt.rejected].every(n => Number.isSafeInteger(n) && n >= 0)
      || receipt.accepted + receipt.rejected > receipt.received) blockers.push('invalid_quantities');
    if (receipt.rejected > 0) blockers.push('rejected_parts');
    if (receipt.received > entry.required) blockers.push('overreceipt_requires_reconciliation');
    if (receipt.received < entry.required || receipt.accepted !== entry.required) blockers.push('parts_not_fully_accepted');
  }
  if (!confirmation) blockers.push('team_confirmation_required');
  else {
    if (!(assignedActors || []).includes(confirmation.actorId)) blockers.push('unassigned_actor');
    if (confirmation.orderId !== manifest.orderId || confirmation.manifestRevision !== manifest.revision
      || confirmation.receiptRevision !== receiptRevision || confirmation.hubId !== hubId) blockers.push('stale_or_wrong_confirmation');
  }
  return {eligible: blockers.length === 0, blockers: [...new Set(blockers)]};
}
module.exports = {projectReceiptRelease};
