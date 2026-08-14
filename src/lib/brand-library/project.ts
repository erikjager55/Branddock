// =============================================================
// Brand Library — projectie (puur)
//
// Zet een gelezen styleguide-rij om in het consumptiecontract: gates
// toepassen, analyzer-markers strippen, secties samenstellen. Geen Prisma,
// geen cache, geen IO — zodat de smoke deze logica zonder database draait
// (zelfde knip als `views.ts` en `styleguide-rule-checks.ts`).
//
// De DB- en cache-laag zit in index.ts.
// =============================================================

import {
  stripAnalyzerMarkers,
  stripAnalyzerMarkersFromList,
} from "@/lib/brandstyle/analyzer-markers";
import {
  renderBrandManifestMarkdown,
  type BrandManifest,
} from "@/lib/brandstyle/manifest-builder";
import { projectManifest, type BrandLibraryView } from "./views";
import type {
  BrandLibraryGates,
  BrandLibraryResult,
  BrandLibrarySections,
  LibraryColor,
  LibraryComponent,
  LibraryFont,
  LibraryLogo,
  LibraryRule,
} from "./types";

/** Precies de velden die index.ts uit de database haalt. */
export interface StyleguideRowForLibrary {
  published: boolean;
  status: string;
  manifestVersion: number;
  brandManifest: unknown;
  designPhilosophy: string | null;
  sourceUrl: string | null;

  colorsSavedForAi: boolean;
  typographySavedForAi: boolean;
  imagerySavedForAi: boolean;
  designLanguageSavedForAi: boolean;
  visualLanguageSavedForAi: boolean;
  logoSavedForAi: boolean;

  primaryFontName: string | null;
  layoutStyle: BrandLibraryResult["render"]["layoutStyle"];
  layoutStyleInferred: boolean;
  archetype: BrandLibraryResult["render"]["archetype"];

  typeScale: unknown;
  semanticColors: unknown;
  semanticTokens: unknown;
  buttonProfile: unknown;
  typographyProfile: unknown;
  spacingProfile: unknown;
  spacingScale: unknown;
  elevationProfile: unknown;
  radiusProfile: unknown;
  motionProfile: unknown;
  brandImages: unknown;
  fixtureSamples: unknown;

  colorDonts: string[];
  logoGuidelines: string[];
  logoDonts: string[];
  photographyStyle: unknown;
  photographyGuidelines: string[];
  illustrationGuidelines: string[];
  imageryDonts: string[];
  graphicElements: unknown;
  patternsTextures: unknown;
  iconographyStyle: unknown;
  gradientsEffects: unknown;
  layoutPrinciples: unknown;
  graphicElementsDonts: string[];
  iconographyDonts: string[];
  visualLanguage: unknown;

  colors: LibraryColor[];
  fonts: LibraryFont[];
  logos: Array<Omit<LibraryLogo, "description"> & { description: string | null }>;
  components: LibraryComponent[];
  rules: LibraryRule[];
}

/**
 * Strip markers per key van een platte objectwaarde. De "label: value"-structuur
 * moet intact blijven — downstream parsers (o.a. `featureSafeImagerySegments`)
 * splitsen op die labels, dus we strippen de waarden en niet het geheel.
 */
function stripObjectValues(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string") out[key] = stripAnalyzerMarkers(raw);
    else if (Array.isArray(raw)) {
      out[key] = raw.map((item) => (typeof item === "string" ? stripAnalyzerMarkers(item) : item));
    } else out[key] = raw;
  }
  return out;
}

function stripLogos(logos: StyleguideRowForLibrary["logos"]): LibraryLogo[] {
  return logos.map((logo) => ({
    ...logo,
    description: logo.description ? stripAnalyzerMarkers(logo.description) : null,
  }));
}

function stripRules(rules: LibraryRule[]): LibraryRule[] {
  return rules.map((rule) => ({
    ...rule,
    title: stripAnalyzerMarkers(rule.title),
    description: rule.description ? stripAnalyzerMarkers(rule.description) : null,
  }));
}

/** Publish-gate × sectie-gate. Beide moeten open zijn. */
export function resolveGates(row: StyleguideRowForLibrary): BrandLibraryGates {
  const p = row.published;
  return {
    published: p,
    colors: p && row.colorsSavedForAi,
    typography: p && row.typographySavedForAi,
    imagery: p && row.imagerySavedForAi,
    designLanguage: p && row.designLanguageSavedForAi,
    visualLanguage: p && row.visualLanguageSavedForAi,
    logo: p && row.logoSavedForAi,
  };
}

