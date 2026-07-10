// =============================================================
// Cron endpoint — reap stale credit-reservations (Fase 3, Gate D)
//
// Geeft credit-reserveringen vrij die tussen reserve en reconcile bleven
// hangen (gecrashte/gekilde generatie tussen pre-flight en completion), zodat
// `reserved` niet permanent beschikbaar saldo blokkeert. Protected via
// CRON_SECRET. Loopt elke 15 min (zie vercel.json); default-drempel 30 min.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/cron-auth';
import { reapStaleReservations } from '@/lib/billing/credits/reservation';

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const released = await reapStaleReservations(30);
    return NextResponse.json({ released });
  } catch (error) {
    console.error('[GET /api/cron/reap-reservations]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
