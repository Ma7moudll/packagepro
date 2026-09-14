import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../lib/prisma';
import { invoiceService } from './invoice.service';
import { AuthorizationError, NotFoundError } from '../../utils/errors';

/**
 * P8 — Customer invoice endpoint (Decision B).
 *
 * The legacy frontend mock always 404'd. This suite nails the backend
 * contract behind `GET /api/orders/:id/invoice` at the service layer:
 *
 *   A  Unknown order id → NotFoundError (404).
 *   B  A different customer's order is unreachable — AuthorizationError
 *      (403), never a fabricated invoice (auth-bypass guard).
 *   C  The order's own customer can fetch and render a real PDF.
 *   D  ADMIN (finance/nested context) may fetch any order's invoice.
 *
 * HTTP wiring (auth middleware → route → error handler mapping AppError to
 * status codes) is exercised by the E2E phase2-approval suite; here we pin
 * the ownership + render logic, which is where silent denial bugs live.
 */

describe('P8 invoice service — customer invoice access', () => {
  const emails: string[] = [];
  let ownerUserId = '';
  let otherUserId = '';
  let adminUserId = '';
  let ownerCustomerId = '';
  let otherCustomerId = '';
  let orderId = '';

  async function seedUser(prefix: string, role: 'CUSTOMER' | 'ADMIN') {
    const email = `p8-${prefix}-${Date.now().toString(36)}@test.local`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'x', role },
    });
    emails.push(email);
    return user;
  }

  beforeAll(async () => {
    const owner = await seedUser('owner', 'CUSTOMER');
    const other = await seedUser('other', 'CUSTOMER');
    const admin = await seedUser('admin', 'ADMIN');
    ownerUserId = owner.id;
    otherUserId = other.id;
    adminUserId = admin.id;

    const ownerCustomer = await prisma.customer.create({ data: { userId: owner.id } });
    const otherCustomer = await prisma.customer.create({ data: { userId: other.id } });
    ownerCustomerId = ownerCustomer.id;
    otherCustomerId = otherCustomer.id;

    const order = await prisma.order.create({
      data: {
        customerId: ownerCustomer.id,
        orderNumber: `P8-${Date.now().toString(36)}`,
        status: 'completed',
        subtotal: '120.00',
        tax: '7.20',
        shippingCost: '0.00',
        total: '127.20',
        shippingAddress: { line1: '1 Customer Ave', city: 'Cairo', country: 'EG' },
        shippingName: 'Owner',
        shippingPhone: '555-0100',
        payment: {
          create: {
            amount: '127.20',
            currency: 'USD',
            status: 'captured',
          },
        },
        items: {
          create: [
            {
              productType: 'box',
              quantity: 100,
              dimensions: { length: 200, width: 120, height: 60, unit: 'mm' },
              material: 'cardboard',
              color: 'kraft',
              finish: 'matte',
              sku: 'box--mailer-box--custom',
              unitPrice: '1.20',
              totalPrice: '120.00',
            },
          ],
        },
      },
    });
    orderId = order.id;
  });

  afterAll(async () => {
    if (orderId) await prisma.order.deleteMany({ where: { id: orderId } });
    if (ownerCustomerId) await prisma.customer.deleteMany({ where: { id: ownerCustomerId } });
    if (otherCustomerId) await prisma.customer.deleteMany({ where: { id: otherCustomerId } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('A — unknown order id raises NotFoundError (404 semantics)', async () => {
    const promise = invoiceService.getOrderForCustomer('p8-does-not-exist', ownerUserId);
    await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    await expect(promise).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('B — another customer cannot fetch the order (403, no auth bypass)', async () => {
    const promise = invoiceService.getOrderForCustomer(orderId, otherUserId);
    await expect(promise).rejects.toBeInstanceOf(AuthorizationError);
    await expect(promise).rejects.toMatchObject({ statusCode: 403 });
  });

  it('C — the owning customer renders a real PDF invoice', async () => {
    const order = await invoiceService.getOrderForCustomer(orderId, ownerUserId);
    expect(order).toBeTruthy();
    expect(order.customer.user.id).toBe(ownerUserId);

    const pdf = await invoiceService.generateInvoice(order);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(100);
    // PDF magic header — proves a real document streams, not a JSON stub.
    expect(pdf.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('D — ADMIN (finance context) may fetch any order invoice', async () => {
    const order = await invoiceService.getOrderForCustomer(orderId, adminUserId);
    expect(order.id).toBe(orderId);
    const pdf = await invoiceService.generateInvoice(order);
    expect(pdf.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });
});