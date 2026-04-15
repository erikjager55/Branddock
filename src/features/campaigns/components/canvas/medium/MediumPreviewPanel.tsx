'use client';

import React, { useMemo, useCallback } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { resolvePreviewComponent } from '../previews/preview-map';
import { STUDIO } from '@/lib/constants/design-tokens';
import { CheckCircle2 } from 'lucide-react';
import type { PreviewContent } from '../../../types/canvas.types';

interface MediumPreviewPanelProps {
  onAdvance: () => void;
  deliverableId?: string;
}

/** Preview panel for Step 3: shows the content preview + Confirm button */
export function MediumPreviewPanel({ onAdvance, deliverableId }: MediumPreviewPanelProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const imageVariants = useCanvasStore((s) => s.imageVariants);
  const mediumConfigValues = useCanvasStore((s) => s.mediumConfigValues);
  const heroImage = useCanvasStore((s) => s.heroImage);
  const setInsertImageModalOpen = useCanvasStore((s) => s.setInsertImageModalOpen);

  const platform = contextStack?.medium?.platform ?? null;
  const format = contextStack?.medium?.format ?? null;

  const previewEntry = useMemo(
    () => resolvePreviewComponent(platform, format),
    [platform, format],
  );

  const previewContent = useMemo<PreviewContent>(() => {
    const content: PreviewContent = {};
    for (const [group, variants] of variantGroups) {
      const selectedIdx = selections.get(group) ?? 0;
      const selected = variants[selectedIdx];
      if (selected) {
        content[group] = { content: selected.content, type: 'text' };
      }
    }
    return content;
  }, [variantGroups, selections]);

  const configBadges = useMemo(() => {
    const entries = Object.entries(mediumConfigValues);
    return entries
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .slice(0, 6)
      .map(([key, val]) => {
        const display = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val);
        return { key, display };
      });
  }, [mediumConfigValues]);

  const handleConfirm = useCallback(async () => {
    const store = useCanvasStore.getState();
    store.setMediumApproved(true);

    // Persist medium config to deliverable settings
    if (deliverableId) {
      try {
        await fetch(`/api/studio/${deliverableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: { mediumConfig: store.mediumConfigValues },
          }),
        });
      } catch {
        // Non-blocking
      }
    }

    const label = previewEntry.label ?? 'Medium';
    store.setStepSummary(3, { label: `${label} configured` });
    onAdvance();
  }, [onAdvance, previewEntry.label, deliverableId]);

  const PreviewComponent = previewEntry.component;

  return (
    <div className="space-y-4">
      {/* Platform preview */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 overflow-hidden">
        <p className="text-xs font-medium text-gray-500 mb-2">{previewEntry.label} Preview</p>
        <div className="overflow-hidden rounded-md bg-gray-50">
          <PreviewComponent
            previewContent={previewContent}
            imageVariants={imageVariants}
            isGenerating={false}
            heroImage={heroImage}
            onAddImage={() => setInsertImageModalOpen(true)}
            brandName={contextStack?.brand?.brandName ?? undefined}
            platform={platform ?? undefined}
          />
        </div>
      </div>

      {/* Config summary badges */}
      {configBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {configBadges.map(({ key, display }) => (
            <span
              key={key}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
            >
              {display}
            </span>
          ))}
        </div>
      )}

      {/* Confirm button */}
      <button
        type="button"
        onClick={handleConfirm}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton}`}
      >
        <CheckCircle2 className="h-4 w-4" />
        Confirm & Continue
      </button>
    </div>
  );
}
