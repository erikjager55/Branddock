// =============================================================
// Style Validator — validates generated images against the style profile
// =============================================================

import { extractColorsFromImage } from "./color-extractor";
import { extractImageStats } from "./image-stats-extractor";
import type {
  IllustrationStyleProfile,
  StyleValidationResult,
} from "./style-profile.types";

/**
 * Validate a generated image against the illustration style profile.
 * Compares color palette overlap and contrast/brightness similarity.
 * Returns an overall score (0-1) with per-dimension breakdown.
 */
export async function validateGeneratedImage(
  generatedBuffer: Buffer,
  profile: IllustrationStyleProfile,
): Promise<StyleValidationResult> {
  const [colors, stats] = await Promise.all([
    extractColorsFromImage(generatedBuffer),
    extractImageStats(generatedBuffer),
  ]);

  const deviations: string[] = [];

  // ─── Color Match Score ──────────────────────────────────

  const profileColors = profile.color.palette.map((c) => c.hex.toUpperCase());
  const generatedColors = colors.palette.map((c) => c.hex.toUpperCase());

  // Count how many generated colors are within deltaE threshold of any profile color
  let matchedColors = 0;
  const maxProfileColors = Math.min(profileColors.length, 8);

  for (const genHex of generatedColors) {
    const genRgb = hexToRgb(genHex);
    if (!genRgb) continue;

    let bestDistance = Infinity;
    for (const profHex of profileColors.slice(0, maxProfileColors)) {
      const profRgb = hexToRgb(profHex);
      if (!profRgb) continue;
      const dist = colorDistance(genRgb, profRgb);
      if (dist < bestDistance) bestDistance = dist;
    }

    // DeltaE < 25 in simplified RGB space ≈ perceptually close
    if (bestDistance < 25) {
      matchedColors++;
    } else if (bestDistance < 50) {
      matchedColors += 0.5;
    }
  }

  const colorMatchScore = generatedColors.length > 0
    ? Math.min(1, matchedColors / Math.min(generatedColors.length, maxProfileColors))
    : 0;

  if (colorMatchScore < 0.5) {
    deviations.push(
      `Color palette diverges significantly — only ${Math.round(colorMatchScore * 100)}% of colors match the profile`,
    );
  }

  // ─── Contrast Match Score ───────────────────────────────

  // Compare overall contrast/brightness to expected range based on profile
  const rgbChannels = stats.channelStats.slice(0, 3);
  const genContrast = rgbChannels.length >= 3
    ? (rgbChannels[0].stdDev + rgbChannels[1].stdDev + rgbChannels[2].stdDev) / 3
    : 50;

  const expectedContrast = contrastLevelToRange(profile.color.contrastLevel);
  const contrastDelta = Math.abs(genContrast - expectedContrast.center);
  const contrastMatchScore = Math.max(0, 1 - contrastDelta / expectedContrast.tolerance);

  if (contrastMatchScore < 0.5) {
    deviations.push(
      `Contrast level (${Math.round(genContrast)}) doesn't match expected ${profile.color.contrastLevel} contrast`,
    );
  }

  // ─── Saturation check ──────────────────────────────────

  const genBrightness = rgbChannels.length >= 3
    ? (rgbChannels[0].mean + rgbChannels[1].mean + rgbChannels[2].mean) / 3
    : 128;

  // Flat illustrations typically have lower entropy
  if (profile.texture.fillType === "flat" && stats.entropy > 7.5) {
    deviations.push(
      `Image appears more textured/detailed than expected for flat style (entropy: ${stats.entropy.toFixed(1)})`,
    );
  }

  // Gradient check
  if (!profile.color.usesGradients && stats.entropy > 7.0) {
    deviations.push("Possible unwanted gradients detected (high entropy for non-gradient style)");
  }

  // ─── Overall Score ─────────────────────────────────────

  // Weighted: color match is most important for illustration style
  const overallScore = Math.round(
    (colorMatchScore * 0.6 + contrastMatchScore * 0.25 + (deviations.length === 0 ? 0.15 : 0.05)) * 100,
  ) / 100;

  return {
    overallScore: Math.max(0, Math.min(1, overallScore)),
    colorMatchScore: Math.round(colorMatchScore * 100) / 100,
    contrastMatchScore: Math.round(contrastMatchScore * 100) / 100,
    deviations,
  };
}

// ─── Helpers ───────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

/** Simplified Euclidean RGB distance (not perceptually uniform but fast) */
function colorDistance(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2,
  );
}

function contrastLevelToRange(level: string): { center: number; tolerance: number } {
  switch (level) {
    case "low":
      return { center: 30, tolerance: 40 };
    case "medium":
      return { center: 55, tolerance: 35 };
    case "high":
      return { center: 80, tolerance: 30 };
    default:
      return { center: 55, tolerance: 50 };
  }
}
