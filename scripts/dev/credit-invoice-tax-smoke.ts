// =============================================================
// Smoke — BTW-extractie uit Stripe-invoices (Fase 5b).
// Zonder Stripe-API: gefabriceerde invoice-objecten door extractInvoiceTax
// + de upsert-mapping via handleInvoicePaid op een fixture-workspace.
// De end-to-end checkout-tax (automatic_tax/VIES/OSS) is deploy-smoke in
// Stripe-testmode (de berekening is Stripe's domein — wij persisteren).
//
// Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
//        SELLER_VAT_NUMBER=NL000000000B01 \
//        npx tsx scripts/dev/credit-invoice-tax-smoke.ts
// =============================================================

import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { extractInvoiceTax, handleInvoicePaid } from '@/lib/stripe/webhook-handlers';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  [ok] ${label}`); }
  else { fail++; console.error(`  [x] ${label}`); }
}

function fabInvoice(over: Record<string, unknown>): Stripe.Invoice {
  return {
    id: `in_smoke_${Math.random().toString(36).slice(2, 10)}`,
    number: null,
    currency: 'eur',
    period_start: 1750000000,
    period_end: 1752600000,
    created: 1750000000,
    invoice_pdf: null,
    total_taxes: [],
    customer_tax_ids: [],
    customer_tax_exempt: 'none',
    ...over,
  } as unknown as Stripe.Invoice;
}

async function main(): Promise<void> {
  // (1) NL-klant zonder VAT → 21% BTW
  const nl = extractInvoiceTax(fabInvoice({
    amount_paid: 4719, // €47,19 totaal
    total_excluding_tax: 3900, // €39 netto
    total_taxes: [{ amount: 819 }], // €8,19 (21%)
  }));
  check('NL: taxAmount €8,19', nl.taxAmount === 8.19);
  check('NL: netAmount €39,00', nl.netAmount === 39);
  check('NL: taxRate 21%', nl.taxRate === 0.21);
  check('NL: geen reverse-charge', nl.reverseCharge === false);

  // (2) EU-B2B met geldig VAT → reverse-charge. PRIMAIR pad onder
  // automatic_tax: taxability_reason op de tax-regel (review-W1) — het
  // customer_tax_exempt-veld is daar een dode snapshot.
  const be = extractInvoiceTax(fabInvoice({
    amount_paid: 3900,
    total_excluding_tax: 3900,
    total_taxes: [{ amount: 0, taxability_reason: 'reverse_charge' }],
    customer_tax_ids: [
      { type: 'nl_kvk', value: '12345678' },
      { type: 'eu_vat', value: 'BE0123456789' },
    ],
  }));
  check('B2B: reverseCharge via taxability_reason', be.reverseCharge === true);
  check('B2B: taxAmount 0', be.taxAmount === 0);
  check('B2B: eu_vat geprefereerd boven ander tax-id', be.customerVatNumber === 'BE0123456789');
  check('B2B: sellerVatNumber uit env', be.sellerVatNumber === 'NL000000000B01');
  const beLegacy = extractInvoiceTax(fabInvoice({
    amount_paid: 3900, total_excluding_tax: 3900, total_taxes: [], customer_tax_exempt: 'reverse',
  }));
  check('B2B: legacy customer_tax_exempt-pad blijft werken', beLegacy.reverseCharge === true);

  // (3) Pre-tax factuur (geen automatic_tax) → nette nulls, geen fake 0
  const pre = extractInvoiceTax(fabInvoice({ amount_paid: 2900, total_excluding_tax: null }));
  check('pre-tax: taxAmount/netAmount/taxRate alle null', pre.taxAmount === null && pre.netAmount === null && pre.taxRate === null);

  // (4) end-to-end mapping via handleInvoicePaid → Invoice-rij met BTW-velden
  const s = Date.now();
  const org = await prisma.organization.create({ data: { name: 'tax-smoke', slug: `tax-${s}` } });
  const ws = await prisma.workspace.create({
    data: { name: 'tax-ws', slug: `tax-ws-${s}`, organizationId: org.id, stripeCustomerId: `cus_smoke_${s}` },
  });
  try {
    await handleInvoicePaid(fabInvoice({
      id: `in_e2e_${s}`,
      customer: `cus_smoke_${s}`,
      amount_paid: 4719,
      total_excluding_tax: 3900,
      total_taxes: [{ amount: 819 }],
      customer_tax_ids: [{ type: 'eu_vat', value: 'NL123456789B01' }],
      billing_reason: 'manual', // geen plan-grant-pad in deze smoke
    }));
    const row = await prisma.invoice.findUnique({ where: { stripeInvoiceId: `in_e2e_${s}` } });
    check('upsert: rij aangemaakt met totaal €47,19', row?.amount === 47.19);
    check('upsert: BTW-velden gepersisteerd', row?.taxAmount === 8.19 && row?.netAmount === 39 && row?.taxRate === 0.21);
    check('upsert: customerVatNumber gepersisteerd', row?.customerVatNumber === 'NL123456789B01');
    check('upsert: sellerVatNumber gepersisteerd (create-tak)', row?.sellerVatNumber === 'NL000000000B01');

    // (5) update-tak (review-M2): retry van hetzelfde event — waarden stabiel,
    // sellerVatNumber wordt niet herschreven (create-only, review-M6).
    process.env.SELLER_VAT_NUMBER = 'NL999999999B99';
    await handleInvoicePaid(fabInvoice({
      id: `in_e2e_${s}`,
      customer: `cus_smoke_${s}`,
      amount_paid: 4719,
      total_excluding_tax: 3900,
      total_taxes: [{ amount: 819 }],
      customer_tax_ids: [{ type: 'eu_vat', value: 'NL123456789B01' }],
      billing_reason: 'manual',
    }));
    const row2 = await prisma.invoice.findUnique({ where: { stripeInvoiceId: `in_e2e_${s}` } });
    check('update-tak: tax-velden stabiel na retry', row2?.taxAmount === 8.19 && row2?.netAmount === 39);
    check('update-tak: sellerVatNumber NIET herschreven na env-wijziging', row2?.sellerVatNumber === 'NL000000000B01');
    const usage = await prisma.subscription.findFirst({ where: { workspaceId: ws.id } });
    check("billing_reason 'manual' → geen usage-reset-write nodig (geen subscription-rij aangeraakt)", usage === null);
  } finally {
    await prisma.invoice.deleteMany({ where: { workspaceId: ws.id } });
    await prisma.subscription.deleteMany({ where: { workspaceId: ws.id } });
    await prisma.workspace.delete({ where: { id: ws.id } }).catch(() => {});
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
