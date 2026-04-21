// =============================================================
// Component Extractor — Fase 5
//
// Scans a scraped page with cheerio + CSS rules to detect 7 common
// component types (buttons, form inputs, status chips, product cards,
// feature icons, top navigation, quote blocks) and extract their
// design tokens (padding, radius, colors, typography, shadow).
//
// Runs automatically during analysis pipeline. Uses DOM matching +
// rule lookup — no Puppeteer, no Vision (deliberate: keeps analysis
// fast + cheap for V1). Screenshots + Vision analysis is a follow-up.
// =============================================================

import type * as cheerio from "cheerio";

export type ComponentType =
  | "BUTTON"
  | "FORM_INPUT"
  | "STATUS_CHIP"
  | "PRODUCT_CARD"
  | "FEATURE_ICON"
  | "TOP_NAVIGATION"
  | "QUOTE_BLOCK";

export interface ExtractedComponentStyles {
  background?: string;
  color?: string;
  border?: string;
  borderRadius?: string;
  padding?: string;
  fontSize?: string;
  fontWeight?: string;
  boxShadow?: string;
  textTransform?: string;
  display?: string;
}

export interface DetectedComponent {
  type: ComponentType;
  label: string;
  selector: string;
  classes: string[];
  extractedStyles: ExtractedComponentStyles;
  previewHtml: string | null;
  confidence: number;
  /** URL of the real element screenshot, populated when the Playwright-based
   *  screenshotter (Sprint 4) is enabled. Null for static DOM extraction. */
  screenshotUrl?: string | null;
}

const MAX_PER_TYPE = 5;
/**
 * Confidence floor for a detected component. Below this, the match is likely
 * an accidental div that happened to share a utility class — not an actual
 * branded component. 0.4 requires at least ~3 distinct styling props AND
 * some class-name signal (see computeConfidence below).
 */
const MIN_CONFIDENCE = 0.4;
const RELEVANT_PROPS = [
  "background",
  "background-color",
  "color",
  "border",
  "border-color",
  "border-width",
  "border-radius",
  "padding",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "font-size",
  "font-weight",
  "box-shadow",
  "text-transform",
  "display",
] as const;

// cheerio's Cheerio<Element> union shifts across major versions; using an
// object with the minimal surface we actually touch (tagName, attr) keeps
// the matcher signature portable.
interface ElementLike {
  attr: (name: string) => string | undefined;
  0?: { tagName?: string };
}

interface Matcher {
  type: ComponentType;
  selectors: string[];
  labelFn: (el: ElementLike, classes: string[]) => string;
}

const MATCHERS: Matcher[] = [
  {
    type: "BUTTON",
    // Mirror the broader selector list from component-screenshotter.ts so
    // static extraction catches shadcn/Radix/link-as-button variants. See
    // that file for rationale on each entry.
    selectors: [
      "button",
      "[role=button]",
      "[data-slot=button]",
      "[data-radix-collection-item][role=button]",
      "a.btn",
      "a.button",
      "a[class*=button]",
      "a[class*=btn]",
      "a[class*=Button]",
      "[class*=btn-]",
      "input[type=submit]",
      "input[type=button]",
      // Heuristic: pure-Tailwind anchors without "button"/"btn" in class.
      // Still filtered by computeConfidence (requires bg + padding + radius).
      "a[href]",
    ],
    labelFn: (el, classes) => {
      const cls = classes.join(" ").toLowerCase();
      if (/primary|cta|main/.test(cls)) return "Primary Button";
      if (/secondary|ghost|outline/.test(cls)) return "Secondary Button";
      if (/danger|destructive|warning/.test(cls)) return "Danger Button";
      return `Button${classes[0] ? " — " + classes[0] : ""}`;
    },
  },
  {
    type: "FORM_INPUT",
    selectors: [
      "input[type=text]",
      "input[type=email]",
      "input[type=search]",
      "input[type=tel]",
      "input[type=number]",
      "input[type=url]",
      "input[type=password]",
      "textarea",
      "select",
      "[data-slot=input]",
      "[data-slot=textarea]",
      "[data-slot=select]",
    ],
    labelFn: (el) => {
      const tag = el[0]?.tagName?.toLowerCase();
      if (tag === "textarea") return "Textarea";
      if (tag === "select") return "Select";
      const type = el.attr("type") ?? "text";
      return `Input — ${type}`;
    },
  },
  {
    type: "STATUS_CHIP",
    selectors: [
      ".badge",
      ".chip",
      ".tag",
      ".pill",
      "[class*=status-]",
      "[class*=badge-]",
      "[class*=Badge]",
      "[data-slot=badge]",
      "[data-radix-toast]",
    ],
    labelFn: (el, classes) => {
      const cls = classes.join(" ").toLowerCase();
      if (/success|green/.test(cls)) return "Status Chip — Success";
      if (/warning|amber|yellow/.test(cls)) return "Status Chip — Warning";
      if (/danger|error|red/.test(cls)) return "Status Chip — Danger";
      if (/info|blue/.test(cls)) return "Status Chip — Info";
      return "Status Chip";
    },
  },
  {
    type: "PRODUCT_CARD",
    selectors: [
      ".card",
      "article.product",
      "[class*=product-card]",
      "[class*=item-card]",
      "[data-slot=card]",
    ],
    labelFn: (el, classes) => `Card${classes[0] ? " — " + classes[0] : ""}`,
  },
  {
    type: "FEATURE_ICON",
    selectors: ["svg[class*=icon]", ".icon", "[class*=feature-icon]", "i.fa", "i.material-icons"],
    labelFn: (el, classes) => `Feature Icon${classes[0] ? " — " + classes[0] : ""}`,
  },
  {
    type: "TOP_NAVIGATION",
    selectors: ["nav", "[role=navigation]", "header nav", ".navbar", ".navigation"],
    labelFn: () => "Top Navigation",
  },
  {
    type: "QUOTE_BLOCK",
    selectors: ["blockquote", "[class*=quote]", "[class*=testimonial]"],
    labelFn: (el, classes) => {
      const cls = classes.join(" ").toLowerCase();
      if (/testimonial/.test(cls)) return "Testimonial";
      return "Quote Block";
    },
  },
];

