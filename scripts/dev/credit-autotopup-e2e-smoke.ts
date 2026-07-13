// =============================================================
// E2E-TESTMODE-smoke — invoice-based auto-topup (credit-autotopup-invoice-tax).
//
// Bewijst tegen écht Stripe-testmode + echte webhooks: (1) claim gekeyd op het
// invoice-id + off-session SEPA-incasso mét automatic_tax (BTW-factuur in de
// Invoice-tabel); (2) settle via invoice.paid; (3) cap-race dicht (2 parallelle
// calls → precies één claim, advisory lock); (4) fail-IBAN → invoice.payment_failed
// → reversal + kill-switch.
//
// Setup (zie ook docs/playbooks/stripe-go-live.md §10):
//   1. dev-server op :3000 met testmode-env (STRIPE_SECRET_KEY=sk_test_…,
//      NEXT_PUBLIC_BILLING/CREDITS/TOPUP_ENABLED=true) — .env.local-whsec moet
//      matchen met `stripe listen`.
//   2. `stripe listen --latest --forward-to localhost:3000/api/stripe/webhook`
//   3. Een smoke-org met actief testmode-SEPA-mandaat + een state-file
//      `{"a":{"orgId":…,"workspaceId":…}}`.
//
// Run per fase (volgorde: reset → topup → settle-verify → invoice-tax-verify →
// concurrent → fail):
//   SMOKE_STATE_FILE=<pad> SMOKE_GOOD_PM=<pm_…> STRIPE_SECRET_KEY=sk_test_… \
//     NEXT_PUBLIC_CREDITS_ENABLED=true DATABASE_URL=… \
//     npx tsx scripts/dev/credit-autotopup-e2e-smoke.ts <fase>
// =============================================================

import fs from 'node:fs';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { deductCredits, getBalance } from '@/lib/billing/credits/ledger';
import { maybeAutoTopup } from '@/lib/billing/credits/auto-topup';

const STATE_FILE = process.env.SMOKE_STATE_FILE;
if (!STATE_FILE) throw new Error('SMOKE_STATE_FILE ontbreekt (pad naar smoke-state.json)');
const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as Record<
  string,
  { orgId: string; workspaceId: string; userId: string }
