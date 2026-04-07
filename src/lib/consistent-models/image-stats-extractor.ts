// =============================================================
// Image Stats Extraction — sharp wrapper
// =============================================================

import sharp from "sharp";
import type { ImageStats } from "./style-profile.types";

/**
 * Extract statistical properties from an image buffer using sharp.
 * Used to provide objective grounding data for the Claude Vision analysis.
 */
export async function extractImageStats(
  buffer: Buffer,
): Promise<ImageStats> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const stats = await image.stats();

  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    channels: metadata.channels ?? 3,
    entropy: stats.entropy ?? 0,
    hasAlpha: metadata.hasAlpha ?? false,
    format: metadata.format ?? "unknown",
    channelStats: stats.channels.map((ch) => ({
      mean: Math.round(ch.mean * 100) / 100,
      stdDev: Math.round(ch.stdev * 100) / 100,
      min: ch.min,
      max: ch.max,
    })),
  };
}

/**
 * Compute a consensus of image stats across multiple images.
 * Returns averages for numerical values.
 */
export function mergeImageStats(statsArray: ImageStats[]): {
  avgEntropy: number;
  avgBrightness: number;
  avgContrast: number;
  avgWidth: number;
  avgHeight: number;
  commonFormat: string;
  hasAlpha: boolean;
} {
  if (statsArray.length === 0) {
    return {
      avgEntropy: 0,
      avgBrightness: 128,
      avgContrast: 50,
      avgWidth: 0,
      avgHeight: 0,
      commonFormat: "unknown",
      hasAlpha: false,
    };
  }

  const n = statsArray.length;
  let totalEntropy = 0;
  let totalBrightness = 0;
  let totalContrast = 0;
  let totalWidth = 0;
  let totalHeight = 0;
  let anyAlpha = false;
  const formatCounts = new Map<string, number>();

  for (const s of statsArray) {
    totalEntropy += s.entropy;
    totalWidth += s.width;
    totalHeight += s.height;
    if (s.hasAlpha) anyAlpha = true;

    // RGB brightness = average of channel means
    const rgbChannels = s.channelStats.slice(0, 3);
    if (rgbChannels.length >= 3) {
      totalBrightness += (rgbChannels[0].mean + rgbChannels[1].mean + rgbChannels[2].mean) / 3;
      totalContrast += (rgbChannels[0].stdDev + rgbChannels[1].stdDev + rgbChannels[2].stdDev) / 3;
    }

    formatCounts.set(s.format, (formatCounts.get(s.format) ?? 0) + 1);
  }

  // Most common format
  let commonFormat = "png";
  let maxCount = 0;
  for (const [fmt, count] of formatCounts) {
    if (count > maxCount) {
      maxCount = count;
      commonFormat = fmt;
    }
  }

  return {
    avgEntropy: Math.round((totalEntropy / n) * 100) / 100,
    avgBrightness: Math.round(totalBrightness / n),
    avgContrast: Math.round((totalContrast / n) * 100) / 100,
    avgWidth: Math.round(totalWidth / n),
    avgHeight: Math.round(totalHeight / n),
    commonFormat,
    hasAlpha: anyAlpha,
  };
}
