'use client';

import { useState, useMemo } from 'react';
import { Plus, AlertTriangle, Boxes } from 'lucide-react';
import { Button, EmptyState, SkeletonCard } from '@/components/shared';
import { useStyleReferences } from '../../../hooks/index';
import type { StyleReferenceWithMeta } from '../../../types/media.types';
import { BrandModelCard } from './BrandModelCard';
import { CreateBrandModelModal } from './CreateBrandModelModal';
import { BrandModelDetailPanel } from './BrandModelDetailPanel';

// ─── Component ──────────────────────────────────────────────

/** Tab component displaying a grid of brand model style references. */
export function BrandModelsTab() {
  const { data, isLoading, isError } = useStyleReferences();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const brandModels = useMemo<StyleReferenceWithMeta[]>(() => {
    if (!data) return [];
    return (data as StyleReferenceWithMeta[]).filter((ref) => ref.type === 'BRAND_MODEL');
  }, [data]);

  return (
    <div data-testid="brand-models-tab">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Brand Models</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage visual style references for AI-generated brand imagery.
          </p>
        </div>
        <Button
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
          data-testid="create-brand-model-button"
        >
          Create Brand Model
        </Button>
      </div>

      {/* Content states */}
      {isError ? (
        <div data-testid="error-message" className="text-center py-16">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            Something went wrong
          </h3>
          <p className="text-xs text-gray-500">
            Failed to load brand models. Please try again later.
          </p>
        </div>
      ) : isLoading ? (
        <div data-testid="skeleton-loader" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} height={240} />
          ))}
        </div>
      ) : brandModels.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No brand models yet"
          description="Create your first brand model to define a visual style reference for AI generation."
          action={{
            label: 'Create Brand Model',
            onClick: () => setIsCreateModalOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brandModels.map((model) => (
            <BrandModelCard
              key={model.id}
              model={model}
              onClick={() => setSelectedModelId(model.id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateBrandModelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Detail Panel */}
      {selectedModelId && (
        <BrandModelDetailPanel
          modelId={selectedModelId}
          onClose={() => setSelectedModelId(null)}
        />
      )}
    </div>
  );
}
