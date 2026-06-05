/**
 * Typography-per-rol extractor (Fase A2 verbeterplan).
 *
 * Classificeert CSS-rules naar typografie-rol (display / heading /
 * subheading / body / label / button) en bewaart font-family/size/weight/
 * line-height/letter-spacing/text-transform per rol.
 *
 * Doel: renderers gebruiken brand-specifieke type-styling per element-rol
 * i.p.v. de generic display/body uit een layoutStyle-preset.
 *
 * Pure functie — geen DOM, geen DB.
 */

import { resolveOrKeep } from './css-var-resolver';

export type TypographyRole =
  | "display"
  | "heading"
  | "subheading"
  | "body"
  | "label"
  | "button";

export interface ScrapedTypographyByRole {
  display?: TypographyRoleStyle;
  heading?: TypographyRoleStyle;
  subheading?: TypographyRoleStyle;
  body?: TypographyRoleStyle;
  label?: TypographyRoleStyle;
  button?: TypographyRoleStyle;
}

export interface TypographyRoleStyle {
  fontFamily: string | null;
  fontSize: string | null;
  fontWeight: string | null;
  lineHeight: string | null;
  letterSpacing: string | null;
  textTransform: string | null;
  /** Fase B — color uit `color:` declaratie. Pakt de eerste hex/rgb()
   *  waarde; nodig voor heading-text-color in LP-renderer zodat hero-h1
   *  in dezelfde kleur staat als op de bron. */
  color: string | null;
  /** Voor debug: source-selector(s) waar deze rol uit kwam. */
  sourceSelectors: string[];
}

// ─── Role-classifier per selector ─────────────────────────

