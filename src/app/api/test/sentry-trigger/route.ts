// =============================================================
// GET /api/test/sentry-trigger
// Test-endpoint voor Sentry-deployment smoke. Throws een synthetische
// error die in Sentry-dashboard moet verschijnen binnen 1 min.
//
// Beveiligd via SENTRY_TEST_SECRET query-param zodat alleen Erik
// dit kan triggeren in productie. In dev/preview altijd toegankelijk.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const providedSecret = url.searchParams.get('secret') ?? '';
  const requiredSecret = process.env.SENTRY_TEST_SECRET ?? '';

  if (process.env.NODE_ENV === 'production') {
    if (!requiredSecret) {
      return NextResponse.json(
        { error: 'SENTRY_TEST_SECRET not configured — endpoint disabled in production' },
        { status: 503 },
      );
    }
    if (providedSecret !== requiredSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const variant = url.searchParams.get('variant') ?? 'sync';

  if (variant === 'async') {
    // Async error binnen Promise — verifieert Sentry's promise-rejection hook
    setTimeout(() => {
      throw new Error(
        '[sentry-trigger] Synthetic async error voor deployment-smoke',
      );
    }, 0);
    return NextResponse.json({ triggered: 'async', detail: 'Check Sentry dashboard binnen ~1 min' });
  }

  // Default: sync throw — verifieert basis error-boundary
  throw new Error('[sentry-trigger] Synthetic sync error voor deployment-smoke');
}
