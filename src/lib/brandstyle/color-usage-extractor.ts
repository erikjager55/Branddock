/**
 * Color usage extractor — scant CSS-rules en logt per hex-kleur waarvoor
 * de bron-website het gebruikt. Maakt het mogelijk om in de LP-renderer
 * te kiezen op basis van WAT de site echt doet i.p.v. blind 'primary =
 * hero-background'.
 *
 * Fase A van het LP-fidelity verbeterplan (2026-05-27).
 *
 * Strategie:
 *   1. Parse CSS-rules ({selector, body} paren)
 *   2. Voor elke property die een hex-waarde bevat:
 *      - Determine welke property-class (background / color / border / etc.)
 *      - Determine selector-context (hero / heading / button / nav / body / link)
 *      - Combine → usage-tag (bv. 'hero-bg', 'button-text', 'link-color')
 *   3. Aggregeer per hex (case-insensitive) tot een Set<tag>
 *
 * Output is een Map die de caller per kleur kan koppelen aan
 * StyleguideColor.tags.
 */

/** Alle tag-types die we genereren. Strikt zodat downstream consumers niet
 *  hoeven gokken welke strings binnenkomen. */
export type ColorUsageTag =
  | 'hero-bg'
  | 'section-bg'
  | 'body-bg'
  | 'card-bg'
  | 'heading-text'
  | 'body-text'
  | 'accent-text'
  | 'button-bg'
  | 'button-text'
  | 'link'
  | 'border';

/** Normaliseer hex naar 6-char lowercase (zonder #) voor consistente lookup. */
function normalizeHex(raw: string): string | null {
  let m = raw.match(/^#?([0-9a-f]{6})(?:[0-9a-f]{2})?$/i);
  if (m) return m[1].toLowerCase();
  m = raw.match(/^#?([0-9a-f]{3})$/i);
  if (m) {
    const [r, g, b] = m[1];
    return (r + r + g + g + b + b).toLowerCase();
  }
  return null;
}

/** Extract alle hex-waardes uit een CSS-property value string. */
function extractHexes(value: string): string[] {
  const result: string[] = [];
  const re = /#[0-9a-f]{3,8}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    const norm = normalizeHex(m[0]);
    if (norm) result.push(norm);
  }
  return result;
}

/** Strip pseudo-elements/classes voor cleaner selector-matching. */
function stripPseudo(selector: string): string {
  return selector.replace(/::?[\w-]+(\([^)]*\))?/g, '').trim();
}

// ─── Selector context classifiers ─────────────────────────

