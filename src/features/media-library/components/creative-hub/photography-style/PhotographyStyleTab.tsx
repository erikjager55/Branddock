'use client';

import React, { useState, useMemo } from 'react';
import { Camera, Plus, Columns2 } from 'lucide-react';
import { Button, EmptyState, SkeletonCard } from '@/components/shared';
import { useStyleReferences } from '@/features/media-library/hooks';
import type { StyleReferenceWithMeta } from '@/features/media-library/types/media.types';
import { StyleGuideCard } from './StyleGuideCard';
import { CreateStyleGuideModal } from './CreateStyleGuideModal';
import { StyleComparisonView } from './StyleComparisonView';

/** Tab component for managing photography style references in the Creative Hub. */
export function PhotographyStyleTab() {
  const { data, isLoading, isError, error } = useStyleReferences();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const photographyStyles = useMemo(() => {
    if (!data) return [];
    const styles = Array.isArray(data) ? data : (data as { styleReferences?: StyleReferenceWithMeta[] }).styleReferences ?? [];
    return styles.filter((ref: StyleReferenceWithMeta) => ref.type === 'PHOTOGRAPHY_STYLE');
  }, [data]);

  const selectedStyle = useMemo(
    () => photographyStyles.find((s) => s.id === selectedStyleId) ?? null,
    [photographyStyles, selectedStyleId],
  );

  function handleSelectForCompare(id: string) {
    setCompareIds((prev) => {
      if (!prev) return [id, id];
      if (prev[0] === id) return prev;
      return [prev[0], id];
    });
  }

  function handleToggleComparison() {
    if (!showComparison && photographyStyles.length >= 2) {
      setCompareIds([photographyStyles[0].id, photographyStyles[1].id]);
    }
    setShowComparison((v) => !v);
  }

  const compareStyleA = useMemo(
    () => (compareIds ? photographyStyles.find((s) => s.id === compareIds[0]) ?? null : null),
    [compareIds, photographyStyles],
  );
  const compareStyleB = useMemo(
    () => (compareIds ? photographyStyles.find((s) => s.id === compareIds[1]) ?? null : null),
    [compareIds, photographyStyles],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 bg-gray-200 animate-pulse rounded" />
          <div className="h-9 w-36 bg-gray-200 animate-pulse rounded-lg" />
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
          Failed to load photography styles.{' '}
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
          <h3 className="text-lg font-semibold text-gray-900">Photography Styles</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Define visual style guides for photography -- color grading, composition, mood, and lighting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {photographyStyles.length >= 2 && (
            <Button
              variant="secondary"
              size="sm"
              icon={Columns2}
              onClick={handleToggleComparison}
            >
              {showComparison ? 'Hide Compare' : 'Compare'}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsCreateOpen(true)}
          >
            Create Style Guide
          </Button>
        </div>
      </div>

      {/* Comparison view */}
      {showComparison && (
        <StyleComparisonView
          styleA={compareStyleA}
          styleB={compareStyleB}
          allStyles={photographyStyles}
          onSelectA={(id) => setCompareIds((prev) => [id, prev?.[1] ?? id])}
          onSelectB={(id) => setCompareIds((prev) => [prev?.[0] ?? id, id])}
        />
      )}

      {/* Grid or empty state */}
      {photographyStyles.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="No photography styles defined yet"
          description="Create your first photography style guide to define the visual language for your brand's photography."
          action={{
            label: 'Create Style Guide',
            onClick: () => setIsCreateOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photographyStyles.map((style) => (
            <StyleGuideCard
              key={style.id}
              style={style}
              isSelected={selectedStyleId === style.id}
              onClick={() =>
                setSelectedStyleId((prev) => (prev === style.id ? null : style.id))
              }
              onCompare={() => handleSelectForCompare(style.id)}
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
          {selectedStyle.modelDescription && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{selectedStyle.modelDescription}</p>
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
      <CreateStyleGuideModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
