/**
 * C3 — generatieve pattern-keuze (verbeterplan 2026-08-07 §5 Fase C;
 * ADR docs/adr/2026-08-12-generative-pattern-choice.md).
 *
 * De copy-generator kiest per sectie een layout-pattern uit de C1-registry
 * (section-patterns.ts) via een ADDITIEF `layoutPatterns`-veld in de
 * structured output. Deze module levert de drie schakels rond dat veld:
 *
 *  1. {@link buildLayoutPatternPromptBlock} — het compacte LAYOUT-PATTERNS-
 *     prompt-blok per content-type, archetype-gefilterd via
 *     `allowedPatternsFor` (dezelfde bron als de C2-kiezer, dus prompt en
 *     validatie kunnen niet driften).
 *  2. {@link sanitizeVariantLayoutPatterns} — server-side validatie ná de
 *     Zod-parse. Zod bewaakt alleen de vorm (defense-in-depth, don't-break-
 *     parse); het archetype- + minItems-filter is dynamisch en kan dus niet
 *     in het statische schema. Ongeldige keys degraderen naar 'default'
 *     (console.warn, nooit een fail) — spiegel van resolveSectionPatternKey.
 *  3. {@link patternProp} — de mapper-helper die een gevalideerde key als
 *     `patternKey`-prop op de component-instance zet (alleen wanneer
 *     aanwezig; zonder layoutPatterns blijft de tree byte-identiek).
 *
 * Puur en dependency-arm (registry + LONG_FORM_SEO_TYPES) zodat generator
 * (server), mappers (client én server) en smokes dit kunnen importeren.
 */

import {
  allowedPatternsFor,
  resolveSectionPatternKey,
  SECTION_PATTERN_PROP,
} from "./section-patterns";
import { LONG_FORM_SEO_TYPES } from "../ai/seo-pipeline.types";
import type { PageVariantContent } from "./page-type-schemas";

// ─── Slots: layoutPatterns-veld ↔ sectie-type ↔ item-count ───

/** Eén kiesbaar layout-slot van een content-type. */
export interface PatternSlot {
  /** Veldnaam in `layoutPatterns` — sluit aan op de sectie-sleutels van het type-schema. */
  field: string;
  /** Sectie-type in SECTION_PATTERNS (bepaalt de toegestane keys). */
  sectionType: string;
  /** NL-omschrijving van de sectie voor het prompt-blok. */
  describe: string;
  /** Item-count uit de gegenereerde variant, voor de minItems-validatie. */
  itemCount: (variant: PageVariantContent) => number;
}

