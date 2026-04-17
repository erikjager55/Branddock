'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { updateComponentContent } from '../../../api/canvas.api';
import { Pencil, Check, X, Loader2 } from 'lucide-react';

interface ContentSectionsEditorProps {
  deliverableId: string;
}

/**
 * Per-section content editor shown in the Medium tab (Step 3).
 * Displays the selected variant text for each variant group (hook, body, cta, etc.)
 * as editable textareas. Changes are saved to the store and persisted to DB.
 */
export function ContentSectionsEditor({ deliverableId }: ContentSectionsEditorProps) {
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);

  const groups = Array.from(variantGroups.entries()).filter(
    ([, variants]) => variants.some((v) => v.content),
  );

  if (groups.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-600">
          Edit Content Sections
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {groups.map(([group, variants]) => {
          const selectedIdx = selections.get(group) ?? 0;
          const selected = variants[selectedIdx];
          if (!selected?.content) return null;

          return (
            <SectionField
              key={group}
              group={group}
              content={selected.content}
              componentId={selected.componentId}
              variantIndex={selectedIdx}
              deliverableId={deliverableId}
            />
          );
        })}
      </div>
    </div>
  );
}

interface SectionFieldProps {
  group: string;
  content: string;
  componentId?: string;
  variantIndex: number;
  deliverableId: string;
}

function SectionField({ group, content, componentId, variantIndex, deliverableId }: SectionFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Strip HTML for display
  const displayText = content.replace(/<[^>]*>/g, '');

  const handleStartEdit = useCallback(() => {
    setDraft(content.replace(/<[^>]*>/g, ''));
    setIsEditing(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [content]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraft(content.replace(/<[^>]*>/g, ''));
  }, [content]);

  const handleSave = useCallback(async () => {
    if (draft.trim() === displayText.trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      // Update store
      const store = useCanvasStore.getState();
      const variants = store.variantGroups.get(group);
      if (variants) {
        const updated = variants.map((v, i) =>
          i === variantIndex ? { ...v, content: draft } : v,
        );
        store.addVariantGroup(group, updated);
      }

      // Persist to DB if componentId is available
      if (componentId) {
        await updateComponentContent(deliverableId, componentId, draft);
      }
    } catch {
      // Revert on error
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
  }, [draft, displayText, group, variantIndex, componentId, deliverableId, content]);

  const label = group.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        {!isEditing ? (
          <button
            type="button"
            onClick={handleStartEdit}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-1">
            {isSaving && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            if (e.key === 'Enter' && e.metaKey) handleSave();
          }}
          rows={Math.min(12, Math.max(3, draft.split('\n').length + 1))}
          className="w-full text-sm text-gray-800 border border-gray-300 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        />
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
          {displayText}
        </p>
      )}
    </div>
  );
}
