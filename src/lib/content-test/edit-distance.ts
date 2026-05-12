// =============================================================
// Edit-distance signal (content-test #6.B).
// Genormaliseerd Levenshtein-distance voor content.edited events.
// > 0.20 = soft-negative signal voor regression-corpus filter.
//
// Whitespace-collapsing + lowercase-normalization vóór compare zodat
// markdown-formatting verschillen (extra newlines, hoofdletter-CTA)
// niet als major edits worden gemarkeerd.
//
// Wagner-Fischer algoritme met two-row optimisation (O(n) ruimte
// ipv O(n*m)). Bij zeer grote teksten (>5000 chars) wordt eerst
// truncation toegepast om quadratische tijd te voorkomen.
// =============================================================

const MAX_LENGTH = 5000;

/**
 * Compute normalized Levenshtein distance tussen original en edited.
 * Output 0.0 (identical) - 1.0 (volledig herschreven).
 *
 * Truncation: bij > MAX_LENGTH chars wordt eerste MAX_LENGTH gebruikt.
 * Voor inline-edit save scenarios is dat ruim voldoende (longest blog
 * variant ~3000-4000 chars).
 */
export function computeEditDistance(original: string, edited: string): number {
  const a = normalize(original).slice(0, MAX_LENGTH);
  const b = normalize(edited).slice(0, MAX_LENGTH);

  if (a === b) return 0;
  if (a.length === 0) return b.length > 0 ? 1 : 0;
  if (b.length === 0) return 1;

  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return distance / maxLen;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Two-row Wagner-Fischer Levenshtein.
 * O(min(m,n)) ruimte, O(m*n) tijd.
 */
function levenshtein(a: string, b: string): number {
  // Zorg dat b het kortste is (minder kolommen in inner loop)
  if (a.length < b.length) {
    [a, b] = [b, a];
  }
  const m = b.length;
  let prev = new Array<number>(m + 1);
  let curr = new Array<number>(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,         // deletion
        curr[j - 1] + 1,     // insertion
        prev[j - 1] + cost,  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[m];
}

/**
 * Threshold-check: > 0.20 = soft-negative signal (regression-corpus candidate).
 */
export function isSignificantEdit(distance: number): boolean {
  return distance > 0.2;
}
