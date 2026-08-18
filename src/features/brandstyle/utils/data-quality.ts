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
import { resolveFontRender } from "./font-loading";

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
/**
 * Fonts die de gebruiker WEL in zijn styleguide ziet staan, maar die op het
 * scherm als iets anders renderen.
 *
 * Waarom dit een aparte controle is: `computeDataQuality` kijkt naar de
 * herkomst van een token — is de waarde gedetecteerd of geraden. Een font kan
 * met volle zekerheid gedetecteerd zijn (origin = detected, high confidence) en
 * tóch als Inter renderen omdat het bestand ontbreekt. De badge stond dan op
 * groen om de verkéérde reden, en het gat was alleen te zien door per merk de
 * Typography-tab te openen.
 *
 * ⚠️ Een leeg `fileUrl` is hiervoor GEEN bruikbaar signaal, en dat is
 * contra-intuïtief. Meting op productie (2026-08-18): 44 van de 44 fonts hebben
 * geen bestand, maar slechts 29 renderen als substituut —
 * `GOOGLE_FONTS` (15 stuks) laden gewoon bij Google en hebben nooit een bestand
 * nodig. De taak die hierover ging leidde de impact af uit die ene kolom en
 * kwam daardoor op "44 van de 44 kapot" uit.
 *
 * Het echte signaal is het renderplan, en dat is precies wat de Typography-tab
 * zelf gebruikt. Deze functie spiegelt óók de extra tak uit die tab: een font
 * zonder `availability` (pure AI-inferentie) valt daar terug op de echte Google
 * Font en is dus niet gesubstitueerd — vandaar de `availability != null`-eis.
 */
function substitutedFontItems(styleguide: BrandStyleguide): DataQualityItem[] {
  const workspaceKitId = styleguide.workspaceAdobeFontsKitId ?? null;
  const seen = new Set<string>();
  const items: DataQualityItem[] = [];

  for (const font of styleguide.fonts ?? []) {
    const name = font.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const plan = resolveFontRender(name, font.availability, { workspaceKitId });
    if (plan.source !== "SUBSTITUTE" || font.availability == null) continue;

    items.push({
      path: `font:${key}`,
      label: name,
      tab: "typography",
      origin: {
        source: "fallback",
        confidence: "low",
        detector: "font-render",
        evidence: plan.substitute
          ? `rendert als ${plan.substitute.googleFont} — geen bestand en geen Adobe-kit`
          : "rendert niet — geen bestand, geen Adobe-kit en geen substituut",
      },
      uncertain: true,
    });
  }
  return items;
}

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

  // De gesubstitueerde fonts komen erbij als volwaardige items: ze tellen mee in
  // het totaal én in needsAttention, zodat de badge en de wizard ze allebei
  // laten zien zonder dat hun consumenten iets hoeven te weten.
  const allItems = [...items, ...substitutedFontItems(styleguide)];

  return {
    provenance,
    items: allItems,
    needsAttention: allItems.filter((i) => i.uncertain),
  };
}
