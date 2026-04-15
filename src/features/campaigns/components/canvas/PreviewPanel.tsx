'use client';

import React from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { resolvePreviewComponent } from './previews/preview-map';
import { ValidationChecks } from './previews/ValidationChecks';
import { PublishSuggestion } from './previews/PublishSuggestion';
import { PerformanceCard } from './PerformanceCard';
import type { PreviewContent } from '../../types/canvas.types';
import { STUDIO } from '@/lib/constants/design-tokens';

/** Right panel: platform preview + validation + publish suggestion */
export function PreviewPanel() {
  const deliverableId = useCanvasStore((s) => s.deliverableId);
  const contextStack = useCanvasStore((s) => s.contextStack);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const imageVariants = useCanvasStore((s) => s.imageVariants);
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  const publishSuggestion = useCanvasStore((s) => s.publishSuggestion);
  const publishedAt = useCanvasStore((s) => s.publishedAt);

  const medium = contextStack?.medium ?? null;
  const platform = medium?.platform ?? null;
  const format = medium?.format ?? null;
  const isGenerating = globalStatus === 'generating';
  const brandName = contextStack?.brand?.brandName ?? undefined;

  // Resolve the correct preview component for this platform + format
  const { component: PreviewComponent, label } = resolvePreviewComponent(platform, format);

  // Assemble preview content from selected variants
  const previewContent: PreviewContent = React.useMemo(() => {
    const result: PreviewContent = {};

    for (const [group, variants] of variantGroups) {
      const selectedIdx = selections.get(group) ?? 0;
      const selected = variants[selectedIdx];
      if (!selected) continue;

      result[group] = {
        content: selected.content || null,
        type: 'text',
        cta: selected.cta ?? null,
      };
    }

    return result;
  }, [variantGroups, selections]);

  return (
    <div className={`${STUDIO.panel.right} flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto`}>
      <div className="p-4 space-y-6">
        {/* Section: Preview */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {label}
          </h3>
          <PreviewComponent
            previewContent={previewContent}
            imageVariants={imageVariants}
            isGenerating={isGenerating}
            brandName={brandName}
            platform={platform ?? undefined}
          />
        </div>

        {/* Section: Validation */}
        <ValidationChecks
          previewContent={previewContent}
          medium={medium}
          deliverableId={deliverableId}
        />

        {/* Section: Publish Suggestion */}
        <PublishSuggestion
          suggestion={publishSuggestion}
          isGenerating={isGenerating}
        />

        {/* Section: Performance (placeholder for Fase F) */}
        <PerformanceCard publishedAt={publishedAt} />
      </div>
    </div>
  );
}
