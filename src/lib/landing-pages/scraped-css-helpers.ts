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
