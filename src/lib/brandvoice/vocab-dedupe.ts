/**
 * Vocab-hygiëne (audit 2026-06-10, fase 3).
 *
 * De do/avoid-datalaag kan contradicties bevatten: Linfi had 'exclusief' en
 * 'luxe' in zowel vocabularyDo/wordsWeUse als vocabularyDont/wordsWeAvoid.
 * Gevolg: de prompt seedt een woord dat de rules-pijler vervolgens bestraft —
 * een score-plafond dat geen enkele copy-verbetering kan oplossen.
 *
 * Regel: AVOID WINT. Een merk dat expliciet zegt een woord te vermijden
 * krijgt het niet alsnog ge-seed via de do-lijst. Toegepast bij elke
 * analyzer-write (analysis-engine) + eenmalig op bestaande data via
 * scripts/dev/dedupe-voice-vocab.ts.
 */

function normalize(term: string): string {
  return term.trim().toLowerCase();
}

export interface VocabDedupeResult {
  /** Do-lijst geschoond van termen die ook in een avoid-lijst staan. */
  cleanedDo: string[];
  /** Termen die uit de do-lijst verwijderd zijn (voor logging/rapportage). */
  removed: string[];
}

/**
 * Verwijder uit `doList` elke term die (genormaliseerd) ook in een van de
 * avoid-lijsten voorkomt. Pure functie; behoudt volgorde en originele casing
 * van de overgebleven do-termen.
 */
export function dedupeVocabularyAgainstAvoid(
  doList: readonly string[],
  ...avoidLists: ReadonlyArray<readonly string[]>
): VocabDedupeResult {
  const avoidSet = new Set(
    avoidLists.flat().filter((t): t is string => typeof t === 'string').map(normalize),
  );
  const cleanedDo: string[] = [];
  const removed: string[] = [];
  for (const term of doList) {
    if (typeof term !== 'string') continue;
    if (avoidSet.has(normalize(term))) {
      removed.push(term);
    } else {
      cleanedDo.push(term);
    }
  }
  return { cleanedDo, removed };
}
