// =============================================================
// Landing-page retentie — beleid + selectie-logica (ADR 2026-08-17)
//
// Bewust ZONDER Prisma-import: `src/lib/prisma.ts` gooit al bij module-load
// als er geen DATABASE_URL is, en dan zou de riskante logica hieronder
// alleen mét database te verifiëren zijn. Zo draait ze overal.
// De database-kant staat in `./retention`.
// =============================================================

/** PageEvent-window. Het stats-dashboard leest 30 dagen; 13 maanden houdt
 *  jaar-op-jaar-vergelijking mogelijk zonder onbegrensde groei. */
export const PAGE_EVENT_RETENTION_MONTHS = 13;

/** FormSubmission-window. Lead-PII in `data Json` — 26 maanden is de
 *  vaste verwerkersafspraak-termijn (ADR 2026-08-17 §Windows). */
export const FORM_SUBMISSION_RETENTION_MONTHS = 26;

/** Aantal nieuwste publish-versies per pagina dat zijn bevroren HTML
 *  houdt. Ouder → `compiledHtml = null`; `puckData` blijft, dus die
 *  versies renderen via het runtime-fallback-pad in `/p`. */
export const COMPILED_HTML_KEEP_VERSIONS = 5;

/**
 * Kalender-correcte afkapdatum: `months` terug vanaf `now`.
 *
 * Bewust `setMonth()` en geen `months * 30`-benadering — die schuift per
 * jaar merkbaar weg, wat bij een AVG-termijn niet uit te leggen is.
 */
export function retentionCutoff(months: number, now: Date = new Date()): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

/** Minimale vorm die `selectPrunableCompiledHtml` nodig heeft. */
export interface PublishVersionRef {
  id: string;
  version: number;
}

/**
 * Welke publishes van één pagina mogen hun `compiledHtml` verliezen.
 *
 * Twee regels: de nieuwste `keepVersions` blijven, én de versie waar de
 * live-pointer naar wijst blijft altijd — óók als die buiten dat venster
 * valt. Dat laatste is geen detail: rollback is een pointer-swap, dus na
 * een rollback naar een oude versie is de live pagina níet de nieuwste.
 * Zonder die uitzondering verliest juist de live pagina haar bevroren
 * artifact en valt ze stil terug op runtime-hercompilatie.
 */
export function selectPrunableCompiledHtml(
  publishes: readonly PublishVersionRef[],
  livePublishId: string | null,
  keepVersions: number = COMPILED_HTML_KEEP_VERSIONS,
): string[] {
  return [...publishes]
    .sort((a, b) => b.version - a.version)
    .slice(keepVersions)
    .filter((publish) => publish.id !== livePublishId)
    .map((publish) => publish.id);
}
