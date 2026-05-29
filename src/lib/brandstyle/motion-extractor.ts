/**
 * Motion-signature extractor (Fase A4 verbeterplan).
 *
 * Detecteert CSS transition + animation-duration declaraties en
 * categoriseert ze naar speed-categorie (instant / quick / comfortable /
 * slow). Bewaart ook gangbare easing-functions.
 *
 * Renderers gebruiken dit voor brand-specifieke hover-transitions op
 * buttons + section-fades.
 *
 * Pure functie — geen DOM, geen DB.
 */

export type MotionCategory = "instant" | "quick" | "comfortable" | "slow";

export interface MotionSample {
  /** Originele transition/animation-duration waarde. */
  raw: string;
  durationMs: number;
  category: MotionCategory;
  /** Easing functie wanneer expliciet aanwezig in declaration. */
  easing: string | null;
}

export interface MotionProfile {
  samples: MotionSample[];
  /** Dominante speed-categorie. */
  dominantCategory: MotionCategory;
  /** Gemiddelde duration in ms. */
  averageDurationMs: number | null;
  /** Meest voorkomende easing-function. */
  dominantEasing: string | null;
}

// ─── Duration parsing ─────────────────────────────────────

function parseDuration(value: string): number | null {
  const trimmed = value.trim();
  // ms: bv "200ms"
  const msMatch = trimmed.match(/^(\d+(?:\.\d+)?)ms$/i);
  if (msMatch) return parseFloat(msMatch[1]);
  // s: bv "0.2s"
  const sMatch = trimmed.match(/^(\d+(?:\.\d+)?)s$/i);
  if (sMatch) return parseFloat(sMatch[1]) * 1000;
  return null;
}

function categorize(ms: number): MotionCategory {
  if (ms <= 100) return "instant";
  if (ms <= 200) return "quick";
  if (ms <= 400) return "comfortable";
  return "slow";
}

// ─── Easing detection ─────────────────────────────────────

// Sorted longest-first zodat "ease-in-out" wint van "ease-in" wint van "ease"
const KNOWN_EASINGS = [
  "ease-in-out",
  "ease-out",
  "ease-in",
  "linear",
  "ease",
];

function extractEasing(transitionValue: string): string | null {
  const lower = transitionValue.toLowerCase();
  // cubic-bezier(...) catch-all
  const cubicMatch = lower.match(/cubic-bezier\([^)]+\)/);
  if (cubicMatch) return cubicMatch[0];
  for (const e of KNOWN_EASINGS) {
    // Match: easing-keyword aan word-boundary aan beide kanten zonder
    // extra hyphens (zodat "ease" niet matcht in "ease-out")
    const re = new RegExp(`(^|[^a-z-])${e}([^a-z-]|$)`);
    if (re.test(lower)) return e;
  }
  return null;
}

// ─── Transition parser ────────────────────────────────────

/**
 * Parse een `transition: ...` waarde. Kan multi-property zijn met komma's.
 * Geeft één sample per property terug.
 *
 * Voorbeelden:
 *  - "all 200ms ease" → 1 sample 200ms ease
 *  - "background 200ms ease, color 100ms linear" → 2 samples
 *  - "color 0.3s cubic-bezier(0.4,0,0.2,1)" → 1 sample 300ms cubic
 */
function parseTransitionValue(value: string): MotionSample[] {
  const samples: MotionSample[] = [];
  // Split op komma's, maar respecteer haakjes (cubic-bezier heeft komma's)
  const parts = splitRespectingParens(value, ",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // Vind duration (eerste numeric value met ms of s)
    const durMatch = trimmed.match(/(\d+(?:\.\d+)?)(ms|s)\b/i);
    if (!durMatch) continue;
    const durationMs = parseDuration(durMatch[0]) ?? 0;
    if (durationMs === 0) continue;
    samples.push({
      raw: trimmed,
      durationMs,
      category: categorize(durationMs),
      easing: extractEasing(trimmed),
    });
  }
  return samples;
}

function splitRespectingParens(str: string, sep: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === sep && depth === 0) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) result.push(current);
  return result;
}

// ─── CSS rule parser ──────────────────────────────────────

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

// ─── Main extraction ──────────────────────────────────────

/**
 * Filter cap: transition-duration > 1500ms is bijna nooit een UI-interaction
 * (button hover, link fade) — meestal een animation-keyframe (scroll-reveal,
 * splash, marquee). Voor BrandTokens.motion willen we de UI-feel, niet de
 * splash-effect.
 */
const MOTION_OUTLIER_CAP_MS = 1500;

export function extractMotionProfile(css: string): MotionProfile {
  const rules = parseCssRules(css);
  const samples: MotionSample[] = [];

  for (const { block } of rules) {
    // transition shorthand
    const trans = getProp(block, "transition");
    if (trans) {
      samples.push(...parseTransitionValue(trans));
    }
    // transition-duration (alone)
    const td = getProp(block, "transition-duration");
    if (td && !trans) {
      // Match each duration in shorthand (kan multi zijn: "200ms, 100ms")
      const parts = td.split(",").map((s) => s.trim()).filter(Boolean);
      for (const p of parts) {
        const ms = parseDuration(p);
        if (ms !== null && ms > 0) {
          const easing = getProp(block, "transition-timing-function");
          samples.push({
            raw: p,
            durationMs: ms,
            category: categorize(ms),
            easing: easing ? extractEasing(easing) : null,
          });
        }
      }
    }
    // animation-duration
    const ad = getProp(block, "animation-duration");
    if (ad) {
      const ms = parseDuration(ad);
      if (ms !== null && ms > 0) {
        samples.push({
          raw: ad,
          durationMs: ms,
          category: categorize(ms),
          easing: null,
        });
      }
    }
  }

  // Strip outliers (animation-keyframes) voor average + dominant berekening.
  // Behoud ze wel in `samples` voor debug-doeleinden.
  const uiSamples = samples.filter((s) => s.durationMs <= MOTION_OUTLIER_CAP_MS);

  // Categorize dominant + average + dominant easing — op uiSamples
  const counts: Record<MotionCategory, number> = {
    instant: 0,
    quick: 0,
    comfortable: 0,
    slow: 0,
  };
  for (const s of uiSamples) counts[s.category]++;
  let dominantCategory: MotionCategory = "comfortable";
  let topCount = -1;
  for (const [cat, count] of Object.entries(counts) as [MotionCategory, number][]) {
    if (count > topCount) {
      topCount = count;
      dominantCategory = cat;
    }
  }

  const average =
    uiSamples.length === 0
      ? null
      : uiSamples.reduce((sum, s) => sum + s.durationMs, 0) / uiSamples.length;

  // Dominant easing — meest-voorkomend, exclusief null
  const easingCounts = new Map<string, number>();
  for (const s of uiSamples) {
    if (s.easing) easingCounts.set(s.easing, (easingCounts.get(s.easing) ?? 0) + 1);
  }
  let dominantEasing: string | null = null;
  let topEasingCount = 0;
  for (const [e, c] of easingCounts.entries()) {
    if (c > topEasingCount) {
      topEasingCount = c;
      dominantEasing = e;
    }
  }

  return {
    samples,
    dominantCategory: samples.length === 0 ? "comfortable" : dominantCategory,
    averageDurationMs: average,
    dominantEasing,
  };
}
