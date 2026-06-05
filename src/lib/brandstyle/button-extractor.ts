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
 * Universal-fix layers (sites zoals LINFI met WP + Bricks Builder):
 *  1. CSS-var resolution — `var(--btn-radius)` → 8px door :root-map +
 *     recursieve substitutie. Zonder dit blijft de echte radius leeg en
 *     valt de merger terug op WP-core defaults.
 *  2. DOM-presence filter — selectors waarvan GEEN element in de gerenderde
 *     HTML matcht worden gedropt. Dit elimineert WP-core stylesheets
 *     (`.wp-block-button__link`) die altijd aanwezig zijn maar nooit
 *     gebruikt worden.
 *  3. Backward-compat — beide nieuwe parameters zijn optioneel; oude
 *     call-sites blijven werken (zonder filtering).
 *
 * Pure functie — DOM-input is een cheerio root, geen browser. Caller
 * integreert in scrapeUrl output.
 */

// Standalone resolver (geen circular dep met url-scraper) — full-CSS-fallback
// wanneer de (kleur-gefilterde) var-map een var() niet kan resolven.
import { resolveCssVar } from './css-var-resolver';

/**
 * Subset van CssVariable dat we nodig hebben — frozen om circular import te
 * vermijden (CssVariable woont in url-scraper.ts en url-scraper importeert
 * deze module).
 */
export interface ButtonExtractorCssVar {
  name: string;
  value: string;
}

/** Cheerio root — typed as `unknown` om geen hard cheerio-dep in dit
 *  bestand te krijgen. Caller weet wat hij doorgeeft. */
export type CheerioRootLike = {
  (selector: string): { length: number };
} | null;

export interface ButtonExtractorOptions {
  /** CSS-vars uit :root (en theme-blocks) voor var(...) substitutie. */
  cssVariables?: ButtonExtractorCssVar[];
  /** Cheerio `$` voor DOM-presence filtering. Wanneer aanwezig: selectors
   *  zonder DOM-match worden gedropt. */
  $?: CheerioRootLike;
}

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
  fontFamily: string | null;
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

// ─── CSS-var resolution ───────────────────────────────────
//
// Bouwt een var-map uit :root + theme-blocks en resolved `var(--x, fallback)`
// recursief. Cycle-guard via visited-set, max 10 stappen diep om pathologische
// chains te vermijden. Wanneer een var leeg blijft → originele expression
// behouden (geen falsy "" terugschrijven, dan zou de merger verkeerd vallen).

const MAX_VAR_DEPTH = 10;

/**
 * Vind de eerste `var(...)` expression met balanced parens (nested support).
 * Returnt start-index + end-index (exclusive) en parsed { name, fallback }.
 * Returnt null wanneer geen match.
 */
function findVarCall(expr: string, from = 0): {
  start: number;
  end: number;
  name: string;
  fallback: string | null;
} | null {
  const start = expr.indexOf("var(", from);
  if (start < 0) return null;
  let depth = 1;
  let i = start + 4;
  while (i < expr.length && depth > 0) {
    if (expr[i] === "(") depth++;
    else if (expr[i] === ")") depth--;
    if (depth === 0) break;
    i++;
  }
  if (depth !== 0) return null; // unbalanced
  const inner = expr.slice(start + 4, i);
  const commaIdx = findTopLevelComma(inner);
  const name = (commaIdx >= 0 ? inner.slice(0, commaIdx) : inner).trim();
  const fallback = commaIdx >= 0 ? inner.slice(commaIdx + 1).trim() : null;
  return { start, end: i + 1, name, fallback };
}

function findTopLevelComma(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") depth--;
    else if (s[i] === "," && depth === 0) return i;
  }
  return -1;
}

function buildVarMap(vars: ButtonExtractorCssVar[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!vars?.length) return map;
  // Eerste pass: raw values, last-wins (theme-overrides winnen van :root).
  for (const v of vars) {
    if (v.name && v.value) map.set(v.name, v.value.trim());
  }
  return map;
}

function resolveVar(expr: string, varMap: Map<string, string>, depth = 0): string {
  if (depth > MAX_VAR_DEPTH) return expr;
  let result = expr;
  let cursor = 0;
  // Loop: vind elke var(...) call met balanced parens, vervang met
  // resolved waarde of recursief gefallbackte expression.
  while (cursor < result.length) {
    const match = findVarCall(result, cursor);
    if (!match) break;
    const resolved = varMap.get(match.name);
    let replacement: string;
    if (resolved) {
      replacement = resolveVar(resolved, varMap, depth + 1);
    } else if (match.fallback) {
      replacement = resolveVar(match.fallback, varMap, depth + 1);
    } else {
      // Onbekend + geen fallback → originele expression behouden, skip
      // verder vanaf einde van deze call zodat we niet eindeloos loopen.
      cursor = match.end;
      continue;
    }
    result = result.slice(0, match.start) + replacement + result.slice(match.end);
    cursor = match.start + replacement.length;
  }
  return result;
}

