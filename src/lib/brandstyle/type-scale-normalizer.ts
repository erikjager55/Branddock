/**
 * Type-scale eenheid-normalisatie (verbeterplan Typography-fix, 2026-06-05).
 *
 * Doel: lever schonere, consistente type-scale-sizes door gemengde eenheden
 * (px/pt/em/%) naar `rem` te normaliseren vóór de DB-write. BEWUST GEEN dedup,
 * GEEN level-collision-resolutie en GEEN rem→px-omrekening:
 *
 *   - dedup/collision braken de size-gedreven `mapTypographyRoles` (die juist
 *     het AANTAL + de grootte van de niveaus gebruikt om buckets te vullen) en
 *     de live InContextPreview (exact-match op 'h1'/'h2'/'h3').
 *   - rem→px-omrekening corrumpeert bron-getrouwheid bij sites die de root
 *     rebasen (`html{font-size:62.5%}` → 2rem = 20px, niet 32px).
 *
 * Pure functies — geen DOM, geen DB, geen `any`. Onparseerbare waarden (var(),
 * onbekende units) blijven verbatim staan (fail-safe, nooit data verliezen).
 */

/** Converteer één CSS-lengte naar een rem-getal, of `null` als het geen
 *  enkelvoudige lengte is. em wordt als rem-equivalent behandeld (consistent
 *  met `parseToPx` in semantic-role-resolver). */
export function lengthToRem(value: string, rootPx = 16): number | null {
  const m = value.trim().match(/^(-?[\d.]+)(px|rem|em|pt|%)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  switch ((m[2] || 'px').toLowerCase()) {
    case 'px': return n / rootPx;
    case 'rem': return n;
    case 'em': return n;
    case 'pt': return (n * (4 / 3)) / rootPx;
    case '%': return n / 100;
    default: return null;
  }
}

/** Formatteer een rem-getal naar een nette CSS-string (max 3 decimalen). */
function formatRem(rem: number): string {
  return `${parseFloat(rem.toFixed(3))}rem`;
}

/**
 * Normaliseer één size-waarde naar `rem`. `clamp(min,pref,max)` → de min-arg
 * (consistent met de preview-cap; bewuste keuze, zie ADR). `calc()` → het
 * eerste numerieke token. Onparseerbaar (var(), lege string) → ongewijzigd.
 */
export function resolveSizeToRem(size: string | null | undefined, rootPx = 16): string {
  if (!size || !size.trim()) return size ?? '';
  const raw = size.trim();
  const clamp = raw.match(/clamp\(\s*([^,]+),/i);
  if (clamp) {
    const rem = lengthToRem(clamp[1].trim(), rootPx);
    return rem === null ? raw : formatRem(rem);
  }
  const calc = raw.match(/calc\(([^)]+)\)/i);
  if (calc) {
    const token = calc[1].match(/-?[\d.]+(?:px|rem|em|pt|%)/i)?.[0];
    const rem = token ? lengthToRem(token, rootPx) : null;
    return rem === null ? raw : formatRem(rem);
  }
  const rem = lengthToRem(raw, rootPx);
  return rem === null ? raw : formatRem(rem);
}

/**
 * Normaliseer de `size` van elke type-scale-entry naar `rem` met behoud van
 * alle overige velden (object-spread — de PDF-exporteurs lezen `usage`/
 * `letterSpacing`/`color`). Volgorde en aantal entries blijven ongewijzigd
 * zodat de size-gedreven rol-mapping exact dezelfde buckets vult.
 */
export function normalizeTypeScale<T extends { size?: string | null }>(
  scale: readonly T[],
  rootPx = 16,
): T[] {
  return scale.map((entry) => ({ ...entry, size: resolveSizeToRem(entry.size, rootPx) }));
}
