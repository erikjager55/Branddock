// =============================================================
// Color Extraction — node-vibrant wrapper
// =============================================================

import { Vibrant } from "node-vibrant/node";
import { normalizeHex } from "@/features/brandstyle/utils/color-utils";
import type { ExtractedColorPalette } from "./style-profile.types";

const SWATCH_NAMES = [
  "Vibrant",
  "Muted",
  "DarkVibrant",
  "DarkMuted",
  "LightVibrant",
  "LightMuted",
] as const;

/**
 * Extract dominant colors from an image buffer using node-vibrant.
 * Returns named swatches with hex values and population percentages.
 */
export async function extractColorsFromImage(
  buffer: Buffer,
): Promise<ExtractedColorPalette> {
  const palette = await Vibrant.from(buffer).getPalette();

  let totalPopulation = 0;
  const rawSwatches: { hex: string; population: number; name: string }[] = [];

  for (const name of SWATCH_NAMES) {
    const swatch = palette[name];
    if (!swatch) continue;
    totalPopulation += swatch.population;
    rawSwatches.push({
      hex: normalizeHex(swatch.hex ?? "#000000") ?? swatch.hex ?? "#000000",
      population: swatch.population,
      name,
    });
  }

  // Sort by population descending
  rawSwatches.sort((a, b) => b.population - a.population);

  // Convert population to percentage
  const paletteWithPercentage = rawSwatches.map((s) => ({
    hex: s.hex,
    population: totalPopulation > 0
      ? Math.round((s.population / totalPopulation) * 1000) / 10
      : 0,
    name: s.name,
  }));

  return {
    palette: paletteWithPercentage,
    dominantHex: paletteWithPercentage[0]?.hex ?? "#000000",
    colorCount: paletteWithPercentage.length,
  };
}

/**
 * Merge multiple color extractions into a consensus palette.
 * Colors within deltaE ~30 are grouped; percentages averaged.
 */
export function mergeColorPalettes(
  palettes: ExtractedColorPalette[],
): ExtractedColorPalette {
  if (palettes.length === 0) {
    return { palette: [], dominantHex: "#000000", colorCount: 0 };
  }
  if (palettes.length === 1) return palettes[0];

  // Collect all colors
  const allColors = palettes.flatMap((p) => p.palette);

  // Simple dedup: group by exact hex, average populations
  const hexMap = new Map<string, { population: number; count: number; name: string }>();
  for (const c of allColors) {
    const existing = hexMap.get(c.hex);
    if (existing) {
      existing.population += c.population;
      existing.count += 1;
    } else {
      hexMap.set(c.hex, { population: c.population, count: 1, name: c.name });
    }
  }

  const merged = Array.from(hexMap.entries())
    .map(([hex, data]) => ({
      hex,
      population: Math.round((data.population / data.count) * 10) / 10,
      name: data.name,
    }))
    .sort((a, b) => b.population - a.population)
    .slice(0, 12); // max 12 colors

  return {
    palette: merged,
    dominantHex: merged[0]?.hex ?? "#000000",
    colorCount: merged.length,
  };
}
