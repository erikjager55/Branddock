'use client';

import React, { useMemo, useCallback } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { resolvePreviewComponent } from '../previews/preview-map';
import { STUDIO } from '@/lib/constants/design-tokens';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import type { PreviewContent } from '../../../types/canvas.types';
import type { MediumVariant } from '../../../types/medium-config.types';

interface MediumPreviewPanelProps {
  onAdvance: () => void;
  deliverableId?: string;
}

/** Shared preview panel: pre-generation placeholder OR post-generation variant cards */
export function MediumPreviewPanel({ onAdvance, deliverableId }: MediumPreviewPanelProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const imageVariants = useCanvasStore((s) => s.imageVariants);
  const mediumConfigValues = useCanvasStore((s) => s.mediumConfigValues);
  const mediumVariants = useCanvasStore((s) => s.mediumVariants);
  const selectedMediumVariantId = useCanvasStore((s) => s.selectedMediumVariantId);
  const variantsGenerated = useCanvasStore((s) => s.variantsGenerated);
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

  const handleGenerateVariants = useCallback(() => {
    const store = useCanvasStore.getState();

    const mockVariants: MediumVariant[] = [
      {
        id: 'A',
        title: 'Variant A — Bold Approach',
        description: 'A high-impact version with strong visual emphasis and direct messaging.',
        configSnapshot: { ...store.mediumConfigValues },
      },
      {
        id: 'B',
        title: 'Variant B — Balanced',
        description: 'A balanced version that combines clarity with brand-aligned aesthetics.',
        configSnapshot: { ...store.mediumConfigValues },
      },
      {
        id: 'C',
        title: 'Variant C — Subtle',
        description: 'A refined, understated version that leads with storytelling.',
        configSnapshot: { ...store.mediumConfigValues },
      },
    ];

    store.setMediumVariants(mockVariants);
    store.setVariantsGenerated(true);
    store.setMediumGenerationStatus('complete');
  }, []);

  const handleConfirmSelection = useCallback(async () => {
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
        // Non-blocking — config is in memory, persistence is best-effort
      }
    }

    const label = previewEntry.label ?? 'Medium';
    const variantLabel = store.selectedMediumVariantId;
    store.setStepSummary(3, {
      label: `${label} configured | Variant ${variantLabel} selected`,
    });

    onAdvance();
  }, [onAdvance, previewEntry.label, deliverableId]);

  const PreviewComponent = previewEntry.component;

  return (
    <div className="space-y-4">
      {/* Platform preview placeholder */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 overflow-hidden">
        <p className="text-xs font-medium text-gray-500 mb-2">{previewEntry.label} Preview</p>
        <div className="overflow-hidden rounded-md bg-gray-50">
          <PreviewComponent
            previewContent={previewContent}
            imageVariants={imageVariants}
            isGenerating={false}
            heroImage={heroImage}
            onAddImage={() => setInsertImageModalOpen(true)}
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

      {/* Pre-generation: Generate button */}
      {!variantsGenerated && (
        <button
          type="button"
          onClick={handleGenerateVariants}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton}`}
        >
          <Sparkles className="h-4 w-4" />
          Generate 3 Variants
        </button>
      )}

      {/* Post-generation: Variant cards */}
      {variantsGenerated && mediumVariants.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-500">Select a Variant</p>
          <div role="radiogroup" aria-label="Select a Variant" className="space-y-3">
          {mediumVariants.map((variant) => {
            const isSelected = selectedMediumVariantId === variant.id;
            return (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() =>
                  useCanvasStore.getState().setSelectedMediumVariant(variant.id)
                }
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`h-3 w-3 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-primary' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {variant.title}
                  </span>
                </div>
                <p className="text-xs text-gray-500 ml-5">{variant.description}</p>
              </button>
            );
          })}
          </div>

          <button
            type="button"
            onClick={handleConfirmSelection}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton}`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirm Selection
          </button>
        </div>
      )}
    </div>
  );
}
