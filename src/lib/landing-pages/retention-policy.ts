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
 * Geen `months * 30`-benadering — die schuift per jaar merkbaar weg, wat bij
 * een AVG-termijn niet uit te leggen is.
 *
 * Ook geen kale `setMonth()`: die rolt op maandeinden vóóruit in plaats van te
 * clampen. Op 31-03 leverde `setMonth(-13)` 03-03 op in plaats van 28-02, dus
 * een latere cutoff en dáármee tot drie dagen data té veel verwijderd — precies
 * het tegenovergestelde van de bedoelde termijn. De dag wordt daarom geclampt
 * op de laatste dag van de doelmaand.
 *
 * Rekent in UTC, zodat de termijn niet een uur verschuift rond een
 * DST-overgang op een host met lokale tijdzone.
 */
export function retentionCutoff(months: number, now: Date = new Date()): Date {
  // Harde guard: `0` levert `now` op (wist praktisch de hele tabel) en een
  // negatieve waarde een cutoff in de toekomst (wist álles, van alle tenants).
  // Er is geen soft-delete, dus één tekenfout in een constante hierboven is
  // onherstelbaar. Liever een gefaalde cron-stap dan stille massa-verwijdering.
  if (!Number.isInteger(months) || months <= 0) {
    throw new Error(
      `retentionCutoff: months moet een positief geheel getal zijn, kreeg ${months}`,
    );
  }
  const targetMonth = now.getUTCMonth() - months;
  // Dag 0 van de maand ná de doelmaand = laatste dag van de doelmaand.
  const daysInTargetMonth = new Date(
    Date.UTC(now.getUTCFullYear(), targetMonth + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      targetMonth,
      Math.min(now.getUTCDate(), daysInTargetMonth),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    ),
  );
}

/** Minimale vorm die `selectPrunableCompiledHtml` nodig heeft. */
export interface PublishVersionRef {
  id: string;
  version: number;
}

/**
 * Welke publishes van één pagina mogen hun `compiledHtml` verliezen.
 *
 * **`publishes` moet alleen de rijen bevatten die nú nog HTML dragen.** Het
 * venster telt bewust *beschikbare artifacts*, niet publish-rijen. Compile bij
 * publish is fail-soft (`publish/route.ts` maakt de rij en vult de HTML erna,
 * met een `console.warn` bij falen), en zo'n mislukking is meestal systematisch
 * — een onrenderbare sectie, een kapotte context-assembly — dus vijf null-html
 * publishes op rij is een realistische vorm. Zou het venster rijen tellen, dan
 * verloor precies zo'n pagina élk artifact dat ze nog had: de nieuwste vijf
 * rijen dragen niets, en alles daarachter — de laatste werkende artifacts —
 * viel buiten het venster.
 *
 * Twee regels: de nieuwste `keepVersions` artifacts blijven, én de versie waar
 * de live-pointer naar wijst blijft altijd — óók als die buiten dat venster
 * valt. Dat laatste is geen detail: rollback is een pointer-swap, dus na een
 * rollback naar een oude versie is de live pagina níet de nieuwste. Zonder die
 * uitzondering verliest juist de live pagina haar bevroren artifact en valt ze
 * stil terug op runtime-hercompilatie.
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
