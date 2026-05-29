/**
 * Site-DNA based LayoutStyle inference (V2-2b).
 *
 * Detecteert layoutStyle uit gescrapede signals zonder archetype-dependency:
 *  - photographyMood text keywords (Tier-1 signal — analyzer's eigen output
 *    bevat al woorden als "sophisticated/minimalist/playful/editorial")
 *  - brand-color saturation + luminance (Tier-2 signal — dark+desaturated
 *    duwt naar MINIMAL, vibrant+saturated naar PLAYFUL)
 *
 * Aanvulling op V2-2 `inferLayoutStyleFromBrand` die VERBAL brand-content
 * vereist (essence/personality/values). Dat is in scraper-fase nog niet
 * aanwezig — brand-foundation wordt apart aangemaakt.
 *
 * Pure functie; caller bepaalt persistence. Returnt null wanneer signals
 * te zwak zijn — caller laat layoutStyle dan op default staan.
 */
import type { LayoutStyle } from "../landing-pages/design-system";

export interface SiteDataInput {
  /** Gescrapede photographyMood field (BrandStyleguide.photographyStyle.mood). */
  photographyMood?: string | null;
  /** Brand-color hex (uit BrandStyleguide primary BrandColor). */
  brandHex?: string | null;
  /** Aantal afbeeldingen detecteerd op site (image-density signal). */
  imageDensity?: number | null;
}

export interface InferResult {
  layoutStyle: LayoutStyle;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  /** Per-style score breakdown — handig voor debug/UI. */
  scores: Record<LayoutStyle, number>;
}

// ─── Keyword maps per LayoutStyle ─────────────────────────

const KEYWORDS_PER_STYLE: Record<LayoutStyle, string[]> = {
  MINIMAL: [
    "minimal", "minimalist", "minimaal", "sparse", "quiet", "refined",
    "verfijnd", "sophisticated", "premium", "luxe", "luxury", "exclusief",
    "elegant", "clean", "monochrome", "monochroom", "understated",
    "high-end", "subtle", "subtiel",
  ],
  EDITORIAL: [
    "editorial", "magazine", "magazine-style", "narrative", "narratief",
    "feature", "documentary", "journalistic", "literary", "rijk",
    "considered", "intentional", "craft", "vakmanschap",
  ],
  COMMERCIAL: [
    "commercial", "commercieel", "conversion", "product-focused",
    "tight", "scannable", "scanbaar", "modern", "professional", "professioneel",
    "corporate", "business-led", "efficient", "efficiënt", "b2b",
  ],
  EXPERIENTIAL: [
    "experiential", "immersive", "story-driven", "cinematic", "atmospheric",
    "moody", "aspirational", "lifestyle", "narrative", "journey",
    "transformative", "dramatic", "evocative",
  ],
  PLAYFUL: [
    "playful", "speels", "fun", "vibrant", "bold", "energetic",
    "energiek", "colorful", "kleurrijk", "joyful", "vrolijk", "warm",
    "friendly", "vriendelijk", "casual", "approachable",
  ],
};

// ─── Color signal helpers ─────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace(/^#/, "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  // Relative luminance per WCAG (0 = black, 1 = white)
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function saturation({ r, g, b }: { r: number; g: number; b: number }): number {
  // HSL saturation (0..1) — high = vivid/playful, low = neutral/minimal
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

// ─── Score function per style ─────────────────────────────

function scoreKeywords(haystack: string, keywords: string[]): number {
  let count = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw)) count++;
  }
  return count;
}

// ─── Main inference ───────────────────────────────────────

export function inferLayoutStyleFromSiteData(
  input: SiteDataInput,
): InferResult | null {
  const mood = (input.photographyMood ?? "").toLowerCase().trim();
  if (!mood && !input.brandHex) return null;

  const scores: Record<LayoutStyle, number> = {
    MINIMAL: 0,
    EDITORIAL: 0,
    COMMERCIAL: 0,
    EXPERIENTIAL: 0,
    PLAYFUL: 0,
  };

  // Tier-1: photographyMood keyword-scan (gewicht 3 — sterkste signal)
  if (mood) {
    for (const style of Object.keys(scores) as LayoutStyle[]) {
      scores[style] += scoreKeywords(mood, KEYWORDS_PER_STYLE[style]) * 3;
    }
  }

  // Tier-2: brand-color saturation + luminance (gewicht 1 — zwakker signal)
  if (input.brandHex) {
    const rgb = hexToRgb(input.brandHex);
    if (rgb) {
      const sat = saturation(rgb);
      const lum = luminance(rgb);

      // High saturation (>0.7) duwt naar PLAYFUL/EXPERIENTIAL
      if (sat > 0.7) {
        scores.PLAYFUL += 1;
        scores.EXPERIENTIAL += 1;
      }
      // Low saturation (<0.25) duwt naar MINIMAL/EDITORIAL
      if (sat < 0.25) {
        scores.MINIMAL += 1;
        scores.EDITORIAL += 1;
      }
      // Very dark (<0.15 lum) of very light (>0.85 lum) → MINIMAL signal
      if (lum < 0.15 || lum > 0.85) {
        scores.MINIMAL += 1;
      }
      // Mid-range warm color → PLAYFUL hint
      if (lum > 0.3 && lum < 0.7 && sat > 0.5) {
        scores.PLAYFUL += 1;
      }
    }
  }

  // Tier-3: image density (gewicht 1)
  if (typeof input.imageDensity === "number") {
    if (input.imageDensity > 30) {
      scores.EXPERIENTIAL += 1;
      scores.EDITORIAL += 1;
    } else if (input.imageDensity < 5) {
      scores.MINIMAL += 1;
      scores.COMMERCIAL += 1;
    }
  }

  // Bepaal winner
  const entries = Object.entries(scores) as [LayoutStyle, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const [topStyle, topScore] = entries[0];
  const [, secondScore] = entries[1];

  if (topScore === 0) return null;

  // Confidence: high wanneer topScore ≥ 6 EN gap met second ≥ 3
  // medium wanneer topScore ≥ 3
  // low anders
  let confidence: "high" | "medium" | "low" = "low";
  if (topScore >= 6 && topScore - secondScore >= 3) confidence = "high";
  else if (topScore >= 3) confidence = "medium";

  const reasoning = `${topStyle} wint met score ${topScore} (next: ${secondScore}); signals uit ${mood ? "photographyMood" : ""}${mood && input.brandHex ? " + " : ""}${input.brandHex ? "brand-color" : ""}${input.imageDensity ? " + image-density" : ""}`;

  return {
    layoutStyle: topStyle,
    confidence,
    reasoning,
    scores,
  };
}