/**
 * Extract components from a loaded cheerio document.
 *
 * Strategy:
 *  1. For each matcher, collect up to ~20 matching elements.
 *  2. Extract CSS properties for each match by looking up class-based rules
 *     in the provided CSS text.
 *  3. Dedup by a style-hash so "Primary Button" doesn't show twice.
 *  4. Return the top MAX_PER_TYPE per type ordered by confidence.
 */
export function extractComponents(
  $: cheerio.CheerioAPI,
  allCss: string,
): DetectedComponent[] {
  const cssRules = parseCssRules(allCss);
  const out: DetectedComponent[] = [];

  for (const matcher of MATCHERS) {
    const seen = new Set<string>();
    const collected: DetectedComponent[] = [];

    for (const selector of matcher.selectors) {
      $(selector).each((_i, element) => {
        if (collected.length >= MAX_PER_TYPE * 4) return false; // stop iteration
        const el = $(element);
        const classes = (el.attr("class") ?? "")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 6);

        const styles = resolveStyles(classes, el.attr("style") ?? "", cssRules);
        // Dedup on a structural fingerprint instead of the full style object.
        // `background + borderRadius + padding` captures the variant identity
        // (CTA vs. secondary vs. ghost) while ignoring noise like inline
        // text-transform or explicit display:inline-flex. Matches the
        // size-bucket+bg strategy used by the Playwright screenshotter.
        const styleHash = [
          (styles.background ?? "").replace(/\s+/g, ""),
          styles.borderRadius ?? "",
          styles.padding ?? "",
        ].join("|");
        if (seen.has(styleHash)) return;
        seen.add(styleHash);

        // Skip elements with zero extracted properties — likely unstyled utility matches
        if (Object.keys(styles).length === 0) return;

        const confidence = computeConfidence(styles, classes);
        if (confidence < MIN_CONFIDENCE) return;

        collected.push({
          type: matcher.type,
          label: matcher.labelFn(el, classes),
          selector,
          classes,
          extractedStyles: styles,
          previewHtml: null,
          confidence,
        });
        return;
      });
      if (collected.length >= MAX_PER_TYPE) break;
    }

    collected.sort((a, b) => b.confidence - a.confidence);
    out.push(...collected.slice(0, MAX_PER_TYPE));
  }

  return out;
}

// ─── Helpers ───────────────────────────────────────────────

interface CssRule {
  selector: string;
  props: Map<string, string>;
}

function parseCssRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  // Strip comments to avoid bogus matches
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Match "selector { body }" — keeps it simple; nested rules are flattened.
  const re = /([^{}@][^{}]*?)\{([^{}]*)\}/g;
  let match;
  while ((match = re.exec(cleaned)) !== null) {
    const selector = match[1].trim();
    const body = match[2];
    if (!selector || selector.length > 300) continue;
    const props = new Map<string, string>();
    for (const decl of body.split(";")) {
      const idx = decl.indexOf(":");
      if (idx < 0) continue;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const value = decl.slice(idx + 1).trim();
      if (!prop || !value) continue;
      if (RELEVANT_PROPS.includes(prop as (typeof RELEVANT_PROPS)[number])) {
        props.set(prop, value);
      }
    }
    if (props.size > 0) {
      rules.push({ selector, props });
    }
  }
  return rules;
}

