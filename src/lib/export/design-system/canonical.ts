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

export interface Extensions {
  voice?: VoiceExtension;
  imagery?: ImageryExtension;
  iconography?: IconographyExtension;
  brandFoundation?: BrandFoundationExtension;
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
