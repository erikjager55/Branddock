/**
 * Eigen sectie-tree-datamodel voor de webpage-builder (E1, ADR
 * 2026-08-07-puck-exit-sectie-editor). Structureel identiek aan de
 * `puckData`-JSON die al in `Deliverable.settings.puckData` en
 * `LandingPage.puckData` staat — bestaande data blijft byte-voor-byte
 * geldig, dit bestand vervangt alleen het `Data`-type uit
 * `@puckeditor/core` zodat de dependency het datamodel niet meer bezit.
 *
 * Registry-contract (marktpatroon Makeswift/Plasmic/Storyblok):
 * sectie-type-id's zijn STABIEL — een id die ooit in gepersisteerde
 * puckData heeft gestaan mag nooit hernoemd of verwijderd worden zonder
 * load-time-migratie. Nieuwe secties: id toevoegen aan
 * {@link SECTION_TYPE_IDS} + component-registratie in `puck-config.tsx`
 * (zie canvas/medium/README.md).
 */

/** Eén sectie-instantie in de content-array. */
export interface PageContentItem<
  TType extends string = string,
  TProps extends object = Record<string, unknown>,
> {
  type: TType;
  props: TProps & { id?: string };
  /** Puck-legacy veld (per-veld readonly-markering) — genegeerd door de eigen render. */
  readOnly?: Record<string, boolean>;
}

/** Discriminated union over een component-props-map ({ BrandHero: {…}, … }). */
export type PageContentOf<TComponents extends Record<string, object>> = {
  [K in keyof TComponents & string]: PageContentItem<K, TComponents[K]>;
}[keyof TComponents & string];

/**
 * De sectie-tree van één pagina. Vorm-compatibel met Pucks `Data<Props>`
 * (root.props + platte content-array; `zones` bestaat in legacy-data maar
 * wordt door Branddock niet gebruikt — geen nested dropzones, bewust).
 */
export interface PageData<
  TComponents extends Record<string, object> = Record<string, Record<string, unknown>>,
> {
  root?: { props?: Record<string, unknown> } & Record<string, unknown>;
  content: Array<PageContentOf<TComponents>>;
  zones?: Record<string, Array<PageContentItem>>;
}

/**
 * Versie van het sectie-registry-contract. Ophogen bij een breaking change
 * aan een sectie-schema (hernoemd/verwijderd veld) — de bijbehorende
 * load-time-migratie hoort in dezelfde commit (Plasmic-patroon: renames en
 * deleties zijn per definitie breaking voor gepersisteerde trees).
 */
export const SECTION_REGISTRY_VERSION = 1;

/**
 * Stabiele sectie-type-id's — de canonieke lijst van wat in puckData's
 * `content[].type` mag staan. Gespiegeld aan de component-registratie in
 * `buildSpikePuckConfig` (canvas/medium/puck-config.tsx); de smoke-suite
 * bewaakt dat beide lijsten synchroon blijven.
 */
export const SECTION_TYPE_IDS = [
  'BrandHero',
  'FeatureSplit',
  'BrandCTA',
  'FeatureGrid',
  'Testimonial',
  'PricingTable',
  'FAQ',
  'Footer',
  'RichText',
  'StickyCtaBar',
  'StatsBlock',
  'BrandNav',
  'SpecTable',
  'AnchorNav',
  'StoryChapter',
  'HighlightCards',
  'ComparisonTable',
  'Listicle',
] as const;

export type SectionTypeId = (typeof SECTION_TYPE_IDS)[number];

const SECTION_TYPE_ID_SET: ReadonlySet<string> = new Set(SECTION_TYPE_IDS);

export function isKnownSectionType(type: string): type is SectionTypeId {
  return SECTION_TYPE_ID_SET.has(type);
}

/**
 * Structurele validatie van een onbekende waarde als PageData. Bewust
 * shape-only (geen per-prop-schema's — die leven per sectie als Zod in de
 * AI-tool-laag): dit is de goedkope guard voor load-/write-paden.
 * Onbekende sectie-types zijn een WAARSCHUWING, geen fout — forward-compat
 * met data uit een nieuwere registry-versie (render slaat ze over).
 */
export function validatePageDataShape(value: unknown): {
  ok: boolean;
  errors: string[];
  unknownTypes: string[];
} {
  const errors: string[] = [];
  const unknownTypes: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['pageData is geen object'], unknownTypes };
  }
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.content)) {
    errors.push('content ontbreekt of is geen array');
  } else {
    data.content.forEach((item, i) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`content[${i}] is geen object`);
        return;
      }
      const { type, props } = item as Record<string, unknown>;
      if (typeof type !== 'string' || type.length === 0) {
        errors.push(`content[${i}].type ontbreekt`);
      } else if (!SECTION_TYPE_ID_SET.has(type)) {
        unknownTypes.push(type);
      }
      if (props !== undefined && (typeof props !== 'object' || props === null || Array.isArray(props))) {
        errors.push(`content[${i}].props is geen object`);
      }
    });
  }
  return { ok: errors.length === 0, errors, unknownTypes };
}