/** Veilige geneste property-lookup zonder casts naar concrete variant-shapes. */
function path(value: unknown, ...keys: string[]): unknown {
  let cur: unknown = value;
  for (const key of keys) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function len(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

/**
 * LP-slots (gelden ook voor comparison-page en onbekende types — die volgen
 * het LP-schema, zie getVariantSchemaForType). De trust-strip is bewust géén
 * slot: dat is een MVP-workaround-FeatureGrid, semantisch geen features-sectie.
 */
const LANDING_PAGE_SLOTS: readonly PatternSlot[] = [
  {
    field: "features",
    sectionType: "FeatureGrid",
    describe: "features-sectie",
    itemCount: (v) => len(path(v, "features", "items")),
  },
  {
    field: "testimonial",
    sectionType: "Testimonial",
    describe: "testimonial-sectie",
    itemCount: () => 1,
  },
  {
    field: "stats",
    sectionType: "StatsBlock",
    describe: "impact-stats-sectie",
    itemCount: (v) => len(path(v, "socialProof", "impactStats")),
  },
  {
    field: "faq",
    sectionType: "FAQ",
    describe: "FAQ-sectie",
    itemCount: (v) => len(path(v, "faq", "items")),
  },
  {
    field: "finalCta",
    sectionType: "BrandCTA",
    describe: "afsluitende CTA",
    itemCount: () => 1,
  },
];

const PRODUCT_PAGE_SLOTS: readonly PatternSlot[] = [
  {
    field: "features",
    sectionType: "FeatureGrid",
    describe: "features-sectie",
    itemCount: (v) => len(path(v, "features")),
  },
  {
    field: "faq",
    sectionType: "FAQ",
    describe: "FAQ-sectie",
    itemCount: (v) => len(path(v, "faq")),
  },
  {
    field: "finalCta",
    sectionType: "BrandCTA",
    describe: "afsluitende CTA",
    itemCount: () => 1,
  },
];

const FAQ_PAGE_SLOTS: readonly PatternSlot[] = [
  {
    field: "popularQuestions",
    sectionType: "FAQ",
    describe: "populaire-vragen-blok",
    itemCount: (v) => len(path(v, "popularQuestions")),
  },
  {
    field: "categories",
    sectionType: "FAQ",
    describe: "categorie-blokken (zelfde layout voor álle categorieën)",
    // Eén key stuurt alle categorie-blokken; valideer tegen de KLEINSTE
    // categorie zodat minItems (two-column ≥4) voor elk blok klopt.
    itemCount: (v) => {
      const cats = path(v, "categories");
      if (!Array.isArray(cats) || cats.length === 0) return 0;
      return Math.min(...cats.map((c) => len(path(c, "items"))));
    },
  },
  {
    field: "closingCta",
    sectionType: "BrandCTA",
    describe: "afsluitende CTA",
    itemCount: () => 1,
  },
];

/** Microsite: StatsBlock-callouts dragen 1 stat (cards vraagt ≥2) → geen slot. */
const MICROSITE_SLOTS: readonly PatternSlot[] = [
  {
    field: "quote",
    sectionType: "Testimonial",
    describe: "hoofdstuk-citaten (zelfde layout voor álle quotes)",
    itemCount: () => 1,
  },
  {
    field: "join",
    sectionType: "BrandCTA",
    describe: "join/deelname-CTA",
    itemCount: () => 1,
  },
];

/**
 * Slot-dispatch per content-type — spiegelt getVariantSchemaForType zodat
 * prompt, schema en validatie dezelfde velden zien. Long-form GEO heeft geen
 * pattern-dragende mapper-componenten → geen slots.
 */
export function patternSlotsFor(
  contentType: string | null | undefined,
): readonly PatternSlot[] {
  if (contentType && LONG_FORM_SEO_TYPES.has(contentType)) return [];
  switch (contentType) {
    case "faq-page":
      return FAQ_PAGE_SLOTS;
    case "product-page":
      return PRODUCT_PAGE_SLOTS;
    case "microsite":
      return MICROSITE_SLOTS;
    default:
      return LANDING_PAGE_SLOTS;
  }
}

// ─── Prompt-blok ─────────────────────────────────────────────

/**
 * 1-regel-betekenis per pattern voor het prompt-blok (wanneer-kies-je-dit).
 * De registry draagt NL-kiezer-labels; deze map draagt de generator-uitleg.
 * Onbekende keys (nieuwere registry) vallen terug op het registry-label.
 * Bewust ZONDER em-dashes: het prompt mag ze niet primen (HVD no-priming,
 * bewaakt door de page-types-w4-smoke op het OFF-prompt).
 */
const PATTERN_MEANINGS: Record<string, Record<string, string>> = {
  FeatureGrid: {
    default: "rustig raster van gelijkwaardige kaarten, voor 3-4 even zware items",
    alternating: "om-en-om beeld/tekst-rijen (editorial), voor verhalende features met een volgorde",
    bento: "asymmetrisch raster met één uitgelichte grote kaart, voor één feature die eruit springt",
  },
  Testimonial: {
    default: "gecentreerd enkel citaat, rustig en universeel",
    wall: "citaat als card op een wand-achtergrond, geeft het bewijs meer massa",
    spotlight: "oversized editorial pull-quote, maximale nadruk op één sterke uitspraak",
  },
  BrandCTA: {
    default: "gecentreerde banner op merk-tint, de klassieke afsluiter",
    split: "tekst links, knop rechts; zakelijk en compact",
    card: "omkaderde kaart op neutrale achtergrond, ingetogen slot",
  },
  FAQ: {
    default: "accordeon in één kolom, beste leesbaarheid bij lange antwoorden",
    "two-column": "accordeon-items in twee kolommen, compacter bij veel korte vragen",
  },
  StatsBlock: {
    default: "rij cijfers met scheidingslijnen, strak en aaneengesloten",
    cards: "elk cijfer in een eigen omkaderde kaart, geeft losse cijfers meer gewicht",
  },
};

/**
 * Bouwt het compacte LAYOUT-PATTERNS-blok voor het system-prompt van dit
 * content-type. Archetype filtert hard via `allowedPatternsFor` (itemCount =
 * MAX_SAFE_INTEGER: content bestaat op prompt-moment nog niet — minItems
 * staat als voorwaarde in de regel en wordt ná generatie afgedwongen door
 * {@link sanitizeVariantLayoutPatterns}). Slots met maar één toegestaan
 * pattern worden overgeslagen (geen keuze = geen prompt-ruis); geen enkel
 * slot met keuze → lege string (het prompt blijft dan byte-identiek).
 *
 * Vorm-contract met de prompt-templates: begint met `\n` en eindigt op `\n`,
 * zodat `}\n${blok}\n# KRITISCHE REGELS` bij een leeg blok exact de oude
 * `}\n\n# KRITISCHE REGELS`-bytes oplevert.
 */
export function buildLayoutPatternPromptBlock(
  contentType: string | null | undefined,
  archetype: string | null,
): string {
  const slots = patternSlotsFor(contentType);
  const fieldNames: string[] = [];
  const lines: string[] = [];
  for (const slot of slots) {
    const allowed = allowedPatternsFor(slot.sectionType, archetype, Number.MAX_SAFE_INTEGER);
    if (allowed.length < 2) continue;
    fieldNames.push(`"${slot.field}": "..."`);
    const options = allowed.map((def) => {
      const meaning = PATTERN_MEANINGS[slot.sectionType]?.[def.key] ?? def.label;
      const minClause = def.minItems && def.minItems > 1 ? ` (alleen bij ${def.minItems}+ items)` : "";
      return `'${def.key}' = ${meaning}${minClause}`;
    });
    lines.push(`- "${slot.field}" (${slot.describe}): ${options.join(" | ")}`);
  }
  if (lines.length === 0) return "";
  // Geen em-dashes in dit blok (HVD no-priming; page-types-w4 bewaakt het).
  return `
# LAYOUT-PATTERNS (kies per sectie een layout, onderdeel van je JSON-output)
Voeg aan het JSON-object een top-level veld "layoutPatterns" toe: { ${fieldNames.join(", ")} }.
Toegestane keys per sectie (kies UITSLUITEND uit deze lijst; een veld weglaten = 'default'):
${lines.join("\n")}
Kies per sectie het pattern dat bij de CONTENT past (3-4 gelijkwaardige items → een raster/rij; verhalende content met volgorde → een alternerende/editorial vorm; één uitspringend element → een uitgelicht pattern) én dat je creative angle/invalshoek versterkt.
VARIEER: deze pagina is één variant in een batch die NAAST ELKAAR vergeleken wordt. Varianten horen ook in LAYOUT te verschillen, niet alleen in copy. Kies dus een uitgesproken pattern-combinatie die bij JOUW invalshoek past i.p.v. overal het veilige 'default'. Ongeldige keys vallen server-side terug op 'default'; gok niet buiten de lijst.
`;
}

// ─── Server-side validatie (ná Zod-parse) ────────────────────

/**
 * Leest het `layoutPatterns`-object union-veilig uit een variant (lege map
 * wanneer afwezig/ongeldig) — voor de §7 pattern-spreiding-log in de route.
 */
export function variantLayoutPatterns(
  variant: PageVariantContent,
): Record<string, string> {
  const raw = path(variant, "layoutPatterns");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.length > 0) out[key] = value;
  }
  return out;
}

