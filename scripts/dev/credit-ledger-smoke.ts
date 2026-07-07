// =============================================================
// Smoke — credit-ledger Fase 1 (ADR 2026-07-07).
// Draait de scenario's uit tasks/pricing-credits-fase1-ledger-core.md tegen een
// wegwerp-org op de lokale DB. Ruimt zichzelf op.
//
// Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx scripts/dev/credit-ledger-smoke.ts
// =============================================================

import { prisma } from '@/lib/prisma';
import { getBalance, grantCredits, deductCredits } from '@/lib/billing/credits/ledger';
import { reserveCredits, reconcileReservation, releaseReservation } from '@/lib/billing/credits/reservation';
import { InsufficientCreditsError } from '@/lib/billing/credits/errors';
import { ZERO_COST_ACTIONS, tokensToCredits } from '@/lib/billing/credits/credit-costs';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  [ok] ${label}`); }
  else { fail++; console.error(`  [x] ${label}`); }
}

async function makeOrg(slug: string): Promise<string> {
  const org = await prisma.organization.create({ data: { name: `smoke ${slug}`, slug, type: 'DIRECT' } });
  await prisma.creditBalance.create({ data: { organizationId: org.id, balance: 0 } });
  return org.id;
}

async function main(): Promise<void> {
  const orgA = await makeOrg(`credit-smoke-a-${process.pid}`);
  const orgB = await makeOrg(`credit-smoke-b-${process.pid}`);

  try {
    // 1. grant → balance
    await grantCredits({ organizationId: orgA, credits: 300, type: 'TRIAL_GRANT', reason: 'smoke trial' });
    let b = await getBalance(orgA);
    check('grant 300 → balance 300', b.balance === 300 && b.available === 300);

    // 2. reserve + reconcile (output-only, lengte-accuraat)
    const r = await reserveCredits(orgA, 80, { action: 'long-form' });
    b = await getBalance(orgA);
    check('reserve 80 → reserved 80, available 220', b.reserved === 80 && b.available === 220);
    const expected = tokensToCredits(1500, 'default'); // ceil(1.5*1) = 2
    const rec = await reconcileReservation(r.reservationId, { outputTokens: 1500 });
    b = await getBalance(orgA);
    check(`reconcile 1500 tokens → spent ${expected}, reserved 0`, rec.creditsSpent === expected && b.reserved === 0 && b.balance === 300 - expected);

    // 3. output-only: F-VAL is gratis
    check('ZERO_COST_ACTIONS bevat f-val', ZERO_COST_ACTIONS.has('f-val') && ZERO_COST_ACTIONS.has('brand-context'));

    // 4. release-pad (crash): reserve → release geeft credits vrij
    const r2 = await reserveCredits(orgA, 50, { action: 'image' });
    await releaseReservation(r2.reservationId);
    b = await getBalance(orgA);
    check('reserve 50 → release → reserved 0', b.reserved === 0);

    // 5. insufficient: reserve meer dan beschikbaar
    let threw = false;
    try { await reserveCredits(orgA, 9999, { action: 'long-form' }); }
    catch (e) { threw = e instanceof InsufficientCreditsError; }
    check('reserve 9999 → InsufficientCreditsError', threw);

    // 6. concurrency: 2× deduct 50 op balance 60 → precies 1 slaagt
    await grantCredits({ organizationId: orgB, credits: 60, type: 'PLAN_GRANT', reason: 'smoke' });
    const results = await Promise.allSettled([
      deductCredits({ organizationId: orgB, credits: 50, reason: 'race-1' }),
      deductCredits({ organizationId: orgB, credits: 50, reason: 'race-2' }),
    ]);
    const ok = results.filter((x) => x.status === 'fulfilled').length;
    b = await getBalance(orgB);
    check('concurrency 2×50 op 60 → precies 1 slaagt, saldo ≥ 0', ok === 1 && b.balance === 10);

    // 7. idempotentie: 2× deduct met dezelfde key → 1 boeking
    await deductCredits({ organizationId: orgA, credits: 5, reason: 'idem', idempotencyKey: `k-${process.pid}` });
    const before = (await getBalance(orgA)).balance;
    await deductCredits({ organizationId: orgA, credits: 5, reason: 'idem', idempotencyKey: `k-${process.pid}` });
    const after = (await getBalance(orgA)).balance;
    check('idempotency: 2e deduct met zelfde key boekt niet', before === after);

  } finally {
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  }

  console.log(`\n${pass} passed, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
