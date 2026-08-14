// =============================================================
// Brand Library accessor (designbibliotheek-verbeterplan W7.1)
//
// Het verplichte consumptiepad voor merkcontext: consumers vragen de
// bibliotheek op via getBrandLibrary(workspaceId, { view }) i.p.v. zelf
// BrandStyleguide-velden te lezen. Gates, marker-stripping en compressie
// per kanaal zitten daarmee op één plek — de bugklasse "consumer leest langs
// de save-for-AI-gate om" (gotchas 2026-06-10) kan structureel niet meer
// ontstaan, en een nieuwe consumer erft de governance automatisch.
//
// Zie ADR 2026-08-14-brand-library-consumption voor de afwegingen:
//   D2  prozacontent gegate, render-tokens bewust niet
//   D3  `gates` reist mee zodat "ontbreekt" ≠ "leeg"
//   D4  markers worden hier gestript, niet bij de consumer
//
// Directe `prisma.brandStyleguide`-toegang buiten deze module is een
// lint-fout (`no-restricted-properties` in eslint.config.mjs).
// =============================================================

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCached, invalidateCache, setCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import {
  emptyBrandLibrary,
  projectBrandLibrary,
  type StyleguideRowForLibrary,
} from "./project";
import type { BrandLibraryView } from "./views";
import type { BrandLibraryMode, BrandLibraryResult } from "./types";

export { projectManifest } from "./views";
export type { BrandLibraryView } from "./views";
export * from "./types";

// ─── Cache ──────────────────────────────────────────

/**
 * We hangen bewust onder de bestaande server-cache met de `brandstyle`-prefix
 * in plaats van een eigen Map bij te houden: élke brandstyle-mutatieroute roept
 * al `invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId))` aan (CLAUDE.md
 * regel #10). Daarmee is de bibliotheek automatisch vers na een kleurwijziging,
 * een publish of een save-for-AI-toggle — zonder dat er veertien routes een
 * tweede invalidatie moeten leren kennen. Een eigen cache zou precies de
 * "twee plekken houden dezelfde waarheid bij"-klasse uit gotchas.md zijn.
 */
const CACHE_TTL_MS = 5 * 60 * 1000; // gelijk aan getBrandContext

function cacheKey(workspaceId: string, view: BrandLibraryView): string {
  return `${cacheKeys.prefixes.brandstyle(workspaceId)}:library:${view}`;
}

/**
 * Leeg de bibliotheek-cache van één workspace.
 *
 * Meestal niet nodig — de bestaande `invalidateCache(prefixes.brandstyle(...))`
 * in de mutatieroutes dekt dit al. Bedoeld voor scripts en tests die buiten een
 * route om schrijven.
 */
export function invalidateBrandLibrary(workspaceId: string): void {
  invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
}

// ─── Query ──────────────────────────────────────────

