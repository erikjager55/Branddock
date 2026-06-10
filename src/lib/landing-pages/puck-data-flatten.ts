/**
 * Flatten a Puck data-tree to plain text for downstream evaluators
 * (F-VAL judge, brand-voice scorer, edit-distance comparisons).
 *
 * Used by Phase 6 page-level AI (auto-iterate + strict-rewrite). Pure
 * function — operates on any object shaped like Puck's Data; does not
 * import @puckeditor/core types so smoke-tests can call it without
 * pulling in React.
 */

interface PuckLikeItem {
  type: string;
  props?: Record<string, unknown>;
}

interface PuckLikeData {
  root?: { props?: Record<string, unknown> };
  content: PuckLikeItem[];
}

/**
 * Recursively walks a value and returns all string leaves whose parent
 * key is NOT in `excludeKeys`. Excludes are config-style keys (id, href,
 * personaId, etc.) so the output is only human-readable copy.
 */
const EXCLUDED_KEYS = new Set([
  'id', 'href', 'personaId', 'columns', 'metadata', 'icon',
]);

/**
 * Audit 2026-06-10: asset-URLs lekten in de judge-input via exact-match-miss —
 * de echte key was `heroVisualUrl`, niet `src`/`url`. Suffix-matching vangt
 * elke huidige én toekomstige asset-prop (mediaUrl, imageSrc, linkHref, ...).
 */
function isAssetKey(key: string): boolean {
  return /(?:Url|Src|Href)$/.test(key) || key === 'url' || key === 'src';
}

function collectStrings(value: unknown, keyPath: string[], out: string[]): void {
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, keyPath, out);
    return;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    // Audit 2026-06-10: FAQ-items serialiseerden in insertion-order
    // ({answer, question}) waardoor de judge antwoorden VÓÓR vragen zag en
    // coherence afstrafte. Q&A-paren altijd als vraag → antwoord.
    if (typeof record.question === 'string' && typeof record.answer === 'string') {
      out.push(record.question);
      out.push(record.answer);
      for (const [k, v] of Object.entries(record)) {
        if (k === 'question' || k === 'answer') continue;
        if (EXCLUDED_KEYS.has(k) || isAssetKey(k)) continue;
        collectStrings(v, [...keyPath, k], out);
      }
      return;
    }
    for (const [k, v] of Object.entries(record)) {
      if (EXCLUDED_KEYS.has(k) || isAssetKey(k)) continue;
      collectStrings(v, [...keyPath, k], out);
    }
  }
}

/**
 * Returns all human-readable text content in the tree, joined with
 * newlines. Use case 1: brand-voice judge input. Use case 2: edit-distance
 * comparison between current + proposed page.
 */
export function flattenPuckText(data: PuckLikeData): string {
  const parts: string[] = [];
  collectStrings(data.root?.props ?? {}, ['root'], parts);
  for (const item of data.content) {
    collectStrings(item.props ?? {}, [item.type], parts);
  }
  return parts.filter((s) => s.trim().length > 0).join('\n');
}

/**
 * Audit 2026-06-10: judge-input-variant met `[ComponentType]`-sectielabels
 * zodat de F-VAL judge structuur ziet i.p.v. één ongelabelde fragment-soep
 * (mei-batch judge-rationales citeerden footer-items en losse UI-strings als
 * incoherentie). Bewust een aparte functie: flattenPuckText voedt óók
 * readability-woordtellingen en edit-distance, waar labels het signaal
 * zouden vervuilen.
 */
export function flattenPuckTextForJudge(data: PuckLikeData): string {
  const parts: string[] = [];
  collectStrings(data.root?.props ?? {}, ['root'], parts);
  for (const item of data.content) {
    const sectionParts: string[] = [];
    collectStrings(item.props ?? {}, [item.type], sectionParts);
    if (sectionParts.some((s) => s.trim().length > 0)) {
      parts.push(`[${item.type}]`);
      parts.push(...sectionParts);
    }
  }
  return parts.filter((s) => s.trim().length > 0).join('\n');
}

/**
 * Returns word count for the flattened text. Used by stub page-quality
 * heuristic in Phase 6 — production replaces this with F-VAL judge composite.
 */
export function wordCount(data: PuckLikeData): number {
  const text = flattenPuckText(data);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Returns component-type → count map for the tree. Used by smoke + by
 * future page-quality signals that weight on layout-density.
 */
export function componentTypeCounts(data: PuckLikeData): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of data.content) {
    counts[item.type] = (counts[item.type] ?? 0) + 1;
  }
  return counts;
}

export type { PuckLikeData, PuckLikeItem };