function resolveButtonVars(btn: ScrapedButtonStyle, varMap: Map<string, string>, fullCss: string): void {
  const fields: (keyof ScrapedButtonStyle)[] = [
    "paddingY", "paddingX", "fontWeight", "fontSize", "textTransform",
    "letterSpacing", "borderRadius", "background", "color", "border",
    "transition", "hoverBackground", "hoverColor", "hoverTransform", "hoverBorder",
  ];
  for (const f of fields) {
    const val = btn[f];
    if (typeof val !== "string" || !val.includes("var(")) continue;
    let resolved = varMap.size > 0 ? resolveVar(val, varMap) : val;
    // Fase 1 (brand-fidelity): de var-map is kleur-gefilterd, dus typografie/
    // radius-vars (var(--bs-btn-padding-y), var(--btn-radius)) zitten er niet
    // in. Val terug op resolutie tegen de VOLLEDIGE CSS zodat die niet onnodig
    // naar null degraderen.
    if (resolved.includes("var(")) {
      const full = resolveCssVar(val, fullCss);
      if (full != null) resolved = full;
    }
    // Wanneer er na resolution NOG steeds een unresolved var() in zit
    // (typisch op sites zoals linfi.nl waar Bricks `--btn-radius` declareert
    // maar nooit initialiseert), zet het veld op null. De v4-merger pakt
    // dan automatisch de volgende non-null sample i.p.v. een unusable
    // string als "valid value" door te geven aan de renderer.
    if (resolved.includes("var(")) {
      (btn as unknown as Record<string, unknown>)[f] = null;
    } else if (resolved && resolved !== val) {
      (btn as unknown as Record<string, unknown>)[f] = resolved;
    }
  }
}

// ─── DOM-presence filter ──────────────────────────────────
//
// Voor elke base-selector: split op spaces/combinators, neem de meest
// specifieke laatste component (class/id/tag), check of die in de DOM
// voorkomt. Skip stylesheets-only auto-generated rules (WP-core block
// stylesheets, theme-resets) die nooit gerenderd worden.
//
// Voorzichtige strategie: alleen filteren wanneer cheerio-$ is meegegeven
// EN de selector een class/id/tag bevat die we veilig kunnen testen. Bij
// twijfel: behouden (false-negatives kosten meer dan false-positives).

const SELECTOR_TOKEN_RE = /[#.][\w-]+|\[[^\]]+\]|\b[a-z][\w-]*\b/gi;

function selectorMatchesDom($: NonNullable<CheerioRootLike>, selector: string): boolean {
  // Strip pseudo-elementen en pseudo-classes vóór DOM-test
  const cleaned = selector
    .replace(/::?[a-z-]+(\([^)]*\))?/gi, "")
    .replace(/!important/gi, "")
    .trim();
  if (!cleaned) return false;

  // Probeer eerst de hele cleaned selector
  try {
    if ($(cleaned).length > 0) return true;
  } catch {
    // cheerio kan struikelen over complexe attribute-selectors — fall through
  }

  // Fallback: probeer per token (class/id/tag)
  const tokens = cleaned.match(SELECTOR_TOKEN_RE) ?? [];
  for (const tok of tokens) {
    // Skip generic tags die overal voorkomen (zou alles laten passeren)
    if (/^(div|span|a|p|html|body)$/i.test(tok)) continue;
    try {
      if ($(tok).length > 0) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

export function extractButtonStyles(
  css: string,
  options: ButtonExtractorOptions = {},
): ScrapedButtonStyle[] {
  const rules = parseCssRules(css);
  const varMap = buildVarMap(options.cssVariables);

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

  // CSS-var resolution pass (voor classificatie + DOM-filter, zodat de
  // role-heuristic accurate background-info heeft).
  for (const btn of baseMap.values()) {
    resolveButtonVars(btn, varMap, css);
  }

  // DOM-presence filter — alleen wanneer cheerio root meegegeven
  const $ = options.$;
  const filtered = $ ? Array.from(baseMap.values()).filter((btn) => {
    return selectorMatchesDom($, btn.selector);
  }) : Array.from(baseMap.values());

  // Edge-case safety: als filter alles wegvaagt (bv. bij CSS-only fixture
  // zonder HTML), fall back op ongefilterde set. Better-to-have-noise dan
  // empty buttonProfile.
  const candidates = filtered.length > 0 ? filtered : Array.from(baseMap.values());

  // Classify role per match (eindstap, nu met geresolvede background)
  const results: ScrapedButtonStyle[] = [];
  for (const btn of candidates) {
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
    fontFamily: null,
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
  target.fontFamily = target.fontFamily ?? getProp(block, "font-family");
  target.border = target.border ?? getProp(block, "border");
  target.transition = target.transition ?? getProp(block, "transition");
}

function fillHoverProps(target: ScrapedButtonStyle, block: string): void {
  target.hoverBackground = target.hoverBackground ?? (getProp(block, "background") ?? getProp(block, "background-color"));
  target.hoverColor = target.hoverColor ?? getProp(block, "color");
  target.hoverTransform = target.hoverTransform ?? getProp(block, "transform");
  target.hoverBorder = target.hoverBorder ?? getProp(block, "border");
}
