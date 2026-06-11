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

/**
 * Prefix/pattern rules for short plain-text component groups emitted by
 * platform-specific content types (search/display ads, LinkedIn polls,
 * X threads). These fields render verbatim in platform previews, so
 * markdown would leak as raw characters. Centralized here so prompt
 * building (canvas-orchestrator regeneration) and storage-time
 * sanitization share one classification (prompt-audit 2026-06-11).
 */
function matchesPlainTextPattern(group: string): boolean {
  if (group.includes("headline")) return true; // headline-1, short-headline-3, long-headline
  if (group.startsWith("description-")) return true; // description-1..5 (ads)
  if (group.startsWith("option-")) return true; // option-1..4 (LinkedIn poll)
  if (group === "question") return true; // LinkedIn poll question
  if (group.startsWith("tweet-")) return true; // tweet-2..6 (X thread)
  if (group.startsWith("sitelink-")) return true; // sitelink-N-title / -description
  if (group.startsWith("path-")) return true; // path-1/2 (search-ad display URL)
  if (group.startsWith("cta-") || group.endsWith("-cta")) return true; // cta-tweet, closing-cta
  if (/^email-\d+-subject$/.test(group)) return true; // email-1..7-subject (sequence contracts)
  if (group === "preview-text") return true; // re-engagement inbox preview text
  if (/^question-\d+$/.test(group)) return true; // question-1..6 (faq-page)
  return false;
}

/**
 * Length caps for plain-text groups matched by pattern rather than exact
 * name — numbered contract groups (email-3-subject, question-4) can't live
 * in the exact-match PLAIN_TEXT_MAX_LENGTH map. First matching entry wins.
 * Caps mirror the component-contract maxLength values in
 * component-templates-fallback.ts so prompt budget and storage clamp agree.
 */
const PLAIN_TEXT_PATTERN_MAX_LENGTH: ReadonlyArray<{ pattern: RegExp; cap: number }> = [
  { pattern: /^email-\d+-subject$/, cap: 60 },
  { pattern: /^preview-text$/, cap: 110 },
  { pattern: /^question-\d+$/, cap: 120 },
];

/** True if a variant group must be rendered without markdown. */
export function isPlainTextGroup(group: string | null | undefined): boolean {
  if (!group) return false;
  const g = group.toLowerCase().trim();
  return PLAIN_TEXT_GROUPS.has(g) || matchesPlainTextPattern(g);
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
export function stripMarkdown(input: string, preserveLineBreaks = false): string {
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

  // Collapse whitespace. Multi-line groups (tweets) keep their line breaks:
  // X renders newlines verbatim, so collapsing them flattens deliberate
  // thread formatting. Other plain-text groups collapse to a single line.
  if (preserveLineBreaks) {
    s = s
      .split("\n")
      .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } else {
    s = s.replace(/\s+/g, " ").trim();
  }

  return s;
}

/** Plain-text groups where line breaks are meaningful platform formatting. */
function preservesLineBreaks(group: string): boolean {
  return group.startsWith("tweet-") || group === "cta-tweet";
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
  const normalizedGroup = group!.toLowerCase().trim();
  const stripped = stripMarkdown(content, preservesLineBreaks(normalizedGroup));
  const cap =
    PLAIN_TEXT_MAX_LENGTH[normalizedGroup] ??
    PLAIN_TEXT_PATTERN_MAX_LENGTH.find(({ pattern }) => pattern.test(normalizedGroup))?.cap;
  if (cap && stripped.length > cap) {
    // Soft truncate: cut on the last word boundary within the cap so the
    // clamp never chops mid-word.
    const slice = stripped.slice(0, cap);
    const lastSpace = slice.lastIndexOf(" ");
    const safeCut = lastSpace > cap * 0.6 ? slice.slice(0, lastSpace) : slice;
    const clamped = safeCut.trimEnd();
    // Truncation must be observable (gotcha 2026-05-17: silent paths emit a
    // structured warn). A silent clamp hides prompt-vs-storage budget
    // mismatches until a user notices missing words.
    console.warn("[variant-content-sanitizer] plain-text cap clamped output", {
      group: normalizedGroup,
      cap,
      strippedLength: stripped.length,
      clampedLength: clamped.length,
    });
    return clamped;
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
