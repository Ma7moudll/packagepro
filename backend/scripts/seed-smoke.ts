/**
 * One-off smoke-test seeding: admin + vendor + customer accounts with known
 * passwords, and a minimal order → PO → production chain for the vendor so
 * sample upload can be exercised end-to-end.
 *
 * Run: npx tsx scripts/seed-smoke.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function upsertUser(email: string, password: string, role: 'CUSTOMER' | 'VENDOR' | 'ADMIN') {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, role, emailVerified: true },
    create: { email, passwordHash, role, emailVerified: true },
  });
}

async function main() {
  const suffix = Date.now().toString(36);
  const admin = await upsertUser('smoke-admin@packagepro.test', 'SmokeAdmin!123', 'ADMIN');
  const vendorUser = await upsertUser(`smoke-vendor-${suffix}@packagepro.test`, 'SmokeVendor!123', 'VENDOR');
  const customerUser = await upsertUser(`smoke-customer-${suffix}@packagepro.test`, 'SmokeCustomer!123', 'CUSTOMER');

  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      companyName: 'Smoke Test Packaging Co',
      address: '12 Nile St',
      city: 'Cairo',
      country: 'Egypt',
      isActive: true,
    },
  });

  const customer = await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: { userId: customerUser.id },
  });

  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      orderNumber: `SMOKE-${suffix}`,
      status: 'in_production',
      subtotal: 100,
      tax: 14,
      shippingCost: 10,
      total: 124,
      shippingAddress: { street: '1 Smoke St', city: 'Cairo', country: 'Egypt', name: 'Smoke Tester', phone: '+201000000000' },
      shippingName: 'Smoke Tester',
      shippingPhone: '+201000000000',
      shippingEmail: customerUser.email,
    },
  });

  const po = await prisma.purchaseOrder.create({
    data: {
      orderId: order.id,
      vendorId: vendor.id,
      poNumber: `SMOKE-PO-${suffix}`,
      status: 'confirmed',
      vendorCost: 60,
      confirmedAt: new Date(),
    },
  });

  const production = await prisma.production.create({
    data: { poId: po.id, vendorId: vendor.id, status: 'in_progress', progressPercent: 20, startedAt: new Date() },
  });

  console.log(JSON.stringify({ suffix, admin: admin.email, vendor: vendorUser.email, customer: customerUser.email, productionId: production.id }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
