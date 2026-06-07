/**
 * Helpers voor het herkennen van "no-op" scraped CSS-waardes.
 *
 * Centraliseert detectie van transparante/onzichtbare backgrounds en
 * effectief-geen-border declaraties zodat renderer + mapper consistent
 * dezelfde regels gebruiken.
 *
 * Pure functions, geen DOM, geen DB.
 */

/**
 * Detecteert of een background-waarde effectief transparant is en dus
 * geen visueel bewijs van een "echte" achtergrond. Matcht:
 *  - null / undefined / lege string
 *  - 'transparent' / 'inherit' / 'initial' / 'unset' / 'currentColor' (case-insensitive)
 *  - rgba(...) of hsla(...) met alpha=0
 *  - CSS variables (var(...)) — niet resolveerbaar in deze context
 */
export function isTransparentBackground(raw: string | null | undefined): boolean {
  if (!raw) return true;
  const t = raw.trim().toLowerCase();
  if (!t) return true;
  if (t === 'transparent' || t === 'inherit' || t === 'initial' || t === 'unset' || t === 'currentcolor') {
    return true;
  }
  if (t.startsWith('var(')) return true;
  // rgba(r, g, b, 0[.0]) — captures alpha 0 ongeacht r/g/b en spacing
  if (/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(?:\.0+)?\s*\)$/.test(t)) return true;
  // hsla(...) met alpha 0
  if (/^hsla\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(t)) return true;
  return false;
}

/**
 * Leest de alpha-component (0..1) uit een CSS-kleur. Ondersteunt:
 *  - 'transparent' → 0
 *  - 8-digit hex (#rrggbbaa) → aa/255
 *  - rgba()/hsla() met komma-syntax: laatste numerieke component
 *  - moderne space/slash-syntax: rgb(r g b / a), hsl(h s l / a%)
 *  - opaque kleuren (6/3-digit hex, rgb()/hsl() zonder alpha, named) → 1
 * Returnt `null` voor niet-interpreteerbare waardes (var(...), gradient, url()).
 *
 * Nodig omdat scrapes translucent overlay-buttons leveren (bv.
 * `rgb(255 255 255 / .1)`) die `isTransparentBackground` (alpha===0) mist maar
 * die als CTA-fill onzichtbaar zijn.
 */
export function colorAlpha(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (!t || t.startsWith('var(') || t.includes('gradient') || t.startsWith('url(')) return null;
  if (t === 'transparent') return 0;
  const m8 = t.match(/^#[0-9a-f]{6}([0-9a-f]{2})$/);
  if (m8) return parseInt(m8[1], 16) / 255;
  if (/^#[0-9a-f]{3}$/.test(t) || /^#[0-9a-f]{6}$/.test(t)) return 1;
  // Slash-syntax: rgb(r g b / a) of hsl(h s l / a) — alpha als 0..1 of %.
  const slash = t.match(/\/\s*([0-9]*\.?[0-9]+)(%?)\s*\)$/);
  if (slash) {
    const v = parseFloat(slash[1]);
    return slash[2] === '%' ? v / 100 : v;
  }
  // Komma-syntax rgba()/hsla(): de 4e component is alpha.
  const comma = t.match(/^(?:rgba|hsla)\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([0-9]*\.?[0-9]+)(%?)\s*\)$/);
  if (comma) {
    const v = parseFloat(comma[1]);
    return comma[2] === '%' ? v / 100 : v;
  }
  // rgb()/hsl() zonder alpha, of named color → opaque.
  if (/^(?:rgb|hsl)\(/.test(t) || /^[a-z]+$/.test(t)) return 1;
  return null;
}

/**
 * Een scraped button-background is "zwak" (ongeschikt als solide CTA-fill)
 * wanneer hij transparant of bijna-transparant is (alpha < 0.6). Zulke overlay-
 * fills lossen op in de sectie-achtergrond → de knop ziet eruit als platte tekst.
 * De renderer valt dan terug op de merk-accent zodat de CTA altijd los-popt.
 */
export function isWeakButtonBackground(raw: string | null | undefined): boolean {
  if (isTransparentBackground(raw)) return true;
  const a = colorAlpha(raw);
  return a != null && a < 0.6;
}

/**
 * Detecteert of een border-shorthand effectief geen border oplevert.
 *  - null / leeg / 'none' / 'inherit' / 'initial'
 *  - width=0 in elke eenheid: '0', '0px', '0em', '0rem', '0%' + style + color
 *  - style='none' ongeacht width: '2px none #000'
 *  - color met alpha=0 als geheel matchbaar (zeldzaam)
 *  - CSS variables
 */
export function isNoOpBorder(raw: string | null | undefined): boolean {
  if (!raw) return true;
  const t = raw.trim().toLowerCase();
  if (!t || t === 'none' || t === 'inherit' || t === 'initial' || t === 'unset') return true;
  if (t.startsWith('var(')) return true;
  // Width=0 in elke eenheid gevolgd door whitespace OF einde — vangt
  // '0 solid #fff', '0px none rgb(...)', '0em solid #000', '0rem' op.
  // Lookahead (?=\s|$) zorgt dat '0.5px solid #000' NIET matcht (de '0'
  // wordt anders door \b apart van '.5' herkend).
  if (/^0(?:px|em|rem|%)?(?=\s|$)/.test(t)) return true;
  // Style=none ergens in shorthand → effectief geen border
  if (/\bnone\b/.test(t)) return true;
  return false;
}
