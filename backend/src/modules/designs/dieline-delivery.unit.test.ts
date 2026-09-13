// M8-J — Unit suite: certified dieline delivery receipt (pure, database-free).
//
//   A  deterministic file name — dieline-<boxType>.svg, no timestamps/UUIDs
//   B  no order              -> unavailable / NOT_CERTIFIED (cannot certify)
//   C  no persisted result   -> blocked_certification / NOT_CERTIFIED
//   D  stale check           -> blocked_certification / NOT_CERTIFIED when the
//      design changed after the last prepress check (never a silent pass)
//   E  failed check          -> blocked_certification / FAILED
//   F  unverifiable verdict  -> blocked_certification / UNVERIFIABLE (a real M8-I
//      outcome is never marketed as a pass)
//   G  clean pass            -> delivered / CERTIFIED with a deterministic file name
//   H  receipt carries NO geometry — it never claims to authenticate bytes

import { describe, it, expect } from 'vitest';
import {
  dielineDeliveryFileName,
  certifiedDielineReceipt,
  type DeliveryInput,
} from './dieline-delivery';

describe('dielineDeliveryFileName', () => {
  it('A: names are deterministic and mangle unsupported characters', () => {
    expect(dielineDeliveryFileName('mailer-box')).toBe('dieline-mailer-box.svg');
    expect(dielineDeliveryFileName('Folding Carton')).toBe('dieline-folding-carton.svg');
    expect(dielineDeliveryFileName('custom/mailer!box')).toBe('dieline-custom-mailer-box.svg');
    expect(dielineDeliveryFileName(undefined)).toBe('dieline-dieline.svg');
    expect(dielineDeliveryFileName('')).toBe('dieline-dieline.svg');
    expect(/[0-9]{13}/.test(dielineDeliveryFileName('mailer-box'))).toBe(false);
  });
});

const PREPRESS_BASE = {
  passed: true,
  checkedAt: new Date('2026-09-13T10:00:00Z'),
  issues: [],
};

const input = (over: Partial<DeliveryInput> = {}) =>
  ({
    orderId: 'order-1',
    designUpdatedAt: new Date('2026-09-13T09:00:00Z'),
    prepress: PREPRESS_BASE,
    boxType: 'mailer-box',
    ...over,
  }) as DeliveryInput;

describe('certifiedDielineReceipt', () => {
  it('B: no order -> unavailable / NOT_CERTIFIED', () => {
    const r = certifiedDielineReceipt(input({ orderId: null }));
    expect(r.status).toBe('unavailable');
    expect(r.certificationStatus).toBe('NOT_CERTIFIED');
    expect(r.reason).toMatch(/no linked order/i);
  });

  it('C: no persisted result -> blocked_certification / NOT_CERTIFIED', () => {
    const r = certifiedDielineReceipt(input({ prepress: null }));
    expect(r.status).toBe('blocked_certification');
    expect(r.certificationStatus).toBe('NOT_CERTIFIED');
    expect(r.reason).toMatch(/no prepress certification is on record/i);
  });

  it('D: stale certification (design changed after the check) -> NOT_CERTIFIED', () => {
    const stale = input({
      designUpdatedAt: new Date('2026-09-13T11:00:00Z'), // newer than checkedAt
    });
    const r = certifiedDielineReceipt(stale);
    expect(r.status).toBe('blocked_certification');
    expect(r.certificationStatus).toBe('NOT_CERTIFIED');
    expect(r.reason).toMatch(/stale/i);
    // A check at the same instant is still current.
    const same = input({
      designUpdatedAt: new Date('2026-09-13T10:00:00Z'),
    });
    expect(certifiedDielineReceipt(same).status).toBe('delivered');
  });

  it('E: failed check -> blocked_certification / FAILED', () => {
    const r = certifiedDielineReceipt(
      input({
        prepress: {
          ...PREPRESS_BASE,
          passed: false,
          issues: [{ type: 'resolution', severity: 'error', message: 'x' }],
        },
      }),
    );
    expect(r.status).toBe('blocked_certification');
    expect(r.certificationStatus).toBe('FAILED');
  });

  it('F: UNVERIFIABLE verdict is never marketed as a pass', () => {
    const r = certifiedDielineReceipt(
      input({
        prepress: {
          ...PREPRESS_BASE,
          passed: true,
          issues: [{ type: 'resolution', severity: 'warning', message: 'Resolution is UNVERIFIABLE for vector files' }],
        },
      }),
    );
    expect(r.status).toBe('blocked_certification');
    expect(r.certificationStatus).toBe('UNVERIFIABLE');
  });

  it('G: clean pass -> delivered / CERTIFIED with deterministic name', () => {
    const r = certifiedDielineReceipt(input());
    expect(r.status).toBe('delivered');
    expect(r.certificationStatus).toBe('CERTIFIED');
    expect(r.fileName).toBe('dieline-mailer-box.svg');
    expect(r.checkedAt).toBe('2026-09-13T10:00:00.000Z');
    expect(r.format).toBe('svg');
    expect(r.dieline).toBe(true);
  });

  it('H: a receipt never fabricates geometry or authenticates bytes', () => {
    const r = certifiedDielineReceipt(input());
    expect(JSON.stringify(r)).not.toMatch(/<svg|\bdata-face-id\b|<path/);
  });
})