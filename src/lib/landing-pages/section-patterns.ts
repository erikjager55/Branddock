/**
 * Sectie-patroonbibliotheek (C1, verbeterplan 2026-08-07 §5 Fase C) — het
 * gegeneraliseerde equivalent van het hero-pattern-mechanisme
 * (`HeroPatternKey` + `pickHeroLayout` in brand-render-rules.ts), maar dan
 * als registry per sectie-type: elke sectie kan meerdere layout-patronen
 * renderen, gekozen via de instance-prop {@link SECTION_PATTERN_PROP}
 * (`patternKey`) op de sectie in `puckData.content[]`.
 *
 * Contract:
 *  - `'default'` is per type ALTIJD aanwezig en betekent: het bestaande
 *    render-gedrag. Een instance ZONDER `patternKey` (alle bestaande
 *    puckData) rendert byte-gelijk aan `patternKey: 'default'` — dat is
 *    het backward-compat-acceptatiecriterium van C1. Onbekende keys
 *    (nieuwere registry-versie) vallen óók terug op default (forward-compat,
 *    zelfde filosofie als validatePageDataShape).
 *  - Archetype-fit (`archetypes`) is gegrond in de geest van
 *    RENDER_CONSTRAINTS_BY_ARCHETYPE (render-constraints.ts): patterns die
 *    op cards/shadow/asymmetrie leunen zijn beperkt tot archetypen met
 *    `allowShadow: 'medium'` (+ CREATOR, die in pickCardStyle als playful
 *    strong-shadow geldt). Leeg/afwezig = alle archetypen. Een NIET
 *    geclassificeerd merk (archetype null) krijgt alleen onbeperkte
 *    patterns — restricties vragen positieve evidence.
 *  - `minItems` is een content-eis: de kiezer (C2) toont het pattern
 *    uitgegrijsd mét reden zolang de sectie te weinig items draagt;
 *    `allowedPatternsFor` filtert hard (voor generatie/C3).
 *
 * Puur en dependency-arm (alleen het BrandArchetype-type) zodat zowel
 * server (puck-config renders, C3-generatie) als client (swap-popover,
 * sectie-editor) dit kunnen importeren.
 */
import type { BrandArchetype } from './brand-archetype-classifier';

/** Losse key-vorm voor persistentie/props; per sectie-type bestaat hieronder een eigen union. */
export type SectionPatternKey = string;

export type FeatureGridPatternKey = 'default' | 'alternating' | 'bento';
export type TestimonialPatternKey = 'default' | 'wall' | 'spotlight';
export type BrandCtaPatternKey = 'default' | 'split' | 'card';
export type FaqPatternKey = 'default' | 'two-column';
export type StatsBlockPatternKey = 'default' | 'cards';

/** Eén layout-patroon van een sectie-type. */
export interface SectionPatternDefinition {
  /** Stabiel, kebab-case (bv. 'grid', 'alternating', 'bento'). */
  key: string;
  /** NL-label voor de kiezer (registry = de enige label-catalogus, geen i18n-dubbel). */
  label: string;
  /** Archetype-fit: welke brand-archetypen dit pattern mogen gebruiken; leeg = alle. */
  archetypes?: readonly string[];
  /** Content-eisen (bv. min aantal features) — de kiezer grijst uit met reden. */
  minItems?: number;
}

/** De prop op de sectie-instance die het gekozen pattern draagt. */
export const SECTION_PATTERN_PROP = 'patternKey' as const;

/**
 * Archetypen die visueel gewicht (shadow-cards, asymmetrie, drama) kunnen
 * dragen: `allowShadow: 'medium'` in RENDER_CONSTRAINTS_BY_ARCHETYPE, plus
 * CREATOR (pickCardStyle rekent JESTER/CREATOR tot playful strong-shadow).
 * Ingetogen archetypen (RULER none/flat; SAGE/CARETAKER/INNOCENT/REGULAR_GUY
 * subtle) vallen buiten dramatische patterns.
 */
const SHADOW_TOLERANT_ARCHETYPES: readonly BrandArchetype[] = [
  'MAGICIAN', 'LOVER', 'EXPLORER', 'HERO', 'OUTLAW', 'JESTER', 'CREATOR',
];

