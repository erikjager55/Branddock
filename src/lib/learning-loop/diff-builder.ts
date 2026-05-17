/**
 * Diff-builder — produces structured diff and aggregate summary
 * between two ContentVersion snapshots.
 *
 * V2 (2026-05-17): ProseMirror-aware paragraph-level diff via Markdown-
 * isation. Rich-text inputs (TipTap/ProseMirror JSON) are converted to
 * Markdown before paragraph-diffing, so formatting and structural
 * changes surface as content changes — bolding a phrase, promoting a
 * paragraph to a heading, wrapping text in a blockquote, etc. all
 * become visible diff entries. Plain text and HTML inputs continue to
 * work via the existing extraction path.
 *
 * No external diff library: the Markdown round-trip is cheap and the
 * existing paragraph-LCS handles the rest. The DiffEntry shape stays
 * unchanged so all downstream consumers (classifyEdit, UI render) get
 * richer signal without code changes.
 *
 * Cat 4 — leerlus-werkstroom sessie 2.
 */

import type { DiffSummary } from "@/types/learning-loop";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface DiffEntry {
  op: "equal" | "added" | "removed";
  text: string;
  /** Index in original 'before' paragraphs (for removed/equal). */
  beforeIndex?: number;
  /** Index in 'after' paragraphs (for added/equal). */
  afterIndex?: number;
}

export interface DiffResult {
  /** Structured diff entries — paragraph-level for v1. */
  entries: DiffEntry[];
  summary: DiffSummary;
}

// ─────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build a paragraph-level diff between two text snapshots.
 *
 * Strategy: split both into paragraphs, find which paragraphs from
 * 'before' survived in 'after' (regardless of order), classify the rest
 * as added/removed, detect reordering.
 *
 * Not suitable for very long content (>10K paragraphs) — O(n*m) matching.
 * Typical content: <100 paragraphs → instant.
 */
export function buildPlainTextDiff(
  before: string,
  after: string,
): DiffResult {
  const beforeParas = splitParagraphs(before);
  const afterParas = splitParagraphs(after);

  const entries = computeParagraphDiff(beforeParas, afterParas);
  const summary = computeSummary(before, after, entries, beforeParas, afterParas);

  return { entries, summary };
}

/**
 * Format-aware entry-point. Detects ProseMirror JSON / HTML / plain text
 * and reduces all three to Markdown before running paragraph-LCS. The
 * Markdown round-trip captures structural and mark-level changes that
 * pure text-extraction missed (bolding text, promoting paragraphs to
 * headings, wrapping in lists or blockquotes).
 *
 * @param contentTypeId from `deliverable-types.ts` — reserved for future
 *   format-specific tweaks (e.g. table-aware diff for content-types that
 *   render tabular data). Unused in V2.
 */
export function buildDiff(
  before: string,
  after: string,
  contentTypeId?: string,
): DiffResult {
  void contentTypeId; // reserved for future format-specific routing
  const beforeText = extractPlainText(before);
  const afterText = extractPlainText(after);
  return buildPlainTextDiff(beforeText, afterText);
}

// ─────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags and decode common entities. Keeps text-content,
 * separates blocks with newlines.
 */
