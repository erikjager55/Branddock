// =============================================================
// Hoe de Content Library "is hier iets, en wat mist er nog?" beantwoordt.
//
// Stond eerder als losse helpers ín `api/content-library/route.ts`. Verplaatst
// omdat een route-file in de App Router geen extra symbolen mag exporteren, en
// deze logica dus niet te smoken viel — terwijl juist hier de fout zat die
// tasks/content-chain-accessor.md #2 beschrijft: een volle, gepubliceerde
// pillar-page kreeg een rood stoplicht met "No content generated", omdat alleen
// de dode keten C werd gelezen.
//
// tsc bewijst hier per definitie niets (beide ketens compileren), dus de
// beslissingen hieronder hebben een echte smoke:
// scripts/smoke-tests/content-library-readiness.ts
// =============================================================

import {
  resolveDeliverableContentSignal,
  type DeliverableContentState,
} from '@/lib/content/resolve-deliverable-content';

/**
 * Eén reden waarom een item nog niet publicatie-klaar is, als **token** —
 * niet als zin.
 *
 * De route bouwde hier eerder Engelse zinnen die de UI rauw rendert, terwijl
 * dezelfde begrippen in `campaigns-content-library` wél vertaald staan: een
 * Nederlandse gebruiker zag "No content generated" op de kaart en "Geen content
 * gegenereerd" in het filter. Erger was de terugweg — het serverfilter leidde
 * zijn tokens af uit die Engelse tekst met `lower.includes('choose')`, dus één
 * herformulering (of een vertaling) had het filter stil kapotgemaakt.
 *
 * Engels blijft de bron (`DEFAULT_UI_LOCALE = 'en'`): elke call-site geeft de
 * Engelse tekst als `defaultValue` mee, zodat het scherm ook klopt wanneer de
 * namespace nog niet geladen is.
 */
export type ReadinessSignal =
  | { token: 'no-content' }
  | { token: 'variant-unchosen'; count: number }
  | { token: 'pipeline-incomplete' }
  | { token: 'not-reviewed' }
  | { token: 'status'; status: string };

export interface LibraryContentSignal {
  contentState: DeliverableContentState;
  /**
   * Er is verzendbare content (tekst, beeld of video).
   *
   * Bewust NIET waar bij `awaiting-choice`: dit veld schakelt in de UI de
   * QuickPublishMenu vrij, en de publish-guard weigert een deliverable zonder
   * variantkeuze alsnog. Een actie aanbieden die gegarandeerd afketst is erger
   * dan hem verbergen.
   */
  hasContent: boolean;
  /** Versies gegenereerd, gebruiker koos er nog geen. Telt wél als voortgang. */
  isAwaitingChoice: boolean;
  /** Alleen wanneer de telling gratis is (keten B/C); anders `null`. */
  wordCount: number | null;
  /** Het content-deel van de readiness-hint, of `null` als er niets mist. */
  contentSignal: ReadinessSignal | null;
}

export function resolveLibraryContentSignal(
  deliverable: {
    contentType?: string | null;
    settings?: unknown;
    generatedText?: string | null;
    generatedImageUrls?: unknown;
    generatedVideoUrl?: string | null;
  },
  /** Aantal componenten mét tekst; een `take: 1`-existentiecheck volstaat. */
  textComponentCount: number,
): LibraryContentSignal {
  const signal = resolveDeliverableContentSignal({ ...deliverable, textComponentCount });

  const hasVisuals =
    (Array.isArray(deliverable.generatedImageUrls) && deliverable.generatedImageUrls.length > 0) ||
    deliverable.generatedVideoUrl != null;

  const isAwaitingChoice = signal.state === 'awaiting-choice';
  // Beeld/video op de rij telt als publiceerbare content — behalve zolang er een
  // variantkeuze open staat. De publish-guard leest de accessor, ziet
  // `structured-unchosen` en weigert; `hasContent: true` zou dan een
  // QuickPublishMenu tonen die gegarandeerd afketst.
  const hasContent = signal.state === 'ready' || (hasVisuals && !isAwaitingChoice);

  // Voortgang, geen leegte: er ís gegenereerd, alleen de keuze ontbreekt. Het
  // token noemt daarom de eerstvolgende handeling in plaats van een gemis; de
  // UI maakt er de zin van, in de taal van de gebruiker.
  const contentSignal: ReadinessSignal | null = isAwaitingChoice
    ? { token: 'variant-unchosen', count: signal.optionCount }
    : hasContent
      ? null
      : { token: 'no-content' };

  return {
    contentState: signal.state,
    hasContent,
    isAwaitingChoice,
    wordCount: signal.wordCount,
    contentSignal,
  };
}

/**
 * De filter-tokens van een item.
 *
 * Was een substring-match op de Engelse hint-tekst; nu leest hij de tokens die
 * er al zijn. Dat scheelt niet alleen een vertaal-val — het scheelt de hele
 * klasse: tekst en filter kunnen niet meer uit elkaar lopen omdat er nog maar
 * één bron is.
 */
export function readinessSignalTokens(signals: ReadinessSignal[]): string[] {
  return signals.map((s) => s.token);
}

/**
 * De traffic-light-bucket die zowel het server-filter als de UI gebruikt.
 * Volgt het mentale model van de gebruiker, niet de status-enum alleen:
 *   - GREEN : approved of published
 *   - RED   : echt onaangeroerd — niets gegenereerd, niet ingepland, NOT_STARTED
 *   - AMBER : al het andere — er is content, er wachten versies op een keuze,
 *             het item staat ingepland, of de status staat op IN_PROGRESS/COMPLETED
 * Overdue is een label-modifier (zie `deriveTrafficLight`) en verandert de
 * bucket nooit.
 */
export function deriveReadinessBucket(args: {
  isPublishReady: boolean;
  status: string | null;
  hasContent: boolean;
  isAwaitingChoice: boolean;
  isScheduled: boolean;
  isPublished: boolean;
}): 'red' | 'amber' | 'green' {
  if (args.isPublishReady || args.isPublished) return 'green';
  const hasAnyProgress =
    args.hasContent ||
    args.isAwaitingChoice ||
    args.isScheduled ||
    args.status === 'IN_PROGRESS' ||
    args.status === 'COMPLETED';
  return hasAnyProgress ? 'amber' : 'red';
}
