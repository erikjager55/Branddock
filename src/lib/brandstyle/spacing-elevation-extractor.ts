/**
 * Spacing + elevation profile extractor (Fase A3 verbeterplan).
 *
 * Detecteert per element-context (section/card/button/input) de gebruikte
 * padding/margin + border-radius + box-shadow waarden. Renderers gebruiken
 * dit om brand-specifiek section-padding, card-elevation en corner-policy
 * toe te passen.
 *
 * Output:
 *  - spacingProfile: padding-Y/X samples per context, en de typical/dominant
 *    waarde per context (median)
 *  - elevationProfile: shadow-classification (none/subtle/medium/strong) per
 *    context + raw box-shadow strings
 *  - radiusProfile: border-radius samples per context
 *
 * Pure functie — geen DOM, geen DB.
 */

export type ElementContext = "section" | "card" | "button" | "input" | "container";

export interface SpacingSample {
  paddingY: string | null;
  paddingX: string | null;
}

export interface ElevationSample {
  raw: string;
  /** Heuristic classification op basis van blur-radius + opacity. */
  category: "none" | "subtle-shadow" | "medium-shadow" | "strong-shadow";
}

export interface SpacingProfile {
  section: { samples: SpacingSample[]; typical: SpacingSample | null };
  card: { samples: SpacingSample[]; typical: SpacingSample | null };
  button: { samples: SpacingSample[]; typical: SpacingSample | null };
  input: { samples: SpacingSample[]; typical: SpacingSample | null };
  container: { samples: SpacingSample[]; typical: SpacingSample | null };
}

export interface ElevationProfile {
  /** Alle box-shadow declaraties met categorisatie. */
  samples: ElevationSample[];
  /** Dominante categorie — gewogen meerderheid. */
  dominantCategory: "none" | "subtle-shadow" | "medium-shadow" | "strong-shadow";
}

export interface RadiusProfile {
  /** border-radius samples per context — bewaar raw string. */
  section: string[];
  card: string[];
  button: string[];
  input: string[];
  /** Dominante radius per element-type — pak meest-frequent. */
  cardTypical: string | null;
  buttonTypical: string | null;
  inputTypical: string | null;
}

// ─── Selector → context classifier ────────────────────────