const STYLEGUIDE_SELECT = {
  id: true,
  published: true,
  status: true,
  manifestVersion: true,
  brandManifest: true,
  designPhilosophy: true,
  sourceUrl: true,

  colorsSavedForAi: true,
  typographySavedForAi: true,
  imagerySavedForAi: true,
  designLanguageSavedForAi: true,
  visualLanguageSavedForAi: true,
  logoSavedForAi: true,

  primaryFontName: true,
  additionalFonts: true,
  layoutStyle: true,
  layoutStyleInferred: true,
  archetype: true,

  typeScale: true,
  semanticColors: true,
  semanticTokens: true,
  buttonProfile: true,
  typographyProfile: true,
  spacingProfile: true,
  spacingScale: true,
  elevationProfile: true,
  radiusProfile: true,
  motionProfile: true,
  brandImages: true,
  fixtureSamples: true,

  colorDonts: true,
  logoGuidelines: true,
  logoDonts: true,
  photographyStyle: true,
  photographyGuidelines: true,
  illustrationGuidelines: true,
  imageryDonts: true,
  graphicElements: true,
  patternsTextures: true,
  iconographyStyle: true,
  gradientsEffects: true,
  layoutPrinciples: true,
  graphicElementsDonts: true,
  iconographyDonts: true,
  visualLanguage: true,

  colors: {
    select: {
      id: true,
      name: true,
      hex: true,
      category: true,
      sortOrder: true,
      tags: true,
      contrastWhite: true,
      contrastBlack: true,
      confidence: true,
      detectorSource: true,
    },
    orderBy: { sortOrder: "asc" },
  },
  fonts: {
    select: {
      name: true,
      role: true,
      source: true,
      fileUrl: true,
      fileType: true,
      weight: true,
      fontFamily: true,
      availability: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: "asc" },
  },
  logos: {
    select: {
      variant: true,
      fileUrl: true,
      fileType: true,
      width: true,
      height: true,
      sortOrder: true,
      description: true,
    },
    orderBy: { sortOrder: "asc" },
  },
  components: {
    select: { type: true, label: true, extractedStyles: true, confidence: true },
    // Deterministische volgorde voor de highest-confidence pick in
    // `mapStyleguideComponents` — overgenomen uit canvas-context, waar deze
    // volgorde de renderer-uitkomst bepaalt.
    orderBy: [{ confidence: "desc" }, { sortOrder: "asc" }],
  },
  rules: {
    select: {
      id: true,
      section: true,
      kind: true,
      severity: true,
      source: true,
      title: true,
      description: true,
      constraint: true,
    },
  },
} satisfies Prisma.BrandStyleguideSelect;

// ─── Public API ─────────────────────────────────────

export interface GetBrandLibraryOptions {
  /** Channel-view voor de manifest-projectie. Default `full`. */
  view?: BrandLibraryView;
  /**
   * `gated` (default) voor alles wat een prompt voedt; `raw` voor audit- en
   * analysepaden die de ongereviewde staat juist moeten kunnen zien.
   */
  mode?: BrandLibraryMode;
}

/**
 * Zoek bij een styleguide-id de workspace op.
 *
 * Bestaat zodat consumers die alleen een styleguide-id hebben (bv. de
 * alignment-entiteitlezer) niet zelf `prisma.brandStyleguide` hoeven aan te
 * roepen — het enige leespad blijft daarmee deze module.
 */
export async function resolveStyleguideWorkspace(styleguideId: string): Promise<string | null> {
  const row = await prisma.brandStyleguide.findUnique({
    where: { id: styleguideId },
    select: { workspaceId: true },
  });
  return row?.workspaceId ?? null;
}

/**
 * Haal de merkbibliotheek van één workspace op.
 *
 * Retourneert **altijd** een object — ook zonder styleguide of zonder publish.
 * In dat geval zijn `sections` leeg en `gates.published` false, terwijl
 * `render` gewoon gevuld is: een pagina moet in de merkkleuren renderen ook
 * als de review nog loopt (ADR D2). Consumers die prozacontent naar een prompt
 * schrijven gebruiken uitsluitend `sections`.
 *
 * @param workspaceId - de workspace
 * @param options.view - channel-view; alleen van invloed op `manifest`/`markdown`
 */
export async function getBrandLibrary(
  workspaceId: string,
  options: GetBrandLibraryOptions = {},
): Promise<BrandLibraryResult> {
  const view = options.view ?? "full";
  const mode = options.mode ?? "gated";
  const key = `${cacheKey(workspaceId, view)}:${mode}`;

  const cached = getCached<BrandLibraryResult>(key);
  if (cached) return cached;

  const [styleguide, workspace] = await Promise.all([
    prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: STYLEGUIDE_SELECT,
    }),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { adobeFontsKitId: true },
    }),
  ]);

  const adobeFontsKitId = workspace?.adobeFontsKitId ?? null;
  const result = styleguide
    ? projectBrandLibrary(
        workspaceId,
        styleguide as unknown as StyleguideRowForLibrary,
        view,
        adobeFontsKitId,
        mode,
      )
    : emptyBrandLibrary(workspaceId, view, adobeFontsKitId);

  setCache(key, result, CACHE_TTL_MS);
  return result;
}
