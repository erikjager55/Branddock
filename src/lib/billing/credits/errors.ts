// =============================================================
// Credit-ledger errors + 402-serializer (ADR 2026-07-07)
//
// Mirror van PlanLimitError/enforcePlanLimit zodat routes een consistente
// 402-body teruggeven bij ontoereikend saldo.
// =============================================================

import { NextResponse } from 'next/server';
import { isTopupEnabled } from '@/lib/stripe/feature-flags';

export class InsufficientCreditsError extends Error {
  public readonly organizationId: string;
  public readonly required: number;
  public readonly available: number;

  constructor(organizationId: string, required: number, available: number) {
    super(`Insufficient credits: need ${required}, have ${available} (org ${organizationId})`);
    this.name = 'InsufficientCreditsError';
    this.organizationId = organizationId;
    this.required = required;
    this.available = available;
  }
}

/** 402-response voor een verlopen no-card trial (Fase 4 read-only-lock).
 * Onderscheiden van "onvoldoende credits" via `trialExpired: true` zodat de UI
 * een conversie-CTA kan tonen i.p.v. een top-up-melding. Merk-data blijft
 * volledig leesbaar — alleen muterende/generatieve acties krijgen deze 402. */
export function trialLockedResponse(): NextResponse {
  const suffix = isTopupEnabled()
    ? 'Kies een plan of koop credits om verder te gaan — je merkdata staat veilig en blijft zichtbaar.'
    : 'Neem contact op om je account te activeren — je merkdata staat veilig en blijft zichtbaar.';
  return NextResponse.json(
    {
      error: `Je gratis trialperiode is afgelopen. ${suffix}`,
      trialExpired: true,
      upgradeRequired: true,
    },
    { status: 402 },
  );
}

/** 402-response voor een route-boundary guard. Copy is topup-bewust: in de
 * pilotfase (kopen uit) verwijzen we naar contact i.p.v. een koopknop die er niet is. */
export function insufficientCreditsResponse(err: InsufficientCreditsError): NextResponse {
  const suffix = isTopupEnabled()
    ? 'Koop credits bij of wacht op je maandtegoed.'
    : 'Neem contact op voor extra credits.';
  return NextResponse.json(
    {
      error: `Onvoldoende credits: ${err.required} nodig, ${err.available} beschikbaar. ${suffix}`,
      required: err.required,
      available: err.available,
      topUpRequired: true,
    },
    { status: 402 },
  );
}