function extractPlainText(input: string): string {
  if (!input) return "";

  // If looks like JSON (ProseMirror doc), try to extract text
  if (input.trim().startsWith("{") && input.includes('"type"')) {
    try {
      return extractTextFromProseMirror(JSON.parse(input));
    } catch {
      // fall through to HTML/plain handling
    }
  }

  // HTML / plain
  return input
    .replace(/<\/?(p|div|h[1-6]|li|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface ProseMirrorMark {
  type?: string;
  attrs?: Record<string, unknown>;
}

interface ProseMirrorNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: ProseMirrorMark[];
  content?: ProseMirrorNode[];
}

interface PMContext {
  /** True when the current walk is inside a list — drives `- ` / `1. ` prefixes for list_item children. */
  listType?: "bullet" | "ordered";
  /** Index of the current list_item within its parent list — used for ordered-list numbering. */
  listIndex?: number;
}

/**
 * Recursively serialise ProseMirror JSON to a Markdown-flavoured string.
 *
 * Captures:
 *  - headings as `# ` / `## ` / `### ` (level from attrs.level, default 1)
 *  - bullet / ordered list items as `- text` / `1. text`
 *  - blockquote children prefixed with `> `
 *  - code_block wrapped in triple-backticks
 *  - inline marks: bold → `**text**`, italic → `*text*`, code → `` `text` ``,
 *    underline → `__text__`, strike → `~~text~~`, link → `[text](href)`
 *
 * Block-level nodes emit a trailing blank line so splitParagraphs sees them
 * as separate paragraphs — that's what makes formatting changes show up as
 * removed+added pairs in the diff entries.
 */
function extractTextFromProseMirror(
  node: ProseMirrorNode | unknown,
  ctx: PMContext = {},
): string {
  if (!node || typeof node !== "object") return "";
  const n = node as ProseMirrorNode;

  // Leaf text node — wrap by marks from inside out.
  if (typeof n.text === "string") {
    return applyMarks(n.text, n.marks);
  }

  const children = Array.isArray(n.content) ? n.content : [];

  switch (n.type) {
    case "heading": {
      const level = clampHeadingLevel(n.attrs?.level);
      const inner = children.map((c) => extractTextFromProseMirror(c, {})).join("");
      return `${"#".repeat(level)} ${inner}\n\n`;
    }
    case "blockquote": {
      const inner = children.map((c) => extractTextFromProseMirror(c, {})).join("");
      // Prefix every non-empty line with "> " so the structural marker
      // survives the paragraph split.
      return (
        inner
          .split("\n")
          .map((line) => (line.trim().length > 0 ? `> ${line}` : line))
          .join("\n") + "\n"
      );
    }
    case "bullet_list":
    case "bulletList": {
      const inner = children
        .map((c, i) => extractTextFromProseMirror(c, { listType: "bullet", listIndex: i }))
        .join("");
      return inner + "\n";
    }
    case "ordered_list":
    case "orderedList": {
      const inner = children
        .map((c, i) => extractTextFromProseMirror(c, { listType: "ordered", listIndex: i }))
        .join("");
      return inner + "\n";
    }
    case "list_item":
    case "listItem": {
      const prefix =
        ctx.listType === "ordered" ? `${(ctx.listIndex ?? 0) + 1}. ` : "- ";
      const inner = children.map((c) => extractTextFromProseMirror(c, {})).join("").trimEnd();
      return `${prefix}${inner}\n`;
    }
    case "code_block":
    case "codeBlock": {
      const inner = children.map((c) => extractTextFromProseMirror(c, {})).join("");
      const lang = typeof n.attrs?.language === "string" ? (n.attrs.language as string) : "";
      return `\`\`\`${lang}\n${inner}\n\`\`\`\n\n`;
    }
    case "paragraph": {
      const inner = children.map((c) => extractTextFromProseMirror(c, {})).join("");
      return inner.length > 0 ? `${inner}\n\n` : "";
    }
    case "hard_break":
    case "hardBreak":
      return "\n";
    default:
      // doc / unknown wrappers — recurse through children without a wrapper.
      return children.map((c) => extractTextFromProseMirror(c, ctx)).join("");
  }
}

function clampHeadingLevel(raw: unknown): number {
  if (typeof raw !== "number") return 1;
  if (!Number.isFinite(raw)) return 1;
  return Math.min(6, Math.max(1, Math.round(raw)));
}

/**
 * Wrap text with Markdown syntax for each mark, inside-out. Order matters
 * (bold-italic vs italic-bold render the same in Markdown so the result is
 * deterministic). Unknown marks are ignored.
 */
function applyMarks(text: string, marks?: ProseMirrorMark[]): string {
  if (!marks || marks.length === 0) return text;
  let wrapped = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
      case "strong":
        wrapped = `**${wrapped}**`;
        break;
      case "italic":
      case "em":
        wrapped = `*${wrapped}*`;
        break;
      case "code":
        wrapped = `\`${wrapped}\``;
        break;
      case "underline":
        wrapped = `__${wrapped}__`;
        break;
      case "strike":
      case "strikethrough":
        wrapped = `~~${wrapped}~~`;
        break;
      case "link": {
        const href = typeof mark.attrs?.href === "string" ? (mark.attrs.href as string) : "";
        wrapped = href ? `[${wrapped}](${href})` : wrapped;
        break;
      }
      default:
        // Unknown mark — preserve text but skip the wrapper.
        break;
    }
  }
  return wrapped;
}