>;
const A = state.a;
const GOOD_PM = process.env.SMOKE_GOOD_PM;
if (!GOOD_PM) throw new Error('SMOKE_GOOD_PM ontbreekt (het generated sepa_debit-pm van het mandaat)');
const RUN = process.env.SMOKE_RUN_ID ?? 'r2';
// Guard: dit script muteert customers en start echte off-session incasso's —
// dat mag uitsluitend in testmode.
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  throw new Error('STRIPE_SECRET_KEY is geen sk_test_-key — deze smoke draait alleen in testmode');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function main() {
  const phase = process.argv[2];

  if (phase === 'reset') {
    // Mandaat terug op het goede pm, auto-topup aan, cap ruim; customer krijgt
    // een NL-adres (vereist voor automatic_tax op de invoice).
    await prisma.organization.update({
      where: { id: A.orgId },
      data: {
        autoTopupEnabled: true,
        autoTopupPackId: '500',
        autoTopupExposureCap: 1000,
        sepaMandateStatus: 'active',
        sepaPaymentMethodId: GOOD_PM,
      },
    });
    const ws = await prisma.workspace.findUniqueOrThrow({
      where: { id: A.workspaceId },
      select: { stripeCustomerId: true },
    });
    await stripe.customers.update(ws.stripeCustomerId!, {
      address: { line1: 'Teststraat 1', postal_code: '6711 JA', city: 'Ede', country: 'NL' },
    });
    console.log(`reset ok — saldo: ${(await getBalance(A.orgId)).balance}`);
    return;
  }

  if (phase === 'topup') {
    const res = await maybeAutoTopup(A.orgId, 100);
    const bal = (await getBalance(A.orgId)).balance;
    console.log(`maybeAutoTopup: ${JSON.stringify(res)} | saldo: ${bal}`);
    if (!res.topped) throw new Error('FAIL: geen top-up');
    const tx = await prisma.creditTransaction.findFirst({
      where: { organizationId: A.orgId, type: 'TOPUP', idempotencyKey: { startsWith: 'topup:in_' } },
      orderBy: { createdAt: 'desc' },
      select: { idempotencyKey: true },
    });
    if (!tx) throw new Error('FAIL: grant niet gekeyd op invoice-id');
    console.log(`PASS topup — key=${tx.idempotencyKey}`);
    return;
  }

  if (phase === 'settle-verify') {
    for (let i = 0; i < 60; i++) {
      const tx = await prisma.creditTransaction.findFirst({
        where: { organizationId: A.orgId, type: 'TOPUP', idempotencyKey: { startsWith: 'topup:in_' } },
        orderBy: { createdAt: 'desc' },
      });
      const meta = (tx?.metadata ?? {}) as Record<string, unknown>;
      if (meta.settled === true && meta.reversed !== true) {
        console.log(`PASS settle — tx=${tx!.id} amount=${tx!.amount}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error('FAIL: niet settled binnen 180s');
  }

  if (phase === 'invoice-tax-verify') {
    for (let i = 0; i < 40; i++) {
      const inv = await prisma.invoice.findFirst({
        where: { workspaceId: A.workspaceId, taxRate: { not: null } },
        orderBy: { createdAt: 'desc' },
      });
      if (inv) {
        console.log(
          JSON.stringify({
            stripeInvoiceId: inv.stripeInvoiceId,
            amount: inv.amount,
            netAmount: inv.netAmount,
            taxAmount: inv.taxAmount,
            taxRate: inv.taxRate,
            sellerVat: inv.sellerVatNumber,
          }),
        );
        if ((inv.taxRate ?? 0) <= 0) throw new Error('FAIL: geen BTW op de auto-topup-factuur');
        console.log('PASS invoice-tax');
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error('FAIL: geen Invoice-rij met tax binnen 120s');
  }

  if (phase === 'concurrent') {
    // Cap = precies één pack: van 2 gelijktijdige calls mag er exact één claimen.
    await prisma.organization.update({
      where: { id: A.orgId },
      data: { autoTopupEnabled: true, autoTopupExposureCap: 500, sepaPaymentMethodId: GOOD_PM, sepaMandateStatus: 'active' },
    });
    const bal = (await getBalance(A.orgId)).balance;
    if (bal > 3) {
      await deductCredits({ organizationId: A.orgId, credits: bal - 3, reason: 'smoke drain concurrent', idempotencyKey: `smoke-drain-conc-${RUN}` });
    }
    const [r1, r2] = await Promise.all([maybeAutoTopup(A.orgId, 100), maybeAutoTopup(A.orgId, 100)]);
    console.log(`r1=${JSON.stringify(r1)} r2=${JSON.stringify(r2)}`);
    const topped = [r1, r2].filter((r) => r.topped).length;
    const overCap = [r1, r2].filter((r) => r.reason === 'over-cap').length;
    if (topped !== 1 || overCap !== 1) throw new Error(`FAIL: verwacht exact 1 topped + 1 over-cap, kreeg ${topped}/${overCap}`);
    const bal2 = (await getBalance(A.orgId)).balance;
    if (bal2 !== 503) throw new Error(`FAIL: saldo ${bal2}, verwacht 503 (3 + één pack)`);
    console.log(`PASS concurrent — saldo ${bal2}, precies één claim`);
    return;
  }

  if (phase === 'fail') {
    // Falende test-IBAN → invoice.payment_failed → reversal + kill-switch.
    const ws = await prisma.workspace.findUniqueOrThrow({
      where: { id: A.workspaceId },
      select: { stripeCustomerId: true },
    });
    const si = await stripe.setupIntents.create({
      customer: ws.stripeCustomerId!,
      payment_method_types: ['sepa_debit'],
      confirm: true,
      payment_method_data: {
        type: 'sepa_debit',
        sepa_debit: { iban: 'AT861904300235473202' },
        billing_details: { name: 'Smoke Fail', email: 'smoke-fail@example.test' },
      },
      mandate_data: {
        customer_acceptance: { type: 'online', online: { ip_address: '127.0.0.1', user_agent: 'smoke' } },
      },
    });
    const failPm = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method!.id;
    await prisma.organization.update({
      where: { id: A.orgId },
      data: { autoTopupEnabled: true, autoTopupExposureCap: 1000, sepaPaymentMethodId: failPm, sepaMandateStatus: 'active' },
    });
    const bal = (await getBalance(A.orgId)).balance;
    if (bal > 3) {
      await deductCredits({ organizationId: A.orgId, credits: bal - 3, reason: 'smoke drain fail', idempotencyKey: `smoke-drain-fail-${RUN}` });
    }
    const res = await maybeAutoTopup(A.orgId, 100);
    console.log(`maybeAutoTopup(fail-pad): ${JSON.stringify(res)}`);
    if (!res.topped) throw new Error('FAIL: fail-pad-claim niet gestart');
    for (let i = 0; i < 90; i++) {
      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: A.orgId },
        select: { autoTopupEnabled: true },
      });
      const reversal = await prisma.creditTransaction.findFirst({
        where: { organizationId: A.orgId, idempotencyKey: { startsWith: 'topup-reversal:in_' } },
      });
      if (!org.autoTopupEnabled && reversal) {
        console.log(`PASS fail — reversal=${reversal.amount} kill-switch=uit saldo=${(await getBalance(A.orgId)).balance}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error('FAIL: geen reversal+kill-switch binnen 270s');
  }

  throw new Error(`onbekende fase: ${phase}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
