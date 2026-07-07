// =============================================================
// Credit-ledger errors + 402-serializer (ADR 2026-07-07)
//
// Mirror van PlanLimitError/enforcePlanLimit zodat routes een consistente
// 402-body teruggeven bij ontoereikend saldo.
// =============================================================

import { NextResponse } from 'next/server';

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

/** 402-response voor een route-boundary guard. */
export function insufficientCreditsResponse(err: InsufficientCreditsError): NextResponse {
  return NextResponse.json(
    {
      error: `Onvoldoende credits: ${err.required} nodig, ${err.available} beschikbaar. Koop credits bij of wacht op je maandtegoed.`,
      required: err.required,
      available: err.available,
      topUpRequired: true,
    },
    { status: 402 },
  );
}
