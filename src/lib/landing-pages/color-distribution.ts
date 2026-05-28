/**
 * 60/30/10 color-distribution validator (#5 design-quality verbeterplan).
 *
 * Klassiek interieur-design en print-design principe dat ook in web werkt:
 *   - 60% dominant (achtergrond, surface)
 *   - 30% secundair (typografie, body)
 *   - 10% accent (CTAs, links, highlights)
 *
 * Wanneer brand-color > 20% van section-area neemt, voelt het als overdaad
 * (Branddock-incident: groene vol-veld hero + groene stats + groene CTA op
 * 1 page = visueel agressief). Deze validator schat de section-level
 * distributie + waarschuwt wanneer balance verstoord is, en biedt een
 * auto-correct die brand-bg-sections terugschaalt naar accent.
 *
 * Werkt op puck-component-array — pure functie, geen renderer dependency.
 */

import type { Data } from "@puckeditor/core";

export type ColorBudgetCategory = "dominant" | "secondary" | "accent";

interface SectionAreaEstimate {
  componentType: string;
  /** Geschat percentage van totale page-pixels dat deze section beslaat. */
  areaPct: number;
  /** Welke kleurrol vult de achtergrond? brand → accent-budget,
   *  surface → dominant-budget, onSurface → secondary-budget. */
  bgCategory: ColorBudgetCategory;
}

// Empirische page-area-distributie (gebaseerd op typische LP-layout)
const COMPONENT_AREA_PCT: Record<string, number> = {
  BrandHero: 25,
  FeatureGrid: 20,
  Testimonial: 10,
  PricingTable: 15,
  FAQ: 12,
  Footer: 5,
  BrandCTA: 8,
  StatsBlock: 8,
  StickyCtaBar: 2,
  RichText: 5,
};

interface ColorDistributionResult {
  /** Pct van page-area op accent-color (brand-bg) — target ≤ 20%. */
  accentPct: number;
  /** Pct dominant (surface-bg) — target ≥ 50%. */
  dominantPct: number;
  /** Pct secondary (onSurface-bg, dark sections) — target ≤ 30%. */
  secondaryPct: number;
  /** Sections die brand-bg gebruiken (accent-budget). */
  accentSections: string[];
  /** TRUE wanneer accent > 20% — visueel-overdadig. */
  isOversaturated: boolean;
  /** TRUE wanneer dominant < 40% — geen visueel-rust. */
  isDominantUnderused: boolean;
  /** Specifieke warning-string voor UI of log. */
  warning: string | null;
}

/**
 * Schat de 60/30/10 distributie van een puckData-tree. Returnt een rapport
 * met percentages + warnings. Caller kan dit gebruiken om:
 *   - User te waarschuwen voor over-saturation
 *   - Auto-correct te triggeren (bv. brand-bg sections naar surface)
 *   - F-VAL judge een extra dimensie te geven
 *
 * De `bgCategory` per component moet door de caller worden geleverd via
 * de section-bg-determination logic in puck-config — we kunnen die niet
 * achterhalen uit puckData zelf (renderer-decision).
 */
export function estimateColorDistribution(
  sections: SectionAreaEstimate[],
): ColorDistributionResult {
  if (sections.length === 0) {
    return {
      accentPct: 0,
      dominantPct: 0,
      secondaryPct: 0,
      accentSections: [],
      isOversaturated: false,
      isDominantUnderused: false,
      warning: null,
    };
  }
  const totalArea = sections.reduce((s, sec) => s + sec.areaPct, 0);
  const accentArea = sections.filter((s) => s.bgCategory === "accent").reduce((s, sec) => s + sec.areaPct, 0);
  const dominantArea = sections.filter((s) => s.bgCategory === "dominant").reduce((s, sec) => s + sec.areaPct, 0);
  const secondaryArea = sections.filter((s) => s.bgCategory === "secondary").reduce((s, sec) => s + sec.areaPct, 0);
  const accentPct = Math.round((accentArea / totalArea) * 100);
  const dominantPct = Math.round((dominantArea / totalArea) * 100);
  const secondaryPct = Math.round((secondaryArea / totalArea) * 100);
  const accentSections = sections.filter((s) => s.bgCategory === "accent").map((s) => s.componentType);
  const isOversaturated = accentPct > 20;
  const isDominantUnderused = dominantPct < 40;
  let warning: string | null = null;
  if (isOversaturated) {
    warning = `Brand-color te dominant: ${accentPct}% van page-area (target ≤ 20%). Sections: ${accentSections.join(', ')}.`;
  } else if (isDominantUnderused) {
    warning = `Surface (neutral) te schaars: ${dominantPct}% van page (target ≥ 50%). Voeg light sections toe voor visueel-rust.`;
  }
  return {
    accentPct,
    dominantPct,
    secondaryPct,
    accentSections,
    isOversaturated,
    isDominantUnderused,
    warning,
  };
}

/**
 * Helper: pak area-pct voor een Puck-component-type. Fallback 5% voor
 * onbekende types zodat totaal niet doodloopt.
 */
export function getComponentAreaPct(componentType: string): number {
  return COMPONENT_AREA_PCT[componentType] ?? 5;
}

/**
 * Auto-correct hint: gegeven de oversaturation-warning, welke section
 * zou eerst naar surface moeten worden gemoved? Pakt de grootste accent-
 * section uit de lijst (max impact bij minste sections-change).
 */
export function suggestAccentReduction(
  sections: SectionAreaEstimate[],
): string | null {
  const accents = sections.filter((s) => s.bgCategory === "accent");
  if (accents.length === 0) return null;
  accents.sort((a, b) => b.areaPct - a.areaPct);
  return accents[0]?.componentType ?? null;
}

/** Re-export voor Data-type omzeil (caller mag eigen mapping doen). */
export type { Data };
