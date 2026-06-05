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

// Geëxporteerd zodat de smoke kan asserteren dat de pill-sentinel (9999) in
// `values` zit maar NIET in median/mostCommon lekt (review-fix Fase 5c).
export function extractBorderRadius(css: string) {
  const values: number[] = [];
  const regex = /border-radius\s*:\s*([^;]+)/gi;
  let match;

  while ((match = regex.exec(css)) !== null) {
    const raw = match[1].trim();
    // Parse first value (handles "8px", "0.5rem", "50%", "8px 4px 8px 4px")
    const numMatch = raw.match(/(\d+(?:\.\d+)?)\s*(px|rem|em|%)?/);
    if (numMatch) {
      let val = parseFloat(numMatch[1]);
      const unit = numMatch[2];
      if (unit === "rem" || unit === "em") val *= 16;
      if (isNaN(val)) continue;
      // Fase 5c: bewaar pill/cirkel-radius als één sentinel (9999) i.p.v. 'm
      // te droppen — `border-radius:50%` (cirkel) of `9999px`/`100px+` (pill).
      // Zonder dit kreeg de "full"-bucket per ongeluk een kleine radius (4px).
      if (unit === "%") {
        if (val >= 50) values.push(9999);
      } else if (val >= 100) {
        values.push(9999);
      } else {
        values.push(Math.round(val));
      }
    }
  }

  values.sort((a, b) => a - b);

  // Review-fix: de pill-sentinel (9999, Fase 5c) hoort in `values` zodat
  // `deriveCornerRadii` de pill kan herkennen — maar mag NIET de stats
  // vervuilen. De Design-Language-prompt gebruikt `median`/`mostCommon` als
  // "observed corner-radius"; een enkele pill (avatar/badge) zou de AI dan
  // 9999px voorschotelen. Bereken de stats daarom over de niet-pill radii.
  const nonPill = values.filter((v) => v < 9999);
  return {
    values,
    median: nonPill.length > 0 ? nonPill[Math.floor(nonPill.length / 2)] : 0,
    mostCommon: findMostCommon(nonPill) ?? 0,
    hasVariation: new Set(nonPill).size > 3,
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

// ─── Spacing Tokens (Fase 4) ───────────────────────────────

export interface SpacingScaleTokens {
  gridBase: number | null;
  tokens: Array<{ name: string; value: number }>; // px values, sorted
}

export interface CornerRadiiTokens {
  tokens: Array<{ name: string; value: number }>; // px values, sorted
}

export interface ShadowSystemTokens {
  tokens: Array<{ name: string; value: string; intensity: "subtle" | "medium" | "bold" }>;
}

/**
 * Derive structured design tokens from raw CSS heuristics. Used in Fase 4 to
 * populate the Spacing section cards (scale, radii, shadows).
 */
export function buildSpacingTokens(heuristics: CssVisualHeuristics): {
  spacingScale: SpacingScaleTokens;
  cornerRadii: CornerRadiiTokens;
  shadowSystem: ShadowSystemTokens;
} {
  return {
    spacingScale: deriveSpacingScale(heuristics.spacing),
    cornerRadii: deriveCornerRadii(heuristics.borderRadius),
    shadowSystem: deriveShadowSystem(heuristics.boxShadow),
  };
}

function deriveSpacingScale(spacing: CssVisualHeuristics["spacing"]): SpacingScaleTokens {
  const { values, gridBase } = spacing;
  if (!values || values.length === 0) {
    return { gridBase, tokens: [] };
  }
  // Frequency count, then pick top distinct values in ascending order.
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  const unique = Array.from(freq.keys()).sort((a, b) => a - b);

  // Pick values that appear more than once (reduces noise), cap to 6 tokens.
  const candidates = unique.filter((v) => (freq.get(v) ?? 0) > 1);
  const picks = (candidates.length >= 3 ? candidates : unique).slice(0, 6);

  const labels = ["xs", "sm", "md", "lg", "xl", "2xl"];
  const tokens = picks.map((value, i) => ({ name: labels[i] ?? `t${i + 1}`, value }));
  return { gridBase, tokens };
}

export function deriveCornerRadii(
  radius: CssVisualHeuristics["borderRadius"],
): CornerRadiiTokens {
  const { values } = radius;
  if (!values || values.length === 0) return { tokens: [] };
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  const unique = Array.from(freq.keys()).sort((a, b) => a - b);
  // Fase 5c: scheid de pill-sentinel (9999) van de echte radii zodat "full"
  // de WERKELIJKE pill is en niet per ongeluk de 4e-kleinste radius. Kleine
  // radii → sm/md/lg (max 3); een aanwezige pill → full.
  const hasPill = unique.some((v) => v >= 9999);
  const smalls = unique.filter((v) => v < 9999);
  if (smalls.length === 1 && !hasPill) {
    return { tokens: [{ name: "default", value: smalls[0] }] };
  }
  const smallLabels = ["sm", "md", "lg"];
  const tokens = smalls
    .slice(0, 3)
    .map((value, i) => ({ name: smallLabels[i] ?? `r${i + 1}`, value }));
  if (hasPill) tokens.push({ name: "full", value: 9999 });
  return { tokens };
}

function deriveShadowSystem(
  shadow: CssVisualHeuristics["boxShadow"],
): ShadowSystemTokens {
  const { samples } = shadow;
  if (!samples || samples.length === 0) return { tokens: [] };

  // Dedupe preserving order.
  const seen = new Set<string>();
  const unique = samples.filter((s) => {
    const key = s.replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const labels = ["subtle", "default", "bold", "elevated"];
  return {
    tokens: unique.slice(0, 4).map((value, i) => {
      const blurMatch = value.match(/\d+\s*px\s+\d+\s*px\s+(\d+)\s*px/);
      const blur = blurMatch ? parseInt(blurMatch[1], 10) : 0;
      const intensity: "subtle" | "medium" | "bold" =
        blur <= 6 ? "subtle" : blur <= 16 ? "medium" : "bold";
      return { name: labels[i] ?? `s${i + 1}`, value, intensity };
    }),
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
