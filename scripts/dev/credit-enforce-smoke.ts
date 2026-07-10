// =============================================================
// Smoke — pre-flight enforcement (Gate B, Fase 3).
// Bewijst met billing AAN: 0-saldo → 402, voldoende saldo → toegestaan,
// unlimited-org → altijd toegestaan.
//
// Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
//        NEXT_PUBLIC_BILLING_ENABLED=true npx tsx scripts/dev/credit-enforce-smoke.ts
// =============================================================

import { prisma } from '@/lib/prisma';
import { grantCredits } from '@/lib/billing/credits/ledger';
import { enforceCreditBalance } from '@/lib/stripe/enforcement';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  [ok] ${label}`); }
  else { fail++; console.error(`  [x] ${label}`); }
}

async function cleanup(orgId: string): Promise<void> {
  await prisma.creditTransaction.deleteMany({ where: { organizationId: orgId } });
  await prisma.creditReservation.deleteMany({ where: { organizationId: orgId } });
  await prisma.creditBalance.deleteMany({ where: { organizationId: orgId } });
  await prisma.organization.delete({ where: { id: orgId } });
}

async function main(): Promise<void> {
  const s = Date.now();
  const zero = await prisma.organization.create({ data: { name: 'enf-zero', slug: `enf-zero-${s}` } });
  const rich = await prisma.organization.create({ data: { name: 'enf-rich', slug: `enf-rich-${s}` } });
  const unl = await prisma.organization.create({ data: { name: 'enf-unl', slug: `enf-unl-${s}`, unlimitedCredits: true } });

  try {
    await grantCredits({ organizationId: rich.id, credits: 100, type: 'PLAN_GRANT', reason: 'smoke' });

    check('0-saldo → geblokkeerd (402-Response)', (await enforceCreditBalance(zero.id, 10)) !== null);
    check('voldoende saldo (100 ≥ 10) → toegestaan (null)', (await enforceCreditBalance(rich.id, 10)) === null);
    check('unlimited-org bij 0-saldo → toegestaan (null)', (await enforceCreditBalance(unl.id, 10)) === null);
    check('estimate 0 → toegestaan (null)', (await enforceCreditBalance(zero.id, 0)) === null);
  } finally {
    await cleanup(zero.id);
    await cleanup(rich.id);
    await cleanup(unl.id);
  }

  console.log(`\n${pass} passed, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
