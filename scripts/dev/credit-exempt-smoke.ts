// =============================================================
// Smoke — unlimited-free-uitzondering (Fase 3).
// Bewijst: met billing AAN boekt een unlimited-org NOOIT af, een normale org wél.
//
// Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
//        NEXT_PUBLIC_BILLING_ENABLED=true npx tsx scripts/dev/credit-exempt-smoke.ts
// =============================================================

import { prisma } from '@/lib/prisma';
import { grantCredits, getBalance } from '@/lib/billing/credits/ledger';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';
import { isOrgUnlimited } from '@/lib/billing/credits/exempt';

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
  const stamp = Date.now();
  const A = await prisma.organization.create({
    data: { name: 'smoke-unlimited', slug: `smoke-unl-${stamp}`, unlimitedCredits: true },
  });
  const B = await prisma.organization.create({
    data: { name: 'smoke-normal', slug: `smoke-nrm-${stamp}`, unlimitedCredits: false },
  });

  try {
    await grantCredits({ organizationId: A.id, credits: 100, type: 'PLAN_GRANT', reason: 'smoke' });
    await grantCredits({ organizationId: B.id, credits: 100, type: 'PLAN_GRANT', reason: 'smoke' });

    check('isOrgUnlimited(A) = true', (await isOrgUnlimited(A.id)) === true);
    check('isOrgUnlimited(B) = false', (await isOrgUnlimited(B.id)) === false);

    // charge image×1 (=2 credits) op beide, met billing AAN
    await chargeAfter({ organizationId: A.id, action: 'image', feature: 'smoke' }, { count: 1 });
    await chargeAfter({ organizationId: B.id, action: 'image', feature: 'smoke' }, { count: 1 });

    const a = await getBalance(A.id);
    const b = await getBalance(B.id);
    check('unlimited-org A: saldo ONGEWIJZIGD (100)', a.balance === 100);
    check('normale org B: 2 credits afgeboekt (98)', b.balance === 98);
  } finally {
    await cleanup(A.id);
    await cleanup(B.id);
  }

  console.log(`\n${pass} passed, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