/**
 * Alle archetypen behalve RULER: diens constraints (`allowShadow: 'none'` +
 * `forceFlatCards`) beschrijven een vlakke typografie-esthetiek waar losse
 * omkaderde kaartjes niet in passen.
 */
const NON_FLAT_ARCHETYPES: readonly BrandArchetype[] = [
  'INNOCENT', 'EXPLORER', 'SAGE', 'HERO', 'OUTLAW', 'MAGICIAN',
  'REGULAR_GUY', 'LOVER', 'JESTER', 'CARETAKER', 'CREATOR',
];

/**
 * Registry: patterns per sectie-type. Alleen sectie-types die in
 * SECTION_TYPE_IDS (page-data.ts) bestaan; de phase54-smoke bewaakt die
 * sync. Per pattern in 1 regel de archetype-rationale.
 */
export const SECTION_PATTERNS: Record<string, readonly SectionPatternDefinition[]> = {
  FeatureGrid: [
    // default: het bestaande raster — neutraal, elk archetype draagt het.
    { key: 'default', label: 'Raster' },
    // alternating: editorial A-B-A-B rijen (FeatureSplit-stijl) — puur
    // whitespace + typografie, veilig voor elk archetype; 1 rij is geen ritme.
    { key: 'alternating', label: 'Om-en-om (beeld/tekst)', minItems: 2 },
    // bento: asymmetrisch shadow-card-raster — alleen archetypen die
    // shadow/speels aankunnen (allowShadow medium + playful CREATOR).
    { key: 'bento', label: 'Bento-raster', archetypes: SHADOW_TOLERANT_ARCHETYPES, minItems: 3 },
  ],
  Testimonial: [
    // default: gecentreerd enkel citaat — het bestaande gedrag, universeel.
    { key: 'default', label: 'Enkel citaat' },
    // wall: card-presentatie (testimonial-wall-esthetiek) — card volgt de
    // brand-tokens, dus veilig voor elk archetype. NB: de props dragen 1
    // quote; wall rendert die als 1 wall-card (groot + subtiel) — een échte
    // multi-quote wand vraagt een quotes-array (C3-terrein).
    { key: 'wall', label: 'Citaten-wand' },
    // spotlight: oversized editorial pull-quote — klassiek premium-editorial
    // middel, werkt van SAGE tot JESTER (alleen typografie-schaal).
    { key: 'spotlight', label: 'Spotlight-citaat' },
  ],
  BrandCTA: [
    // default: de bestaande gecentreerde banner-panel — universeel.
    { key: 'default', label: 'Banner' },
    // split: tekst links, knop rechts — layout-only, geen extra decoratie,
    // dus veilig voor elk archetype.
    { key: 'split', label: 'Gesplitst (tekst | knop)' },
    // card: omkaderde surface-kaart i.p.v. brand-tint-panel — border-only
    // afbakening past elk archetype (ook flat-liefhebbers als RULER).
    { key: 'card', label: 'Kaart (omkaderd)' },
  ],
  FAQ: [
    // default: het bestaande accordeon — universeel.
    { key: 'default', label: 'Accordeon' },
    // two-column: 2-koloms grid van dezelfde accordeon-items — layout-only,
    // elk archetype; onder 4 items blijft een kolom halfleeg.
    { key: 'two-column', label: 'Twee kolommen', minItems: 4 },
  ],
  StatsBlock: [
    // default: de bestaande rij met scheidingslijnen — universeel.
    { key: 'default', label: 'Rij' },
    // cards: elk cijfer in een eigen omkaderde kaart — niet voor RULER
    // (allowShadow none + forceFlatCards: vlakke typografie, geen kaartjes).
    { key: 'cards', label: 'Kaarten', archetypes: NON_FLAT_ARCHETYPES, minItems: 2 },
  ],
};

/** Heeft dit sectie-type meer dan alleen het default-pattern? (→ toon de swap-knop, C2) */
export function sectionHasPatterns(sectionType: string): boolean {
  return (SECTION_PATTERNS[sectionType]?.length ?? 0) > 1;
}

/**
 * Normaliseer een instance-`patternKey` naar een geldige registry-key.
 * Afwezig, leeg of onbekend → 'default' (backward- én forward-compat: een
 * tree uit een nieuwere registry-versie rendert als default i.p.v. te breken).
 */
