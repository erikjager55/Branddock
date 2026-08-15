// =============================================================
// Canonical Design System Model
//
// Single source of truth voor ALLE export-emitters (DESIGN.md,
// DTCG tokens.json, Tailwind theme config, shadcn CSS vars,
// Figma Variables, Style Dictionary, AGENTS.md brand brief).
//
// Emitters kiezen welk subset ze nodig hebben. De resolver in
// resolver.ts bouwt dit model op uit de DB.
// =============================================================

import type {
  SemanticColorRole,
  TypeRole,
  RoundedScale,
  SpacingScale,
  ElevationLevel,
  TypographyToken,
} from '@/lib/brandstyle/semantic-role-resolver';

// Re-export semantic types zodat emitters niet cross-package hoeven importeren
export type {
  SemanticColorRole,
  TypeRole,
  RoundedScale,
  SpacingScale,
  ElevationLevel,
  TypographyToken,
};

// ─── Meta ─────────────────────────────────────────────

export interface DesignSystemMeta {
  /** Workspace-slug of brand-naam, gebruikt als `name` in DESIGN.md frontmatter */
  name: string;
  /** Optionele beschrijving — short one-liner */
  description?: string;
  workspaceId: string;
  workspaceSlug: string;
  /** ISO timestamp */
  generatedAt: string;
  /** Bron van de semantic-tokens: wanneer de resolver laatst draaide */
  resolvedAt?: string;
  resolverVersion?: string;
}

// ─── Token-cellen ─────────────────────────────────────

export interface ColorToken {
  value: string;                // hex, uppercase
  description?: string;
  /** Rol van de kleur ("primary", "on-primary", ...) — key in de outer map is de rolnaam */
  role: SemanticColorRole;
  /** Bron-attributie uit de resolver diagnostics */
  source?: string;
}

export interface DimensionToken {
  value: number;                // px
  description?: string;
}

export interface ElevationToken {
  value: string;                // box-shadow string
  description?: string;
}

export interface ComponentToken {
  /** Token-refs ({colors.primary}) of raw values (hex, px). Welke properties
   *  valide zijn wordt door de DESIGN.md-spec bepaald. */
  props: Record<string, string>;
}

// ─── Prose-blokken ────────────────────────────────────

export interface ProseBlocks {
  /** Holistische merk-omschrijving (look-and-feel) */
  overview?: string;
  colors?: string;
  typography?: string;
  layout?: string;
  elevation?: string;
  shapes?: string;
  components?: string;
  /** Do's en don'ts als gecombineerde bullets */
  dosDonts?: string[];
}

// ─── Extensions ───────────────────────────────────────

/**
 * Extensies leven buiten de strikte DESIGN.md-spec maar zijn wel
 * brand-relevant. Emitters picken per format: DESIGN.md kan `## Brand Voice`
 * / `## Imagery` / `## Iconography` / `## Brand Foundation` sub-secties
 * toevoegen omdat onbekende sections preserved worden.
 */
export interface VoiceExtension {
  principles: string[];
  writingGuidelines: string[];
  doSayPhrases: string[];
  dontSayPhrases: string[];
}

export interface ImageryExtension {
  photographyStyle?: string;
  photographyGuidelines: string[];
  illustrationGuidelines: string[];
  donts: string[];
}

export interface IconographyExtension {
  style?: string;
  strokeWeight?: string;
  cornerRadius?: string;
  sizing?: string;
  colorUsage?: string;
}

export interface BrandFoundationAssetSummary {
  name: string;
  slug: string;
  category: string;
  frameworkType?: string | null;
  summary: string;                // 1-2 zin kern-omschrijving
}

export interface PersonaSummary {
  name: string;
  tagline?: string | null;
  keyTraits: string[];            // top-5 personality/values/interests
  primaryGoal?: string;
  quote?: string | null;
}

export interface CompetitorSummary {
  name: string;
  tier: string;
  positioning?: string;
  differentiators: string[];
}

