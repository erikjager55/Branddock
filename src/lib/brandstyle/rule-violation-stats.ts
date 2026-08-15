/**
 * Feedback-loop: welke merkregels botsen structureel met wat we genereren?
 * (verbeterplan R4, fase 2 §5.3)
 *
 * De logging bestond al — élke generatie schrijft een `ContentFidelityScore`
 * met geneste `BrandReviewFinding`-rijen, en `mapViolationToFindingInput` zet
 * `{ ruleId, ruleType, pattern }` in `evidence`. Wat ontbrak was de aggregatie
 * per regel: "regel X wordt in 19% van de generaties overtreden — te streng
 * geformuleerd of verkeerd geëxtraheerd?"
 *
 * ## Waarom niet op `ruleId` aggregeren
 *
 * Dat lijkt de voor de hand liggende sleutel en is precies de verkeerde. Zowel
 * `brand-rule-sync.ts` als `rule-structurer.ts` doen `deleteMany` +
 * `createMany`, dus élke sync deelt verse cuid's uit en verweest de hele
 * historie. Op de echte data bestonden van de 24 gerefereerde regel-ID's er nog
 * **3**. Een suggestie op `ruleId` zou dus in 87% van de gevallen naar een
 * regel wijzen die niet meer bestaat.
 *
 * `(ruleType, pattern)` overleeft die sync wél — beide staan al in dezelfde
 * `evidence`-JSON, dus het werkt met terugwerkende kracht en zonder
 * schema-wijziging.
 *
 * Alles hier is puur, zodat het zonder database te testen is.
 */

/** Drempels — afgestemd op de echte verdeling, zie de task-file. */
export const MIN_VIOLATION_RATE = 0.15;
export const MIN_GENERATIONS = 10;
/** Minimaal aantal geraakte generaties, los van het percentage. */
export const MIN_HITS = 3;
/** Bovengrens op het aantal suggesties, zodat het paneel niet volstroomt. */
export const MAX_SIGNALS = 3;

/** Waar een regel vandaan komt; bepaalt wat de gebruiker ermee kán. */
export type CuratableRuleKind =
  /** Gesynct uit de voiceguide — cureren doe je op de bron, niet op de regel. */
  | 'voiceguide-synced'
  /** Handmatig aangemaakte BrandRule — direct bewerkbaar. */
  | 'brand-rule-manual'
  /** StyleguideRule — severity is direct bij te stellen. */
  | 'styleguide-rule';

/** Eén finding zoals de aggregatie 'm nodig heeft. */
export interface ViolationRow {
  /** De generatie waar deze overtreding bij hoorde (`fidelityScoreId`). */
  generationId: string;
  /** `evidence.ruleId` — alleen gebruikt om heuristieken te filteren. */
  ruleId: string;
  /** `evidence.ruleType` — helft van de stabiele sleutel. */
  ruleType: string | null;
  /** `evidence.pattern` — andere helft, en het label voor de gebruiker. */
  pattern: string | null;
}

/** Een regel die vandaag nog bestaat en dus te cureren is. */
export interface LiveRule {
  id: string;
  ruleType: string;
  pattern: string;
  kind: CuratableRuleKind;
  /**
   * De term zoals hij in de voiceguide staat. Vaak níet gelijk aan `pattern`:
   * de sync expandeert stem-varianten, dus de regel voor "exclusieve" hoort bij
   * de term "exclusief". Ontbreekt hij, dan is er geen werkende correctie.
   */
  sourceTerm?: string;
  /** Álle voiceguide-velden waarin `sourceTerm` voorkomt. */
  sourceFields?: Array<'wordsWeAvoid' | 'vocabularyDont' | 'antiPatterns'>;
  /** BLOCKING/ADVISORY (styleguide) of error/warning/info (BrandRule). */
  severity: string;
}

export interface RuleViolationStat {
  /** Stabiele sleutel: `<ruleType>::<pattern>` (lowercase). */
  key: string;
  /** De levende regel waar deze statistiek bij hoort. */
  rule: LiveRule;
  /** Aantal generaties waarin deze regel minstens één keer werd overtreden. */
  generationsHit: number;
  /** Totaal aantal generaties in het venster. */
  generationsTotal: number;
  /** `generationsHit / generationsTotal`, 0..1. */
  rate: number;
}

/**
 * Welke lane een violation komt uit. Beide lanes gebruiken dezelfde
 * `ruleType`-enum en kunnen hetzelfde pattern opleveren (een styleguide-regel
 * "vermijd 'luxe'" en `wordsWeAvoid: ['luxe']`), dus zonder de lane in de
 * sleutel klappen ze op elkaar en wint er stilzwijgend één — met een correctie
 * die de andere ongemoeid laat.
 */
export type ViolationLane = 'brandrule' | 'styleguide';

/** De lane die bij een ruleId hoort. */
export function laneOf(ruleId: string): ViolationLane {
  return ruleId.startsWith('styleguide:') ? 'styleguide' : 'brandrule';
}

