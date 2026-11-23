import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { planEgpBootstrap } from '../services/pricing-bootstrap/plan';

/** Explicit operator command, never run automatically during application startup.
 * Dry run is default. No orders/payments/carts or customized prices are rewritten.
 */
export async function bootstrapEgp(prisma: PrismaClient, apply = false) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.material.findMany();
    const plan = planEgpBootstrap(rows);
    if (!apply) return plan;
    if (plan.conflicts.length) throw new Error(`Pricing bootstrap refused, review customized/non-EGP rates: ${plan.conflicts.join(', ')}`);
    for (const rate of plan.insert) await tx.material.create({data: {
      code: rate.code, name: rate.name, unitPrice: rate.unitPrice, currency: 'EGP',
      metadata: {source: 'egp-bootstrap-v1'},
    }});
    for (const rate of plan.migrate) {
      const row = rows.find((r) => r.code === rate.code)!;
      await tx.material.update({where: {id: row.id}, data: {
        unitPrice: rate.unitPrice, currency: 'EGP',
        metadata: {...(row.metadata as object), pricingBootstrap: 'egp-v1', previousSeedCurrency: 'USD', previousSeedUnitPrice: rate.legacyUsd},
      }});
    }
    return plan;
  }, {isolationLevel: Prisma.TransactionIsolationLevel.Serializable});
}
if (require.main === module) {
  const prisma = new PrismaClient();
  const apply = process.argv.includes('--apply');
  bootstrapEgp(prisma, apply).then((plan) => {
    console.log(JSON.stringify({mode: apply ? 'applied' : 'dry-run', ...plan}, null, 2));
    if (plan.conflicts.length) process.exitCode = 1;
  }).catch((err) => { console.error(String(err)); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}
