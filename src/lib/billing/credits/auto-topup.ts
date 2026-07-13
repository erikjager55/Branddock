// =============================================================
// Auto-topup — optimistisch credits bijkopen bij een tekort (Fase 5a,
// BTW-compliant gemaakt in credit-autotopup-invoice-tax).
//
// De incasso loopt via een `charge_automatically`-INVOICE met `automatic_tax`
// (niet via een kale PaymentIntent — die kent geen BTW): pack-prijs ex-BTW als
// invoice-item, Stripe Tax telt het juiste tarief erbij op en de bestaande
// invoice.paid-webhook persisteert de factuur (incl. tax-velden) gratis in de
// factuurhistorie. SEPA settelt pas na dagen; daarom kent de flow de credits
// OPTIMISTISCH toe met idempotencyKey `topup:<invoice.id>` — settle gebeurt op
// `invoice.paid`, terugdraaien + kill-switch op `invoice.payment_failed`
// (webhook-handlers.ts → topup.ts).
//
// Volgorde is claim-vóór-charge: de cap-check + optimistische grant gebeuren
// atomair onder een pg_advisory_xact_lock per org (dicht de review-W2-race:
// twee gelijktijdige tekorten kunnen nooit allebei claimen), pas daarna wordt
// de al-aangemaakte draft-invoice gefinaliseerd en betaald. Faalt de betaling
// synchroon, dan bewijst een geslaagde `voidInvoice` dat er niets geïncasseerd
// wordt → idempotente reversal (`topup-reversal:<invoice.id>`, dezelfde key
// als het webhook-failure-pad, dus dubbel-verwerken is onschadelijk).
//
// Fail-soft by design: elke fout hier betekent "niet bijgekocht" —
// enforceCreditBalance valt dan gewoon terug op de 402.
// =============================================================

import { prisma } from '@/lib/prisma';
import { grantCreditsTx, deductCredits, type PrismaTx } from './ledger';
import { getStripeClient } from '@/lib/stripe/client';
import { STRIPE_CURRENCY } from '@/lib/stripe/config';
import { getTopupPack } from '@/lib/stripe/topup';
import { notifyAutoTopup } from './auto-topup-notify';

export interface AutoTopupResult {
  /** Is er daadwerkelijk bijgekocht (saldo verhoogd)? */
  topped: boolean;
  /** Waarom niet: disabled | no-mandate | no-pack | over-cap | charge-failed. */
  reason?: string;
  grantedCredits?: number;
}

/** Som van optimistisch toegekende, nog niet door Stripe bevestigde credits. */
async function unsettledOptimisticCredits(
  organizationId: string,
  db: PrismaTx | typeof prisma = prisma,
): Promise<number> {
  // De settled-check gebeurt in JS: een SQL `NOT (metadata->settled = true)`
  // matcht rijen zonder de key níet (JSON-NULL-semantiek) — precies de rijen
  // die we willen meetellen. Optimistische rijen per org zijn er hooguit een
  // handvol, dus dit is goedkoop.
  // 90-dagen-venster: SEPA settelt < ~14 dagen; dit begrenst de scan terwijl
  // een hangende incasso ruim binnen het venster blijft meetellen (review-M2).
  const rows = await db.creditTransaction.findMany({
    where: {
      organizationId,
      type: 'TOPUP',
      metadata: { path: ['optimistic'], equals: true },
      createdAt: { gte: new Date(Date.now() - 90 * 86_400_000) },
    },
    select: { amount: true, metadata: true },
  });
  return rows.reduce((sum, r) => {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    if (meta.settled === true) return sum;
    return sum + Math.max(0, r.amount);
  }, 0);
}

/** Interne marker: cap overschreden binnen de claim-transactie. */
class OverCapError extends Error {}

/**
 * Probeert bij een tekort een pack optimistisch toe te kennen tegen het
 * SEPA-mandaat. Retourneert `{ topped: true }` alleen als de credits
 * daadwerkelijk zijn bijgeschreven.
 */
