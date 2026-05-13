/**
 * Variant content sanitization — some variant groups must render as plain
 * text (title / meta description / CTA button label) but AI models have a
 * tendency to prefix them with markdown (`# Title`, `## CTA paragraph`).
 *
 * Defense-in-depth: the orchestrator prompt asks the model to use plain
 * text for these groups, but we also strip markdown at storage time and
 * at render time so raw `#` / `##` characters never leak into the UI.
 */

/** Variant groups that must be rendered as plain text (no markdown). */
export const PLAIN_TEXT_GROUPS = new Set<string>([
  "title",
  "meta",
  "meta-description",
  "cta",
  "subject",
  "preheader",
  "headline",
  "subheadline",
  "slug",
]);

/** Hard character cap per plain-text group. AI sometimes generates a
 *  paragraph where a short phrase was requested — this clamps the runaway
 *  cases without silently truncating reasonable output. */
export const PLAIN_TEXT_MAX_LENGTH: Record<string, number> = {
  title: 120,
  headline: 120,
  subheadline: 140,
  subject: 78, // email subject best practice
  preheader: 110,
  meta: 160, // SEO meta description
  "meta-description": 160,
  cta: 48, // short imperative button/link text
  slug: 80,
};

/** True if a variant group must be rendered without markdown. */
export function isPlainTextGroup(group: string | null | undefined): boolean {
  if (!group) return false;
  return PLAIN_TEXT_GROUPS.has(group.toLowerCase().trim());
}

/**
 * Strip common markdown syntax from a string, leaving human-readable text.
 *
 * Handles (in order):
 *  - ATX headings: `## Title` → `Title`
 *  - Setext headings: `Title\n====` → `Title`
 *  - Leading blockquote markers: `> Quote` → `Quote`
 *  - List markers: `- item`, `* item`, `1. item` → `item`
 *  - Bold/italic wrappers: `**x**`, `__x__`, `*x*`, `_x_`, `~~x~~`
 *  - Inline code: `` `code` ``
 *  - Link text: `[label](url)` → `label`
 *  - Horizontal rules: `---`, `***`, `___` → removed
 *  - HTML tags: `<br>`, `<span>` etc. → removed
 *
 * Whitespace is collapsed to single spaces and trimmed, so multi-line
 * output becomes a single clean line (appropriate for title/cta/meta).
 */
export function stripMarkdown(input: string): string {
  if (!input) return "";
  let s = input;

  // HTML tags
  s = s.replace(/<[^>]*>/g, "");

  // Horizontal rules on their own line
  s = s.replace(/^\s*(---|\*\*\*|___)\s*$/gm, "");

  // Setext heading underline (second line only — first line is the title)
  s = s.replace(/^(.+)\n\s*[=-]{2,}\s*$/gm, "$1");

  // ATX heading prefix: `#### `, `### `, `## `, `# ` → remove hashes + space
  s = s.replace(/^\s*#{1,6}\s+/gm, "");

  // Blockquote marker at line start
  s = s.replace(/^\s*>\s?/gm, "");

  // List marker at line start
  s = s.replace(/^\s*([-*+]|\d+\.)\s+/gm, "");

  // Link: [label](url) → label
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Image: ![alt](url) → alt
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");

  // Inline code ` ... ` (remove backticks, keep text)
  s = s.replace(/`([^`]+)`/g, "$1");

  // Bold **x** / __x__
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");

  // Italic *x* / _x_ — careful with standalone asterisks
  s = s.replace(/(^|\s)\*([^*\s][^*]*[^*\s]|[^*\s])\*(\s|$)/g, "$1$2$3");
  s = s.replace(/(^|\s)_([^_\s][^_]*[^_\s]|[^_\s])_(\s|$)/g, "$1$2$3");

  // Strikethrough ~~x~~
  s = s.replace(/~~([^~]+)~~/g, "$1");

  // Collapse all whitespace (including newlines) to single spaces.
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Normalize a variant's content for storage or rendering based on its
 * group. Plain-text groups are stripped + length-clamped; other groups
 * pass through unchanged so markdown in body/hook/etc. stays intact.
 */
export function sanitizeVariantContent(
  content: string,
  group: string | null | undefined,
): string {
  if (!isPlainTextGroup(group)) return content;
  const stripped = stripMarkdown(content);
  const cap = PLAIN_TEXT_MAX_LENGTH[group!.toLowerCase().trim()];
  if (cap && stripped.length > cap) {
    // Soft truncate: cut on last word boundary within cap, then add ellipsis
    // only if we actually cut. Keeps clamp from chopping mid-word.
    const slice = stripped.slice(0, cap);
    const lastSpace = slice.lastIndexOf(" ");
    const safeCut = lastSpace > cap * 0.6 ? slice.slice(0, lastSpace) : slice;
    return safeCut.trimEnd();
  }
  return stripped;
}

/**
 * UX-fix 2026-05-13: enforce brand-name capitalization op AI output.
 * AI ignoreert soms "preserve original capitalization" instructie en
 * produceert lowercase "napking" of all-caps "NAPKING". Voorheen blokte
 * dat de hele generatie via property-eval BLOCK; nu auto-fix tijdens
 * sanitize. Word-boundary aware regex om sub-string matches te voorkomen
 * (bv. "napkings" als bestaand woord — onwaarschijnlijk maar veilig).
 *
 * Aanroepen vanuit canvas-orchestrator persistVariants per variant.
 */
export function enforceBrandNameCapitalization(
  content: string,
  brandName: string | null | undefined,
): string {
  if (!brandName || brandName.length < 2 || !content) return content;
  // Case-insensitive match. Vervang elke instance die niet exact-case matched
  // met de canonical brandName.
  const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');
  return content.replace(pattern, (matched) => {
    // Only replace when the case differs from canonical to avoid no-op work
    return matched === brandName ? matched : brandName;
  });
}
