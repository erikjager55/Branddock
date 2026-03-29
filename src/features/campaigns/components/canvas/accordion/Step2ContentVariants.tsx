'use client';

import React, { useMemo } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { useCanvasOrchestration } from '../../../hooks/useCanvasOrchestration';
import { resolvePreviewComponent } from '../previews/preview-map';
import { VariantCard } from '../VariantCard';
import { FeedbackBar } from '../FeedbackBar';
import { Badge, Skeleton } from '@/components/shared';
import { STUDIO } from '@/lib/constants/design-tokens';
import type { PreviewContent } from '../../../types/canvas.types';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';

interface Step2ContentVariantsProps {
  deliverableId: string;
  onAdvance: () => void;
}

export function Step2ContentVariants({ deliverableId, onAdvance }: Step2ContentVariantsProps) {
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const generationStatus = useCanvasStore((s) => s.generationStatus);
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  const imageVariants = useCanvasStore((s) => s.imageVariants);
  const contextStack = useCanvasStore((s) => s.contextStack);
  const { regenerate, abort } = useCanvasOrchestration(deliverableId);

  const hasVariants = variantGroups.size > 0;
  const isGenerating = globalStatus === 'generating';

  // Resolve preview component for this platform/format
  const platform = contextStack?.medium?.platform ?? null;
  const format = contextStack?.medium?.format ?? null;
  const previewEntry = useMemo(
    () => resolvePreviewComponent(platform, format),
    [platform, format],
  );

  // Build preview content from selected variants
  const previewContent = useMemo<PreviewContent>(() => {
    const content: PreviewContent = {};
    for (const [group, variants] of variantGroups) {
      const selectedIdx = selections.get(group) ?? 0;
      const selected = variants[selectedIdx];
      if (selected) {
        content[group] = {
          content: selected.content,
          type: 'text',
        };
      }
    }
    return content;
  }, [variantGroups, selections]);

  const PreviewComponent = previewEntry.component;
  const showPreview = Object.keys(previewContent).length > 0;

  const handleAdvance = () => {
    const store = useCanvasStore.getState();
    const groups = Array.from(store.variantGroups.entries());

    // Build summary
    const summaryParts: string[] = [];
    for (const [group, variants] of groups) {
      const selectedIdx = store.selections.get(group) ?? 0;
      const label = group.replace(/_/g, ' ');
      summaryParts.push(`${label}: variant ${String.fromCharCode(65 + selectedIdx)}`);
    }

    store.setStepSummary(2, {
      label: summaryParts.join(' | ') || 'Variants selected',
    });

    onAdvance();
  };

  // Still generating, no variants yet — show skeleton
  if (isGenerating && !hasVariants) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating content variants...</span>
        </div>
        <SkeletonVariantGroup />
        <SkeletonVariantGroup />
      </div>
    );
  }

  // No variants and not generating — waiting for step 1
  if (!hasVariants && !isGenerating) {
    return (
      <div className="text-center py-8">
        <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">
          Content will appear here after generation starts in step 1.
        </p>
      </div>
    );
  }

  const groups = Array.from(variantGroups.entries());

  return (
    <div className={showPreview ? 'grid gap-6' : ''} style={showPreview ? { gridTemplateColumns: '2fr 1fr' } : undefined}>
      {/* Left column: variants + feedback + advance (~2/3) */}
      <div className="space-y-6" style={{ minWidth: 0, overflow: 'hidden' }}>
        {/* Variant groups */}
        {groups.map(([group, variants]) => {
          const groupStatus = generationStatus.get(group) ?? 'idle';
          const selectedIndex = selections.get(group) ?? 0;

          return (
            <div key={group}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-gray-700 capitalize">
                  {group.replace(/_/g, ' ')}
                </h3>
                {groupStatus === 'generating' && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Generating...
                  </span>
                )}
                {groupStatus === 'complete' && (
                  <Badge variant="success" size="sm">Complete</Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {variants.map((variant, idx) => (
                  <VariantCard
                    key={`${group}-${idx}`}
                    group={group}
                    variant={variant}
                    variantIndex={idx}
                    isSelected={idx === selectedIndex}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Image variants */}
        {imageVariants.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Images</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {imageVariants.map((img, idx) => {
                const selectImage = () => {
                  const store = useCanvasStore.getState();
                  const updated = store.imageVariants.map((v, i) => ({
                    ...v,
                    isSelected: i === idx,
                  }));
                  store.setImageVariants(updated);
                };

                return (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    aria-pressed={img.isSelected}
                    aria-label={`Select image variant ${idx + 1}: ${img.prompt}`}
                    onClick={selectImage}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectImage();
                      }
                    }}
                    className={`rounded-lg border-2 overflow-hidden cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                      img.isSelected
                        ? 'border-primary-500 ring-1 ring-primary-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.prompt}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-xs text-gray-500 line-clamp-2">{img.prompt}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Feedback bar */}
        <div className="border-t border-gray-200 pt-4">
          <FeedbackBar onRegenerate={regenerate} onAbort={abort} />
        </div>

        {/* Advance button */}
        {hasVariants && !isGenerating && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleAdvance}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ArrowRight className="h-4 w-4" />
              Confirm & Continue
            </button>
          </div>
        )}
      </div>

      {/* Right column: composed preview (~1/3) */}
      {showPreview && (
        <div className="border-l border-gray-200 pl-6" style={{ minWidth: 0, overflow: 'hidden' }}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-700">{previewEntry.label}</h3>
            {!isGenerating && (
              <Badge variant="success" size="sm">Ready for review</Badge>
            )}
            {isGenerating && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating...
              </span>
            )}
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 overflow-hidden">
            <PreviewComponent
              previewContent={previewContent}
              imageVariants={imageVariants}
              isGenerating={isGenerating}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonVariantGroup() {
  return (
    <div>
      <Skeleton className="h-4 w-32 mb-3" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}
