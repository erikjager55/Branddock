/**
 * Markdown-strip helpers for plain-text variant groups.
 *
 * Some Canvas variant groups (title, meta, cta, subject, etc.) are rendered
 * as plain text — no markdown parser. When the AI accidentally returns
 * markdown syntax (e.g. `# Heading`, `**bold**`), the raw characters become
 * visible in the UI. These helpers strip that syntax at render time as a
 * defense-in-depth alongside the canvas-orchestrator FORMATTING RULES prompt.
 *
 * We deliberately strip on render only (not on save), so the DB keeps the
 * raw AI output. If the prompt-fix improves later, no data migration needed.
 */

const EXACT_PLAIN_TEXT_GROUPS = new Set([
  'title',
  'meta',
  'meta-description',
  'metadescription',
  'cta',
  'subject',
  'preheader',
  'headline',
  'subheadline',
  'sub-headline',
  'slug',
]);

/**
 * Returns true when the variant group should render as plain text without
 * markdown formatting. Matches both exact group names (`cta`, `title`) and
 * common variants (`primary-cta`, `meta_description`, `sub_headline`).
 */
export function isPlainTextGroup(group: string | null | undefined): boolean {
  if (!group) return false;
  const g = group.toLowerCase().replace(/[_\s]/g, '-');
  if (EXACT_PLAIN_TEXT_GROUPS.has(g)) return true;
  if (g.includes('meta')) return true;
  if (g.endsWith('cta') || g.startsWith('cta-') || g.includes('-cta')) return true;
  if (g.includes('headline')) return true;
  if (g.endsWith('-title') || g.startsWith('title-')) return true;
  if (g.endsWith('-subject') || g === 'email-subject') return true;
  return false;
}

/** CTA hard cap — anything longer is paragraph-content and not button text. */
export const CTA_MAX_CHARS = 80;

/**
 * Strip common markdown syntax from a plain-text variant. Safe to call on
 * already-clean text (no-op). Collapses internal whitespace so a multi-line
 * markdown blob renders as a single line.
 */
export function stripMarkdownForPlainText(text: string | null | undefined): string {
  if (!text) return '';
  let out = text;

  // Fenced code blocks ``` ... ```
  out = out.replace(/```[\s\S]*?```/g, '');
  // Inline code `x`
  out = out.replace(/`([^`]+)`/g, '$1');

  // Leading heading markers, blockquotes, list bullets — strip the marker
  // only, keep the text. `^` with the `m` flag matches each line start.
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  out = out.replace(/^\s{0,3}>\s?/gm, '');
  out = out.replace(/^\s*[-*+]\s+/gm, '');
  out = out.replace(/^\s*\d+\.\s+/gm, '');

  // Bold / italic / strikethrough — keep inner text
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1');
  out = out.replace(/__([^_]+)__/g, '$1');
  out = out.replace(/\*([^*]+)\*/g, '$1');
  out = out.replace(/(?<![A-Za-z0-9_])_([^_]+)_(?![A-Za-z0-9_])/g, '$1');
  out = out.replace(/~~([^~]+)~~/g, '$1');

  // Links: [text](url) → text. Images: ![alt](url) → alt
  out = out.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Horizontal rules
  out = out.replace(/^\s*[-*_]{3,}\s*$/gm, '');

  // Collapse newlines + extra whitespace into single spaces
  out = out.replace(/\s*\n\s*/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();

  return out;
}

/**
 * Strip + truncate a CTA. Used when rendering CTA variant text — long
 * paragraphs that the AI sometimes returns get clipped to a button-sized
 * length so the preview chrome stays usable.
 */
export function clampCta(text: string | null | undefined): string {
  const stripped = stripMarkdownForPlainText(text);
  if (stripped.length <= CTA_MAX_CHARS) return stripped;
  return stripped.slice(0, CTA_MAX_CHARS - 1).trimEnd() + '…';
}

/**
 * Combined helper — strips markdown for any plain-text group, additionally
 * truncates CTAs. For non-plain-text groups (body, hook, …) returns the
 * input unchanged so markdown rendering downstream still works.
 */
export function renderForGroup(
  group: string | null | undefined,
  text: string | null | undefined,
): string {
  if (!isPlainTextGroup(group)) return text ?? '';
  if (group && group.toLowerCase().includes('cta')) return clampCta(text);
  return stripMarkdownForPlainText(text);
}
