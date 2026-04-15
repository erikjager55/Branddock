/**
 * ContentBriefCard — collapsible context card for type-specific content inputs.
 *
 * Rendered in the Canvas ContextPanel between Medium and Knowledge cards.
 * Shows pre-filled values (AI-derived or user-provided), allows inline editing,
 * and triggers content regeneration when fields are modified.
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { ContentTypeInputFields } from '../shared/ContentTypeInputFields';
import { getContentTypeInputs } from '../../lib/content-type-inputs';
import type { ContentTypeInputValue } from '../../lib/content-type-inputs';
import { Badge } from '@/components/shared';

interface ContentBriefCardProps {
  /** Callback to trigger content regeneration after saving changes */
  onRegenerate?: () => void;
}

export function ContentBriefCard({ onRegenerate }: ContentBriefCardProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const contentType = useCanvasStore((s) => s.contentType);
  const deliverableId = useCanvasStore((s) => s.deliverableId);
  const contentTypeInputs = useCanvasStore((s) => s.contentTypeInputs);
  const modified = useCanvasStore((s) => s.contentTypeInputsModified);
  const setContentTypeInput = useCanvasStore((s) => s.setContentTypeInput);
  const contextStack = useCanvasStore((s) => s.contextStack);

  // Seed store with existing values from context stack when it loads (once only)
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (contextStack?.contentTypeInputs && Object.keys(contextStack.contentTypeInputs).length > 0) {
      seededRef.current = true;
      const cti = contextStack.contentTypeInputs;
      useCanvasStore.getState().setContentTypeInputsBulk(cti);

      // Auto-seed seoInput.primaryKeyword from contentTypeInputs if empty
      const store = useCanvasStore.getState();
      if (!store.seoInput.primaryKeyword) {
        const keyword = typeof cti.seoKeyword === 'string' ? cti.seoKeyword
          : Array.isArray(cti.targetKeywords) && cti.targetKeywords.length > 0 ? String(cti.targetKeywords[0])
          : '';
        if (keyword) {
          store.setSeoInput({ primaryKeyword: keyword });
        }
      }
    }
  }, [contextStack?.contentTypeInputs]);

  const fields = useMemo(
    () => (contentType ? getContentTypeInputs(contentType) : []),
    [contentType],
  );

  // Count filled fields for the badge
  const filledCount = useMemo(() => {
    return Object.values(contentTypeInputs).filter((v) => {
      if (v === '' || v === false) return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return v != null;
    }).length;
  }, [contentTypeInputs]);

  const handleChange = useCallback(
    (key: string, value: ContentTypeInputValue) => {
      setSaveError(null);
      setContentTypeInput(key, value);
    },
    [setContentTypeInput],
  );

  // Cache campaignId after first fetch (static for lifetime of this deliverable)
  const campaignIdRef = useRef<string | null>(null);

  const handleSaveAndRegenerate = useCallback(async () => {
    if (!deliverableId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const latestInputs = useCanvasStore.getState().contentTypeInputs;

      // Fetch campaignId once, cache for subsequent saves
      if (!campaignIdRef.current) {
        const detailRes = await fetch(`/api/studio/${deliverableId}`);
        if (!detailRes.ok) throw new Error('Failed to load deliverable');
        const detail = await detailRes.json();
        if (!detail.campaignId) throw new Error('No campaign linked');
        campaignIdRef.current = detail.campaignId;
      }
      const campaignId = campaignIdRef.current;

      const res = await fetch(`/api/campaigns/${campaignId}/deliverables/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentTypeInputs: latestInputs }),
      });
      if (!res.ok) throw new Error('Failed to save');

      // Reset modified flag
      useCanvasStore.getState().setContentTypeInputsBulk(latestInputs);
      onRegenerate?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setSaveError(msg);
      console.error('[ContentBriefCard] Save error:', err);
    } finally {
      setSaving(false);
    }
  }, [deliverableId, onRegenerate]);

  // Don't render if no fields defined for this content type
  if (fields.length === 0 || !contentType) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-left hover:bg-gray-50 rounded-t-lg"
        aria-expanded={open}
      >
        <span className="text-gray-500">
          <FileText className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium text-gray-700 flex-1">Content Brief</span>
        {filledCount > 0 && (
          <Badge variant="teal" size="sm">
            {filledCount}/{fields.length}
          </Badge>
        )}
        {modified && (
          <span className="w-2 h-2 rounded-full bg-amber-400" title="Modified" />
        )}
        <svg
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-3 border-t border-gray-100">
          <ContentTypeInputFields
            typeId={contentType}
            values={contentTypeInputs}
            onChange={handleChange}
            compact
          />

          {saveError && (
            <p className="mt-2 text-xs text-red-600">{saveError}</p>
          )}

          {modified && (
            <button
              type="button"
              onClick={handleSaveAndRegenerate}
              disabled={saving}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
              {saving ? 'Saving…' : 'Regenerate with changes'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
