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
  type PruneResult,
} from '@/lib/landing-pages/retention';

/** Uitkomst per stap: het resultaat, of dat de stap gefaald is. */
type StepOutcome = PruneResult | { error: string };

async function runStep(
  label: string,
  step: () => Promise<PruneResult>,
): Promise<StepOutcome> {
  try {
    return await step();
  } catch (error) {
    // Volledige fout naar de log, generieke tekst naar de response — zelfde
    // keuze als brandmd-draft-cleanup; Prisma-berichten kunnen kolom- en
    // querydetails bevatten.
    console.error(`[GET /api/cron/lp-retention] step "${label}" failed`, error);
    return { error: `Step "${label}" failed — see server logs` };
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

  const steps = { pageEvents, formSubmissions, compiledHtml };
  const outcomes = Object.values(steps);
  const failed = outcomes.some((outcome) => 'error' in outcome);
  // "Er staat nog werk open" geldt óók als een stap crashte: die deed niets, en
  // `truncated: false` zou dat als "klaar" laten lezen.
  const truncated = outcomes.some(
    (outcome) => 'error' in outcome || outcome.truncated,
  );
  if (truncated) {
    console.warn('[GET /api/cron/lp-retention] run truncated — work remains', steps);
  }

  return NextResponse.json(
    { ...steps, truncated },
    { status: failed ? 500 : 200 },
  );
}
