/**
 * Edit-classifier — heuristisch toewijzen van een `editType` aan een
 * user-edit op basis van de DiffSummary.
 *
 * V1: pure deterministische heuristieken op `diffSummary`. Geen AI-call.
 * `tone` classificatie is uitsluitend AI-judge — niet gedekt in v1.
 *
 * Cat 4 — leerlus-werkstroom sessie 2.
 */

import type { DiffSummary, EditTypeKey } from "@/types/learning-loop";

/**
 * Classify an edit based on its diffSummary.
 * Returns null if no heuristic matches confidently.
 *
 * Decision rules (in order):
 * 1. sectionsReordered → 'restructure'
 * 2. charsRemoved >> charsAdded → 'shorten'
 * 3. charsAdded >> charsRemoved → 'expand'
 * 4. percentChanged > 60 → 'rewrite' (most content replaced)
 * 5. percentChanged < 8 AND paragraphsTouched <= 2 → 'factual' (small targeted)
 * 6. percentChanged < 15 → 'polish' (light overall pass)
 * 7. fallback → null (uncategorized)
 *
 * 'tone' is intentionally not auto-classified — requires AI-judge.
 */
export function classifyEdit(summary: DiffSummary): EditTypeKey | null {
  const {
    charsAdded,
    charsRemoved,
    percentChanged,
    sectionsReordered,
    paragraphsTouched,
  } = summary;

  // Rule 1: structural reorder
  if (sectionsReordered) return "restructure";

  const totalChange = charsAdded + charsRemoved;
  if (totalChange === 0) return null;

  // Rule 4: heavy replacement (catches before shorten/expand to avoid
  // misclassifying full rewrites where added/removed are both large)
  if (percentChanged > 60) return "rewrite";

  // Rule 2/3: directional sizing — require meaningful asymmetry
  // (avoid 'shorten'/'expand' for tiny absolute changes)
  if (totalChange > 50) {
    if (charsRemoved > charsAdded * 1.3 && charsRemoved >= 30) {
      return "shorten";
    }
    if (charsAdded > charsRemoved * 1.3 && charsAdded >= 30) {
      return "expand";
    }
  }

  // Rule 5: tiny targeted change
  if (percentChanged < 8 && paragraphsTouched <= 2 && totalChange < 100) {
    return "factual";
  }

  // Rule 6: light polish pass
  if (percentChanged < 15) {
    return "polish";
  }

  // Fallback: distributed medium-magnitude change without clear pattern
  return null;
}

/**
 * Human-readable explanation of the classifier verdict — useful for
 * debugging and audit-display.
 */
export function describeEdit(
  summary: DiffSummary,
  editType: EditTypeKey | null,
): string {
  const parts: string[] = [];
  parts.push(`${summary.percentChanged}% changed`);
  parts.push(`+${summary.charsAdded}/-${summary.charsRemoved} chars`);
  if (summary.sectionsReordered) parts.push("sections reordered");
  parts.push(`${summary.paragraphsTouched} paragraph(s) touched`);

  const verdict = editType ?? "uncategorized";
  return `${verdict} (${parts.join(", ")})`;
}