function buildSections(
  row: StyleguideRowForLibrary,
  gates: BrandLibraryGates,
): BrandLibrarySections {
  const sections: BrandLibrarySections = {};

  if (gates.colors) {
    sections.colors = {
      palette: row.colors,
      semanticColors: row.semanticColors,
      donts: stripAnalyzerMarkersFromList(row.colorDonts),
    };
  }

  if (gates.typography) {
    sections.typography = {
      primaryFontName: row.primaryFontName,
      fonts: row.fonts,
      typeScale: row.typeScale,
    };
  }

  if (gates.imagery) {
    sections.imagery = {
      photographyStyle: stripObjectValues(row.photographyStyle),
      guidelines: stripAnalyzerMarkersFromList(row.photographyGuidelines),
      illustrationGuidelines: stripAnalyzerMarkersFromList(row.illustrationGuidelines),
      donts: stripAnalyzerMarkersFromList(row.imageryDonts),
    };
  }

  if (gates.designLanguage) {
    sections.designLanguage = {
      graphicElements: stripObjectValues(row.graphicElements) ?? row.graphicElements,
      patternsTextures: stripObjectValues(row.patternsTextures) ?? row.patternsTextures,
      iconographyStyle: stripObjectValues(row.iconographyStyle) ?? row.iconographyStyle,
      gradientsEffects: stripObjectValues(row.gradientsEffects) ?? row.gradientsEffects,
      layoutPrinciples: stripObjectValues(row.layoutPrinciples) ?? row.layoutPrinciples,
      graphicElementsDonts: stripAnalyzerMarkersFromList(row.graphicElementsDonts),
      iconographyDonts: stripAnalyzerMarkersFromList(row.iconographyDonts),
    };
  }

  if (gates.visualLanguage) {
    sections.visualLanguage = stripObjectValues(row.visualLanguage) ?? row.visualLanguage;
  }

  if (gates.logo) {
    sections.logo = {
      logos: stripLogos(row.logos),
      guidelines: stripAnalyzerMarkersFromList(row.logoGuidelines),
      donts: stripAnalyzerMarkersFromList(row.logoDonts),
    };
  }

  return sections;
}

/**
 * Bouw het consumptiecontract uit een gelezen styleguide-rij.
 *
 * @param workspaceId - de workspace
 * @param row - de rij inclusief relaties, zoals index.ts hem ophaalt
 * @param view - channel-view voor de manifest-projectie
 * @param adobeFontsKitId - workspace-scalar die canvas-context nodig heeft
 */
export function projectBrandLibrary(
  workspaceId: string,
  row: StyleguideRowForLibrary,
  view: BrandLibraryView,
  adobeFontsKitId: string | null,
): BrandLibraryResult {
  const gates = resolveGates(row);

  // Het manifest kent zijn eigen gates al (manifest-builder past de
  // save-for-AI-vlaggen toe bij het bouwen); hier geldt alleen de publish-gate,
  // net als in brand-context.ts.
  const rawManifest = gates.published ? (row.brandManifest as BrandManifest | null) : null;
  const manifest = rawManifest ? projectManifest(rawManifest, view) : null;

  return {
    workspaceId,
    published: row.published,
    manifestVersion: row.manifestVersion,
    manifest,
    markdown: manifest ? renderBrandManifestMarkdown(manifest) : "",
    view,
    sections: buildSections(row, gates),
    render: {
      primaryFontName: row.primaryFontName,
      layoutStyle: row.layoutStyle,
      layoutStyleInferred: row.layoutStyleInferred,
      archetype: row.archetype,
      colors: row.colors,
      fonts: row.fonts,
      logos: stripLogos(row.logos),
      components: row.components,
      typeScale: row.typeScale,
      semanticColors: row.semanticColors,
      semanticTokens: row.semanticTokens,
      buttonProfile: row.buttonProfile,
      typographyProfile: row.typographyProfile,
      spacingProfile: row.spacingProfile,
      spacingScale: row.spacingScale,
      elevationProfile: row.elevationProfile,
      radiusProfile: row.radiusProfile,
      motionProfile: row.motionProfile,
      brandImages: row.brandImages,
      fixtureSamples: row.fixtureSamples,
      adobeFontsKitId,
    },
    rules: stripRules(row.rules),
    gates,
    meta: {
      designPhilosophy: row.designPhilosophy ? stripAnalyzerMarkers(row.designPhilosophy) : null,
      sourceUrl: row.sourceUrl,
      status: row.status,
    },
  };
}

/** Lege bibliotheek voor een workspace zonder styleguide — nooit `null` terug. */
export function emptyBrandLibrary(
  workspaceId: string,
  view: BrandLibraryView,
  adobeFontsKitId: string | null,
): BrandLibraryResult {
  return {
    workspaceId,
    published: false,
    manifestVersion: 0,
    manifest: null,
    markdown: "",
    view,
    sections: {},
    render: {
      primaryFontName: null,
      layoutStyle: "COMMERCIAL",
      layoutStyleInferred: false,
      archetype: null,
      colors: [],
      fonts: [],
      logos: [],
      components: [],
      typeScale: null,
      semanticColors: null,
      semanticTokens: null,
      buttonProfile: null,
      typographyProfile: null,
      spacingProfile: null,
      spacingScale: null,
      elevationProfile: null,
      radiusProfile: null,
      motionProfile: null,
      brandImages: null,
      fixtureSamples: null,
      adobeFontsKitId,
    },
    rules: [],
    gates: {
      published: false,
      colors: false,
      typography: false,
      imagery: false,
      designLanguage: false,
      visualLanguage: false,
      logo: false,
    },
    meta: { designPhilosophy: null, sourceUrl: null, status: "DRAFT" },
  };
}
