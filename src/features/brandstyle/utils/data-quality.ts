/**
 * Data-quality — V3 (provenance-footer) van het governed-token-layer plan.
 *
 * Berekent uit de geladen styleguide de token-provenance (V1) en destilleert
 * daaruit de "curatabele" paden: de kleuren + fonts die de styleguide-UI
 * daadwerkelijk laadt én die de gebruiker in de Kleuren/Typografie-tabs kan
 * corrigeren. De render-profielen (button/spacing/elevation JSON) laadt de UI
 * niet, dus die laten we hier bewust buiten beschouwing — anders zou de badge
 * vals-pessimistisch tellen.
 *
 * Gedeeld door de data-quality-badge in `StyleguideHeader` en de onzekerheid-
 * first volgorde in `BrandOnboardingWizard` (V4).
 */

import { extractBrandTokensWithProvenance } from "@/lib/landing-pages/brand-tokens";
import type { TokenOrigin, TokenProvenance } from "@/lib/landing-pages/token-provenance";
import type { BrandStyleguide } from "../types/brandstyle.types";

export type CuratableTab = "colors" | "typography";

interface CuratablePath {
  path: string;
  label: string;
  tab: CuratableTab;
}

/** Paden die de styleguide-UI laadt + de gebruiker kan cureren. */
export const CURATABLE_PATHS: readonly CuratablePath[] = [
  { path: "brand", label: "Primaire merkkleur", tab: "colors" },
  { path: "surface", label: "Achtergrondkleur", tab: "colors" },
  { path: "onSurface", label: "Tekstkleur", tab: "colors" },
  { path: "accent", label: "Accentkleur", tab: "colors" },
  { path: "headingFont", label: "Kop-font", tab: "typography" },
  { path: "bodyFont", label: "Body-font", tab: "typography" },
];

export interface DataQualityItem extends CuratablePath {
  origin: TokenOrigin;
  /** True wanneer fallback/preset OF low-confidence — vraagt om bevestiging. */
  uncertain: boolean;
}

export interface DataQuality {
  provenance: TokenProvenance;
  items: DataQualityItem[];
  /** Subset van items die aandacht nodig heeft (uncertain === true). */
  needsAttention: DataQualityItem[];
}

function isUncertain(origin: TokenOrigin): boolean {
  return (
    origin.source === "fallback"
    || origin.source === "preset"
    || origin.confidence === "low"
  );
}

/**
 * Bereken de data-quality van een styleguide. Pure functie — veilig client-side
 * (de onderliggende extractor is puur, lazy-requires wcag + v4-mappers).
 */
export function computeDataQuality(styleguide: BrandStyleguide): DataQuality {
  // Structurele cast: BrandStyleguide is een superset van het StyleguideShape
  // dat de extractor verwacht (alle profile-velden zijn optioneel → undefined
  // wanneer de UI ze niet laadt). Colors/fonts dragen de tags/confidence die de
  // color/font-provenance voeden.
  const { provenance } = extractBrandTokensWithProvenance(
    styleguide as unknown as Parameters<typeof extractBrandTokensWithProvenance>[0],
  );

  const items: DataQualityItem[] = CURATABLE_PATHS.map((cp) => {
    const origin = provenance[cp.path] ?? {
      source: "fallback" as const,
      confidence: "low" as const,
    };
    return { ...cp, origin, uncertain: isUncertain(origin) };
  });

  return {
    provenance,
    items,
    needsAttention: items.filter((i) => i.uncertain),
  };
}
