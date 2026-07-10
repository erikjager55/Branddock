// =============================================================
// Smoke — trial-credit-expiry (Fase 3-follow-up).
// Bewijst: alleen een org met verlopen trial + UITSLUITEND trial-credits verloopt;
// betaalde credits (top-up/plan), future-trial en unlimited-orgs blijven ongemoeid.
//
// Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
//        npx tsx scripts/dev/credit-trial-expiry-smoke.ts
// =============================================================

import { prisma } from '@/lib/prisma';
import { grantCredits, deductCredits, getBalance } from '@/lib/billing/credits/ledger';
import { expireTrialCredits } from '@/lib/billing/credits/trial-expiry';

const PAST = new Date(Date.now() - 86_400_000);
const FUTURE = new Date(Date.now() + 30 * 86_400_000);

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  [ok] ${label}`); }
  else { fail++; console.error(`  [x] ${label}`); }
}

async function main(): Promise<void> {
  const s = Date.now();
  const A = await prisma.organization.create({ data: { name: 'exp-pure', slug: `exp-a-${s}`, trialEndsAt: PAST } });
  const B = await prisma.organization.create({ data: { name: 'exp-paid', slug: `exp-b-${s}`, trialEndsAt: PAST } });
  const C = await prisma.organization.create({ data: { name: 'exp-future', slug: `exp-c-${s}`, trialEndsAt: FUTURE } });
  const D = await prisma.organization.create({ data: { name: 'exp-unl', slug: `exp-d-${s}`, trialEndsAt: PAST, unlimitedCredits: true } });
  const ids = [A.id, B.id, C.id, D.id];

  try {
    // A: pure trial, 200 verbruikt → saldo 100, lifetimeGranted 300, trial voorbij → MOET verlopen
    await grantCredits({ organizationId: A.id, credits: 300, type: 'TRIAL_GRANT', reason: 'trial' });
    await deductCredits({ organizationId: A.id, credits: 200, reason: 'usage', force: true });
    // B: trial + top-up → lifetimeGranted 400 → MAG NIET verlopen
    await grantCredits({ organizationId: B.id, credits: 300, type: 'TRIAL_GRANT', reason: 'trial' });
    await grantCredits({ organizationId: B.id, credits: 100, type: 'TOPUP', reason: 'topup' });
    // C: pure trial maar nog niet voorbij → MAG NIET verlopen
    await grantCredits({ organizationId: C.id, credits: 300, type: 'TRIAL_GRANT', reason: 'trial' });
    // D: pure trial + verlopen, maar unlimited → MAG NIET verlopen
    await grantCredits({ organizationId: D.id, credits: 300, type: 'TRIAL_GRANT', reason: 'trial' });

    const count = await expireTrialCredits();
    check('precies 1 org verlopen', count === 1);
    check('A (pure trial, verlopen) → saldo 0', (await getBalance(A.id)).balance === 0);
    check('B (trial + top-up) → saldo 400 ongemoeid', (await getBalance(B.id)).balance === 400);
    check('C (trial niet voorbij) → saldo 300 ongemoeid', (await getBalance(C.id)).balance === 300);
    check('D (unlimited) → saldo 300 ongemoeid', (await getBalance(D.id)).balance === 300);
  } finally {
    for (const id of ids) {
      await prisma.creditTransaction.deleteMany({ where: { organizationId: id } });
      await prisma.creditBalance.deleteMany({ where: { organizationId: id } });
      await prisma.organization.delete({ where: { id } }).catch(() => {});
    }
  }

  console.log(`\n${pass} passed, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
