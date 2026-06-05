/**
 * Font role classifier — bepaal DISPLAY vs UI vs UNKNOWN per gedetecteerd
 * font op basis van CSS-selector context waarin de font-family wordt
 * gebruikt. Sterker signaal dan de naam-heuristic in analysis-engine.ts
 * omdat het werkt voor élke font-naam (custom, made-up, codename, etc.)
 * zo lang de CSS-rules duidelijk heading- versus body-context aangeven.
 *
 * Strategie:
 *   1. Parse alle CSS-rules ({selector, block} paren)
 *   2. Voor elke rule met font-family: pak de EERSTE font-family-naam en
 *      classify de selector als 'heading' / 'body' / 'other'.
 *   3. Aggregeer per font-naam: tel hits in elke context-bucket.
 *   4. Verdict:
 *      - heading-hits > body-hits → DISPLAY
 *      - body-hits   > heading-hits → UI
 *      - gelijk of beide 0 → UNKNOWN (laat caller naam-heuristic doen)
 *
 * Edge cases:
 *   - h1 in een mega-menu kan body-styling hebben — accepted noise; we
 *     gebruiken pluraliteit, niet absolute calls
 *   - css `*` of `:root` rules met font-family → 'other' bucket, niet
 *     misleidend richting body of heading
 *   - resolved font-family met fallback-chain → we kijken alleen naar
 *     de eerste naam (de daadwerkelijke brand-font); fallbacks tellen niet
 */

export type FontRoleVerdict = 'DISPLAY' | 'UI' | 'UNKNOWN';

interface FontRoleHits {
  heading: number;
  body: number;
  other: number;
}

const HEADING_SELECTOR_RE =
  /(^|[\s,>+~])h[1-6]([\s,.{:#[]|$)|(^|[\s.])(heading|headline|display|hero|title|h[1-6])(-|_|\s|[A-Z]|$)/i;
const BODY_SELECTOR_RE =
  /(^|[\s,>+~])(html|body|p)([\s,.{:#[]|$)|(^|[\s.])(body|text|paragraph|copy|prose|content)(-|_|\s|[A-Z]|$)/i;

function classifySelector(selector: string): 'heading' | 'body' | 'other' {
  // Trim pseudo-elements zodat selectors als 'h1::before' beoordelen alsof h1
  const stripped = selector.replace(/::?[\w-]+(\([^)]*\))?/g, '').trim();
  // Heading-test eerst — een rule als ".hero h1" telt als heading, ook al
  // bevat het ergens 'hero' (dat is alleen versterkend).
  if (HEADING_SELECTOR_RE.test(stripped)) return 'heading';
  if (BODY_SELECTOR_RE.test(stripped)) return 'body';
  return 'other';
}

/** Strip quotes + lowercase voor case-insensitive matching. Geen splits hier:
 *  caller is verantwoordelijk om alleen de eerste naam door te geven.
 *  Strip óók de Adobe-CLS-fallback-suffix (`effra-fallback` → `effra`) zodat de
 *  CSS-zijde aligned blijft met de gecanonicaliseerde targetFonts — anders mist
 *  een heading-selector met `font-family:'effra-fallback'` zijn computed-style
 *  hit. Strak anchor `[\s-]fallback$` raakt legitieme `...Fallback`-namen niet. */
function normalizeName(name: string): string {
  return name
    .replace(/^["']|["']$/g, '')
    .trim()
    .replace(/[\s-]fallback$/i, '')
    .trim()
    .toLowerCase();
}

/**
 * Hoofd-functie. Scant alle CSS rules met font-family en aggregeert hits
 * per (lowercase) font-naam.
 *
 * @param css   Volledige gecombineerde stylesheet (inlineCss + linkedCssContent)
 * @param targetFonts  Lijst van font-namen om verdict voor te bepalen.
 *                     Klein letters versie wordt gebruikt voor lookup.
 * @returns Map<lowercaseFontName, verdict>
 */
export function classifyFontsByCssContext(
  css: string,
  targetFonts: string[],
): Map<string, FontRoleVerdict> {
  const targetSet = new Set(targetFonts.map((n) => normalizeName(n)));
  const hits = new Map<string, FontRoleHits>();
  for (const tgt of targetSet) {
    hits.set(tgt, { heading: 0, body: 0, other: 0 });
  }

  // CSS rule parser — laat staan flat, geen at-rules nesting support
  const rulePattern = /([^{}@][^{}]*?)\{([^{}]+?)\}/g;
  let match: RegExpExecArray | null;
  while ((match = rulePattern.exec(css)) !== null) {
    const selectorGroup = match[1].trim();
    const body = match[2];
    const fontFamilyMatch = body.match(/font-family\s*:\s*([^;}!]+)(?:!important)?/i);
    if (!fontFamilyMatch) continue;
    const firstName = fontFamilyMatch[1].split(',')[0]?.trim();
    if (!firstName) continue;
    const normalized = normalizeName(firstName);
    if (!targetSet.has(normalized)) continue;

    // Selector-group kan comma-separated zijn — class elke selector individueel
    // en increment per match. Een rule '.hero h1, body' telt 1 heading + 1 body.
    for (const single of selectorGroup.split(',')) {
      const trimmed = single.trim();
      if (!trimmed) continue;
      const bucket = classifySelector(trimmed);
      const h = hits.get(normalized);
      if (h) h[bucket]++;
    }
  }

  // Verdict per font: heading > body → DISPLAY, body > heading → UI,
  // anders UNKNOWN. Vermijd ties tegen 0 (geen signaal).
  const verdicts = new Map<string, FontRoleVerdict>();
  for (const [name, h] of hits.entries()) {
    if (h.heading === 0 && h.body === 0) {
      verdicts.set(name, 'UNKNOWN');
      continue;
    }
    if (h.heading > h.body) verdicts.set(name, 'DISPLAY');
    else if (h.body > h.heading) verdicts.set(name, 'UI');
    else verdicts.set(name, 'UNKNOWN');
  }
  return verdicts;
}

/** Convenience-export voor diagnostic logging. Geeft de raw hits per font. */
export function debugFontRoleHits(
  css: string,
  targetFonts: string[],
): Map<string, FontRoleHits> {
  const targetSet = new Set(targetFonts.map((n) => normalizeName(n)));
  const hits = new Map<string, FontRoleHits>();
  for (const tgt of targetSet) hits.set(tgt, { heading: 0, body: 0, other: 0 });
  const rulePattern = /([^{}@][^{}]*?)\{([^{}]+?)\}/g;
  let m: RegExpExecArray | null;
  while ((m = rulePattern.exec(css)) !== null) {
    const selectorGroup = m[1].trim();
    const body = m[2];
    const ff = body.match(/font-family\s*:\s*([^;}!]+)(?:!important)?/i);
    if (!ff) continue;
    const firstName = ff[1].split(',')[0]?.trim();
    if (!firstName) continue;
    const normalized = normalizeName(firstName);
    if (!targetSet.has(normalized)) continue;
    for (const single of selectorGroup.split(',')) {
      const trimmed = single.trim();
      if (!trimmed) continue;
      const bucket = classifySelector(trimmed);
      const h = hits.get(normalized);
      if (h) h[bucket]++;
    }
  }
  return hits;
}