const HERO_RE = /(^|[\s.#])(hero|banner|jumbotron|masthead|page-header|top-section)([\s.{:#[]|$)/i;
const HEADING_TAG_RE = /(^|[\s,>+~])h[1-6]([\s,.{:#[]|$)/i;
const HEADING_CLASS_RE = /(^|[\s.#])(heading|headline|display|title)([-_]|\s|$)/i;
const BODY_TAG_RE = /(^|[\s,>+~])(html|body|p)([\s,.{:#[]|$)/i;
const BODY_CLASS_RE = /(^|[\s.#])(body|text|paragraph|copy|prose|content)([-_]|\s|$)/i;
const BUTTON_RE = /(^|[\s.#])(btn|button|cta)([-_]|\s|$)|\[role=["']button["']\]/i;
const LINK_RE = /(^|[\s,>+~])a([\s,.{:#[]|$)|(^|[\s.])link([-_]|\s|$)/i;
const NAV_RE = /(^|[\s.#])(nav|navbar|navigation|menu)([-_]|\s|$)/i;
const SECTION_RE = /(^|[\s,>+~])(section|article|main|header|footer|aside)([\s,.{:#[]|$)/i;
const CARD_RE = /(^|[\s.#])(card|tile|panel)([-_]|\s|$)/i;
const ACCENT_RE = /(^|[\s.#])(badge|chip|tag|label|eyebrow|kicker)([-_]|\s|$)/i;

interface SelectorContext {
  isHero: boolean;
  isHeading: boolean;
  isBody: boolean;
  isButton: boolean;
  isLink: boolean;
  isNav: boolean;
  isSection: boolean;
  isCard: boolean;
  isAccent: boolean;
}

function classifySelector(selector: string): SelectorContext {
  const sel = stripPseudo(selector);
  return {
    isHero: HERO_RE.test(sel),
    isHeading: HEADING_TAG_RE.test(sel) || HEADING_CLASS_RE.test(sel),
    isBody: BODY_TAG_RE.test(sel) || BODY_CLASS_RE.test(sel),
    isButton: BUTTON_RE.test(sel),
    isLink: LINK_RE.test(sel),
    isNav: NAV_RE.test(sel),
    isSection: SECTION_RE.test(sel),
    isCard: CARD_RE.test(sel),
    isAccent: ACCENT_RE.test(sel),
  };
}

// ─── Property-to-tag mapping ──────────────────────────────

/** Map een (property, selector-context) combinatie naar usage-tags. */
function tagsForRule(
  propertyName: string,
  ctx: SelectorContext,
): ColorUsageTag[] {
  const tags: ColorUsageTag[] = [];
  const prop = propertyName.toLowerCase();

  // Background-properties → bg-tags
  if (prop === 'background' || prop === 'background-color' || prop === 'background-image') {
    if (ctx.isHero) tags.push('hero-bg');
    if (ctx.isCard) tags.push('card-bg');
    if (ctx.isButton) tags.push('button-bg');
    if (ctx.isBody && !ctx.isHero && !ctx.isCard) tags.push('body-bg');
    if (ctx.isSection && !ctx.isHero && !ctx.isCard && !ctx.isBody) tags.push('section-bg');
    return tags;
  }

  // Color-properties (text)
  if (prop === 'color') {
    if (ctx.isLink && !ctx.isButton) tags.push('link');
    if (ctx.isButton) tags.push('button-text');
    if (ctx.isHeading) tags.push('heading-text');
    if (ctx.isAccent) tags.push('accent-text');
    if (ctx.isBody && !ctx.isHeading && !ctx.isLink && !ctx.isButton && !ctx.isAccent) {
      tags.push('body-text');
    }
    return tags;
  }

  // Border-properties
  if (prop.startsWith('border')) {
    tags.push('border');
    return tags;
  }

  return tags;
}

// ─── CSS rule parser ──────────────────────────────────────

interface ParsedDeclaration {
  property: string;
  value: string;
}

function parseDeclarations(block: string): ParsedDeclaration[] {
  const out: ParsedDeclaration[] = [];
  for (const decl of block.split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const property = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (!property || !value) continue;
    out.push({ property, value });
  }
  return out;
}

// ─── Main entry ───────────────────────────────────────────

/**
 * Scant volledige CSS-string en bouwt een usage-map per hex.
 * Returns Map<lowercase-hex-without-hash, Set<usage-tag>>.
 *
 * Caller maps deze terug op StyleguideColor.tags voor DB-persist.
 */
export function extractColorUsage(css: string): Map<string, Set<ColorUsageTag>> {
  const usage = new Map<string, Set<ColorUsageTag>>();
  const rulePattern = /([^{}@][^{}]*?)\{([^{}]+?)\}/g;
  let match: RegExpExecArray | null;
  while ((match = rulePattern.exec(css)) !== null) {
    const selectorGroup = match[1].trim();
    const body = match[2];
    const declarations = parseDeclarations(body);
    // Voor elke selector in de groep (comma-separated), classify context
    const selectors = selectorGroup.split(',').map((s) => s.trim()).filter(Boolean);
    if (selectors.length === 0) continue;
    for (const selector of selectors) {
      const ctx = classifySelector(selector);
      for (const { property, value } of declarations) {
        const hexes = extractHexes(value);
        if (hexes.length === 0) continue;
        const tags = tagsForRule(property, ctx);
        if (tags.length === 0) continue;
        for (const hex of hexes) {
          let set = usage.get(hex);
          if (!set) {
            set = new Set();
            usage.set(hex, set);
          }
          for (const t of tags) set.add(t);
        }
      }
    }
  }
  return usage;
}

/** Convenience: get usage-tags voor een specifieke hex (lookup-style). */
export function getUsageForHex(
  usage: Map<string, Set<ColorUsageTag>>,
  hex: string,
): ColorUsageTag[] {
  const norm = normalizeHex(hex);
  if (!norm) return [];
  const set = usage.get(norm);
  return set ? Array.from(set) : [];
}
