// =============================================================
// G8 — deterministic color alignment for visual fidelity
//
// Compares the dominant colors of a generated image against the
// workspace BrandStyleguide palette using ΔE (CIE76) in Lab space.
// Output: 0-100 score + per-color match details.
//
// Pure helpers — no I/O. Caller (visual-fidelity-scorer) supplies
// pre-extracted swatches (via node-vibrant) and brand colors.
// =============================================================

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface LabColor {
  L: number;
  a: number;
  b: number;
}

export interface BrandColor {
  hex: string;
  /** Optional category — primary/secondary/accent/etc. — used for weighting. */
  category?: string;
}

export interface GeneratedSwatch {
  hex: string;
  /** Population percentage in source image (0-100). Drives weight. */
  population: number;
}

export interface ColorMatch {
  generatedHex: string;
  generatedPopulation: number;
  brandHex: string | null;
  brandCategory: string | null;
  deltaE: number;
  /** ΔE rule of thumb: <1 imperceptible, <2.3 just-noticeable, <5 acceptable, <10 noticeable, >10 different colors. */
  matchQuality: "exact" | "close" | "acceptable" | "noticeable" | "different";
}

export interface ColorAlignmentResult {
  /** 0-100 weighted by population coverage. */
  score: number;
  matches: ColorMatch[];
  /** Generated swatches with no brand color within ΔE < 10. */
  unmatchedColors: { hex: string; population: number }[];
  /** Brand colors that did appear (any matchQuality except "different"). */
  matchedBrandHexes: string[];
}

// ─── Hex → RGB ──────────────────────────────────────────

export function hexToRgb(hex: string): RgbColor | null {
  const cleaned = hex.replace(/^#/, "").trim();
  if (cleaned.length !== 6 && cleaned.length !== 3) return null;
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

// ─── RGB → Lab (via XYZ, D65 reference white) ──────────

function pivot(channel: number): number {
  const v = channel / 255;
  return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
}

function labPivot(t: number): number {
  // CIE epsilon = (6/29)^3, kappa = (29/3)^3
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

export function rgbToLab(rgb: RgbColor): LabColor {
  const r = pivot(rgb.r);
  const g = pivot(rgb.g);
  const b = pivot(rgb.b);

  // sRGB → XYZ (D65)
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

  // Reference white D65
  const Xn = 0.95047;
  const Yn = 1.0;
  const Zn = 1.08883;

  const fx = labPivot(x / Xn);
  const fy = labPivot(y / Yn);
  const fz = labPivot(z / Zn);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

// ─── ΔE (CIE76) ─────────────────────────────────────────

export function deltaE76(a: LabColor, b: LabColor): number {
  return Math.sqrt(
    (a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2,
  );
}

function quality(deltaE: number): ColorMatch["matchQuality"] {
  if (deltaE < 1) return "exact";
  if (deltaE < 2.3) return "close";
  if (deltaE < 5) return "acceptable";
  if (deltaE < 10) return "noticeable";
  return "different";
}

// ─── Main scorer ────────────────────────────────────────

/**
 * Score how well a generated image's color palette aligns with the
 * brand palette. Returns 0-100 weighted by the generated population.
 *
 * Logic:
 *  1. For each generated swatch, find nearest brand color in Lab space.
 *  2. Convert ΔE to a per-swatch score (≤2.3 → 100, ≥10 → 0, linear in between).
 *  3. Weighted average by population.
 *  4. If no brand colors are provided, returns 0 (unscoreable — caller skips).
 */
export function alignColorsToPalette(
  generated: GeneratedSwatch[],
  brand: BrandColor[],
): ColorAlignmentResult {
  if (brand.length === 0 || generated.length === 0) {
    return {
      score: 0,
      matches: [],
      unmatchedColors: generated.map((g) => ({ hex: g.hex, population: g.population })),
      matchedBrandHexes: [],
    };
  }

  // Pre-compute Lab for brand colors (reused per generated swatch)
  const brandLabs = brand
    .map((b) => {
      const rgb = hexToRgb(b.hex);
      if (!rgb) return null;
      return { hex: b.hex.toLowerCase(), category: b.category ?? null, lab: rgbToLab(rgb) };
    })
    .filter((b): b is { hex: string; category: string | null; lab: LabColor } => b !== null);

  if (brandLabs.length === 0) {
    return {
      score: 0,
      matches: [],
      unmatchedColors: generated.map((g) => ({ hex: g.hex, population: g.population })),
      matchedBrandHexes: [],
    };
  }

  const matches: ColorMatch[] = [];
  const matchedSet = new Set<string>();
  const unmatched: { hex: string; population: number }[] = [];

  let totalPopulation = 0;
  let weightedScore = 0;

  for (const swatch of generated) {
    const swatchRgb = hexToRgb(swatch.hex);
    if (!swatchRgb) continue;
    const swatchLab = rgbToLab(swatchRgb);

    // Find nearest brand color
    let best = brandLabs[0];
    let bestDelta = deltaE76(swatchLab, best.lab);
    for (let i = 1; i < brandLabs.length; i++) {
      const d = deltaE76(swatchLab, brandLabs[i].lab);
      if (d < bestDelta) {
        bestDelta = d;
        best = brandLabs[i];
      }
    }

    const q = quality(bestDelta);
    matches.push({
      generatedHex: swatch.hex,
      generatedPopulation: swatch.population,
      brandHex: q === "different" ? null : best.hex,
      brandCategory: q === "different" ? null : best.category,
      deltaE: Math.round(bestDelta * 100) / 100,
      matchQuality: q,
    });

    if (q === "different") {
      unmatched.push({ hex: swatch.hex, population: swatch.population });
    } else {
      matchedSet.add(best.hex);
    }

    // Per-swatch score: linear from 100 (deltaE ≤ 2.3) to 0 (deltaE ≥ 10)
    let perSwatchScore: number;
    if (bestDelta <= 2.3) perSwatchScore = 100;
    else if (bestDelta >= 10) perSwatchScore = 0;
    else perSwatchScore = Math.round(((10 - bestDelta) / (10 - 2.3)) * 100);

    weightedScore += perSwatchScore * swatch.population;
    totalPopulation += swatch.population;
  }

  const score =
    totalPopulation > 0 ? Math.round(weightedScore / totalPopulation) : 0;

  return {
    score,
    matches,
    unmatchedColors: unmatched,
    matchedBrandHexes: [...matchedSet],
  };
}
