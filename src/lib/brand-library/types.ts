// =============================================================
// Brand Library — het consumptiecontract (W7.1)
//
// Twee helften, met een bewust verschil in gating (ADR
// 2026-08-14-brand-library-consumption, D2):
//
//   `sections`  prozacontent die een prompt in gaat. Gegate op `published`
//               én op de per-sectie save-for-AI-vlag; `undefined` zodra een
//               van beide dicht staat. Markers zijn gestript.
//   `render`    tokens waarmee een pagina/asset gerenderd wordt. Bewust
//               ongegate: een landingspagina moet in de merkkleuren renderen
//               ook als de imagery-sectie nog niet gereviewd is. Dit was al
//               de expliciete keuze in canvas-context.ts.
//
// `render` bevat daarom géén prozavelden. Wie prozacontent nodig heeft komt
// via `sections` en krijgt de gate cadeau — anders zou `render` de nieuwe
// achterdeur worden en is de hele laag betekenisloos.
// =============================================================

import type {
  BrandArchetype,
  FontAvailability,
  LayoutStyle,
  RuleKind,
  RuleSeverity,
} from "@prisma/client";
import type { BrandManifest } from "@/lib/brandstyle/manifest-builder";
import type { BrandLibraryView } from "./views";

/** Json-velden houden we als `unknown`: de vorm verschilt per analyzer-versie. */
export type JsonLike = unknown;

export interface LibraryColor {
  id: string;
  name: string;
  hex: string;
  category: string;
  sortOrder: number;
  tags: string[];
  /** WCAG-tag voor tekst op deze kleur — "AAA" | "AA" | "Fail". */
  contrastWhite: string | null;
  contrastBlack: string | null;
  confidence: string | null;
  detectorSource: string | null;
}

export interface LibraryFont {
  name: string;
  role: string;
  source: string;
  fileUrl: string | null;
  fileType: string | null;
  weight: string | null;
  fontFamily: string | null;
  availability: FontAvailability | null;
  sortOrder: number;
}

export interface LibraryLogo {
  variant: string;
  fileUrl: string | null;
  fileType: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  /** Marker-vrij (kan analyzer-proza bevatten). */
  description: string | null;
}

export interface LibraryComponent {
  type: string;
  label: string;
  extractedStyles: JsonLike;
  confidence: number | null;
}

export interface LibraryRule {
  id: string;
  section: string;
  kind: RuleKind;
  severity: RuleSeverity;
  source: string;
  title: string;
  description: string | null;
  constraint: JsonLike;
}

// ─── Gegate secties ─────────────────────────────────

export interface ColorsSection {
  palette: LibraryColor[];
  semanticColors: JsonLike;
  donts: string[];
}

export interface TypographySection {
  primaryFontName: string | null;
  /** Legacy vrije-tekst-lijst naast de `fonts`-relatie. */
  additionalFonts: string[];
  fonts: LibraryFont[];
  typeScale: JsonLike;
}

export interface ImagerySection {
  /** Marker-vrij; per key gestript zodat de "label: value"-structuur intact blijft. */
  photographyStyle: Record<string, unknown> | null;
  guidelines: string[];
  illustrationGuidelines: string[];
  donts: string[];
}

export interface DesignLanguageSection {
  graphicElements: JsonLike;
  patternsTextures: JsonLike;
  iconographyStyle: JsonLike;
  gradientsEffects: JsonLike;
  layoutPrinciples: JsonLike;
  graphicElementsDonts: string[];
  iconographyDonts: string[];
}

export interface LogoSection {
  logos: LibraryLogo[];
  guidelines: string[];
  donts: string[];
}

export interface BrandLibrarySections {
  colors?: ColorsSection;
  typography?: TypographySection;
  imagery?: ImagerySection;
  designLanguage?: DesignLanguageSection;
  /** Json-blob met de visuele taal; gegate op `visualLanguageSavedForAi`. */
  visualLanguage?: JsonLike;
  logo?: LogoSection;
}

// ─── Ongegate render-helft ──────────────────────────

export interface BrandLibraryRender {
  primaryFontName: string | null;
  layoutStyle: LayoutStyle;
  layoutStyleInferred: boolean;
  archetype: BrandArchetype | null;
  colors: LibraryColor[];
  fonts: LibraryFont[];
  logos: LibraryLogo[];
  components: LibraryComponent[];
  typeScale: JsonLike;
  semanticColors: JsonLike;
  semanticTokens: JsonLike;
  buttonProfile: JsonLike;
  typographyProfile: JsonLike;
  spacingProfile: JsonLike;
  spacingScale: JsonLike;
  elevationProfile: JsonLike;
  radiusProfile: JsonLike;
  motionProfile: JsonLike;
  brandImages: JsonLike;
  fixtureSamples: JsonLike;
  adobeFontsKitId: string | null;
  /**
   * `visualLanguage` is een gemengd veld: de beschrijvende helft is proza (en
   * zit gegate in `sections.visualLanguage`), maar `heroPattern.pattern` is een
   * renderbeslissing. Alleen dat renderbare stukje komt hier, zodat `render`
   * prozavrij blijft en de consument niet zelf in de blob hoeft te graven.
   */
  heroPattern: string | null;
}

/**
 * `gated` (default) past de publish- en sectie-gates toe: alles wat een prompt
 * in gaat. `raw` levert elke sectie ongeacht de gates — uitsluitend voor
 * audit- en analysepaden die juist moeten kunnen zien wat nóg niet gereviewd
 * is. `gates` rapporteert in beide modi de wáre stand.
 */
export type BrandLibraryMode = "gated" | "raw";

// ─── Gate-rapportage ────────────────────────────────

/**
 * Waarom ontbreekt een sectie? Zonder dit is "gate dicht" niet te
 * onderscheiden van "leeg" — dezelfde stille nul die de Stap-0-spike bij de
 * rules-pijler blootlegde.
 */
export interface BrandLibraryGates {
  published: boolean;
  colors: boolean;
  typography: boolean;
  imagery: boolean;
  designLanguage: boolean;
  visualLanguage: boolean;
  logo: boolean;
}

export interface BrandLibraryResult {
  workspaceId: string;
  /**
   * Bestaat er überhaupt een styleguide voor deze workspace? Onderscheidt
   * "nooit geanalyseerd" van "wel geanalyseerd, niet gepubliceerd" — consumers
   * die in het eerste geval niets willen tonen hebben dat verschil nodig.
   */
  exists: boolean;
  /** False = geen enkele sectie beschikbaar; `render` werkt wél. */
  published: boolean;
  /** Contract-versie (W7.3) om op gegenereerde artefacten te stempelen. */
  manifestVersion: number;
  /** Null wanneer er nog geen manifest gegenereerd is. */
  manifest: BrandManifest | null;
  /** Markdown-render van het geprojecteerde manifest; leeg zonder manifest. */
  markdown: string;
  view: BrandLibraryView;
  sections: BrandLibrarySections;
  render: BrandLibraryRender;
  /** Marker-vrije styleguide-regels (designbibliotheek W2). */
  rules: LibraryRule[];
  gates: BrandLibraryGates;
  /** Overige merk-meta die geen sectie-gate kent. */
  meta: {
    /** Null wanneer er geen styleguide is. */
    styleguideId: string | null;
    designPhilosophy: string | null;
    sourceUrl: string | null;
    status: string;
  };
}