const CONTEXT_PATTERNS: Array<{ context: ElementContext; pattern: RegExp }> = [
  { context: "section", pattern: /(^|[\s,])section(\s|,|\{|$)/i },
  { context: "section", pattern: /\.section(\b|[-_])/i },
  { context: "section", pattern: /\.hero(\b|[-_])/i },

  { context: "card", pattern: /\.card(\b|[-_])/i },
  { context: "card", pattern: /\.feature(\b|[-_])/i },
  { context: "card", pattern: /\.testimonial(\b|[-_])/i },
  { context: "card", pattern: /\.tile(\b|[-_])/i },

  { context: "button", pattern: /(^|[\s,])button(\s|,|\{|$)/i },
  { context: "button", pattern: /\.btn(\b|[-_])/i },
  { context: "button", pattern: /(^|[.\s\-_])cta(\b|[-_])/i },
  { context: "button", pattern: /\.wp-block-button/i },

  { context: "input", pattern: /(^|[\s,])input(\s|,|\{|$|\[)/i },
  { context: "input", pattern: /(^|[\s,])textarea(\s|,|\{|$)/i },
  { context: "input", pattern: /\.field(\b|[-_])/i },

  { context: "container", pattern: /\.container(\b|[-_])/i },
  { context: "container", pattern: /\.wrapper(\b|[-_])/i },
];

const SKIP_PATTERNS: RegExp[] = [
  /:hover\b/i, /:focus\b/i, /:active\b/i,
  /::before\b/i, /::after\b/i,
  /\.modal/i, /\.dropdown/i, /\.popup/i, /\.tooltip/i,
];

function classifyContext(selector: string): ElementContext | null {
  if (SKIP_PATTERNS.some((re) => re.test(selector))) return null;
  for (const { context, pattern } of CONTEXT_PATTERNS) {
    if (pattern.test(selector)) return context;
  }
  return null;
}

// ─── CSS rule parser (zelfde patroon als button/typography) ────

function parseCssRules(css: string): Array<{ selector: string; block: string }> {
  const results: Array<{ selector: string; block: string }> = [];
  const rulePattern = /([^{}@]+)\{([^{}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = rulePattern.exec(css)) !== null) {
    const selectorBlock = m[1].trim();
    const block = m[2];
    for (const single of selectorBlock.split(",")) {
      const trimmed = single.trim();
      if (!trimmed) continue;
      results.push({ selector: trimmed, block });
    }
  }
  return results;
}

function getProp(block: string, prop: string): string | null {
  const re = new RegExp(`(?:^|;|\\{)\\s*${prop}\\s*:\\s*([^;}]+?)(?:!important)?\\s*(?:;|}|$)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function splitPadding(value: string | null): SpacingSample {
  if (!value) return { paddingY: null, paddingX: null };
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return { paddingY: parts[0], paddingX: parts[0] };
  if (parts.length === 2) return { paddingY: parts[0], paddingX: parts[1] };
  if (parts.length >= 3) return { paddingY: parts[0], paddingX: parts[1] };
  return { paddingY: null, paddingX: null };
}

// ─── Box-shadow categorization ────────────────────────────

function classifyShadow(raw: string): ElevationSample["category"] {
  const lower = raw.toLowerCase().trim();
  if (lower === "none" || lower === "0" || lower === "0 0 0") return "none";
  // Pak blur-waarde (3e numerieke value in box-shadow string)
  const numbers = (lower.match(/-?\d+(?:\.\d+)?(?:px|rem|em)?/g) ?? []).map((n) => parseFloat(n));
  // [offsetX, offsetY, blur, spread]
  const blur = numbers[2] ?? 0;
  // Alpha uit rgba()
  const rgbaMatch = lower.match(/rgba?\([^)]*,\s*([\d.]+)\s*\)/);
  const alpha = rgbaMatch ? parseFloat(rgbaMatch[1]) : 1;
  if (blur <= 4 && alpha <= 0.15) return "subtle-shadow";
  if (blur <= 15) return "medium-shadow";
  return "strong-shadow";
}

// ─── Median picker ────────────────────────────────────────

function pickTypical(samples: SpacingSample[]): SpacingSample | null {
  if (samples.length === 0) return null;
  // Group by paddingY value
  const byY = new Map<string, number>();
  const byX = new Map<string, number>();
  for (const s of samples) {
    if (s.paddingY) byY.set(s.paddingY, (byY.get(s.paddingY) ?? 0) + 1);
    if (s.paddingX) byX.set(s.paddingX, (byX.get(s.paddingX) ?? 0) + 1);
  }
  const topY = pickTopKey(byY);
  const topX = pickTopKey(byX);
  return { paddingY: topY, paddingX: topX };
}

function pickTopKey(map: Map<string, number>): string | null {
  let topKey: string | null = null;
  let topCount = 0;
  for (const [key, count] of map.entries()) {
    if (count > topCount) {
      topCount = count;
      topKey = key;
    }
  }
  return topKey;
}

function pickDominantCategory(samples: ElevationSample[]): ElevationProfile["dominantCategory"] {
  if (samples.length === 0) return "none";
  const counts: Record<ElevationSample["category"], number> = {
    none: 0,
    "subtle-shadow": 0,
    "medium-shadow": 0,
    "strong-shadow": 0,
  };
  for (const s of samples) counts[s.category]++;
  let topCat: ElevationSample["category"] = "none";
  let topCount = -1;
  for (const [cat, count] of Object.entries(counts) as [ElevationSample["category"], number][]) {
    if (count > topCount) {
      topCount = count;
      topCat = cat;
    }
  }
  return topCat;
}

// ─── Main extraction ──────────────────────────────────────

export function extractSpacingElevationProfile(css: string): {
  spacingProfile: SpacingProfile;
  elevationProfile: ElevationProfile;
  radiusProfile: RadiusProfile;
} {
  const rules = parseCssRules(css);

  const spacing: SpacingProfile = {
    section: { samples: [], typical: null },
    card: { samples: [], typical: null },
    button: { samples: [], typical: null },
    input: { samples: [], typical: null },
    container: { samples: [], typical: null },
  };
  const elevation: ElevationProfile = {
    samples: [],
    dominantCategory: "none",
  };
  const radius: RadiusProfile = {
    section: [],
    card: [],
    button: [],
    input: [],
    cardTypical: null,
    buttonTypical: null,
    inputTypical: null,
  };

  for (const { selector, block } of rules) {
    const context = classifyContext(selector);
    if (!context) continue;

    // Padding extraction
    const paddingShort = getProp(block, "padding");
    const sample: SpacingSample = splitPadding(paddingShort);
    const longPY =
      getProp(block, "padding-top") ?? getProp(block, "padding-block");
    const longPX =
      getProp(block, "padding-left") ?? getProp(block, "padding-inline");
    if (longPY) sample.paddingY = longPY;
    if (longPX) sample.paddingX = longPX;
    if (sample.paddingY || sample.paddingX) {
      spacing[context].samples.push(sample);
    }

    // Border-radius
    const br = getProp(block, "border-radius");
    if (br) {
      if (context === "section") radius.section.push(br);
      else if (context === "card") radius.card.push(br);
      else if (context === "button") radius.button.push(br);
      else if (context === "input") radius.input.push(br);
    }

    // Box-shadow
    const bs = getProp(block, "box-shadow");
    if (bs && bs.toLowerCase() !== "none") {
      elevation.samples.push({
        raw: bs,
        category: classifyShadow(bs),
      });
    }
  }

  // Compute typicals
  spacing.section.typical = pickTypical(spacing.section.samples);
  spacing.card.typical = pickTypical(spacing.card.samples);
  spacing.button.typical = pickTypical(spacing.button.samples);
  spacing.input.typical = pickTypical(spacing.input.samples);
  spacing.container.typical = pickTypical(spacing.container.samples);
  elevation.dominantCategory = pickDominantCategory(elevation.samples);

  // Radius typicals = meest-frequent waarde per context
  const cardCounts = new Map<string, number>();
  for (const r of radius.card) cardCounts.set(r, (cardCounts.get(r) ?? 0) + 1);
  radius.cardTypical = pickTopKey(cardCounts);
  const buttonCounts = new Map<string, number>();
  for (const r of radius.button) buttonCounts.set(r, (buttonCounts.get(r) ?? 0) + 1);
  radius.buttonTypical = pickTopKey(buttonCounts);
  const inputCounts = new Map<string, number>();
  for (const r of radius.input) inputCounts.set(r, (inputCounts.get(r) ?? 0) + 1);
  radius.inputTypical = pickTopKey(inputCounts);

  return { spacingProfile: spacing, elevationProfile: elevation, radiusProfile: radius };
}
