import { describe, it, expect } from 'vitest';
import { vendorOrderView, vendorShippingAddress } from './vendor-order-view';

// Direct tests of the allow-list: every allow-listed key passes, extra input keys never do,
// and non-string or non-object config is handled. No DB, no routes.
const ADDRESS_KEYS = ['name', 'phone', 'email', 'street', 'city', 'state', 'postalCode', 'country'];
const CONFIG_KEYS = ['size', 'material', 'finish', 'printColors', 'printSides', 'sides', 'closure', 'handle', 'insert', 'selectedSize', 'selectedMaterial', 'selectedFinish'];
const withConfig = (config: any) => (vendorOrderView({ id: 'O', items: [{ id: 'i', config }] }).items as any[])[0].config;

describe('vendor address allow-list', () => {
  it('returns exactly the 8 allow-listed keys and drops extra stored keys (notes, userId, accountEmail)', () => {
    const stored: any = { notes: 'N', userId: 'U', accountEmail: 'A', internalFlag: 'F' };
    for (const k of ADDRESS_KEYS) stored[k] = `v-${k}`;
    const out = vendorShippingAddress(stored)!;
    expect(Object.keys(out).sort()).toEqual([...ADDRESS_KEYS].sort());
    expect(Object.keys(stored).length).toBeGreaterThan(ADDRESS_KEYS.length);
    expect(JSON.stringify(out)).not.toMatch(/"(notes|userId|accountEmail|internalFlag)"/);
    expect(vendorOrderView({ id: 'O', shippingAddress: stored }).shippingAddress).toEqual(out);
  });
  it('non-object addresses become null', () => {
    for (const v of [null, undefined, 'x', 5, ['a']]) expect(vendorShippingAddress(v)).toBeNull();
  });
});

describe('vendor item config allow-list', () => {
  it.each(CONFIG_KEYS)('allow-listed key %s is passed', (k) => {
    expect(withConfig({ [k]: 'v', other: 'x' })).toEqual({ [k]: 'v' });
  });
  it('drops every non-listed key', () => {
    expect(withConfig({ designName: 'D', price: '1', designId: 'x', unitPrice: '2' })).toEqual({});
  });
  it('drops non-string values even under an allow-listed key', () => {
    expect(withConfig({ material: { a: 1 }, finish: 5, size: ['x'], closure: null, handle: true, insert: 'ok' })).toEqual({ insert: 'ok' });
  });
  it('non-object config (array, primitive, null, missing) returns null', () => {
    for (const v of [['material'], 'material', 7, true, null, undefined]) expect(withConfig(v)).toBeNull();
  });
});

describe('vendor shipment allow-list', () => {
  const SHIPMENT_KEYS = ['id', 'orderId', 'status', 'dhlTrackingNumber', 'shippingMethod', 'estimatedDeliveryDate', 'actualDeliveryDate'];
  it('returns exactly the 7 allow-listed keys and drops the real extra Shipment columns', () => {
    const stored: any = { labelUrl: 'L', weight: 'W', dimensions: 'D', trackingEvents: ['E'], podSignature: 'P', createdAt: 'C', updatedAt: 'U', rawResponse: 'R' };
    for (const k of SHIPMENT_KEYS) stored[k] = `v-${k}`;
    const out = (vendorOrderView({ id: 'O', shipment: stored }) as any).shipment;
    expect(Object.keys(out).sort()).toEqual([...SHIPMENT_KEYS].sort());
    expect(Object.keys(stored).length).toBeGreaterThan(SHIPMENT_KEYS.length);
  });
  it.each(SHIPMENT_KEYS)('allow-listed shipment key %s is passed', (k) => {
    expect((vendorOrderView({ id: 'O', shipment: { [k]: 'v' } }) as any).shipment).toEqual({ [k]: 'v' });
  });
});