export function resolveSectionPatternKey(sectionType: string, raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) return 'default';
  const defs = SECTION_PATTERNS[sectionType];
  return defs?.some((d) => d.key === raw) ? raw : 'default';
}

/** NL-label van een pattern-key (voor badges/kiezer); null wanneer onbekend. */
export function patternLabelFor(sectionType: string, key: string): string | null {
  return SECTION_PATTERNS[sectionType]?.find((d) => d.key === key)?.label ?? null;
}

function archetypeAllows(def: SectionPatternDefinition, archetype: string | null): boolean {
  if (!def.archetypes || def.archetypes.length === 0) return true;
  // Restricties vragen positieve evidence: zonder geclassificeerd archetype
  // geen dramatische patterns (conservatief, spiegel van DEFAULT_RENDER_CONSTRAINTS).
  return archetype !== null && def.archetypes.includes(archetype);
}

/**
 * Harde filter: patterns die deze sectie NU mag gebruiken — archetype-fit
 * én content-eis (minItems) beide vervuld. Dit is de programmatische lijst
 * (C3-generatie, validatie); de UI-kiezer gebruikt {@link listPatternOptions}
 * zodat minItems-gefaalde patterns uitgegrijsd mét reden zichtbaar blijven.
 */
export function allowedPatternsFor(
  sectionType: string,
  archetype: string | null,
  itemCount: number,
): SectionPatternDefinition[] {
  const defs = SECTION_PATTERNS[sectionType] ?? [];
  return defs.filter(
    (def) => archetypeAllows(def, archetype) && itemCount >= (def.minItems ?? 0),
  );
}

/** Eén kiezer-optie: definitie + of hij nu toepasbaar is (en zo niet, waarom). */
export interface SectionPatternOption {
  definition: SectionPatternDefinition;
  enabled: boolean;
  /** 'min-items' = te weinig content-items; de UI toont de reden bij uitgrijzen. */
  disabledReason: 'min-items' | null;
}

/**
 * Kiezer-lijst voor de swap-UI (C2): archetype filtert hard (off-brand
 * patterns bestaan voor dit merk simpelweg niet), minItems filtert zacht —
 * het pattern blijft zichtbaar maar uitgegrijsd met reden, zodat de user
 * weet dat méér items het ontgrendelen.
 */
export function listPatternOptions(
  sectionType: string,
  archetype: string | null,
  itemCount: number,
): SectionPatternOption[] {
  const defs = SECTION_PATTERNS[sectionType] ?? [];
  return defs
    .filter((def) => archetypeAllows(def, archetype))
    .map((def) => {
      const meetsMin = itemCount >= (def.minItems ?? 0);
      return {
        definition: def,
        enabled: meetsMin,
        disabledReason: meetsMin ? null : ('min-items' as const),
      };
    });
}

/**
 * Content-item-telling per sectie-type voor de minItems-check: de
 * array-prop die het pattern visueel vult. Types zonder repeterende
 * content (Testimonial/BrandCTA dragen 1 blok) tellen als 1.
 */
export function sectionPatternItemCount(
  sectionType: string,
  props: Record<string, unknown> | undefined | null,
): number {
  if (!props) return 0;
  const arrayLen = (v: unknown): number | null => (Array.isArray(v) ? v.length : null);
  switch (sectionType) {
    case 'FeatureGrid':
      return arrayLen(props.features) ?? 0;
    case 'FAQ':
    case 'StatsBlock':
      return arrayLen(props.items) ?? 0;
    default:
      return 1;
  }
}

/**
 * Select-opties voor het `patternKey`-veld in de component-fields-metadata
 * (puck-config) — zo verschijnt de kiezer automatisch in het E2-props-paneel.
 * Bewust ONGEFILTERD op archetype: de fields-metadata is statisch per
 * config-build; de archetype-bewuste kiezer is de C2-popover. De render
 * normaliseert een niet-passende keuze nooit weg (user-intent blijft staan),
 * hij rendert hem gewoon — off-brand kiezen kan alleen via dit paneel en is
 * een bewuste handeling.
 */
export function patternFieldOptions(
  sectionType: string,
): Array<{ label: string; value: string }> {
  return (SECTION_PATTERNS[sectionType] ?? []).map((def) => ({
    label: def.label,
    value: def.key,
  }));
}
