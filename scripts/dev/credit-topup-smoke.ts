// =============================================================
// Smoke — top-up webhook-grant (Gate A3, Fase 3).
// Bewijst: handleTopupSuccess kent pack-credits toe, idempotent per PaymentIntent
// (event-retry telt niet dubbel); bad/zero metadata is een no-op.
//
// Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
//        npx tsx scripts/dev/credit-topup-smoke.ts
// =============================================================

import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getBalance } from '@/lib/billing/credits/ledger';
import { handleTopupSuccess } from '@/lib/stripe/topup';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  [ok] ${label}`); }
  else { fail++; console.error(`  [x] ${label}`); }
}

function fakePi(id: string, orgId: string, credits: string): Stripe.PaymentIntent {
  return { id, metadata: { type: 'credit_topup', organizationId: orgId, credits, packId: '500' } } as unknown as Stripe.PaymentIntent;
}

async function main(): Promise<void> {
  const org = await prisma.organization.create({ data: { name: 'topup-smoke', slug: `topup-${Date.now()}` } });

  try {
    await handleTopupSuccess(fakePi('pi_1', org.id, '500'));
    check('top-up 500 → saldo 500', (await getBalance(org.id)).balance === 500);

    await handleTopupSuccess(fakePi('pi_1', org.id, '500')); // event-retry, zelfde PI
    check('retry zelfde PI → nog steeds 500 (idempotent)', (await getBalance(org.id)).balance === 500);

    await handleTopupSuccess(fakePi('pi_2', org.id, '500')); // nieuwe PI
    check('nieuwe PI → +500 (saldo 1000)', (await getBalance(org.id)).balance === 1000);

    await handleTopupSuccess(fakePi('pi_3', org.id, '0')); // 0 credits = no-op
    check('credits 0 → no-op (saldo blijft 1000)', (await getBalance(org.id)).balance === 1000);
  } finally {
    await prisma.creditTransaction.deleteMany({ where: { organizationId: org.id } });
    await prisma.creditBalance.deleteMany({ where: { organizationId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });
  }

  console.log(`\n${pass} passed, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
