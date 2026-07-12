// =============================================================
// Smoke — SEPA-mandaat + auto-topup-boekhouding (Fase 5a).
//
// VEILIG ZONDER STRIPE: test uitsluitend de paden die geen Stripe-API raken —
// webhook-handlers met gefabriceerde event-objecten, de guard-/cap-paden van
// maybeAutoTopup, en de optimistisch-grant/settle/reversal-boekhouding.
// Het echte off-session-charge-pad vereist Stripe-TESTMODE-keys (de lokale
// key is live!) en hoort bij de deploy-smoke.
//
// Run: NEXT_PUBLIC_CREDITS_ENABLED=true \
//        DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
//        npx tsx scripts/dev/credit-sepa-mandate-smoke.ts
// =============================================================

import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { grantCredits, getBalance } from '@/lib/billing/credits/ledger';
import { maybeAutoTopup } from '@/lib/billing/credits/auto-topup';
import { activateMandate, handleMandateUpdated } from '@/lib/stripe/sepa-mandate';
import { handleTopupSuccess, handleTopupFailure, handleTopupChargeReversed } from '@/lib/stripe/topup';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  [ok] ${label}`); }
  else { fail++; console.error(`  [x] ${label}`); }
}

async function main(): Promise<void> {
  const s = Date.now();
  const PM = `pm_smoke_${s}`;
  const org = await prisma.organization.create({
    data: { name: 'sepa-smoke', slug: `sepa-${s}` },
  });

  try {
    // (1) mandaat-activatie (persistentie-stap; de resolve van het generated
    // sepa_debit-pm vereist een echte Stripe-retrieve → deploy-smoke)
    await activateMandate(org.id, PM);
    let row = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    check('activateMandate → status active + pm-id', row.sepaMandateStatus === 'active' && row.sepaPaymentMethodId === PM);

    // (2) mandate.updated → status-sync (fail-closed op niet-active)
    await handleMandateUpdated({ payment_method: PM, status: 'inactive' } as unknown as Stripe.Mandate);
    row = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    check('mandate.updated inactive → status inactive', row.sepaMandateStatus === 'inactive');
    await handleMandateUpdated({ payment_method: PM, status: 'active' } as unknown as Stripe.Mandate);
    row = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    check('mandate.updated active → status active', row.sepaMandateStatus === 'active');

    // (3) maybeAutoTopup guard-paden (géén Stripe-call in deze scenario's)
    check('shortfall 0 → no-shortfall', (await maybeAutoTopup(org.id, 0)).reason === 'no-shortfall');
    check('autoTopupEnabled=false → disabled', (await maybeAutoTopup(org.id, 10)).reason === 'disabled');

    await prisma.organization.update({
      where: { id: org.id },
      data: { autoTopupEnabled: true, sepaMandateStatus: 'inactive' },
    });
    check('mandaat niet active → no-mandate', (await maybeAutoTopup(org.id, 10)).reason === 'no-mandate');

    await prisma.organization.update({
      where: { id: org.id },
      data: { sepaMandateStatus: 'active', autoTopupPackId: 'bestaat-niet' },
    });
    check('onbekend pack → no-pack', (await maybeAutoTopup(org.id, 10)).reason === 'no-pack');

    // (4) blootstellingsplafond: bestaande onbevestigde optimistische grant
    // telt mee — pack 500 (echte catalogus), cap 500, outstanding 500 →
    // over-cap vóór enige Stripe-call.
    const PI_OPT = `pi_smoke_opt_${s}`;
    await grantCredits({
      organizationId: org.id, credits: 500, type: 'TOPUP',
      reason: 'optimistisch (smoke)', idempotencyKey: `topup:${PI_OPT}`,
      metadata: { paymentIntentId: PI_OPT, packId: '500', optimistic: true },
    });
    await prisma.organization.update({
      where: { id: org.id },
      data: { autoTopupPackId: '500', autoTopupExposureCap: 500 },
    });
    check('outstanding 500 + pack 500 > cap 500 → over-cap', (await maybeAutoTopup(org.id, 10)).reason === 'over-cap');

    // (5) succeeded-webhook op de optimistische PI → settled, geen dubbel-grant
    const before = (await getBalance(org.id)).balance;
    await handleTopupSuccess({
      id: PI_OPT,
      metadata: { type: 'credit_topup', organizationId: org.id, credits: '500', packId: '500', optimistic: 'true' },
    } as unknown as Stripe.PaymentIntent);
    const after = (await getBalance(org.id)).balance;
    check('succeeded op optimistische PI → geen dubbel-grant (idempotencyKey)', after === before);
    const settled = await prisma.creditTransaction.findUnique({ where: { idempotencyKey: `topup:${PI_OPT}` } });
    const meta = (settled?.metadata ?? {}) as Record<string, unknown>;
    check('succeeded → metadata settled:true', meta.settled === true);
    // Cap-release: de flow passeert nu de cap en stopt pas bij Stripe — de
    // fake pm bestaat niet, dus een read-only 404 → 'charge-failed' (er wordt
    // nooit een object aangemaakt; veilig ook met een live key).
    check('settled telt niet meer mee → cap released (stopt veilig op charge-failed)', (await maybeAutoTopup(org.id, 10)).reason === 'charge-failed');

    // (6) payment_failed op een optimistische PI → reversal (idempotent)
    const PI_FAIL = `pi_smoke_fail_${s}`;
    await grantCredits({
      organizationId: org.id, credits: 50, type: 'TOPUP',
      reason: 'optimistisch (smoke, gaat falen)', idempotencyKey: `topup:${PI_FAIL}`,
      metadata: { paymentIntentId: PI_FAIL, packId: '50', optimistic: true },
    });
    const beforeFail = (await getBalance(org.id)).balance;
    const failPi = {
      id: PI_FAIL,
      metadata: { type: 'credit_topup', organizationId: org.id, credits: '50', packId: '50', optimistic: 'true' },
    } as unknown as Stripe.PaymentIntent;
    await handleTopupFailure(failPi);
    const afterFail = (await getBalance(org.id)).balance;
    check('payment_failed → optimistische grant teruggedraaid (−50)', afterFail === beforeFail - 50);
    await handleTopupFailure(failPi);
    check('reversal is idempotent (retry draait niet dubbel terug)', (await getBalance(org.id)).balance === afterFail);

    // (7) payment_failed op een onbekende PI → geen deduct, wél een tombstone
    // die de idempotencyKey claimt (review-W3: late grant kan nooit meer landen)
    const beforeNoop = (await getBalance(org.id)).balance;
    const PI_RACE = `pi_race_${s}`;
    await handleTopupFailure({
      id: PI_RACE,
      metadata: { type: 'credit_topup', organizationId: org.id, credits: '999', optimistic: 'true' },
    } as unknown as Stripe.PaymentIntent);
    check('failed zonder grant → saldo onaangetast', (await getBalance(org.id)).balance === beforeNoop);
    const tombstone = await prisma.creditTransaction.findUnique({ where: { idempotencyKey: `topup:${PI_RACE}` } });
    check('failed zonder grant → tombstone claimt de key (amount 0)', tombstone?.amount === 0);
    const lateGrant = await grantCredits({
      organizationId: org.id, credits: 999, type: 'TOPUP',
      reason: 'late grant (race-simulatie)', idempotencyKey: `topup:${PI_RACE}`,
      metadata: { paymentIntentId: PI_RACE, optimistic: true },
    });
    check('late grant na tombstone → idempotent no-op (saldo ongewijzigd)', lateGrant.balance === beforeNoop);

    // (8) kill-switch (review-W5): een echte reversal zet autoTopupEnabled uit
    await prisma.organization.update({ where: { id: org.id }, data: { autoTopupEnabled: true } });
    const PI_KILL = `pi_kill_${s}`;
    await grantCredits({
      organizationId: org.id, credits: 50, type: 'TOPUP',
      reason: 'optimistisch (kill-switch-case)', idempotencyKey: `topup:${PI_KILL}`,
      metadata: { paymentIntentId: PI_KILL, packId: '50', optimistic: true },
    });
    await handleTopupFailure({
      id: PI_KILL,
      metadata: { type: 'credit_topup', organizationId: org.id, credits: '50', packId: '50', optimistic: 'true' },
    } as unknown as Stripe.PaymentIntent);
    row = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    check('reversal → auto-topup kill-switch (enabled=false)', row.autoTopupEnabled === false);

    // (9) chargeback wéken na succeeded (review-W1): charge.refunded → reversal
    const PI_CB = `pi_cb_${s}`;
    await grantCredits({
      organizationId: org.id, credits: 500, type: 'TOPUP',
      reason: 'gewone checkout-topup (chargeback-case)', idempotencyKey: `topup:${PI_CB}`,
      metadata: { paymentIntentId: PI_CB, packId: '500' },
    });
    const beforeCb = (await getBalance(org.id)).balance;
    const cbCharge = {
      id: `ch_cb_${s}`,
      payment_intent: PI_CB,
      metadata: { type: 'credit_topup', organizationId: org.id, credits: '500', packId: '500' },
    } as unknown as Stripe.Charge;
    await handleTopupChargeReversed(cbCharge);
    check('charge.refunded → credits teruggeboekt (−500)', (await getBalance(org.id)).balance === beforeCb - 500);
    await handleTopupChargeReversed(cbCharge);
    check('chargeback-reversal idempotent', (await getBalance(org.id)).balance === beforeCb - 500);
  } finally {
    await prisma.creditTransaction.deleteMany({ where: { organizationId: org.id } });
    await prisma.creditBalance.deleteMany({ where: { organizationId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } }).catch(() => {});
  }

  console.log(`\n${pass} passed, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error('FATAL', e instanceof Error ? e.stack : String(e));
  await prisma.$disconnect();
  process.exit(1);
});
