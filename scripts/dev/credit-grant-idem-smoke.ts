// =============================================================
// Smoke — grant-idempotentie onder concurrency (Gate E, Fase 3).
// Bewijst: twee gelijktijdige grants met dezelfde idempotencyKey → geen P2002-crash,
// precies één keer gegrant. Herhaalde key = no-op; nieuwe key = +credits.
//
// Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
//        npx tsx scripts/dev/credit-grant-idem-smoke.ts
// =============================================================

import { prisma } from '@/lib/prisma';
import { grantCredits, getBalance } from '@/lib/billing/credits/ledger';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  [ok] ${label}`); }
  else { fail++; console.error(`  [x] ${label}`); }
}

async function main(): Promise<void> {
  const org = await prisma.organization.create({
    data: { name: 'idem-smoke', slug: `idem-${Date.now()}` },
  });

  try {
    // twee gelijktijdige grants, zelfde key
    const results = await Promise.allSettled([
      grantCredits({ organizationId: org.id, credits: 100, type: 'TRIAL_GRANT', reason: 'race', idempotencyKey: 'k1' }),
      grantCredits({ organizationId: org.id, credits: 100, type: 'TRIAL_GRANT', reason: 'race', idempotencyKey: 'k1' }),
    ]);
    check('geen rejection (P2002 opgevangen)', results.every((r) => r.status === 'fulfilled'));
    check('precies 1× gegrant (saldo 100)', (await getBalance(org.id)).balance === 100);

    // herhaalde grant, zelfde key → no-op
    await grantCredits({ organizationId: org.id, credits: 100, type: 'TRIAL_GRANT', reason: 'again', idempotencyKey: 'k1' });
    check('herhaalde key → nog steeds 100', (await getBalance(org.id)).balance === 100);

    // nieuwe key → +100
    await grantCredits({ organizationId: org.id, credits: 100, type: 'PLAN_GRANT', reason: 'new', idempotencyKey: 'k2' });
    check('nieuwe key → +100 (saldo 200)', (await getBalance(org.id)).balance === 200);
  } finally {
    await prisma.creditTransaction.deleteMany({ where: { organizationId: org.id } });
    await prisma.creditBalance.deleteMany({ where: { organizationId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });
  }

  console.log(`\n${pass} passed, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