const ROLE_PATTERNS: Array<{ role: TypographyRole; pattern: RegExp; weight: number }> = [
  // display: h1, .hero-title, .display-*
  { role: "display", pattern: /(^|[\s,])h1(\s|,|\{|$)/i, weight: 10 },
  { role: "display", pattern: /\.hero-(title|heading)/i, weight: 9 },
  { role: "display", pattern: /\.display(\b|[-_])/i, weight: 9 },
  { role: "display", pattern: /\.page-title/i, weight: 7 },

  // heading: h2, h3, .heading, .title
  { role: "heading", pattern: /(^|[\s,])h2(\s|,|\{|$)/i, weight: 10 },
  { role: "heading", pattern: /(^|[\s,])h3(\s|,|\{|$)/i, weight: 9 },
  { role: "heading", pattern: /\.section-(title|heading)/i, weight: 8 },
  { role: "heading", pattern: /\.heading(\b|[-_])/i, weight: 7 },

  // subheading: h4, .subtitle, .tagline, .lead
  { role: "subheading", pattern: /(^|[\s,])h4(\s|,|\{|$)/i, weight: 10 },
  { role: "subheading", pattern: /\.subtitle/i, weight: 8 },
  { role: "subheading", pattern: /\.tagline/i, weight: 7 },
  { role: "subheading", pattern: /\.lead/i, weight: 7 },

  // body: body, p, .text-body, html
  { role: "body", pattern: /^body(\s|,|\{|$)/i, weight: 10 },
  { role: "body", pattern: /^html(\s|,|\{|$)/i, weight: 9 },
  { role: "body", pattern: /(^|[\s,])p(\s|,|\{|$)/i, weight: 7 },
  { role: "body", pattern: /\.body-(text|copy)/i, weight: 8 },

  // label: .caption, .meta, .label, .eyebrow
  { role: "label", pattern: /\.caption(\b|[-_])/i, weight: 9 },
  { role: "label", pattern: /\.meta(\b|[-_])/i, weight: 8 },
  { role: "label", pattern: /\.eyebrow(\b|[-_])/i, weight: 9 },
  { role: "label", pattern: /\.overline(\b|[-_])/i, weight: 8 },
  { role: "label", pattern: /(^|[\s,])label(\s|,|\{|$)/i, weight: 7 },
  { role: "label", pattern: /\.tag(\b|[-_])/i, weight: 6 },

  // button: button, .btn, .cta
  { role: "button", pattern: /(^|[\s,])button(\s|,|\{|$)/i, weight: 10 },
  { role: "button", pattern: /\.btn(\b|[-_])/i, weight: 9 },
  { role: "button", pattern: /(^|[.\s\-_])cta(\b|[-_])/i, weight: 8 },
  { role: "button", pattern: /\.wp-block-button/i, weight: 9 },
];

// Sluit uit: pseudo-states + heavy-context selectors die geen brand-rol zijn
const SKIP_PATTERNS: RegExp[] = [
  /:hover\b/i,
  /:focus\b/i,
  /:active\b/i,
  /:disabled\b/i,
  /:visited\b/i,
  /::before\b/i,
  /::after\b/i,
  /\.menu-button/i,
  /\.close-button/i,
  /\.icon-button/i,
  /\.modal/i,
  /\.dropdown/i,
  /\.cookie/i,
  /\.banner/i,
];

interface ClassifiedRule {
  selector: string;
  role: TypographyRole;
  /** Higher = more authoritative for this role */
  weight: number;
  block: string;
}

function classifyRule(selector: string, block: string): ClassifiedRule | null {
  if (SKIP_PATTERNS.some((re) => re.test(selector))) return null;
  // Pak hoogste-weight match wanneer meerdere patterns matchen
  let best: { role: TypographyRole; weight: number } | null = null;
  for (const { role, pattern, weight } of ROLE_PATTERNS) {
    if (pattern.test(selector)) {
      if (!best || weight > best.weight) {
        best = { role, weight };
      }
    }
  }
  if (!best) return null;
  return { selector, role: best.role, weight: best.weight, block };
}

// ─── Property extractor (shared via inline regex) ─────────

function getProp(block: string, prop: string): string | null {
  const re = new RegExp(`(?:^|;|\\{)\\s*${prop}\\s*:\\s*([^;}]+?)(?:!important)?\\s*(?:;|}|$)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
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

// ─── Main extraction ──────────────────────────────────────

export function extractTypographyByRole(css: string): ScrapedTypographyByRole {
  const rules = parseCssRules(css);
  const classified: ClassifiedRule[] = [];
  for (const { selector, block } of rules) {
    const c = classifyRule(selector, block);
    if (c) classified.push(c);
  }

  // Bouw per-rol een merged style — hoogste weight wint per veld
  const result: ScrapedTypographyByRole = {};
  for (const c of classified) {
    if (!result[c.role]) {
      result[c.role] = {
        fontFamily: null,
        fontSize: null,
        fontWeight: null,
        lineHeight: null,
        letterSpacing: null,
        textTransform: null,
        color: null,
        sourceSelectors: [],
      };
    }
    const target = result[c.role]!;
    // Eerste-niet-null wint (rules zijn niet weight-sorted; per veld pak
    // de waarde van de hoogst-gewogen selector die hem heeft). Werkt
    // omdat we ze in document-volgorde processen: latere rules met
    // expliciete style overschrijven niet eerdere als hoge-weight selector
    // het veld al had. Verfijning: sort eerst op weight DESC, dan eerste-
    // gevonden-wint.
    if (!target.sourceSelectors.includes(c.selector)) {
      target.sourceSelectors.push(c.selector);
    }
  }

  // 2e pass: sort per-rol op weight DESC, dan vul velden van eerste hit
  const classifiedByRole = new Map<TypographyRole, ClassifiedRule[]>();
  for (const c of classified) {
    if (!classifiedByRole.has(c.role)) classifiedByRole.set(c.role, []);
    classifiedByRole.get(c.role)!.push(c);
  }
  for (const [role, list] of classifiedByRole.entries()) {
    list.sort((a, b) => b.weight - a.weight);
    const target = result[role]!;
    for (const c of list) {
      // Fase 1 (brand-fidelity): resolve var(--...) tegen de volledige CSS en
      // accepteer alleen geresolveerde (niet-null) waarden — zo blijft een
      // onresolveerbare var() het veld null houden en probeert de loop de
      // volgende rule i.p.v. "var(--bs-body-line-height)" te persisteren.
      if (!target.fontFamily) {
        const ff = resolveOrKeep(extractFontFamily(c.block), css);
        if (ff) target.fontFamily = ff;
      }
      if (!target.fontSize) {
        const v = resolveOrKeep(getProp(c.block, "font-size"), css);
        if (v) target.fontSize = v;
      }
      if (!target.fontWeight) {
        const v = resolveOrKeep(getProp(c.block, "font-weight"), css);
        if (v) target.fontWeight = v;
      }
      if (!target.lineHeight) {
        const v = resolveOrKeep(getProp(c.block, "line-height"), css);
        if (v) target.lineHeight = v;
      }
      if (!target.letterSpacing) {
        const v = resolveOrKeep(getProp(c.block, "letter-spacing"), css);
        if (v) target.letterSpacing = v;
      }
      if (!target.textTransform) target.textTransform = getProp(c.block, "text-transform");
      // Fase B — color uit `color:` declaratie, var() geresolved (geen literal).
      if (!target.color) {
        const rawColor = resolveOrKeep(getProp(c.block, "color"), css);
        if (rawColor) target.color = rawColor;
      }
      if (
        target.fontFamily &&
        target.fontSize &&
        target.fontWeight &&
        target.lineHeight &&
        target.letterSpacing &&
        target.textTransform
      ) break;  // Done filling — stop scanning
    }
  }

  // Strip rollen die geen single font-property gekregen hebben (selector
  // matchte wel maar declaratie bevatte geen typografie-props). Zo blijft
  // empty input → empty output.
  for (const role of Object.keys(result) as TypographyRole[]) {
    const r = result[role];
    if (!r) continue;
    const hasAnyProp =
      r.fontFamily || r.fontSize || r.fontWeight ||
      r.lineHeight || r.letterSpacing || r.textTransform;
    if (!hasAnyProp) delete result[role];
  }

  return result;
}

function extractFontFamily(block: string): string | null {
  const raw = getProp(block, "font-family");
  if (!raw) return null;
  // Pak eerste font uit chain, strip quotes
  const first = raw.split(",")[0]?.trim();
  if (!first) return null;
  return first.replace(/^["']|["']$/g, "");
}
