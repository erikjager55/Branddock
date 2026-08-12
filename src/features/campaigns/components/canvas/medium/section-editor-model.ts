/**
 * Pure hulplogica voor de eigen sectie-editor (E2, ADR
 * 2026-08-07-puck-exit-sectie-editor) — bewust hook-vrij zodat de
 * smoke-suite (web-page-builder-phase53-section-editor) dit zonder
 * React/DOM kan draaien:
 *
 *  - {@link sectionListLabel}: sectie-lijst-label (type + eerste tekstregel).
 *  - {@link fieldsToPanelModel}: `fields`-metadata uit puck-config →
 *    renderbaar paneel-model (text/textarea/select/radio/number/array/custom).
 *  - {@link addDefaultsForType}: default-props voor "Sectie toevoegen"
 *    (template-helpers-factory waar die bestaat, registry-defaultProps als
 *    fallback, anders lege props).
 *  - {@link reorderOperations}: drag-drop-doelindex → batch move-operaties
 *    voor de section-edit-tools-kernel (één waarheid voor guards).
 */
import type { ReactNode } from 'react';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { StructureOperation } from '@/lib/landing-pages/section-edit-tools';
import {
  defaultBrandCta,
  defaultBrandHero,
  defaultFaq,
  defaultFeatureGrid,
  defaultFooter,
  defaultPricingTable,
  defaultRichText,
  defaultTestimonial,
  type FilledFields,
} from './puck-templates/template-helpers';

// ─── Registry-metadata (structurele shape van puck-config `fields`) ─────

/**
 * Structurele shape van één veld-definitie in `buildSpikePuckConfig`.
 * Bewust een eigen (losse) type i.p.v. Pucks `Field`-type: de editor mag
 * niet aan `@puckeditor/core` hangen (E3 verwijdert de dependency). De
 * `never`-parameters maken élke concrete config-functie contravariant
 * toewijsbaar zonder `any` (zelfde rationale als page-render.tsx).
 */
export interface SectionFieldMeta {
  type: string;
  options?: ReadonlyArray<{ label: string; value: string | number | boolean }>;
  arrayFields?: Record<string, SectionFieldMeta>;
  defaultItemProps?: Record<string, unknown>;
  getItemSummary?: (item: never, index?: number) => string;
  render?: (props: {
    value?: unknown;
    onChange: (v: never) => void;
    readOnly?: boolean;
  }) => ReactNode;
}

/** Structurele shape van één component-registratie (fields + defaultProps). */
export interface SectionComponentMeta {
  fields?: Record<string, SectionFieldMeta>;
  defaultProps?: Record<string, unknown>;
}

/** De volledige registry-shape — cast-doel voor `config.components`. */
export type SectionRegistryMeta = Record<string, SectionComponentMeta | undefined>;

// ─── Sectie-lijst-labels ────────────────────────────────────────────────

/** Max preview-lengte in de sectie-lijst; langere teksten worden afgekapt. */
export const SECTION_PREVIEW_MAX_LENGTH = 60;

/**
 * Prop-keys die nooit als tekst-preview mogen dienen: identiteit, styling-
 * metadata, URL-achtige velden en select-waarden ('columns' is '2'/'3'/'4').
 */
const PREVIEW_SKIP_KEYS: ReadonlySet<string> = new Set([
  'id',
  'bandTone',
  'anchorId',
  'personaId',
  'metadata',
  'icon',
  'imageUrl',
  'heroVisualUrl',
  'href',
  'ctaHref',
  'columns',
]);

