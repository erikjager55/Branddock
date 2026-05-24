/**
 * Lock-state helpers for Puck components (Phase 5 per ADR 2026-05-22-
 * landing-page-builder-architectuur).
 *
 * Lock-state lives on `puckData.content[i].metadata.locked: boolean`. This
 * keeps the regular component props clean — auto-iterate / strict-rewrite
 * never have to read it as a prop, and the AI-edit API skips locked
 * components server-side so the diff-preview never opens for them.
 *
 * Pure functions — operate on the puckData JSON value, return new copies
 * (immutable). Consumers wire to the Zustand setter so React re-renders
 * pick the new tree up.
 */

interface PuckContentItem {
  type: string;
  props: Record<string, unknown> & {
    id?: string;
    metadata?: {
      locked?: boolean;
      [k: string]: unknown;
    };
  };
  readOnly?: unknown;
}

interface PuckDataShape {
  root?: { props?: Record<string, unknown> };
  content: PuckContentItem[];
}

/**
 * Read lock-state for a component by id. Returns false for unknown ids
 * (a locked check should never crash because of bad state).
 */
export function isComponentLocked(data: PuckDataShape, componentId: string): boolean {
  const found = data.content.find((c) => c.props.id === componentId);
  return found?.props.metadata?.locked === true;
}

/**
 * Toggle lock-state for a component by id. Returns a new PuckDataShape
 * (no mutation). Unknown ids are returned unchanged.
 */
export function toggleComponentLock(data: PuckDataShape, componentId: string): PuckDataShape {
  const idx = data.content.findIndex((c) => c.props.id === componentId);
  if (idx < 0) return data;
  const current = data.content[idx];
  const nextLocked = !(current.props.metadata?.locked === true);
  const nextContent = data.content.slice();
  nextContent[idx] = {
    ...current,
    props: {
      ...current.props,
      metadata: { ...(current.props.metadata ?? {}), locked: nextLocked },
    },
  };
  return { ...data, content: nextContent };
}

/**
 * Count locked components in a tree. Used by smoke + by future page-level
 * auto-iterate (Phase 6) to surface "skipped because locked" stats.
 */
export function countLocked(data: PuckDataShape): number {
  return data.content.filter((c) => c.props.metadata?.locked === true).length;
}

/**
 * Strip lock-metadata before publishing a snapshot. Reasoning: the public
 * Render does not need lock-state, and keeping it in the published JSON
 * leaks an internal UX flag to anyone who curls the SSR markup. Pure
 * function — returns a deep-ish copy with metadata.locked removed.
 */
export function stripLockMetadataForPublish(data: PuckDataShape): PuckDataShape {
  return {
    ...data,
    content: data.content.map((c) => {
      if (!c.props.metadata) return c;
      const { locked: _locked, ...restMetadata } = c.props.metadata;
      const hasOtherMetadata = Object.keys(restMetadata).length > 0;
      const nextProps: PuckContentItem['props'] = { ...c.props };
      if (hasOtherMetadata) {
        nextProps.metadata = restMetadata;
      } else {
        delete nextProps.metadata;
      }
      return { ...c, props: nextProps };
    }),
  };
}
