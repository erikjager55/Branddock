// =============================================================
// Cron endpoint — verloop trial-credits (Fase 3-follow-up)
//
// Verloopt dagelijks de resterende trial-credits van orgs waarvan de 28-daagse
// trial voorbij is en die uitsluitend trial-credits kregen (betaalde credits
// blijven). Protected via CRON_SECRET. Zie vercel.json (dagelijks).
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/cron-auth';
import { isCreditsEnabled } from '@/lib/stripe/feature-flags';
import { expireTrialCredits } from '@/lib/billing/credits/trial-expiry';

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Credits-uit → geen trials om te verlopen. Ook deploy-safety: raakt de nieuwe
  // credit-kolommen niet vóór de Neon `db push`.
  if (!isCreditsEnabled()) {
    return NextResponse.json({ expired: 0, skipped: 'credits-off' });
  }

  try {
    const expired = await expireTrialCredits();
    return NextResponse.json({ expired });
  } catch (error) {
    console.error('[GET /api/cron/expire-trials]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
