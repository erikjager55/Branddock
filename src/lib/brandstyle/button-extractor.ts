/**
 * Button-styling extractor uit CSS (Fase A1 verbeterplan).
 *
 * Detecteert button-selectors in CSS en extraheert per-button:
 *   - padding (X/Y), font-weight, font-size, text-transform, letter-spacing,
 *     border-radius, background, color, transition
 *   - hover-state vanuit `:hover` selector overlap
 *
 * Classificeert elk match heuristisch naar primary/secondary/ghost/unknown
 * op basis van background-fill + border-presence.
 *
 * Pure functie — geen DOM, geen DB. Caller integreert in scrapeUrl output.
 */

export interface ScrapedButtonStyle {
  /** Originele CSS-selector (debug). */
  selector: string;
  /** Heuristic role-classificatie. */
  role: "primary" | "secondary" | "ghost" | "unknown";
  // Base styles — raw CSS values (e.g. "16px", "1.25rem")
  paddingY: string | null;
  paddingX: string | null;
  fontWeight: string | null;
  fontSize: string | null;
  textTransform: string | null;
  letterSpacing: string | null;
  borderRadius: string | null;
  background: string | null;
  color: string | null;
  border: string | null;
  transition: string | null;
  // Hover-state from `selector:hover`
  hoverBackground: string | null;
  hoverColor: string | null;
  hoverTransform: string | null;
  hoverBorder: string | null;
}

// ─── Selector matching ────────────────────────────────────

