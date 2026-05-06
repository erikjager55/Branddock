/**
 * Diff-builder — produces structured diff and aggregate summary
 * between two ContentVersion snapshots.
 *
 * V1: plain-text paragraph-level diff. Format-aware via content-type
 * from `deliverable-types.ts`. Rich-text (TipTap/ProseMirror) and HTML
 * formats fall back to plain-text-extraction for now — full structural
 * diff TODO when ProseMirror-diff lib is added.
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
 * Format-aware entry-point. Extract plain text from rich-text formats
 * for v1, then run plain-text-diff.
 *
 * @param contentTypeId from `deliverable-types.ts` — used to detect format
 */
export function buildDiff(
  before: string,
  after: string,
  contentTypeId?: string,
): DiffResult {
  // V1: all formats fall back to plain-text-extraction.
  // TODO: ProseMirror-diff for rich-text once lib is added.
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

interface ProseMirrorNode {
  type?: string;
  text?: string;
  content?: ProseMirrorNode[];
}

/** Recursively extract text from ProseMirror JSON node. */
function extractTextFromProseMirror(node: ProseMirrorNode | unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as ProseMirrorNode;
  if (typeof n.text === "string") return n.text;

  if (Array.isArray(n.content)) {
    const parts = n.content.map(extractTextFromProseMirror);
    // Block-level types get newline separator
    const blockTypes = new Set([
      "paragraph",
      "heading",
      "blockquote",
      "list_item",
      "bullet_list",
      "ordered_list",
      "code_block",
    ]);
    if (n.type && blockTypes.has(n.type)) {
      return parts.join("") + "\n";
    }
    return parts.join("");
  }
  return "";
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
