// =============================================================
// `Deliverable.settings` getypeerd — de tweede content-keten krijgt een naam.
//
// Het schema documenteerde dit veld als "Type-specifieke settings", wat de
// indruk wekt dat er configuratie in zit. In werkelijkheid woont hier voor de
// 11 keten-B-types (4 PUCK-webpage + 7 long-form GEO) de CONTENT zelf:
// `structuredVariant` (de gekozen variant), `structuredVariantOptions` (de
// gegenereerde opties waaruit nog gekozen moet worden) en `puckData` (de
// render-boom). Vier keer dezelfde bug in acht weken kwam voort uit dat
// misverstand — het type-systeem wees consumenten naar keten A, die voor deze
// types structureel leeg is.
//
// Zie ADR 2026-07-17-deliverable-content-accessor.
// =============================================================

import type { PageVariantContent } from '@/lib/landing-pages/page-type-schemas';

/**
 * De content-dragende velden van `Deliverable.settings`.
 *
 * Bewust NIET exhaustief: `settings` draagt daarnaast per type nog echte
 * configuratie. Dit type beschrijft alleen wat de content-keten aangaat, zodat
 * consumenten niet meer op `unknown` hoeven te gokken.
 */
export interface DeliverableSettings {
  /** De door de gebruiker GEKOZEN variant. Wint altijd van componenten. */
  structuredVariant?: PageVariantContent;
  /** Gegenereerde varianten waaruit nog niets is gekozen. */
  structuredVariantOptions?: unknown[];
  /** Puck-render-boom van de gekozen variant. Geen tekstbron — render-artefact. */
  puckData?: unknown;
  /** Overige type-specifieke settings blijven bereikbaar zonder cast. */
  [key: string]: unknown;
}

/** True voor een niet-null object dat geen array is. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Leest `Deliverable.settings` defensief.
 *
 * Prisma-`Json?` kan letterlijk alles zijn — null, een string, een array, of een
 * object uit een oudere schrijver. Elke niet-object-vorm degradeert hier naar een
 * leeg record in plaats van verderop een TypeError te veroorzaken.
 */
export function readDeliverableSettings(value: unknown): DeliverableSettings {
  if (!isRecord(value)) return {};
  return value as DeliverableSettings;
}

/**
 * De gekozen variant, of `null`.
 *
 * Alleen een objectvorm telt: een variant is nooit een string of array, en een
 * `structuredVariant: null` uit een gereset deliverable mag geen "keten B"-signaal
 * geven — dan wint de componentketen terecht.
 */
export function readChosenVariant(settings: DeliverableSettings): PageVariantContent | null {
  const chosen = settings.structuredVariant;
  return isRecord(chosen) ? (chosen as PageVariantContent) : null;
}

/**
 * Aantal gegenereerde varianten waaruit nog gekozen moet worden (0 als er geen
 * zijn). Alleen objectvormige leden tellen — een array met rommel is geen keuze.
 */
export function countVariantOptions(settings: DeliverableSettings): number {
  const options = settings.structuredVariantOptions;
  if (!Array.isArray(options)) return 0;
  return options.filter(isRecord).length;
}
