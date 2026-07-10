// =============================================================
// Unlimited-free-uitzondering (ADR 2026-07-07-pricing-credits-launch, Fase 3)
//
// Sommige organisaties (pre-launch-gebruikers, comped accounts, pilots) mogen de
// app onbeperkt gratis gebruiken. Voor die orgs short-circuiten ALLE credit-paden
// (reserve/enforce/deduct/charge) — los van hun plan-tier of het saldo.
//
// Dun cache-laagje (60s) zodat de check niet elke metered call een DB-query kost.
// Toggle via `unlimitedCredits` op Organization (Settings-UI/dev-script) →
// `invalidateOrgUnlimited` bust de cache.
// =============================================================

import { prisma } from '@/lib/prisma';

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { unlimited: boolean; expiresAt: number }>();

/** True als de org een unlimited-free-uitzondering heeft (nooit gemeterd/geblokkeerd). */
export async function isOrgUnlimited(organizationId: string): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(organizationId);
  if (hit && hit.expiresAt > now) return hit.unlimited;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { unlimitedCredits: true },
  });
  const unlimited = org?.unlimitedCredits ?? false;
  cache.set(organizationId, { unlimited, expiresAt: now + CACHE_TTL_MS });
  return unlimited;
}

/** Bust de cache na een toggle van `unlimitedCredits`. */
export function invalidateOrgUnlimited(organizationId: string): void {
  cache.delete(organizationId);
}
