/**
 * What a vendor may see of an order. A vendor works from its purchase-order files (the PO's own print and
 * dieline URLs, which are top-level PO fields) and uploads its own sample photos. It does not see the customer's
 * design (designData and every design file row), the approval request (proof URL, hashes), the customer's
 * account identity, payment, settlements or reviews. Everything else on the object is unchanged.
 */
/** A vendor sees only its own purchase orders on an order, never another vendor's PO or vendor row. */
export function onlyOwnPOs<T extends Record<string, any>>(order: T, vendorUserId: string): T {
  const own = Array.isArray(order.purchaseOrders)
    ? order.purchaseOrders.filter((po: any) => po?.vendor?.userId === vendorUserId)
    : [];
  return { ...order, purchaseOrders: own };
}

export function withoutDesignSide<T extends Record<string, any>>(order: T): T {
  const out: Record<string, any> = { ...order, design: null, approvalRequests: [] };
  if ('payment' in out) out.payment = null;
  if ('settlements' in out) out.settlements = [];
  if ('reviews' in out) out.reviews = [];
  if (out.customer) out.customer = { id: out.customer.id };
  return out as T;
}
