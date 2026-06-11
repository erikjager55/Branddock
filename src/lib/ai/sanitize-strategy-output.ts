/**
 * Scrub interne award-rubric vocabulaire uit user-facing strategy-output.
 *
 * Achtergrond: campaign-strategy prompts gebruiken Effie Award criteria als interne
 * kwaliteitscheck. In NL-output echo't het model dit jargon ("effie-waardig"). De
 * prompts zijn aangepast met output-guards, maar deze sanitizer dient als vangnet
 * voor restanten die toch doorglippen.
 *
 * Strategie: regex-vervang bekende leak-tokens door neutrale equivalenten. Gebruik
 * word-boundary (`\b`) om onschuldige woorden ("effectief") niet te raken.
 */

// Token-pattern voor "effie" met ondersteuning voor accent (Éffie), case-insensitief.
// Boundary excludeert letters + cijfers + Latin-extended diacritics, maar wél
// _, /, -, ', spaces (onderscheid-tekens — daar mag het scrubben overheen
// triggeren voor varianten zoals effie_award, Effie/Cannes, Effie's).
// Onschuldige woorden ("effectief", "Jeffie") matchen niet omdat hun
// omringende char wél een letter is.
const EFFIE = '(?<![A-Za-z0-9\\u00C0-\\u017F])[ÉéEe]ffie(?![A-Za-z0-9\\u00C0-\\u017F])';
// "Cannes" alleen scrubben in award-context ("Lions", "-winning", "-waardig") —
// de kale stadsnaam kan legitieme campagne-inhoud zijn (bv. een travel-merk).
const CANNES = '(?<![A-Za-z0-9\\u00C0-\\u017F])[Cc]annes(?:[-\\s/_]?[Ll]ions?)?(?![A-Za-z0-9\\u00C0-\\u017F])';
const CANNES_LIONS = '(?<![A-Za-z0-9\\u00C0-\\u017F])[Cc]annes[-\\s/_]?[Ll]ions?(?![A-Za-z0-9\\u00C0-\\u017F])';
const REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  // Cannes-regels vóór de Effie-regels zodat combinaties ("Effie/Cannes Lions")
  // in twee nette stappen scrubben i.p.v. een halve restant achter te laten.
  [new RegExp(`${CANNES}[-\\s]?winning`, 'gi'), 'world-class'],
  // Langste alternatief eerst: '(e|er|ste)' matchte 'waardige' binnen
  // 'waardiger' en liet een losse 'r' achter ('sterkr').
  [new RegExp(`${CANNES}[-\\s]?waardig(er|ste|e)?`, 'gi'), 'sterk'],
  [new RegExp(`${CANNES_LIONS}(?:[-\\s]?awards?)?`, 'gi'), 'creative-excellence'],
  [new RegExp(`${EFFIE}[-\\s]?waardig(er|ste|e)?`, 'gi'), 'sterk'],
  [new RegExp(`${EFFIE}[-\\s/_]?awards?[-\\s_]?winning`, 'gi'), 'award-worthy'],
  [new RegExp(`${EFFIE}[-\\s/_]?awards?`, 'gi'), 'strategic-quality'],
  [new RegExp(`${EFFIE}[-\\s/_]cannes`, 'gi'), 'creative-excellence'],
  [new RegExp(`${EFFIE}['’]s`, 'gi'), 'strategic-quality\'s'],
  [new RegExp(EFFIE, 'gi'), 'strategic-quality'],
];

export function scrubAwardJargonString(value: string): string;
export function scrubAwardJargonString(value: string | null): string | null;
export function scrubAwardJargonString(value: string | undefined): string | undefined;
export function scrubAwardJargonString(
  value: string | null | undefined,
): string | null | undefined {
  if (value === null || value === undefined) return value;
  let out = value;
  for (const [re, repl] of REPLACEMENTS) {
    out = out.replace(re, repl);
  }
  return out;
}

/**
 * Shallow-copy `obj` met opgegeven string-velden gescrubd. Niet-string-velden en
 * niet-genoemde velden blijven onveranderd. Geen recursie — diepe sub-objecten
 * moeten apart worden gewrappt.
 */
export function scrubAwardJargon<T extends Record<string, unknown>>(
  obj: T,
  stringFields: ReadonlyArray<keyof T>,
): T {
  const copy = { ...obj } as Record<string, unknown>;
  for (const field of stringFields) {
    const v = copy[field as string];
    if (typeof v === 'string') {
      copy[field as string] = scrubAwardJargonString(v);
    }
  }
  return copy as T;
}

/**
 * Scrub alle LLM-output string-velden van een StrategyLayer (incl. nested
 * messagingHierarchy / jtbdFraming / strategicChoices). Idempotent en
 * non-mutating — geeft een nieuwe StrategyLayer-shape terug.
 *
 * Gebruik op het moment dat StrategyLayer terugkomt uit een LLM-call, vóór
 * persist/dispatch naar downstream prompts.
 */
type UnknownObj = Record<string, unknown>;

export function scrubStrategyLayer<T extends UnknownObj>(strategy: T): T {
  const scrubbed = scrubAwardJargon(strategy, [
    'campaignTheme',
    'positioningStatement',
    'humanInsight',
    'culturalTension',
    'creativePlatform',
    'creativeTerritory',
    'brandRole',
    'memorableDevice',
    'effieRationale',
  ] as ReadonlyArray<keyof T>);

  // Nested: messagingHierarchy.{brandMessage, campaignMessage, proofPoints[]}
  const mh = (scrubbed as UnknownObj).messagingHierarchy;
  if (mh && typeof mh === 'object') {
    const mhObj = mh as UnknownObj;
    const newMh = scrubAwardJargon(mhObj, ['brandMessage', 'campaignMessage']);
    const pp = mhObj.proofPoints;
    if (Array.isArray(pp)) {
      (newMh as UnknownObj).proofPoints = pp.map((p) =>
        typeof p === 'string' ? scrubAwardJargonString(p) : p,
      );
    }
    (scrubbed as UnknownObj).messagingHierarchy = newMh;
  }

  // Nested: jtbdFraming
  const jtbd = (scrubbed as UnknownObj).jtbdFraming;
  if (jtbd && typeof jtbd === 'object') {
    (scrubbed as UnknownObj).jtbdFraming = scrubAwardJargon(jtbd as UnknownObj, [
      'jobStatement',
      'functionalJob',
      'emotionalJob',
      'socialJob',
    ]);
  }

  // Nested: strategicChoices[] (kan string OF {choice, rationale, tradeoff} zijn)
  const choices = (scrubbed as UnknownObj).strategicChoices;
  if (Array.isArray(choices)) {
    (scrubbed as UnknownObj).strategicChoices = choices.map((c) => {
      if (typeof c === 'string') return scrubAwardJargonString(c);
      if (c && typeof c === 'object') {
        return scrubAwardJargon(c as UnknownObj, ['choice', 'rationale', 'tradeoff']);
      }
      return c;
    });
  }

  return scrubbed;
}