const BUTTON_SELECTOR_PATTERNS = [
  /\bbutton\b/,
  /\.btn(\b|[-_])/,
  /\.button(\b|[-_])/,
  /(^|[.\s\-_])cta(\b|[-_])/,
  /\[role=["']button["']\]/,
  /\.wp-block-button/,
  /\.elementor-button/,
  /\.acss-btn/,
  /\.wp-element-button/,
  /\.has-button-style/,
  /\.btn-primary/,
  /\.btn-secondary/,
  /\.btn-ghost/,
];

const NEGATIVE_SELECTOR_PATTERNS = [
  /\.menu-button/,        // hamburger menu, niet content-CTA
  /\.toggle-button/,
  /\.close-button/,
  /\.icon-button/,
  /\.share-button/,
  /\.scroll-to-top/,
  /\.back-to-top/,
];

function isButtonSelector(selector: string): boolean {
  const lower = selector.toLowerCase();
  if (NEGATIVE_SELECTOR_PATTERNS.some((re) => re.test(lower))) return false;
  return BUTTON_SELECTOR_PATTERNS.some((re) => re.test(lower));
}

// ─── Role classification ──────────────────────────────────

function classifyButtonRole(
  selector: string,
  background: string | null,
  border: string | null,
): "primary" | "secondary" | "ghost" | "unknown" {
  const lower = selector.toLowerCase();

  // Explicit selector hints first
  if (/\b(primary|cta)\b/.test(lower)) return "primary";
  if (/\b(secondary|outline)\b/.test(lower)) return "secondary";
  if (/\b(ghost|text|link)\b/.test(lower)) return "ghost";

  // Fall back on background + border heuristics
  const hasSolidBg =
    !!background &&
    background !== "transparent" &&
    background !== "none" &&
    !/^rgba\(.*,\s*0\s*\)$/.test(background);
  const hasBorder = !!border && border !== "none" && !/0(px)?(\s|$)/.test(border);

  if (hasSolidBg) return "primary";
  if (hasBorder && !hasSolidBg) return "secondary";
  if (!hasSolidBg && !hasBorder) return "ghost";
  return "unknown";
}

// ─── Property extractors (shared util) ────────────────────

function getProp(block: string, prop: string): string | null {
  const re = new RegExp(`(?:^|;|\\{)\\s*${prop}\\s*:\\s*([^;}]+?)(?:!important)?\\s*(?:;|}|$)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function splitPadding(value: string | null): { y: string | null; x: string | null } {
  if (!value) return { y: null, x: null };
  const parts = value.trim().split(/\s+/);
  // 1 value: all sides; 2: vert/horiz; 3: top/horiz/bottom; 4: top/right/bottom/left
  if (parts.length === 1) return { y: parts[0], x: parts[0] };
  if (parts.length === 2) return { y: parts[0], x: parts[1] };
  if (parts.length === 3) return { y: parts[0], x: parts[1] };
  if (parts.length === 4) return { y: parts[0], x: parts[1] };
  return { y: null, x: null };
}

// ─── Main extraction ──────────────────────────────────────

interface ParsedRule {
  selector: string;
  block: string;
  isHover: boolean;
}

function parseCssRules(css: string): ParsedRule[] {
  const results: ParsedRule[] = [];
  const rulePattern = /([^{}@]+)\{([^{}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = rulePattern.exec(css)) !== null) {
    const selectorBlock = m[1].trim();
    const ruleBlock = m[2];
    // Each selector-group can have multiple comma-separated selectors; split
    for (const single of selectorBlock.split(",")) {
      const trimmed = single.trim();
      if (!trimmed) continue;
      results.push({
        selector: trimmed,
        block: ruleBlock,
        isHover: /:hover\b/.test(trimmed),
      });
    }
  }
  return results;
}

/** Strip `:hover`, `:focus-visible`, etc. zodat we matchen op base-selector. */
function stripPseudo(selector: string): string {
  return selector.replace(/:(?:hover|focus|focus-visible|active|visited)\b/g, "").trim();
}

export function extractButtonStyles(css: string): ScrapedButtonStyle[] {
  const rules = parseCssRules(css);

  // Eerst: bouw base-style map per base-selector
  const baseMap = new Map<string, ScrapedButtonStyle>();
  for (const rule of rules) {
    if (rule.isHover) continue;
    if (!isButtonSelector(rule.selector)) continue;
    const baseSel = stripPseudo(rule.selector);
    if (!baseMap.has(baseSel)) {
      baseMap.set(baseSel, makeEmptyButtonStyle(baseSel));
    }
    fillBaseProps(baseMap.get(baseSel)!, rule.block);
  }

  // Dan: merge hover-styles in
  for (const rule of rules) {
    if (!rule.isHover) continue;
    const baseSel = stripPseudo(rule.selector);
    if (!baseMap.has(baseSel)) continue;  // Only enrich base buttons we found
    fillHoverProps(baseMap.get(baseSel)!, rule.block);
  }

  // Classify role per match (eindstap)
  const results: ScrapedButtonStyle[] = [];
  for (const btn of baseMap.values()) {
    btn.role = classifyButtonRole(btn.selector, btn.background, btn.border);
    results.push(btn);
  }
  return results;
}

function makeEmptyButtonStyle(selector: string): ScrapedButtonStyle {
  return {
    selector,
    role: "unknown",
    paddingY: null,
    paddingX: null,
    fontWeight: null,
    fontSize: null,
    textTransform: null,
    letterSpacing: null,
    borderRadius: null,
    background: null,
    color: null,
    border: null,
    transition: null,
    hoverBackground: null,
    hoverColor: null,
    hoverTransform: null,
    hoverBorder: null,
  };
}

function fillBaseProps(target: ScrapedButtonStyle, block: string): void {
  // Shorthand padding split → paddingY + paddingX
  const padding = getProp(block, "padding");
  if (padding) {
    const split = splitPadding(padding);
    if (split.y && !target.paddingY) target.paddingY = split.y;
    if (split.x && !target.paddingX) target.paddingX = split.x;
  }
  // Long-form overrides
  const paddingY =
    getProp(block, "padding-top") ?? getProp(block, "padding-block");
  if (paddingY) target.paddingY = paddingY;
  const paddingX =
    getProp(block, "padding-left") ?? getProp(block, "padding-inline");
  if (paddingX) target.paddingX = paddingX;

  target.fontWeight = target.fontWeight ?? getProp(block, "font-weight");
  target.fontSize = target.fontSize ?? getProp(block, "font-size");
  target.textTransform = target.textTransform ?? getProp(block, "text-transform");
  target.letterSpacing = target.letterSpacing ?? getProp(block, "letter-spacing");
  target.borderRadius = target.borderRadius ?? getProp(block, "border-radius");
  target.background = target.background ?? (getProp(block, "background") ?? getProp(block, "background-color"));
  target.color = target.color ?? getProp(block, "color");
  target.border = target.border ?? getProp(block, "border");
  target.transition = target.transition ?? getProp(block, "transition");
}

function fillHoverProps(target: ScrapedButtonStyle, block: string): void {
  target.hoverBackground = target.hoverBackground ?? (getProp(block, "background") ?? getProp(block, "background-color"));
  target.hoverColor = target.hoverColor ?? getProp(block, "color");
  target.hoverTransform = target.hoverTransform ?? getProp(block, "transform");
  target.hoverBorder = target.hoverBorder ?? getProp(block, "border");
}