function resolveStyles(
  classes: string[],
  inlineStyle: string,
  rules: CssRule[],
): ExtractedComponentStyles {
  const merged = new Map<string, string>();

  // Apply matching CSS rules first (later rules / inline styles override)
  for (const rule of rules) {
    if (!ruleMatchesElement(rule.selector, classes)) continue;
    for (const [prop, value] of rule.props) {
      merged.set(prop, value);
    }
  }

  // Inline styles take precedence
  if (inlineStyle) {
    for (const decl of inlineStyle.split(";")) {
      const idx = decl.indexOf(":");
      if (idx < 0) continue;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const value = decl.slice(idx + 1).trim();
      if (prop && value) merged.set(prop, value);
    }
  }

  const pick = (k: string) => merged.get(k);
  return {
    background: pick("background-color") ?? pick("background"),
    color: pick("color"),
    border: pick("border") ?? pick("border-width") ?? pick("border-color"),
    borderRadius: pick("border-radius"),
    padding:
      pick("padding") ??
      ([pick("padding-top"), pick("padding-right"), pick("padding-bottom"), pick("padding-left")]
        .filter(Boolean)
        .join(" ") || undefined),
    fontSize: pick("font-size"),
    fontWeight: pick("font-weight"),
    boxShadow: pick("box-shadow"),
    textTransform: pick("text-transform"),
    display: pick("display"),
  };
}

/**
 * Parse a CSS selector into "required class sets". Each alternative (comma-
 * separated) becomes one set: the element must carry ALL of those classes
 * for the rule to match. Cached so we don't re-parse the same selector for
 * each of the ~500 elements on a page.
 *
 * Examples:
 *   ".btn"              → [["btn"]]
 *   ".btn.primary"      → [["btn", "primary"]]       ← compound
 *   "a.btn, .button"    → [["btn"], ["button"]]      ← OR
 *   "nav .btn:hover"    → [["btn"]]                  ← descendant + pseudo
 *   "button"            → [[]]                       ← tag-only, skipped
 *
 * We only use the RIGHTMOST compound (after descendant/child/sibling
 * combinators) because that's what's applied to the element itself.
 * Ancestors are ignored for simplicity — a small number of false positives
 * are OK given the post-match confidence threshold.
 */
const SELECTOR_CACHE = new Map<string, string[][]>();
function parseSelectorClasses(selector: string): string[][] {
  const cached = SELECTOR_CACHE.get(selector);
  if (cached) return cached;

  // Split on commas at the top level (skip commas inside :not(), etc.)
  const alternatives = selector.split(/,(?![^()]*\))/);
  const result: string[][] = [];

  for (const alt of alternatives) {
    const parts = alt.trim().split(/[\s>+~]+/);
    const last = parts[parts.length - 1]?.trim() ?? "";
    if (!last) continue;
    // Strip pseudo-classes / pseudo-elements: .btn:hover → .btn
    const stripped = last.replace(/::?[\w-]+(\([^)]*\))?/g, "");
    // Extract all class names
    const classMatches = [...stripped.matchAll(/\.([\w-]+)/g)];
    result.push(classMatches.map((m) => m[1]));
  }

  SELECTOR_CACHE.set(selector, result);
  return result;
}

function ruleMatchesElement(selector: string, classes: string[]): boolean {
  if (classes.length === 0) return false;
  const classSet = new Set(classes);
  const alternatives = parseSelectorClasses(selector);
  for (const required of alternatives) {
    // Only match when the alternative has ≥1 class requirement (tag-only
    // rules are intentionally skipped — there's no cheap way to verify tag
    // against element here, and tag-only rules usually apply globally rather
    // than carrying branded component styles).
    if (required.length === 0) continue;
    if (required.every((c) => classSet.has(c))) return true;
  }
  return false;
}

function computeConfidence(
  styles: ExtractedComponentStyles,
  classes: string[],
): number {
  let score = 0;
  if (styles.background) score += 0.2;
  if (styles.color) score += 0.1;
  if (styles.borderRadius) score += 0.15;
  if (styles.padding) score += 0.15;
  if (styles.fontSize) score += 0.1;
  if (styles.border) score += 0.1;
  if (styles.boxShadow) score += 0.1;
  if (classes.length > 0) score += 0.1;
  return Math.min(score, 1);
}
