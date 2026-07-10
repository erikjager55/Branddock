// =============================================================
// Smoke — reservation-reaper (Gate D, Fase 3).
// Bewijst: reapStaleReservations geeft een hangende RESERVED-reservering vrij
// (reserved → 0), zonder het saldo af te boeken; status wordt RELEASED.
//
// Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
//        npx tsx scripts/dev/credit-reaper-smoke.ts
// =============================================================

import { prisma } from '@/lib/prisma';
import { grantCredits, getBalance } from '@/lib/billing/credits/ledger';
import { reserveCredits, reapStaleReservations } from '@/lib/billing/credits/reservation';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  [ok] ${label}`); }
  else { fail++; console.error(`  [x] ${label}`); }
}

async function main(): Promise<void> {
  const org = await prisma.organization.create({ data: { name: 'reap-smoke', slug: `reap-${Date.now()}` } });

  try {
    await grantCredits({ organizationId: org.id, credits: 100, type: 'PLAN_GRANT', reason: 'smoke' });
    const res = await reserveCredits(org.id, 50, { idempotencyKey: 'r1' });
    check('reserve 50 → reserved 50', (await getBalance(org.id)).reserved === 50);

    // threshold 0 → elke RESERVED (createdAt < nu) telt als stale
    const released = await reapStaleReservations(0);
    check('reaper gaf ≥ 1 vrij', released >= 1);
    check('na reap → reserved 0', (await getBalance(org.id)).reserved === 0);
    check('saldo ongewijzigd (release deducteert niet) → 100', (await getBalance(org.id)).balance === 100);

    const r = await prisma.creditReservation.findUnique({ where: { id: res.reservationId } });
    check('reservering status = RELEASED', r?.status === 'RELEASED');
  } finally {
    await prisma.creditReservation.deleteMany({ where: { organizationId: org.id } });
    await prisma.creditTransaction.deleteMany({ where: { organizationId: org.id } });
    await prisma.creditBalance.deleteMany({ where: { organizationId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });
  }

  console.log(`\n${pass} passed, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
