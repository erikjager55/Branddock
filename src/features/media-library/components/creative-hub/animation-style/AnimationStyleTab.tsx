'use client';

import React, { useState, useMemo } from 'react';
import { Film, Plus } from 'lucide-react';
import { Button, EmptyState, SkeletonCard } from '@/components/shared';
import { useStyleReferences } from '@/features/media-library/hooks';
import type { StyleReferenceWithMeta } from '@/features/media-library/types/media.types';
import { AnimationReferenceCard } from './AnimationReferenceCard';
import { CreateAnimationStyleModal } from './CreateAnimationStyleModal';

/** Tab component for managing animation style references in the Creative Hub. */
export function AnimationStyleTab() {
  const { data, isLoading, isError, error } = useStyleReferences();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);

  const animationStyles = useMemo(() => {
    if (!data) return [];
    const styles = Array.isArray(data) ? data : (data as { styleReferences?: StyleReferenceWithMeta[] }).styleReferences ?? [];
    return styles.filter((ref: StyleReferenceWithMeta) => ref.type === 'ANIMATION_STYLE');
  }, [data]);

  const selectedStyle = useMemo(
    () => animationStyles.find((s) => s.id === selectedStyleId) ?? null,
    [animationStyles, selectedStyleId],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 bg-gray-200 animate-pulse rounded" />
          <div className="h-9 w-40 bg-gray-200 animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">
          Failed to load animation styles.{' '}
          {error instanceof Error ? error.message : 'Please try again.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Animation Styles</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Define animation style references for motion graphics, video content, and animated assets.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => setIsCreateOpen(true)}
        >
          Create Animation Style
        </Button>
      </div>

      {/* Grid or empty state */}
      {animationStyles.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No animation styles defined yet"
          description="Create your first animation style to establish motion design language for your brand."
          action={{
            label: 'Create Animation Style',
            onClick: () => setIsCreateOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {animationStyles.map((style) => (
            <AnimationReferenceCard
              key={style.id}
              style={style}
              isSelected={selectedStyleId === style.id}
              onClick={() =>
                setSelectedStyleId((prev) => (prev === style.id ? null : style.id))
              }
            />
          ))}
        </div>
      )}

      {/* Expanded detail for selected style */}
      {selectedStyle && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">{selectedStyle.name}</h4>
          {selectedStyle.stylePrompt && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Style Prompt</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {selectedStyle.stylePrompt}
              </p>
            </div>
          )}
          {selectedStyle.negativePrompt && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Negative Prompt</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {selectedStyle.negativePrompt}
              </p>
            </div>
          )}
          {selectedStyle.modelName && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Animation Engine / Tool</p>
              <p className="text-sm text-gray-700">{selectedStyle.modelName}</p>
            </div>
          )}
          {selectedStyle.modelDescription && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700">{selectedStyle.modelDescription}</p>
            </div>
          )}
          {selectedStyle.generationParams && Object.keys(selectedStyle.generationParams).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Generation Parameters</p>
              <pre className="text-xs text-gray-600 bg-white rounded-lg border border-gray-200 p-3 overflow-x-auto">
                {JSON.stringify(selectedStyle.generationParams, null, 2)}
              </pre>
            </div>
          )}
          {selectedStyle.referenceImages.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Reference Images</p>
              <div className="flex gap-2 flex-wrap">
                {selectedStyle.referenceImages.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Reference ${idx + 1}`}
                    className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      <CreateAnimationStyleModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
