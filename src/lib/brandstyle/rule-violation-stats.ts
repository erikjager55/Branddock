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
  /**
   * Wanneer de regel is aangemaakt. Bepaalt de noemer: een regel kan niet
   * overtreden zijn in generaties van vóór zijn bestaan, dus die tellen niet
   * mee. Zonder deze grens scoort een verse regel die in álle recente
   * generaties botst alsnog een paar procent en surfacet hij nooit.
   */
  createdAt: Date;
  /**
   * Beperkt de regel tot bepaalde content-types (BrandRule). Leeg/afwezig =
   * geldt overal. Generaties van een ander type horen niet in de noemer.
   */
  contentTypeFilter?: string[];
}

/** Eén generatie in het venster. */
export interface WindowGeneration {
  id: string;
  scoredAt: Date;
  /**
   * Het content-type van de deliverable. Alleen gevuld wanneer minstens één
   * levende regel een `contentTypeFilter` heeft — anders is de join gratis
   * vermeden en is dit veld `undefined`.
   */
  contentType?: string | null;
}

export interface RuleViolationStat {
  /** Stabiele sleutel: `<ruleType>::<pattern>` (lowercase). */
  key: string;
  /** De levende regel waar deze statistiek bij hoort. */
  rule: LiveRule;
  /** Aantal generaties waarin deze regel minstens één keer werd overtreden. */
  generationsHit: number;
  /**
   * De noemer voor déze regel: generaties uit het venster waarin de regel
   * überhaupt van toepassing kón zijn (bestond al én, bij een filter, het
   * juiste content-type). Niet gelijk aan de venstergrootte.
   */
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
 * De noemer is **per regel**, niet per venster. Een regel kan niet overtreden
 * zijn in generaties van vóór zijn bestaan, en een regel met een
 * `contentTypeFilter` niet in generaties van een ander type. Beide meetellen
 * verwatert het percentage precies daar waar het signaal het scherpst hoort te
 * zijn: bij een net toegevoegde of net gecureerde regel.
 *
 * @param rows      Findings uit het venster (mag heuristieken bevatten).
 * @param window    De generaties in het venster, met hun tijdstip.
 * @param liveRules De regels die vandaag nog in de workspace staan.
 */
export function aggregateViolations(
  rows: readonly ViolationRow[],
  window: readonly WindowGeneration[],
  liveRules: readonly LiveRule[],
): RuleViolationStat[] {
  if (window.length === 0) return [];

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

  /** De nieuwste generatie — de ijkpunt voor de artefact-test hieronder. */
  const newestInWindow = window.reduce(
    (max, g) => (g.scoredAt > max ? g.scoredAt : max),
    window[0].scoredAt,
  );

  const stats: RuleViolationStat[] = [];
  for (const [key, generations] of hits) {
    const rule = byKey.get(key) as LiveRule;
    // De generaties waarin déze regel van toepassing kón zijn.
    const eligible = eligibleGenerations(rule, window, newestInWindow);
    if (eligible.size === 0) continue;
    // Treffers óók begrenzen: een filter kan ná de eerste overtredingen zijn
    // toegevoegd, en die oude treffers horen dan niet meer mee te tellen.
    let hitCount = 0;
    for (const g of generations) if (eligible.has(g)) hitCount++;
    if (hitCount === 0) continue;

    stats.push({
      key,
      rule,
      generationsHit: hitCount,
      generationsTotal: eligible.size,
      rate: hitCount / eligible.size,
    });
  }

  return stats.sort((a, b) => b.rate - a.rate || a.key.localeCompare(b.key));
}

/**
 * Vanaf wanneer telt deze regel mee?
 *
 * `rule.createdAt` lijkt het antwoord maar liegt vaak: zowel `brand-rule-sync`
 * als `rule-structurer` doen `deleteMany` + `createMany`, dus élke sync zet de
 * datum op vandaag. Op de huidige data dragen alle 398 regels een datum die ná
 * de nieuwste generatie ligt.
 *
 * Dát is precies de test. Een regel kan niet zijn aangemaakt ná de data waarin
 * hij overtredingen heeft; ligt `createdAt` na de nieuwste generatie, dan is de
 * datum aantoonbaar een sync-artefact en negeren we hem. Anders is hij
 * bruikbaar en begrenst hij de noemer.
 *
 * Bewust NIET afgeleid uit de treffers zelf: dan zou de noemer per definitie
 * bij de eerste overtreding beginnen en het percentage systematisch omhoog
 * buigen — een regel met 3 treffers zou hoger scoren dan dezelfde regel met 4.
 * De grens hangt alleen van het venster af, niet van wat we meten.
 *
 * Zodra de syncs `createdAt` bewaren (zie `brand-rule-sync`) wordt deze grens
 * vanzelf actief voor nieuwe regels.
 */
function effectiveStart(rule: LiveRule, newestInWindow: Date): Date | null {
  if (rule.createdAt > newestInWindow) return null; // artefact — geen grens
  return rule.createdAt;
}

/**
 * De generatie-ids waarin een regel van toepassing kón zijn.
 *
 * Twee grenzen: de regel moet al bestaan hebben, en bij een `contentTypeFilter`
 * moet het content-type kloppen. Is het content-type niet geladen (omdat geen
 * enkele regel een filter heeft), dan telt de generatie gewoon mee — de guard
 * in de route zorgt dat dat alleen gebeurt wanneer er niets te filteren valt.
 */
function eligibleGenerations(
  rule: LiveRule,
  window: readonly WindowGeneration[],
  newestInWindow: Date,
): Set<string> {
  const filter = rule.contentTypeFilter;
  const hasFilter = Array.isArray(filter) && filter.length > 0;
  const wanted = hasFilter ? new Set(filter.map((t) => t.trim().toLowerCase())) : null;
  const start = effectiveStart(rule, newestInWindow);

  const out = new Set<string>();
  for (const g of window) {
    if (start && g.scoredAt < start) continue;
    if (wanted) {
      if (g.contentType == null) continue;
      if (!wanted.has(g.contentType.trim().toLowerCase())) continue;
    }
    out.add(g.id);
  }
  return out;
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
    /**
     * Sleutels die de gebruiker heeft weggeklikt. De sleutel bevat het
     * pattern, dus zodra de regel wordt aangepast verandert de sleutel en komt
     * de suggestie vanzelf terug — wegklikken bevriest deze regel in deze
     * vorm, niet het onderwerp.
     */
    dismissedKeys?: readonly string[];
  } = {},
): RuleViolationStat[] {
  const minRate = opts.minRate ?? MIN_VIOLATION_RATE;
  const minGenerations = opts.minGenerations ?? MIN_GENERATIONS;
  const minHits = opts.minHits ?? MIN_HITS;
  const maxSignals = opts.maxSignals ?? MAX_SIGNALS;
  const dismissed = new Set(opts.dismissedKeys ?? []);
  return stats
    .filter(
      (s) =>
        !dismissed.has(s.key) &&
        s.generationsTotal >= minGenerations &&
        s.generationsHit >= minHits &&
        s.rate >= minRate,
    )
    .slice(0, maxSignals);
}
