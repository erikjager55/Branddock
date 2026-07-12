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
import { notifyExpiringTrials } from '@/lib/billing/credits/trial-notify';

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Credits-uit → geen trials om te verlopen. Ook deploy-safety: raakt de nieuwe
  // credit-kolommen niet vóór de Neon `db push`.
  if (!isCreditsEnabled()) {
    return NextResponse.json({ expired: 0, notified: 0, skipped: 'credits-off' });
  }

  try {
    const expired = await expireTrialCredits();
    // Fase 4: T-3/T-0-vervalmeldingen — ná de expiry zodat de T-0-melding in
    // dezelfde run als het nul-zetten meegaat. Fail-soft: een melding-fout
    // mag het expiry-resultaat niet maskeren.
    let notified = 0;
    try {
      notified = await notifyExpiringTrials();
    } catch (error) {
      console.warn('[GET /api/cron/expire-trials] notify failed (swallowed)', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return NextResponse.json({ expired, notified });
  } catch (error) {
    console.error('[GET /api/cron/expire-trials]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
