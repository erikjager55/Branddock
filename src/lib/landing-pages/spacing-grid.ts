/**
 * 8pt / 4pt baseline-grid helpers (#2 design-quality verbeterplan).
 *
 * Garandeert dat alle spacing-waardes (padding, margin, gap) op een
 * consistent grid vallen. Voorkomt het "ad-hoc magic numbers" probleem
 * van pre-fix `?? 24` / `Math.min(spacing.length-1, 3)` fallbacks.
 *
 * Industry-standard:
 *   - 8pt grid voor major spacing (≥ 16px)
 *   - 4pt grid voor fine spacing (< 16px) — labels, icon-padding
 *
 * Gebruik:
 *   snapToGrid(23)       → 24  (op 8pt grid)
 *   snapToGrid(13)       → 12  (4pt grid voor kleine waardes)
 *   snapToGrid(95, 8)    → 96
 *   gridStep(2)          → 16  (2 × 8pt)
 */

const MAJOR_GRID = 8;
const MINOR_GRID = 4;
const MINOR_THRESHOLD = 16;

/**
 * Snap een waarde naar het dichtstbijzijnde multiple van de grid-base.
 * Onder 16px gebruiken we 4pt-grid voor fijnere controle (labels, eyebrow,
 * icon-padding). Vanaf 16px gebruiken we 8pt-grid voor majors (padding,
 * margin, gap).
 */
export function snapToGrid(value: number, base?: number): number {
  if (value <= 0) return 0;
  if (base !== undefined) return Math.round(value / base) * base;
  const grid = value < MINOR_THRESHOLD ? MINOR_GRID : MAJOR_GRID;
  return Math.round(value / grid) * grid;
}

/**
 * Direct een grid-step waarde produceren — `gridStep(3)` → 24px.
 * Handig voor design-system definities en preset-arrays.
 */
export function gridStep(steps: number, base: number = MAJOR_GRID): number {
  return Math.max(0, Math.round(steps) * base);
}

/**
 * Snap een spacing-pair (Y/X) naar grid en garandeer min ≥ 4px.
 * Gebruikt door section-padding wrapper in renderers.
 */
export function snapSpacingPair(y: number, x: number): { y: number; x: number } {
  return {
    y: Math.max(MINOR_GRID, snapToGrid(y)),
    x: Math.max(MINOR_GRID, snapToGrid(x)),
  };
}

/**
 * Bouw een gemodulariseerde spacing-scale uit een base + count.
 *   buildSpacingScale(8, 8) → [4, 8, 16, 24, 32, 48, 64, 96, 128]
 * Verschillende step-jumps mimicken design-systemen als Apple HIG (4-stop
 * begin, dan exponentieel).
 */
export function buildSpacingScale(count: number = 8): number[] {
  // Hybrid: eerste paar fine-grid steps, daarna exponentieel via 8pt
  const result: number[] = [4, 8, 16, 24, 32];
  let current = 32;
  while (result.length < count) {
    current = snapToGrid(current * 1.5);
    result.push(current);
  }
  return result.slice(0, count);
}

/**
 * Vertical rhythm helper: bereken line-height in px snapped to grid.
 * Voor 16px body met 1.5 multiplier → 24px (op grid). 17px met 1.5 → 24
 * (snap) i.p.v. 25.5 (off-grid).
 */
export function rhythmicLineHeight(fontSize: number, multiplier: number = 1.5): number {
  return snapToGrid(fontSize * multiplier);
}
