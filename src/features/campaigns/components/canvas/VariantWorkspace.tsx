'use client';

import React from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { VariantCard } from './VariantCard';
import { Skeleton, EmptyState } from '@/components/shared';
import { Sparkles, Loader2 } from 'lucide-react';

interface VariantWorkspaceProps {
  deliverableId: string;
  onGenerate: () => void;
}

export function VariantWorkspace({ deliverableId, onGenerate }: VariantWorkspaceProps) {
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const generationStatus = useCanvasStore((s) => s.generationStatus);
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  const imageVariants = useCanvasStore((s) => s.imageVariants);

  const hasVariants = variantGroups.size > 0;
  const isGenerating = globalStatus === 'generating';

  // No variants and not generating — show generate CTA
  if (!hasVariants && !isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <EmptyState
            icon={Sparkles}
            title="Ready to generate content"
            description="Click the button below to start generating content variants using your campaign context."
            action={{
              label: 'Generate Content',
              onClick: onGenerate,
            }}
          />
        </div>
      </div>
    );
  }

  // Generating but no variants yet — show skeleton
  if (isGenerating && !hasVariants) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating content variants...</span>
        </div>
        <SkeletonVariantGroup />
        <SkeletonVariantGroup />
      </div>
    );
  }

  // Render variant groups progressively
  const groups = Array.from(variantGroups.entries());

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      {groups.map(([group, variants]) => {
        const groupStatus = generationStatus.get(group) ?? 'idle';
        const selectedIndex = selections.get(group) ?? 0;

        return (
          <div key={group}>
            {/* Group header */}
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
                <span className="text-xs text-emerald-600">Complete</span>
              )}
            </div>

            {/* Variant cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {variants.map((variant, idx) => (
                <VariantCard
                  key={`${group}-${idx}`}
                  group={group}
                  variant={variant}
                  variantIndex={idx}
                  isSelected={idx === selectedIndex}
                  deliverableId={deliverableId}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Image variants section */}
      {imageVariants.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Images</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {imageVariants.map((img, idx) => (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                onClick={() => {
                  const store = useCanvasStore.getState();
                  const current = store.imageVariants;
                  const updated = current.map((v, i) => ({
                    ...v,
                    isSelected: i === idx,
                  }));
                  store.setImageVariants(updated);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const store = useCanvasStore.getState();
                    const current = store.imageVariants;
                    const updated = current.map((v, i) => ({
                      ...v,
                      isSelected: i === idx,
                    }));
                    store.setImageVariants(updated);
                  }
                }}
                className={`rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
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
            ))}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}