export async function maybeAutoTopup(
  organizationId: string,
  shortfall: number,
): Promise<AutoTopupResult> {
  if (shortfall <= 0) return { topped: false, reason: 'no-shortfall' };

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      autoTopupEnabled: true,
      autoTopupPackId: true,
      autoTopupExposureCap: true,
      sepaMandateStatus: true,
      sepaPaymentMethodId: true,
    },
  });

  if (!org?.autoTopupEnabled) return { topped: false, reason: 'disabled' };
  // Fail-closed: alleen een expliciet 'active' mandaat mag off-session chargen.
  if (org.sepaMandateStatus !== 'active' || !org.sepaPaymentMethodId) {
    return { topped: false, reason: 'no-mandate' };
  }

  const pack = org.autoTopupPackId ? getTopupPack(org.autoTopupPackId) : null;
  if (!pack) return { topped: false, reason: 'no-pack' };

  // Goedkope pre-check op het blootstellingsplafond (niet-autoritatief; de
  // bindende check zit in de claim-transactie hieronder) — bespaart een
  // Stripe-roundtrip in het gangbare over-cap-geval.
  const outstanding = await unsettledOptimisticCredits(organizationId);
  if (outstanding + pack.credits > org.autoTopupExposureCap) {
    return { topped: false, reason: 'over-cap' };
  }

  const stripe = getStripeClient();

  // De customer hoort bij het PaymentMethod (per-workspace Stripe-customer).
  let customerId: string | undefined;
  try {
    const pm = await stripe.paymentMethods.retrieve(org.sepaPaymentMethodId);
    customerId = typeof pm.customer === 'string' ? pm.customer : pm.customer?.id;
  } catch (error) {
    // Kan transient zijn (netwerk) — rapporteer als charge-failed, niet als
    // mandaat-probleem; de kill-switch blijft aan het echte failure-pad.
    console.warn('[maybeAutoTopup] paymentMethod ophalen faalde', {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { topped: false, reason: 'charge-failed' };
  }
  if (!customerId) return { topped: false, reason: 'no-mandate' };

  // Tax-locatie-pre-check (review-W2): automatic_tax vereist een customer-
  // adres. Mandaten van vóór de verplichte adres-collectie (of een later
  // gewist adres) zouden anders bij ELKE geblokkeerde generatie de dure
  // invoice-create→finalize-fail→del→reversal-cyclus draaien.
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !customer.address?.country) {
      console.warn('[maybeAutoTopup] customer mist adres — tax-locatie onbekend, mandaat opnieuw instellen', {
        organizationId,
        customerId,
      });
      return { topped: false, reason: 'charge-failed' };
    }
  } catch (error) {
    console.warn('[maybeAutoTopup] customer ophalen faalde', {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { topped: false, reason: 'charge-failed' };
  }

  // (1) Draft-invoice + item — nog géén charge; het invoice-id is meteen het
  // idempotency-anker voor de hele levenscyclus (claim/settle/reversal).
  const meta: Record<string, string> = {
    type: 'credit_topup',
    optimistic: 'true',
    organizationId,
    credits: String(pack.credits),
    packId: pack.id,
  };
  let invoiceId: string;
  try {
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'charge_automatically',
      auto_advance: false,
      currency: STRIPE_CURRENCY,
      // Stripe Tax: pack-prijs is EXCLUSIEF BTW; het account-default
      // tax_behavior (exclusive) + de default-tax-code gelden voor het kale
      // amount-item hieronder.
      automatic_tax: { enabled: true },
      pending_invoice_items_behavior: 'exclude',
      payment_settings: { payment_method_types: ['sepa_debit'] },
      description: `Branddock auto-topup — ${pack.credits} credits`,
      metadata: meta,
    });
    invoiceId = invoice.id!;
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoiceId,
      amount: Math.round(pack.priceEur * 100),
      currency: STRIPE_CURRENCY,
      // Expliciet exclusief (review-W4): niet laten afhangen van het
      // account-default in het Stripe-dashboard — een instelwijziging daar
      // mag de pack-prijs nooit stil inclusief maken.
      tax_behavior: 'exclusive',
      description: `Credit top-up — ${pack.credits} credits (pack ${pack.id})`,
    });
  } catch (error) {
    console.warn('[maybeAutoTopup] invoice aanmaken faalde', {
      organizationId,
      packId: pack.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return { topped: false, reason: 'charge-failed' };
  }

  // (2) Claim: cap-check + optimistische grant, atomair onder een advisory
  // lock per org. Alleen DB-werk binnen de lock (geen Stripe-calls) — een
  // tweede gelijktijdige claim wacht hier en ziet de verse grant meetellen.
  try {
    await prisma.$transaction(async (tx) => {
      // ::text-cast: de lock-functie retourneert `void`, dat kan Prisma's
      // $queryRaw niet deserialiseren.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`auto-topup:${organizationId}`}, 0))::text`;
      const outstandingLocked = await unsettledOptimisticCredits(organizationId, tx);
      if (outstandingLocked + pack.credits > org.autoTopupExposureCap) {
        throw new OverCapError();
      }
      await grantCreditsTx(tx, {
        organizationId,
        credits: pack.credits,
        type: 'TOPUP',
        reason: `Auto-topup ${pack.credits} credits (pack ${pack.id}, optimistisch)`,
        idempotencyKey: `topup:${invoiceId}`,
        metadata: { invoiceId, packId: pack.id, optimistic: true },
      });
    });
  } catch (error) {
    // Draft opruimen — er is niets geclaimd en niets geïncasseerd. Het
    // invoice-item gaat aantoonbaar mee de prullenbak in (in testmode
    // geverifieerd, 2026-07-13: na del is de item-lijst leeg en het item-id
    // onvindbaar — geen wees-item dat op een latere factuur kan opduiken).
    await stripe.invoices.del(invoiceId).catch(() => {});
    if (error instanceof OverCapError) return { topped: false, reason: 'over-cap' };
    console.warn('[maybeAutoTopup] claim-transactie faalde', {
      organizationId,
      invoiceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { topped: false, reason: 'charge-failed' };
  }

  // (3) Finaliseren + off-session betalen tegen het mandaat.
  let chargedTotalEur = pack.priceEur;
  try {
    const finalized = await stripe.invoices.finalizeInvoice(invoiceId, { auto_advance: false });
    // Het werkelijke incasso-bedrag (incl. BTW) — voor een notificatie die
    // matcht met het bankafschrift (review-W3).
    chargedTotalEur = (finalized.total ?? Math.round(pack.priceEur * 100)) / 100;
  } catch (error) {
    // Pre-charge-fout (bv. tax-locatie onbekend): claim terugdraaien en de
    // draft opruimen. Geen kill-switch — het mandaat is niet het probleem.
    console.warn('[maybeAutoTopup] finalize faalde — claim teruggedraaid', {
      organizationId,
      invoiceId,
      error: error instanceof Error ? error.message : String(error),
    });
    await stripe.invoices.del(invoiceId).catch(() => {});
    await reverseClaim(organizationId, pack.credits, invoiceId, pack.id);
    return { topped: false, reason: 'charge-failed' };
  }

  try {
    await stripe.invoices.pay(invoiceId, {
      payment_method: org.sepaPaymentMethodId,
      off_session: true,
    });
  } catch (error) {
    console.warn('[maybeAutoTopup] off-session incasso-start faalde', {
      organizationId,
      invoiceId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Alleen terugdraaien als aantoonbaar niets geïncasseerd wordt: een
    // geslaagde void bewijst dat (void weigert zodra een betaling loopt of
    // gelukt is). Een netwerk-throw ná een server-side geslaagde pay laat de
    // claim dus staan — invoice.paid settelt hem later gewoon.
    const voided = await stripe.invoices
      .voidInvoice(invoiceId)
      .then(() => true)
      .catch(() => false);
    if (voided) {
      await reverseClaim(organizationId, pack.credits, invoiceId, pack.id);
      return { topped: false, reason: 'charge-failed' };
    }
    // Onbewijsbaar: als er wél een betaling loopt maken de webhooks
    // (invoice.paid / invoice.payment_failed) het af; faalde óók de void om
    // een transiënte reden, dan blijft — net als bij de gedocumenteerde
    // crash-window — een zichtbare, cap-begrensde open claim staan
    // (optimistic zonder settled) die handmatig te herstellen is.
  }

  // (4) Notificatie — fire-and-forget, mag de generatie nooit ophouden.
  // Bedrag = het factuurtotaal incl. BTW, zodat de melding matcht met wat de
  // bank straks afschrijft.
  void notifyAutoTopup({ organizationId, credits: pack.credits, priceEur: chargedTotalEur }).catch(
    () => {},
  );

  return { topped: true, grantedCredits: pack.credits };
}

/**
 * Draai een zojuist geclaimde optimistische grant terug (pre-charge-fout).
 * Zelfde reversal-key als het webhook-failure-pad → idempotent over beide.
 */
async function reverseClaim(
  organizationId: string,
  credits: number,
  invoiceId: string,
  packId: string,
): Promise<void> {
  try {
    await deductCredits({
      organizationId,
      credits,
      reason: `Auto-topup geannuleerd — incasso niet gestart (${invoiceId})`,
      force: true,
      idempotencyKey: `topup-reversal:${invoiceId}`,
    });
    await prisma.creditTransaction.updateMany({
      where: { idempotencyKey: `topup:${invoiceId}` },
      data: { metadata: { invoiceId, packId, credits, optimistic: true, settled: true, reversed: true } },
    });
  } catch (error) {
    // Money-code: nooit stil — een blijvend openstaande claim telt tegen de cap.
    console.error('[maybeAutoTopup] reversal van claim faalde', {
      organizationId,
      invoiceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
