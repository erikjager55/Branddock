/**
 * Background-depth textures (#8 design-quality verbeterplan).
 *
 * Anthropic's frontend-design Skill noemt expliciet "depth and atmosphere
 * via gradient-mesh, noise, geometric pattern, grain overlay" als anti-
 * default voor vlakke solid-color secties. Branddock's huidige render
 * gebruikt overal solid fills + 1 gradient — Anthropic's banned-default.
 *
 * Deze module levert 4 background-treatments als pure CSS background-image
 * values die op section-style gestapeld kunnen worden naast solid bg:
 *   - subtleNoise: SVG turbulence filter (zeer subtiele grain)
 *   - radialMesh: 2-3 radial-gradients overlay voor 'breathing' depth
 *   - geometricDots: dot-pattern overlay (PLAYFUL/CREATOR archetypes)
 *   - grainHeavy: zichtbare grain voor editorial-print-feel (OUTLAW/LOVER)
 *
 * Per archetype kiest renderer welke treatment past. RULER/SAGE/MINIMAL
 * krijgen `subtleNoise` (premium tactiel zonder afleiding); JESTER/CREATOR
 * krijgen `geometricDots` (visueel-rijk speels); etc.
 */

import type { BrandArchetype } from "./brand-archetype-classifier";
import type { LayoutStyle } from "./design-system";

export type BackgroundDepthLevel = "none" | "subtle" | "medium" | "rich";

/**
 * SVG-data-URL voor subtle film-grain. Wordt als background-image
 * geblend over de base-color. Niet detecteerbaar op kleine screens
 * maar geeft tactile feel op large viewports.
 */
const SUBTLE_NOISE_SVG = `<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /><feColorMatrix type='matrix' values='0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
const HEAVIER_GRAIN_SVG = `<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' /><feColorMatrix type='matrix' values='0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 0.09 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;

/**
 * Genereer een background-image string die over een solid bg gestapeld
 * wordt. Voorbeeld voor renderer:
 *   backgroundImage: buildBackgroundDepth('subtle', brand)
 *   backgroundColor: tokens.surface
 *   → solid surface + grain overlay
 *
 * `brandColor` wordt gebruikt voor radial-mesh-tinten. Wanneer null:
 *  alleen grain (geen kleur-overlay).
 */
export function buildBackgroundDepth(
  level: BackgroundDepthLevel,
  brandColor: string | null = null,
): string | undefined {
  if (level === "none") return undefined;

  const grain = level === "rich"
    ? `url("data:image/svg+xml;utf8,${HEAVIER_GRAIN_SVG}")`
    : `url("data:image/svg+xml;utf8,${SUBTLE_NOISE_SVG}")`;

  if (level === "subtle") return grain;

  // medium / rich: combineer grain met radial-mesh wanneer brand-color
  // beschikbaar is. Anders alleen grain.
  if (!brandColor) return grain;
  const rgb = hexToRgbString(brandColor);
  const mesh1 = `radial-gradient(at 20% 30%, rgba(${rgb}, 0.08) 0%, transparent 50%)`;
  const mesh2 = `radial-gradient(at 80% 70%, rgba(${rgb}, 0.06) 0%, transparent 50%)`;
  if (level === "medium") return `${mesh1}, ${mesh2}, ${grain}`;
  // rich: extra dot-pattern
  const dots = `radial-gradient(circle, rgba(${rgb}, 0.04) 1px, transparent 1px)`;
  return `${mesh1}, ${mesh2}, ${dots}, ${grain}`;
}

/** Background-size voor dot-pattern (alleen relevant voor 'rich' level). */
export function getBackgroundDepthSize(level: BackgroundDepthLevel): string | undefined {
  if (level === "rich") return "auto, auto, 24px 24px, auto";
  return undefined;
}

/**
 * Kies een depth-level op basis van archetype + layoutStyle. Pragmatisch:
 *   - RULER/SAGE/CARETAKER → subtle (premium tactiel)
 *   - INNOCENT/REGULAR_GUY → none (clean simplicity)
 *   - MAGICIAN/HERO/EXPLORER → medium (depth + atmosphere)
 *   - JESTER/CREATOR/LOVER → rich (visueel-rijk, durft)
 *   - OUTLAW → rich (rebellious texture)
 *   - MINIMAL layoutStyle override → max subtle
 *   - EXPERIENTIAL layoutStyle → minimaal medium
 */
export function pickBackgroundDepth(
  archetype: BrandArchetype | null,
  layoutStyle: LayoutStyle,
): BackgroundDepthLevel {
  if (layoutStyle === "MINIMAL") return "subtle";
  if (layoutStyle === "EXPERIENTIAL") {
    if (!archetype) return "medium";
    if (["JESTER", "CREATOR", "LOVER", "OUTLAW"].includes(archetype)) return "rich";
    return "medium";
  }
  if (!archetype) return "subtle";
  if (["INNOCENT", "REGULAR_GUY"].includes(archetype)) return "none";
  if (["RULER", "SAGE", "CARETAKER"].includes(archetype)) return "subtle";
  if (["JESTER", "CREATOR", "LOVER", "OUTLAW"].includes(archetype)) return "rich";
  return "medium";
}

function hexToRgbString(hex: string): string {
  const cleaned = hex.replace(/^#/, "");
  if (cleaned.length !== 6) return "0,0,0";
  const num = parseInt(cleaned, 16);
  if (Number.isNaN(num)) return "0,0,0";
  return `${(num >> 16) & 0xff},${(num >> 8) & 0xff},${num & 0xff}`;
}