export interface BrandFoundationExtension {
  assets: BrandFoundationAssetSummary[];
  personas: PersonaSummary[];
  competitors: CompetitorSummary[];
}

// ─── brand.md full profile (open standaard, upstream v0.2-kern) ──────
//
// Additieve laag voor de `brandmd`-emitter. Waarom apart van de bestaande
// extensies: brand.md heeft velden die geen enkel ander formaat nodig heeft
// (validatie-status per sectie, provenance, producten, channel tones) én een
// harde publiek/privaat-grens — concurrenten mogen alleen in het extended
// profiel landen, nooit in het publieke bestand.

export interface ProductSummary {
  name: string;
  category?: string;
  description?: string;
  features: string[];
  benefits: string[];
  useCases: string[];
}

export interface ChannelToneSummary {
  channel: string;
  tone: string;
}

export type BrandMdSectionKey =
  | 'strategy'
  | 'voice'
  | 'visual'
  | 'audience'
  | 'products';

export interface SectionValidation {
  status: 'validated' | 'unvalidated';
  /** 0-100 — alleen gezet wanneer een echte validatie-bron bestaat */
  score?: number;
  /** ISO-datum van de laatste validatie */
  date?: string;
}

export interface BrandMdProvenance {
  generatedBy: string;
  /** URL van de levende versie (workspace-export) of claim-URL (generator-draft) */
  canonicalUrl?: string;
  /** Bron-site bij scan-gegenereerde profielen */
  sourceUrl?: string;
}

export interface BrandMdExtension {
  tagline?: string;
  /** ISO 639-1, upstream-kernveld `language` */
  language: string;
  /** Full-profile: alle content-locales van de workspace (>=1) */
  locales: string[];
  voiceDescription?: string;
  wordsWeUse: string[];
  wordsWeAvoid: string[];
  channelTones: ChannelToneSummary[];
  products: ProductSummary[];
  /** Machine-checkbare guardrails (full-profile upgrade van prose-dosDonts) */
  guardrails: { do: string[]; dont: string[] };
  /** 0.3 Voice > Message Pillars — scan-afgeleid (draft) of workspace-data (later) */
  messagePillars?: Array<{ pillar: string; statements: string[] }>;
  /** 0.3 Visual > Art Direction — keywords + direction statement */
  artDirection?: { keywords: string[]; statement?: string };
  validation: Partial<Record<BrandMdSectionKey, SectionValidation>>;
  provenance: BrandMdProvenance;
}

export interface Extensions {
  voice?: VoiceExtension;
  imagery?: ImageryExtension;
  iconography?: IconographyExtension;
  brandFoundation?: BrandFoundationExtension;
  brandMd?: BrandMdExtension;
}

// ─── Het canonieke model ──────────────────────────────

export interface DesignSystemModel {
  meta: DesignSystemMeta;
  colors: Partial<Record<SemanticColorRole, ColorToken>>;
  typography: Partial<Record<TypeRole, TypographyToken>>;
  rounded: Partial<Record<RoundedScale, DimensionToken>>;
  spacing: Partial<Record<SpacingScale, DimensionToken>>;
  elevation: Partial<Record<ElevationLevel, ElevationToken>>;
  components: Record<string, ComponentToken>;  // "button-primary", "input-default", ...
  prose: ProseBlocks;
  extensions: Extensions;
}

/** Ruwe rounded/spacing defaults voor `{rounded.md}` token-refs in DESIGN.md */
export function roundedScaleKeys(): RoundedScale[] {
  return ['none', 'sm', 'md', 'lg', 'xl', 'full'];
}

export function spacingScaleKeys(): SpacingScale[] {
  return ['xs', 'sm', 'md', 'lg', 'xl'];
}

export function elevationLevelKeys(): ElevationLevel[] {
  return ['1', '2', '3', '4', '5'];
}
