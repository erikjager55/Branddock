// =============================================================
// CSS Visual Heuristics Extractor
//
// Parses raw CSS text to extract quantitative visual language
// signals: border-radius, box-shadow, borders, spacing, gradients.
// These ground the Claude Vision analysis with objective data.
// =============================================================

import type { CssVisualHeuristics } from "./visual-language.types";

/**
 * Extract visual language heuristics from raw CSS content.
 * Works on the `allCss` string already available in the url-scraper pipeline.
 */
export function extractVisualLanguageHeuristics(
  allCss: string,
): CssVisualHeuristics {
  return {
    borderRadius: extractBorderRadius(allCss),
    boxShadow: extractBoxShadow(allCss),
    borders: extractBorders(allCss),
    spacing: extractSpacing(allCss),
    gradients: extractGradients(allCss),
    glassmorphism: extractGlassmorphism(allCss),
  };
}

// ─── Border Radius ─────────────────────────────────────────

function extractBorderRadius(css: string) {
  const values: number[] = [];
  const regex = /border-radius\s*:\s*([^;]+)/gi;
  let match;

  while ((match = regex.exec(css)) !== null) {
    const raw = match[1].trim();
    // Parse first value (handles "8px", "0.5rem", "50%", "8px 4px 8px 4px")
    const numMatch = raw.match(/(\d+(?:\.\d+)?)\s*(px|rem|em)?/);
    if (numMatch) {
      let val = parseFloat(numMatch[1]);
      const unit = numMatch[2];
      if (unit === "rem" || unit === "em") val *= 16;
      if (!isNaN(val) && val < 100) values.push(Math.round(val));
    }
  }

  values.sort((a, b) => a - b);

  return {
    values,
    median: values.length > 0 ? values[Math.floor(values.length / 2)] : 0,
    mostCommon: findMostCommon(values) ?? 0,
    hasVariation: new Set(values).size > 3,
  };
}

// ─── Box Shadow ────────────────────────────────────────────

function extractBoxShadow(css: string) {
  const regex = /box-shadow\s*:\s*([^;]+)/gi;
  const samples: string[] = [];
  let hasSubtle = false;
  let hasBold = false;
  let hasColored = false;
  let match;

  while ((match = regex.exec(css)) !== null) {
    const raw = match[1].trim();
    if (raw === "none" || raw === "initial") continue;
    samples.push(raw);

    // Classify shadow intensity by blur radius
    const blurMatch = raw.match(/\d+\s*px\s+\d+\s*px\s+(\d+)\s*px/);
    const blur = blurMatch ? parseInt(blurMatch[1]) : 0;
    if (blur <= 8) hasSubtle = true;
    if (blur > 16) hasBold = true;

    // Check for colored shadows (not just rgba(0,0,0,...))
    if (/rgba?\(\s*(?!0\s*,\s*0\s*,\s*0)/.test(raw)) hasColored = true;
  }

  return {
    count: samples.length,
    hasSubtle,
    hasBold,
    hasColored,
    samples: samples.slice(0, 5),
  };
}

// ─── Borders ───────────────────────────────────────────────

function extractBorders(css: string) {
  const widths: number[] = [];
  const colors: string[] = [];
  const regex = /(?:^|[{;])\s*border(?:-(?:top|right|bottom|left))?\s*:\s*([^;]+)/gi;
  let match;

  while ((match = regex.exec(css)) !== null) {
    const raw = match[1].trim();
    if (raw === "none" || raw === "0") continue;

    const widthMatch = raw.match(/(\d+(?:\.\d+)?)\s*px/);
    if (widthMatch) widths.push(parseFloat(widthMatch[1]));

    const colorMatch = raw.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/);
    if (colorMatch) colors.push(colorMatch[0]);
  }

  return {
    count: widths.length,
    widths,
    medianWidth: widths.length > 0
      ? widths.sort((a, b) => a - b)[Math.floor(widths.length / 2)]
      : 0,
    colors: [...new Set(colors)].slice(0, 10),
  };
}

// ─── Spacing ───────────────────────────────────────────────

function extractSpacing(css: string) {
  const values: number[] = [];
  const regex = /(?:padding|margin|gap)\s*:\s*([^;]+)/gi;
  let match;

  while ((match = regex.exec(css)) !== null) {
    const raw = match[1].trim();
    const nums = raw.match(/(\d+(?:\.\d+)?)\s*(px|rem|em)/g);
    if (nums) {
      for (const n of nums) {
        const parts = n.match(/(\d+(?:\.\d+)?)\s*(px|rem|em)/);
        if (!parts) continue;
        let val = parseFloat(parts[1]);
        if (parts[2] === "rem" || parts[2] === "em") val *= 16;
        if (!isNaN(val) && val > 0 && val < 200) values.push(Math.round(val));
      }
    }
  }

  values.sort((a, b) => a - b);

  // Detect grid base (4px or 8px system)
  let gridBase: number | null = null;
  if (values.length > 5) {
    const divisibleBy8 = values.filter((v) => v % 8 === 0).length;
    const divisibleBy4 = values.filter((v) => v % 4 === 0).length;
    if (divisibleBy8 / values.length > 0.6) gridBase = 8;
    else if (divisibleBy4 / values.length > 0.6) gridBase = 4;
  }

  return {
    values: values.slice(0, 50),
    median: values.length > 0 ? values[Math.floor(values.length / 2)] : 16,
    gridBase,
  };
}

// ─── Gradients ─────────────────────────────────────────────

function extractGradients(css: string) {
  const regex = /(?:linear|radial|conic)-gradient\([^)]+\)/gi;
  const samples: string[] = [];
  let match;

  while ((match = regex.exec(css)) !== null) {
    samples.push(match[0]);
  }

  return {
    count: samples.length,
    samples: samples.slice(0, 5),
  };
}

// ─── Glassmorphism ─────────────────────────────────────────

function extractGlassmorphism(css: string) {
  const backdropFilter = /backdrop-filter\s*:/i.test(css);
  const semiTransparentBg = /background\s*:\s*rgba?\([^)]*,\s*0\.[1-8]/i.test(css);

  return {
    detected: backdropFilter && semiTransparentBg,
    backdropFilter,
    semiTransparentBg,
  };
}

// ─── Helpers ───────────────────────────────────────────────

function findMostCommon(values: number[]): number | null {
  if (values.length === 0) return null;
  const freq = new Map<number, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  let maxCount = 0;
  let maxVal = values[0];
  for (const [val, count] of freq) {
    if (count > maxCount) {
      maxCount = count;
      maxVal = val;
    }
  }
  return maxVal;
}
