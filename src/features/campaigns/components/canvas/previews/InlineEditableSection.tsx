'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { updateComponentContent } from '../../../api/canvas.api';

/**
 * Helper hook for preview components — given a variant group key, returns
 * the InlineEditableEntry for the currently-selected variant in that group.
 * Returns null when the group has no variants yet (no content generated).
 *
 * Preview components call this once per group they render, then pass the
 * entry to <InlineEditableSection /> alongside a render function.
 */
export function useEditableEntry(group: string): InlineEditableEntry | null {
  const variants = useCanvasStore((s) => s.variantGroups.get(group));
  const selectedIdx = useCanvasStore((s) => s.selections.get(group) ?? 0);
  if (!variants) return null;
  const selected = variants[selectedIdx];
  if (!selected || !selected.content) return null;
  return {
    group,
    content: selected.content,
    componentId: selected.componentId,
    variantIndex: selectedIdx,
  };
}

/**
 * Variant entry shape — passed in by the preview component so we know which
 * variant group + variant index to update on save.
 */
export interface InlineEditableEntry {
  group: string;
  content: string;
  componentId?: string;
  variantIndex: number;
}

export interface InlineEditableSectionProps {
  entry: InlineEditableEntry;
  /** Renders the read-mode display of the content (e.g. an h1, p, or markdown). */
  render: (text: string) => React.ReactNode;
  /**
   * Persist edits to the DB. Optional override; when omitted the component
   * uses `useCanvasStore.deliverableId` which is set on Canvas mount.
   */
  deliverableId?: string;
  /** Optional ARIA label override — defaults to "Edit {group}". */
  ariaLabel?: string;
  /** Visual size hint for the Edit affordance — "compact" hides the
   *  Edit-button background to keep tight layouts clean. */
  size?: 'default' | 'compact';
}

/**
 * Inline-editable wrapper. Renders the content via `render` in read-mode,
 * with a hover-revealed Edit button. Click → switches to a textarea edit
 * mode. Save updates the canvas store and (when deliverableId+componentId
 * are present) persists to the DB. Cancel reverts.
 *
 * Replaces the old "Edit Content Sections" panel for all medium previews —
 * the user edits the rendered preview directly. Mirrors the
 * EditableArticleSection pattern from WebPageLayout.
 */
export function InlineEditableSection({
  entry,
  render,
  deliverableId: deliverableIdProp,
  ariaLabel,
  size = 'default',
}: InlineEditableSectionProps) {
  const { group, content, componentId, variantIndex } = entry;
  const storeDeliverableId = useCanvasStore((s) => s.deliverableId);
  const deliverableId = deliverableIdProp ?? storeDeliverableId ?? undefined;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleStartEdit = useCallback(() => {
    setDraft(content);
    setIsEditing(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [content]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraft(content);
  }, [content]);

  const handleSave = useCallback(async () => {
    if (draft.trim() === content.trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      // Update the variant in the store first — preview re-renders immediately.
      const store = useCanvasStore.getState();
      const variants = store.variantGroups.get(group);
      if (variants) {
        const updated = variants.map((v, i) =>
          i === variantIndex ? { ...v, content: draft } : v,
        );
        store.addVariantGroup(group, updated);
      }

      // Persist to the DB if we have the wiring for it.
      if (componentId && deliverableId) {
        await updateComponentContent(deliverableId, componentId, draft);
      }
    } catch {
      // Revert on failure so the preview stays in sync with the DB.
      const store = useCanvasStore.getState();
      const variants = store.variantGroups.get(group);
      if (variants) {
        const reverted = variants.map((v, i) =>
          i === variantIndex ? { ...v, content } : v,
        );
        store.addVariantGroup(group, reverted);
      }
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  }, [draft, content, group, variantIndex, componentId, deliverableId]);

  if (isEditing) {
    return (
      <div className="rounded-md border border-teal-300 bg-teal-50/30 p-3">
        <div className="flex items-center justify-end gap-1 mb-2">
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            if (e.key === 'Enter' && e.metaKey) handleSave();
          }}
          rows={Math.min(20, Math.max(2, draft.split('\n').length + 1))}
          className="w-full text-sm text-gray-800 border border-gray-300 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
        />
      </div>
    );
  }

  const editButtonClass =
    size === 'compact'
      ? 'absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-600 px-1 py-0.5'
      : 'absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded bg-white/90 border border-gray-200';

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={handleStartEdit}
        className={editButtonClass}
        aria-label={ariaLabel ?? `Edit ${group}`}
      >
        <Pencil className="h-3 w-3" />
        <span>Edit</span>
      </button>
      {render(content)}
    </div>
  );
}
