/**
 * What a vendor may see of an order. This is an allow-list: a field that is not named here is not returned,
 * so a column added to Order later does not reach a vendor by default.
 *
 * A vendor works from its own purchase orders (their cost and their print and dieline URLs are top-level PO
 * fields), the line specifications, and the shipping recipient fields it needs to ship. It does not get the
 * customer's design or approval proof, the customer's account, any customer price (order subtotal, tax,
 * shipping charge, total, line prices), payment, settlements, reviews, order metadata, or another vendor's PO.
 */
const ORDER_FIELDS = [
  'id', 'orderNumber', 'status', 'currency',
  'createdAt', 'updatedAt', 'approvedAt', 'shippedAt', 'deliveredAt', 'completedAt',
  'shippingName', 'shippingPhone', 'shippingEmail', 'notes',
] as const;
const ITEM_FIELDS = ['id', 'orderId', 'productType', 'quantity', 'dimensions', 'material', 'color', 'finish', 'productId', 'variantId', 'sku', 'config'] as const;
const ADDRESS_FIELDS = ['name', 'phone', 'email', 'street', 'city', 'state', 'postalCode', 'country'] as const;
const SHIPMENT_FIELDS = ['id', 'orderId', 'status', 'dhlTrackingNumber', 'shippingMethod', 'estimatedDeliveryDate', 'actualDeliveryDate'] as const;

function pick(src: any, keys: readonly string[]): Record<string, any> {
  const out: Record<string, any> = {};
  if (!src || typeof src !== 'object') return out;
  for (const k of keys) if (k in src) out[k] = src[k];
  return out;
}

/** The shipping address as limited recipient fields only (never the whole stored object). */
export function vendorShippingAddress(address: any): Record<string, any> | null {
  return address && typeof address === 'object' && !Array.isArray(address) ? pick(address, ADDRESS_FIELDS) : null;
}

/**
 * `vendorUserId` limits purchaseOrders to that vendor's own. Without it (the PO view, where the order sits under
 * one PO already) no purchaseOrders key is added.
 */
export function vendorOrderView(order: Record<string, any>, vendorUserId?: string): Record<string, any> {
  const out: Record<string, any> = pick(order, ORDER_FIELDS);
  out.shippingAddress = vendorShippingAddress(order.shippingAddress);
  if (Array.isArray(order.items)) out.items = order.items.map((i: any) => pick(i, ITEM_FIELDS));
  if (order.shipment) out.shipment = pick(order.shipment, SHIPMENT_FIELDS);
  if (vendorUserId !== undefined) {
    out.purchaseOrders = Array.isArray(order.purchaseOrders)
      ? order.purchaseOrders.filter((po: any) => po?.vendor?.userId === vendorUserId)
      : [];
  }
  return out;
}
