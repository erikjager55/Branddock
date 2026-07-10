// =============================================================
// Auto-topup — optimistisch credits bijkopen bij een tekort (Fase 3-scaffolding).
//
// FASE 3 levert alleen de STRUCTUUR + de hook in enforceCreditBalance. De
// daadwerkelijke off-session SEPA-charge (+ het blootstellingsplafond-boekhouden)
// komt in FASE 5, zodra er een iDEAL→SEPA-mandaat is. Tot dan is dit een bewuste
// NO-OP: zonder actief mandaat wordt er nooit bijgekocht, dus enforceCreditBalance
// valt gewoon terug op de 402. Fase 5 hoeft enkel het gemarkeerde blok in te vullen.
// =============================================================

import { prisma } from '@/lib/prisma';
import { getTopupPack } from '@/lib/stripe/topup';

export interface AutoTopupResult {
  /** Is er daadwerkelijk bijgekocht (saldo verhoogd)? */
  topped: boolean;
  /** Waarom niet: disabled | no-mandate | no-pack | over-cap | not-implemented. */
  reason?: string;
  grantedCredits?: number;
}

/**
 * Probeert bij een tekort een pack optimistisch toe te kennen tegen het SEPA-mandaat.
 * No-op tot Fase 5 (geen actief mandaat → altijd `{ topped: false }`).
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
    },
  });

  if (!org?.autoTopupEnabled) return { topped: false, reason: 'disabled' };
  // FASE 5: een actief iDEAL→SEPA-mandaat is vereist voor een off-session charge.
  if (org.sepaMandateStatus !== 'active') return { topped: false, reason: 'no-mandate' };

  const pack = org.autoTopupPackId ? getTopupPack(org.autoTopupPackId) : null;
  if (!pack) return { topped: false, reason: 'no-pack' };

  // ── FASE 5 — INVULPUNT ────────────────────────────────────────────────────
  // Hier komt: (1) blootstellingsplafond-check (som optimistisch-onbevestigde
  // credits + pack.credits ≤ autoTopupExposureCap → anders 'over-cap'),
  // (2) een off-session Stripe-PaymentIntent tegen het SEPA-mandaat,
  // (3) een optimistische grantCredits('TOPUP', ..., { optimistic:true }),
  // (4) een notificatie per auto-topup.
  // Tot dat blok bestaat, bereikt de code dit punt niet (geen actief mandaat).
  return { topped: false, reason: 'not-implemented' };
}
