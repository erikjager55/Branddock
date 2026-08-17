// =============================================================
// Cron endpoint — landing-page data-retentie (ADR 2026-08-17)
//
// Drie opruimstappen in één dagelijkse job: PageEvents (13mnd),
// FormSubmissions (26mnd, lead-PII) en `PagePublish.compiledHtml`
// (nieuwste 5 versies per pagina behouden, live-versie altijd).
//
// Elke stap wordt afzonderlijk afgevangen: een fout in één stap mag de
// andere twee niet meesleuren, want dan blijft een tabel groeien om een
// reden die er niets met te maken heeft.
// Protected via CRON_SECRET; dagelijks (zie vercel.json).
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/cron-auth';
import {
  prunePageEvents,
  pruneFormSubmissions,
  pruneCompiledHtml,
} from '@/lib/landing-pages/retention';

/** Uitkomst per stap: het aantal geraakte rijen, of de fout die het brak. */
type StepResult = { count: number } | { error: string };

async function runStep(
  label: string,
  step: () => Promise<number>,
): Promise<StepResult> {
  try {
    return { count: await step() };
  } catch (error) {
    console.error(`[GET /api/cron/lp-retention] step "${label}" failed`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const pageEvents = await runStep('pageEvents', () => prunePageEvents(now));
  const formSubmissions = await runStep('formSubmissions', () =>
    pruneFormSubmissions(now),
  );
  const compiledHtml = await runStep('compiledHtml', () => pruneCompiledHtml());

  const failed = [pageEvents, formSubmissions, compiledHtml].some(
    (result) => 'error' in result,
  );
  return NextResponse.json(
    { pageEvents, formSubmissions, compiledHtml },
    { status: failed ? 500 : 200 },
  );
}
