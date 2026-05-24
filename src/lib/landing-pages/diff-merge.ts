/**
 * Per-component diff-merge helper for the Phase 6.1 page-level diff
 * preview UX. Used by PageDiffPreviewModal so users can accept or reject
 * AI proposals at the component level rather than all-or-nothing.
 *
 * Pure function — operates on Puck-like data trees by content[].props.id.
 * Returns a new tree (immutable). Unknown ids in `acceptedComponentIds`
 * are silently ignored (defensive against stale UI state).
 */

interface DiffMergeItem {
  type: string;
  props: Record<string, unknown> & { id?: string };
  readOnly?: unknown;
}

interface DiffMergeData {
  root?: { props?: Record<string, unknown> };
  content: DiffMergeItem[];
}

/**
 * Merge accepted components from `proposed` into `current` by id-match.
 *
 * Algorithm:
 *  - Build a map of proposed components keyed by id.
 *  - Walk current's content; for each item, swap with the proposed version
 *    only when the id appears in `acceptedComponentIds`.
 *  - Preserve current's ordering — proposals never reorder; the user can
 *    still drag-drop after accepting.
 *  - Components in proposed that aren't in current (rare; auto-iterate
 *    prompts forbid invention) are appended at the end.
 *
 * When `acceptedComponentIds` is the literal string 'all', accept every
 * proposed component that exists in current.
 */
export function mergeAcceptedComponents(
  current: DiffMergeData,
  proposed: DiffMergeData,
  acceptedComponentIds: string[] | 'all',
): DiffMergeData {
  const proposedById = new Map<string, DiffMergeItem>();
  for (const item of proposed.content) {
    const id = item.props.id;
    if (typeof id === 'string' && id.length > 0) proposedById.set(id, item);
  }

  const acceptedSet = acceptedComponentIds === 'all'
    ? new Set(proposedById.keys())
    : new Set(acceptedComponentIds);

  const nextContent: DiffMergeItem[] = current.content.map((item) => {
    const id = item.props.id;
    if (typeof id === 'string' && acceptedSet.has(id) && proposedById.has(id)) {
      return proposedById.get(id) as DiffMergeItem;
    }
    return item;
  });

  return { ...current, content: nextContent };
}

/**
 * Lists component ids that have differing props between `current` and
 * `proposed` — useful for showing a "X of Y changed" summary in the modal
 * header and for selecting "all changed" with one click.
 */
export function diffComponentIds(
  current: DiffMergeData,
  proposed: DiffMergeData,
): string[] {
  const proposedById = new Map<string, DiffMergeItem>();
  for (const item of proposed.content) {
    const id = item.props.id;
    if (typeof id === 'string') proposedById.set(id, item);
  }
  const differing: string[] = [];
  for (const item of current.content) {
    const id = item.props.id;
    if (typeof id !== 'string') continue;
    const proposedItem = proposedById.get(id);
    if (!proposedItem) continue;
    if (JSON.stringify(item.props) !== JSON.stringify(proposedItem.props)) {
      differing.push(id);
    }
  }
  return differing;
}

export type { DiffMergeData, DiffMergeItem };
