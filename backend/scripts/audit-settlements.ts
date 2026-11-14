/**
 * SEC-03a — read-only settlement audit CLI.
 *
 * Usage:
 *   npx tsx scripts/audit-settlements.ts --gate pre   # legacy-gap gate (blocks on repairable gaps)
 *   npx tsx scripts/audit-settlements.ts --gate post  # residual-gap gate (also blocks on composite gaps)
 *   any of the above + --json                         # machine-readable output
 *
 * Exit codes: 0 = gate clean, 1 = gate blocked, 2 = usage error.
 * The script performs NO writes of any kind.
 */
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import {
  loadAuditData,
  classifySettlementAudit,
} from '../src/modules/settlements/settlement-audit';

const args = process.argv.slice(2);
const json = args.includes('--json');
const gateIndex = args.indexOf('--gate');
const gate = gateIndex >= 0 ? args[gateIndex + 1] : 'pre';

if (gate !== 'pre' && gate !== 'post') {
  console.error('Usage: npx tsx scripts/audit-settlements.ts --gate pre|post [--json]');
  process.exit(2);
}

const data = await loadAuditData(prisma);
const report = classifySettlementAudit(data.orders, data.settlements);

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Settlement audit (${gate} gate) @ ${report.generatedAt}`);
  console.log(
    `orders=${report.ordersAudited} settlements=${report.settlementsAudited}`
  );
  const counts = Object.entries(report.counts).filter(([, n]) => n > 0);
  if (counts.length === 0) {
    console.log('no findings — clean');
  } else {
    for (const [cls, n] of counts) {
      console.log(`${cls}: ${n}`);
    }
    for (const f of report.findings) {
      console.log(
        `  [${f.severity}] ${f.class} order=${f.orderNumber} vendor=${f.vendorId ?? '-'} :: ${f.detail}`
      );
    }
  }
  const gateBlocked = gate === 'pre' ? report.gates.pre : report.gates.post;
  console.log(`gate ${gate}: ${gateBlocked ? 'BLOCKED' : 'clean'}`);
}
const blocked = gate === 'pre' ? report.gates.pre : report.gates.post;
await prisma.$disconnect();
process.exit(blocked ? 1 : 0);