function isUrlLike(value: string): boolean {
  return /^(#|\/|https?:\/\/|mailto:)/i.test(value);
}

function firstTextValue(value: unknown, depth: number): string | null {
  if (depth > 3 || value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length >= 2 && !isUrlLike(trimmed) ? trimmed : null;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstTextValue(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (PREVIEW_SKIP_KEYS.has(key)) continue;
      const found = firstTextValue(entry, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Lijst-label voor één sectie-instantie: het type + de eerste betekenisvolle
 * tekstwaarde uit de props (genest door arrays/objecten heen, URL-achtige en
 * identiteits-velden overgeslagen). `preview` is `null` wanneer de sectie
 * geen tekst draagt (bv. een kale nav) — de UI toont dan alleen het type.
 */
export function sectionListLabel(item: {
  type: string;
  props?: Record<string, unknown>;
}): { type: string; preview: string | null } {
  const raw = firstTextValue(item.props ?? {}, 0);
  if (!raw) return { type: item.type, preview: null };
  const preview =
    raw.length > SECTION_PREVIEW_MAX_LENGTH
      ? `${raw.slice(0, SECTION_PREVIEW_MAX_LENGTH - 1).trimEnd()}…`
      : raw;
  return { type: item.type, preview };
}

// ─── Veld-labels ────────────────────────────────────────────────────────

/** Afkortingen die in veld-labels als geheel-uppercase horen. */
const LABEL_ABBREVIATIONS: ReadonlySet<string> = new Set(['cta', 'url', 'faq', 'id']);

/**
 * camelCase-prop-key → leesbaar veld-label ('ctaLabel' → 'CTA label',
 * 'heroVisualUrl' → 'Hero visual URL'). De config draagt zelf geen labels
 * (Puck toonde de key); dit houdt het paneel leesbaar zonder per-veld i18n.
 */
export function humanizeFieldKey(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter((w) => w.length > 0)
    .map((w) => (LABEL_ABBREVIATIONS.has(w) ? w.toUpperCase() : w));
  if (words.length === 0) return key;
  const [first, ...rest] = words;
  const head = LABEL_ABBREVIATIONS.has(first.toLowerCase())
    ? first
    : first.charAt(0).toUpperCase() + first.slice(1);
  return [head, ...rest].join(' ');
}

// ─── Paneel-model ───────────────────────────────────────────────────────

export type PanelFieldKind = 'text' | 'textarea' | 'select' | 'number' | 'array' | 'custom';

export interface PanelFieldOption {
  label: string;
  /** Ruwe optie-waarde — radio-opties in de config zijn soms boolean. */
  value: string | number | boolean;
}

/** Eén renderbaar veld in het props-paneel (recursief voor arrays). */
export interface PanelField {
  key: string;
  label: string;
  kind: PanelFieldKind;
  options?: PanelFieldOption[];
  itemFields?: PanelField[];
  defaultItemProps?: Record<string, unknown>;
  /** Veilige samenvattings-functie voor array-items (nooit throwen). */
  itemSummary?: (item: unknown, index: number) => string;
  /** Config-eigen custom render (het imageField → PuckImageField). */
  renderCustom?: SectionFieldMeta['render'];
}

function wrapItemSummary(
  summaryFn: NonNullable<SectionFieldMeta['getItemSummary']>,
): (item: unknown, index: number) => string {
  return (item, index) => {
    try {
      const summary = summaryFn(item as never, index);
      return typeof summary === 'string' && summary.trim().length > 0
        ? summary
        : `${index + 1}`;
    } catch {
      return `${index + 1}`;
    }
  };
}

/**
 * Mapt de `fields`-metadata van één component-type naar het paneel-model:
 * text→text, textarea→textarea, select/radio→select (opties behouden hun
 * ruwe waarde, óók boolean), number→number, array→recursief sub-model,
 * custom→render-functie doorgegeven (hergebruikt PuckImageField exact zoals
 * de config hem definieert). Onbekende veld-types worden overgeslagen —
 * geen editor tonen voor iets dat we niet begrijpen kan geen data corrumperen.
 */
export function fieldsToPanelModel(
  configFields: Record<string, SectionFieldMeta> | undefined,
): PanelField[] {
  if (!configFields) return [];
  const panel: PanelField[] = [];
  for (const [key, meta] of Object.entries(configFields)) {
    if (!meta || typeof meta !== 'object') continue;
    const base = { key, label: humanizeFieldKey(key) };
    switch (meta.type) {
      case 'text':
      case 'textarea':
      case 'number':
        panel.push({ ...base, kind: meta.type });
        break;
      case 'select':
      case 'radio':
        panel.push({
          ...base,
          kind: 'select',
          options: (meta.options ?? []).map((o) => ({ label: o.label, value: o.value })),
        });
        break;
      case 'array':
        panel.push({
          ...base,
          kind: 'array',
          itemFields: fieldsToPanelModel(meta.arrayFields),
          defaultItemProps: meta.defaultItemProps,
          itemSummary: meta.getItemSummary ? wrapItemSummary(meta.getItemSummary) : undefined,
        });
        break;
      case 'custom':
        if (meta.render) panel.push({ ...base, kind: 'custom', renderCustom: meta.render });
        break;
      default:
        break;
    }
  }
  return panel;
}

// ─── Default-props voor "Sectie toevoegen" ──────────────────────────────

/** Lege FilledFields — de factories renderen dan hun eigen placeholders. */
export function emptyFilledFields(): FilledFields {
  return {
    headline: '',
    sub: '',
    ctaLabel: '',
    ctaHref: '',
    featureItems: [],
    faqItems: [],
    testimonialQuote: '',
    testimonialAuthor: '',
    pricingTiers: [],
    longText: '',
  };
}

type SectionFactory = (
  fields: FilledFields,
  ctx: CanvasContextStack | null,
) => { type: string; props: Record<string, unknown> };

/**
 * Factory-dispatch per sectie-type. Alleen de 8 types met een bestaande
 * default<Component>-factory in template-helpers; de overige 10 vallen
 * terug op de registry-defaultProps uit puck-config (zie
 * {@link addDefaultsForType}).
 */
const FACTORY_BY_TYPE: Record<string, SectionFactory> = {
  BrandHero: (f) => defaultBrandHero(f),
  BrandCTA: (f, ctx) => defaultBrandCta(f, ctx),
  FeatureGrid: (f) => defaultFeatureGrid(f),
  FAQ: (f) => defaultFaq(f),
  Testimonial: (f, ctx) => defaultTestimonial(f, ctx),
  PricingTable: (f) => defaultPricingTable(f),
  RichText: (f) => defaultRichText(f),
  Footer: (f, ctx) => defaultFooter(f, ctx),
};

/**
 * Default-props voor een nieuw toe te voegen sectie:
 *  1. template-helpers-factory wanneer die bestaat (placeholder-copy,
 *     persona-/brand-bewust via `ctx`);
 *  2. anders de registry-defaultProps uit puck-config (deep-cloned zodat
 *     twee toevoegingen nooit array-referenties delen);
 *  3. anders lege props.
 * Het `id` wordt bewust weggelaten — `addSection` in de kernel kent het toe.
 */
export function addDefaultsForType(
  type: string,
  ctx: CanvasContextStack | null,
  registryDefaults?: Record<string, unknown>,
): Record<string, unknown> {
  const factory = FACTORY_BY_TYPE[type];
  if (factory) {
    const props = { ...factory(emptyFilledFields(), ctx).props };
    delete props.id;
    return props;
  }
  if (registryDefaults && typeof registryDefaults === 'object') {
    return structuredClone(registryDefaults);
  }
  return {};
}

// ─── Drag-drop-reorder → kernel-operaties ───────────────────────────────

/**
 * Vertaalt een drag-drop ("sectie X landt op index Y") naar een batch
 * één-staps move-operaties voor `applyStructureOperations` — zo blijft de
 * section-edit-tools-kernel de enige plek die de tree muteert (guards,
 * alles-of-niets). Lege array bij onbekend id, out-of-bounds of no-op.
 */
export function reorderOperations(
  content: ReadonlyArray<{ props?: Record<string, unknown> }>,
  sectionId: string,
  toIndex: number,
): StructureOperation[] {
  const from = content.findIndex((item) => item?.props?.id === sectionId);
  if (from < 0 || toIndex < 0 || toIndex >= content.length || toIndex === from) return [];
  const direction: 'up' | 'down' = toIndex < from ? 'up' : 'down';
  const steps = Math.abs(toIndex - from);
  return Array.from({ length: steps }, () => ({ op: 'move' as const, sectionId, direction }));
}

// ─── Viewport-presets ───────────────────────────────────────────────────

export type EditorViewport = 'desktop' | 'tablet' | 'mobile';

/** Preview-breedte per viewport; `null` = volle breedte (desktop). */
export const EDITOR_VIEWPORT_WIDTHS: Record<EditorViewport, number | null> = {
  desktop: null,
  tablet: 768,
  mobile: 375,
};
