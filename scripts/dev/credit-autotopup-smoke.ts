// =============================================================
// Smoke — auto-topup-scaffolding (Fase 3, no-op tot Fase 5).
// Bewijst: maybeAutoTopup koopt NOOIT bij (topped=false) en geeft per config de
// juiste reden. De echte SEPA-charge is Fase 5.
//
// Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
//        npx tsx scripts/dev/credit-autotopup-smoke.ts
// =============================================================

import { prisma } from '@/lib/prisma';
import { maybeAutoTopup } from '@/lib/billing/credits/auto-topup';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  [ok] ${label}`); }
  else { fail++; console.error(`  [x] ${label}`); }
}

const stamp = Date.now();
async function mkOrg(tag: string, data: Partial<{ autoTopupEnabled: boolean; autoTopupPackId: string; sepaMandateStatus: string; sepaPaymentMethodId: string }>): Promise<string> {
  const o = await prisma.organization.create({ data: { name: 'at-smoke', slug: `at-${stamp}-${tag}`, ...data } });
  return o.id;
}

async function main(): Promise<void> {
  const ids: string[] = [];
  try {
    const disabled = await mkOrg('disabled', {}); ids.push(disabled);
    const noMandate = await mkOrg('nomandate', { autoTopupEnabled: true }); ids.push(noMandate);
    // Fase 5a: een 'actief' mandaat vereist óók een PaymentMethod-id (fail-closed).
    const noPack = await mkOrg('nopack', { autoTopupEnabled: true, sepaMandateStatus: 'active', sepaPaymentMethodId: `pm_at_${stamp}` }); ids.push(noPack);
    const ready = await mkOrg('ready', { autoTopupEnabled: true, sepaMandateStatus: 'active', sepaPaymentMethodId: `pm_at2_${stamp}`, autoTopupPackId: '500' }); ids.push(ready);

    check('shortfall ≤ 0 → no-op (no-shortfall)', (await maybeAutoTopup(disabled, 0)).reason === 'no-shortfall');
    check('autoTopup uit → disabled', (await maybeAutoTopup(disabled, 50)).reason === 'disabled');
    check('aan, geen mandaat → no-mandate', (await maybeAutoTopup(noMandate, 50)).reason === 'no-mandate');
    check('aan + mandaat, geen pack → no-pack', (await maybeAutoTopup(noPack, 50)).reason === 'no-pack');
    // Fase 5a: het invulpunt is geïmplementeerd — met de default exposure-cap 0
    // stopt de flow deterministisch op 'over-cap' (0 + pack.credits > 0),
    // vóór enige Stripe-call. Zie credit-sepa-mandate-smoke voor de volle keten.
    const r = await maybeAutoTopup(ready, 50);
    check('aan + mandaat + pack, cap 0 → over-cap, topped=false', r.reason === 'over-cap' && r.topped === false);
  } finally {
    for (const id of ids) await prisma.organization.delete({ where: { id } }).catch(() => {});
  }

  console.log(`\n${pass} passed, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
