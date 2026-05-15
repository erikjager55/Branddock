// Display-only helpers shared across platform preview components.

/**
 * Strip a duplicate headline prefix from body text at render-time only.
 *
 * AI variants sometimes emit a hook component AND repeat that hook as the
 * first line of body / caption. Rendering both produces a duplicate
 * headline visually. This util strips the prefix when it matches case-
 * and whitespace-insensitively. The underlying entry stays intact so
 * inline-edit shows the full body content.
 *
 * Applies to LinkedIn-post (headline/hook + body) and Instagram-post
 * (hook-line + caption) — both use a "first line is the hook" rendering
 * pattern.
 */
export function dedupeBodyPrefix(body: string, headline?: string | null): string {
  if (!headline) return body;
  const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
  const headTrim = norm(headline);
  if (!headTrim) return body;
  const stripped = body.trimStart();
  const lower = stripped.toLowerCase();
  const headLen = headTrim.length;
  if (norm(stripped.slice(0, headLen + 2)).startsWith(headTrim)) {
    const rest = stripped.slice(lower.indexOf(headTrim) + headLen).replace(/^[\s.,;:!?]+/, '');
    return rest.length > 0 ? rest : body;
  }
  return body;
}
