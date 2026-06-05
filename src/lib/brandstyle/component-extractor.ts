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
import { hasFrameworkDefaultClass } from "./framework-defaults";

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
  /** Optional shape-guard: returns false om een element te droppen ook al
   *  matched de selector. Voor types met false-positive-gevoelige
   *  patterns (`.tag` als figure-class, `[class*=-card]` op inline-spans). */
  predicate?: (el: ElementLike) => boolean;
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
      // Framework-specifieke selectors (sync met component-screenshotter)
      ".wp-block-button__link",
      ".elementor-button",
      ".bricks-button",
      ".brxe-button",
      ".et_pb_button",
      ".vc_btn",
      ".acss-btn",
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
      ".pill",
      "[class*=status-]",
      "[class*=badge-]",
      "[class*=Badge]",
      "[data-slot=badge]",
      "[data-radix-toast]",
      // `.tag` is bewust NIET in deze top-level lijst: te veel
      // false-positives op WP/Bricks sites (figure-image classes,
      // taxonomy-links, social-share). Wordt geguard via predicate.
    ],
    predicate: (el) => {
      // Status-chip moet:
      //  - INLINE element zijn (geen <figure>, <img>, <article>, <section>)
      //  - tekst-content hebben (chips zonder tekst zijn iconen / images)
      //  - geen <img>/<svg> als direct child hebben (image-tagged figures)
      const tag = (el as { tagName?: string }).tagName?.toLowerCase();
      if (!tag) return true;
      const blockTags = new Set(["figure", "img", "article", "section", "main", "aside"]);
      if (blockTags.has(tag)) return false;
      return true;
    },
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
      // Generieke __card / -card / card- patterns vangen custom card-
      // implementaties als `.fb-sticky-content__card`, `.feature-card`,
      // `.card-item` op die elke BEM-conventie volgt. Eerder ontbrak dit
      // waardoor de scanner op niet-framework-sites 0 cards rapporteerde
      // terwijl ze er wel stonden.
      "[class*=__card]",
      "[class*=-card]",
      "[class*=card-]",
      // Framework-specifieke card-containers
      ".wp-block-group.has-background",
      ".elementor-widget-wrap.elementor-element-populated",
      ".brxe-container[class*=card]",
      ".brxe-block[class*=card]",
      ".et_pb_blurb",
    ],
    predicate: (el) => {
      // Card-elementen zijn block-level. Filter inline-elementen + image-
      // only wrappers die toevallig "card" in class hebben (bv.
      // `.card-image`, `.user-card-avatar`).
      const tag = (el as { tagName?: string }).tagName?.toLowerCase();
      if (!tag) return true;
      const inlineTags = new Set(["span", "a", "img", "svg", "i", "b", "em", "strong"]);
      if (inlineTags.has(tag)) return false;
      return true;
    },
    labelFn: (el, classes) => `Card${classes[0] ? " — " + classes[0] : ""}`,
  },
  {
    type: "FEATURE_ICON",
    selectors: [
      "svg[class*=icon]",
      ".icon",
      "[class*=feature-icon]",
      "i.fa",
      "i.material-icons",
      // Framework iconen
      ".brxe-icon",
      ".brxe-icon-box svg",
      ".elementor-icon svg",
      ".elementor-icon-box-icon svg",
      ".et_pb_icon",
    ],
    labelFn: (el, classes) => `Feature Icon${classes[0] ? " — " + classes[0] : ""}`,
  },
  {
    type: "TOP_NAVIGATION",
    selectors: [
      "nav",
      "[role=navigation]",
      "header nav",
      ".navbar",
      ".navigation",
      // Framework nav
      ".brxe-nav-menu",
      ".brxe-nav",
      ".elementor-nav-menu",
      ".et_pb_menu",
      ".wp-block-navigation",
    ],
    labelFn: () => "Top Navigation",
  },
  {
    type: "QUOTE_BLOCK",
    selectors: [
      "blockquote",
      "[class*=quote]",
      "[class*=testimonial]",
      ".brxe-testimonial",
      ".elementor-widget-testimonial",
      ".et_pb_testimonial",
    ],
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
        // Shape-guard vóór style-resolution voor performance + correctness.
        // Voor STATUS_CHIP/PRODUCT_CARD voorkomt dit dat <figure class="tag">
        // (Bricks image-class) of inline `<span class="card-icon">` als
        // valid status-chip/card wordt geteld.
        if (matcher.predicate && !matcher.predicate(element as unknown as ElementLike)) {
          return;
        }
        const el = $(element);
        const classes = (el.attr("class") ?? "")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 6);

        // Ancestor-class chain (max 5 niveaus diep — Bricks/Elementor scope
        // rules zelden dieper). Volgorde: [parent, grandparent, ...].
        // Levert descendant-combinator rules (`.fb-sticky-content .card`)
        // de info die ze nodig hebben om te matchen, anders blijft de card
        // unstyled door de static extractor en sneuvelt op MIN_CONFIDENCE.
        const ancestorClasses: Set<string>[] = [];
        el.parents().slice(0, 5).each((_, anc) => {
          const cls = ($(anc).attr("class") ?? "").split(/\s+/).filter(Boolean);
          if (cls.length > 0) ancestorClasses.push(new Set(cls));
        });

        const styles = resolveStyles(
          classes,
          el.attr("style") ?? "",
          cssRules,
          ancestorClasses,
        );
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
  ancestorClasses: Set<string>[] = [],
): ExtractedComponentStyles {
  const merged = new Map<string, string>();

  // PASS 1 — STRICT ancestor-aware match. Levert hoge precisie: alleen
  // CSS-rules die voor DIT element bedoeld zijn worden toegepast (geen
  // cross-scope leakage tussen `.hero-section .card` en `.sidebar .card`).
  let strictMatchCount = 0;
  for (const rule of rules) {
    if (!ruleMatchesElementStrict(rule.selector, classes, ancestorClasses)) continue;
    strictMatchCount++;
    for (const [prop, value] of rule.props) {
      merged.set(prop, value);
    }
  }

  // PASS 2 — LENIENT rightmost-only fallback. ALLEEN wanneer pass 1 niks
  // opleverde (element is helemaal niet gematched door ancestor-aware
  // routes). Behoudt oude gedrag voor sites zonder descendant-styling +
  // voorkomt MIN_CONFIDENCE drops voor elementen waarvan we eenvoudige
  // class-only rules wel kennen.
  if (strictMatchCount === 0) {
    for (const rule of rules) {
      if (!ruleMatchesElementLenient(rule.selector, classes)) continue;
      for (const [prop, value] of rule.props) {
        merged.set(prop, value);
      }
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
 * Parse a CSS selector into ancestor-aware "selector paths". Each
 * alternative (comma-separated) becomes a path: a right-to-left chain of
 * segments where each segment has required classes + a combinator that
 * describes the relationship with the segment to its right (= the
 * descendant direction during matching).
 *
 * Examples:
 *   ".btn"              → [{ segments: [{classes:['btn'], combinator:'desc'}] }]
 *   ".parent .card"     → [{ segments: [
 *                              {classes:['card'], combinator:'desc'},   // rightmost = element
 *                              {classes:['parent'], combinator:'desc'}, // must be ancestor
 *                          ]}]
 *   ".parent > .card"   → [{ segments: [
 *                              {classes:['card'], combinator:'desc'},
 *                              {classes:['parent'], combinator:'child'}, // must be DIRECT parent
 *                          ]}]
 *
 * Sibling-combinators (~, +) worden gemarkeerd als 'sibling' en bij match
 * geskipt (we hebben geen sibling-info in resolveStyles call-site). Acceptabel
 * als false-negative voor het zeldzame `.a + .b { padding: ... }` patroon.
 */
type SelectorCombinator = 'desc' | 'child' | 'sibling';
interface SelectorSegment {
  classes: string[];
  /** Relationship met de NIET-rechter buur (de buur die dichter bij root staat). */
  combinator: SelectorCombinator;
}
interface SelectorPath {
  /** Right-to-left: [0]=element, [1]=parent, [2]=grandparent, ... */
  segments: SelectorSegment[];
}

const SELECTOR_PATH_CACHE = new Map<string, SelectorPath[]>();
function parseSelectorPaths(selector: string): SelectorPath[] {
  const cached = SELECTOR_PATH_CACHE.get(selector);
  if (cached) return cached;

  // Split on commas at the top level (skip commas inside :not(), etc.)
  const alternatives = selector.split(/,(?![^()]*\))/);
  const result: SelectorPath[] = [];

  for (const alt of alternatives) {
    const trimmed = alt.trim();
    if (!trimmed) continue;
    // Tokenize: split op whitespace en combinators, BEHOUD de combinator-tokens.
    // bv. ".a > .b .c" → [".a", ">", ".b", ".c"] (whitespace = descendant)
    const tokens = trimmed.split(/\s*(>|~|\+)\s*|\s+/).filter((t) => t && t.length > 0);
    if (tokens.length === 0) continue;

    const segments: SelectorSegment[] = [];
    let pendingCombinator: SelectorCombinator = 'desc';
    // Process right-to-left
    for (let i = tokens.length - 1; i >= 0; i--) {
      const tok = tokens[i];
      if (tok === '>') { pendingCombinator = 'child'; continue; }
      if (tok === '+' || tok === '~') { pendingCombinator = 'sibling'; continue; }
      // Strip pseudo-classes/elements: .btn:hover → .btn
      const stripped = tok.replace(/::?[\w-]+(\([^)]*\))?/g, '');
      const classMatches = [...stripped.matchAll(/\.([\w-]+)/g)];
      const classes = classMatches.map((m) => m[1]);
      segments.push({ classes, combinator: pendingCombinator });
      pendingCombinator = 'desc';
    }
    if (segments.length > 0) result.push({ segments });
  }

  SELECTOR_PATH_CACHE.set(selector, result);
  return result;
}

/**
 * Ancestor-aware match in twee modes:
 *   - STRICT: rightmost-segment matcht element + ancestor-segments
 *     verifiëren tegen de DOM ancestor-chain. Hoge precisie.
 *   - LENIENT: alleen rightmost segment match (cross-scope leakage
 *     mogelijk). Wordt door resolveStyles ALLEEN gebruikt als pure-
 *     fallback wanneer ZERO strict-matches op het element zijn — anders
 *     contamineren bv. `.hero-section .card` en `.sidebar .card` regels
 *     elkaar omdat beide `.card`-rightmost hebben.
 */
function ruleMatchesElementStrict(
  selector: string,
  elClasses: string[],
  ancestorClasses: Set<string>[],
): boolean {
  if (elClasses.length === 0) return false;
  const elSet = new Set(elClasses);
  const paths = parseSelectorPaths(selector);
  for (const path of paths) {
    if (matchPath(path, elSet, ancestorClasses)) return true;
  }
  return false;
}

function ruleMatchesElementLenient(
  selector: string,
  elClasses: string[],
): boolean {
  if (elClasses.length === 0) return false;
  const elSet = new Set(elClasses);
  const paths = parseSelectorPaths(selector);
  for (const path of paths) {
    const rightmost = path.segments[0];
    if (
      rightmost &&
      rightmost.classes.length > 0 &&
      rightmost.classes.every((c) => elSet.has(c))
    ) {
      return true;
    }
  }
  return false;
}

function matchPath(
  path: SelectorPath,
  elSet: Set<string>,
  ancestors: Set<string>[],
): boolean {
  if (path.segments.length === 0) return false;
  // Rightmost segment moet altijd op het element zelf matchen
  const elSeg = path.segments[0];
  if (elSeg.classes.length === 0) return false; // tag-only, skip
  if (!elSeg.classes.every((c) => elSet.has(c))) return false;
  if (path.segments.length === 1) return true;

  // Walk de rest van de segments (parent, grandparent, ...) door de ancestor-chain
  let ancIdx = 0;
  for (let i = 1; i < path.segments.length; i++) {
    const seg = path.segments[i];
    if (seg.combinator === 'sibling') return false; // geen sibling-info beschikbaar
    if (seg.classes.length === 0) {
      // Tag-only ancestor (bv. "nav .btn") — kunnen we niet verifiëren,
      // wees lenient: accepteer alsof matched + advanceer 1 ancestor
      if (seg.combinator === 'child') {
        if (ancIdx >= ancestors.length) return false;
        ancIdx++;
      }
      // desc: gewoon doorzetten zonder consumptie
      continue;
    }
    if (seg.combinator === 'child') {
      // Direct parent
      const anc = ancestors[ancIdx];
      if (!anc || !seg.classes.every((c) => anc.has(c))) return false;
      ancIdx++;
    } else {
      // 'desc' — vind ergens vooruit in ancestor-chain
      let found = false;
      while (ancIdx < ancestors.length) {
        const anc = ancestors[ancIdx];
        ancIdx++;
        if (seg.classes.every((c) => anc.has(c))) { found = true; break; }
      }
      if (!found) return false;
    }
  }
  return true;
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
  // Fase 2 (brand-fidelity): een volledig-gespecificeerde framework-default
  // (Gutenberg/Gravity/Bootstrap) scoort anders juist máximaal en wint van de
  // échte merk-component. Penaliseer zodat merk-componenten bovenaan komen,
  // maar behoud 'm (op een puur-framework-site blijft er nog iets over).
  if (hasFrameworkDefaultClass(classes)) score *= 0.4;
  return Math.min(score, 1);
}