/**
 * Sleutel waarop we aggregeren. Lowercase omdat de regel-matching zelf
 * case-insensitive is — "Luxe" en "luxe" zijn dezelfde regel.
 */
export function violationKey(
  lane: ViolationLane,
  ruleType: string,
  pattern: string,
): string {
  return `${lane}::${ruleType.trim().toLowerCase()}::${pattern.trim().toLowerCase()}`;
}

/**
 * `heuristic:*`-regels zijn de ingebouwde taal-heuristieken (superlatieven,
 * vage kwaliteit, fillers). Ze zijn veruit de meest overtreden, maar de
 * gebruiker kan ze niet cureren — ze horen bij contentcoaching, niet bij de
 * kwaliteit van de merkbibliotheek. R4 gaat over dat laatste.
 */
export function isCuratableViolation(row: ViolationRow): boolean {
  if (row.ruleId.startsWith('heuristic:')) return false;
  return Boolean(row.ruleType && row.pattern);
}

/**
 * Aggregeert findings naar per-regel overtredingspercentages.
 *
 * Alleen regels die **nog bestaan** leveren een statistiek op. Dat is niet
 * alleen netjes maar noodzakelijk: zonder die filter suggereren we een
 * aanpassing aan een regel die de gebruiker nergens kan vinden.
 *
 * @param rows            Findings uit het venster (mag heuristieken bevatten).
 * @param generationsTotal Aantal generaties in hetzelfde venster — de noemer.
 * @param liveRules       De regels die vandaag nog in de workspace staan.
 */
export function aggregateViolations(
  rows: readonly ViolationRow[],
  generationsTotal: number,
  liveRules: readonly LiveRule[],
): RuleViolationStat[] {
  if (generationsTotal <= 0) return [];

  const byKey = new Map<string, LiveRule>();
  for (const rule of liveRules) {
    const lane: ViolationLane =
      rule.kind === 'styleguide-rule' ? 'styleguide' : 'brandrule';
    const key = violationKey(lane, rule.ruleType, rule.pattern);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, rule);
      continue;
    }
    // Dezelfde term kan uit meerdere bronvelden gesynct zijn (`wordsWeAvoid`
    // én `vocabularyDont`) en levert dan twee rijen op. Eén ask is genoeg,
    // maar de correctie moet álle bronvelden opruimen — anders blijft de regel
    // vanuit het andere veld gewoon bestaan en komt de suggestie terug.
    const merged = new Set([...(existing.sourceFields ?? []), ...(rule.sourceFields ?? [])]);
    byKey.set(key, {
      ...existing,
      sourceTerm: existing.sourceTerm ?? rule.sourceTerm,
      sourceFields: merged.size > 0 ? [...merged] : undefined,
    });
  }

  /** key → set van generaties, zodat 3 hits in één generatie 1× telt. */
  const hits = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!isCuratableViolation(row)) continue;
    const key = violationKey(
      laneOf(row.ruleId),
      row.ruleType as string,
      row.pattern as string,
    );
    if (!byKey.has(key)) continue;
    let set = hits.get(key);
    if (!set) {
      set = new Set();
      hits.set(key, set);
    }
    set.add(row.generationId);
  }

  const stats: RuleViolationStat[] = [];
  for (const [key, generations] of hits) {
    stats.push({
      key,
      rule: byKey.get(key) as LiveRule,
      generationsHit: generations.size,
      generationsTotal,
      rate: generations.size / generationsTotal,
    });
  }

  return stats.sort((a, b) => b.rate - a.rate || a.key.localeCompare(b.key));
}

/**
 * Houdt alleen de statistieken over die de drempel halen.
 *
 * Drie voorwaarden, die elk andere ruis vangen:
 *  - `minGenerations` is een poort op het venster: bij 3 generaties valt er
 *    niets te concluderen, ongeacht de regel;
 *  - `minRate` zegt "botst structureel";
 *  - `minHits` voorkomt dat 2 treffers bij precies 10 generaties als "20% van
 *    je generaties" wordt gepresenteerd. Zonder deze derde was de tweede
 *    voorwaarde één globale poort in plaats van een eigenschap van de regel.
 *
 * `maxSignals` begrenst de uitkomst: één avoid-term expandeert naar meerdere
 * regels, dus zonder cap kan het kalibratie-paneel volstromen met suggesties en
 * zakken de review-asks eronder uit beeld.
 */
export function selectCurationSignals(
  stats: readonly RuleViolationStat[],
  opts: {
    minRate?: number;
    minGenerations?: number;
    minHits?: number;
    maxSignals?: number;
  } = {},
): RuleViolationStat[] {
  const minRate = opts.minRate ?? MIN_VIOLATION_RATE;
  const minGenerations = opts.minGenerations ?? MIN_GENERATIONS;
  const minHits = opts.minHits ?? MIN_HITS;
  const maxSignals = opts.maxSignals ?? MAX_SIGNALS;
  return stats
    .filter(
      (s) =>
        s.generationsTotal >= minGenerations &&
        s.generationsHit >= minHits &&
        s.rate >= minRate,
    )
    .slice(0, maxSignals);
}