/**
 * Valideer elke gekozen pattern-key tegen `allowedPatternsFor(sectionType,
 * archetype, itemCount)` — Zod-defense-in-depth is niet genoeg omdat het
 * archetype-filter dynamisch is. Ongeldig (onbekende key, archetype-restrictie,
 * minItems niet gehaald) → 'default' + console.warn; nooit een fail. Velden
 * buiten de slot-lijst van dit type vallen weg. Zonder `layoutPatterns` (alle
 * bestaande/legacy variants) is dit een no-op.
 */
export function sanitizeVariantLayoutPatterns(
  variant: PageVariantContent,
  contentType: string | null | undefined,
  archetype: string | null,
): PageVariantContent {
  const slots = patternSlotsFor(contentType);
  const raw = path(variant, "layoutPatterns");
  if (slots.length === 0 || !raw || typeof raw !== "object" || Array.isArray(raw)) {
    return variant;
  }
  const sanitized: Record<string, string> = {};
  for (const slot of slots) {
    const value = (raw as Record<string, unknown>)[slot.field];
    if (typeof value !== "string" || value.length === 0) continue;
    const allowed = allowedPatternsFor(slot.sectionType, archetype, slot.itemCount(variant));
    if (allowed.some((def) => def.key === value)) {
      sanitized[slot.field] = value;
    } else {
      sanitized[slot.field] = "default";
      console.warn(
        `[pattern-choice] ongeldige key '${value}' voor ${slot.field} (${slot.sectionType}, archetype=${archetype ?? "null"}, items=${slot.itemCount(variant)}) → 'default'`,
      );
    }
  }
  return { ...variant, layoutPatterns: sanitized } as PageVariantContent;
}

// ─── Mapper-helper ───────────────────────────────────────────

/**
 * Spread-baar `patternKey`-prop-fragment voor de from-structured-builders:
 * `instance("FAQ", { items, ...patternProp("FAQ", v.layoutPatterns?.faq) })`.
 * Zonder key (undefined/leeg) → leeg object, zodat bestaande trees byte-
 * identiek blijven (C1-contract). Met key → genormaliseerd via
 * resolveSectionPatternKey (onbekend → 'default') als goedkoop vangnet voor
 * variants die buiten het gevalideerde generatie-pad om zijn beland.
 */
export function patternProp(
  sectionType: string,
  key: string | null | undefined,
): { [SECTION_PATTERN_PROP]?: string } {
  if (typeof key !== "string" || key.length === 0) return {};
  return { [SECTION_PATTERN_PROP]: resolveSectionPatternKey(sectionType, key) };
}