/** Split text into paragraphs by double-newline; trim each. */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Compute paragraph-level diff via greedy LCS approximation.
 * Returns entries marking each paragraph as equal/added/removed.
 */
function computeParagraphDiff(
  before: string[],
  after: string[],
): DiffEntry[] {
  const entries: DiffEntry[] = [];

  // Build hash-set of before paragraphs for quick lookup
  const beforeIndexByText = new Map<string, number[]>();
  before.forEach((p, i) => {
    const arr = beforeIndexByText.get(p) ?? [];
    arr.push(i);
    beforeIndexByText.set(p, arr);
  });

  const matchedBefore = new Set<number>();
  const afterMatches: Array<{ afterIndex: number; beforeIndex: number | null }> = [];

  // First pass: match each after-para to first available before-occurrence
  for (let i = 0; i < after.length; i++) {
    const para = after[i];
    const candidates = beforeIndexByText.get(para);
    let matched: number | null = null;
    if (candidates) {
      for (const idx of candidates) {
        if (!matchedBefore.has(idx)) {
          matched = idx;
          matchedBefore.add(idx);
          break;
        }
      }
    }
    afterMatches.push({ afterIndex: i, beforeIndex: matched });
  }

  // Emit removed paragraphs (in before but not matched)
  for (let i = 0; i < before.length; i++) {
    if (!matchedBefore.has(i)) {
      entries.push({ op: "removed", text: before[i], beforeIndex: i });
    }
  }

  // Emit after-paragraphs in their order: equal if matched, added if not
  for (const m of afterMatches) {
    if (m.beforeIndex !== null) {
      entries.push({
        op: "equal",
        text: after[m.afterIndex],
        beforeIndex: m.beforeIndex,
        afterIndex: m.afterIndex,
      });
    } else {
      entries.push({
        op: "added",
        text: after[m.afterIndex],
        afterIndex: m.afterIndex,
      });
    }
  }

  return entries;
}

/** Aggregate stats per `DiffSummary` shape. */
function computeSummary(
  before: string,
  after: string,
  entries: DiffEntry[],
  beforeParas: string[],
  afterParas: string[],
): DiffSummary {
  const beforeLen = before.length;
  const afterLen = after.length;

  let charsAdded = 0;
  let charsRemoved = 0;
  const touched = new Set<number>();

  for (const e of entries) {
    if (e.op === "added") {
      charsAdded += e.text.length;
      if (e.afterIndex !== undefined) touched.add(e.afterIndex);
    } else if (e.op === "removed") {
      charsRemoved += e.text.length;
    }
  }

  // Detect section reordering: paragraph N from before appears at
  // position M in after where N != M (and not just shifts from add/remove).
  const sectionsReordered = detectReordering(entries);

  const ratio = beforeLen > 0 ? charsAdded / beforeLen : 0;
  const totalChange = charsAdded + charsRemoved;
  const percentChanged =
    Math.max(beforeLen, afterLen) > 0
      ? Math.round((totalChange / Math.max(beforeLen, afterLen)) * 100)
      : 0;

  return {
    charsAdded,
    charsRemoved,
    paragraphsTouched: touched.size,
    percentChanged: Math.min(100, percentChanged),
    sectionsReordered,
    ratio,
  };
}

/**
 * True if surviving paragraphs appear in different order in 'after' than
 * in 'before'. Uses longest-non-decreasing-subsequence heuristic.
 */
function detectReordering(entries: DiffEntry[]): boolean {
  const equals = entries
    .filter((e) => e.op === "equal" && e.beforeIndex !== undefined)
    .map((e) => e.beforeIndex as number);

  if (equals.length < 2) return false;

  // If beforeIndex sequence is strictly increasing, no reorder
  for (let i = 1; i < equals.length; i++) {
    if (equals[i] < equals[i - 1]) return true;
  }
  return false;
}
