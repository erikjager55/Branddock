'use client';

import React, { useMemo } from 'react';
import { Columns, ThumbsUp, ThumbsDown, AlertTriangle } from 'lucide-react';
import { Badge, Button } from '@/components/shared';
import { useComponentPipelineStore } from '@/lib/studio/stores/component-pipeline-store';
import { validateContentConstraints, type ConstraintValidationWarning } from '@/lib/studio/content-validator';
import type { DeliverableComponentState } from '@/types/studio';

interface VariantComparisonViewProps {
  components: DeliverableComponentState[];
  activeComponentId: string;
  onContentChange: (id: string, content: string) => void;
  deliverableTypeId?: string;
}

export function VariantComparisonView({
  components,
  activeComponentId,
  onContentChange,
  deliverableTypeId,
}: VariantComparisonViewProps) {
  const setComponentRating = useComponentPipelineStore((s) => s.setComponentRating);
  const approveComponent = useComponentPipelineStore((s) => s.approveComponent);

  // Validate each variant's content against type-specific constraints
  const warningsMap = useMemo(() => {
    const map = new Map<string, ConstraintValidationWarning[]>();
    if (!deliverableTypeId) return map;
    for (const component of components) {
      if (component.generatedContent) {
        const result = validateContentConstraints(component.generatedContent, deliverableTypeId);
        if (result.warnings.length > 0) {
          map.set(component.id, result.warnings);
        }
      }
    }
    return map;
  }, [components, deliverableTypeId]);

  const VARIANT_LABELS = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200">
        <Columns className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-900">
          Variant Comparison — {components[0]?.label ?? 'Component'}
        </span>
        <Badge variant="info" size="sm">{components.length} variants</Badge>
      </div>

      {/* Variants Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className={`grid gap-4 ${
          components.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'
        }`}>
          {components.map((component, index) => {
            const isActive = component.id === activeComponentId;
            const variantLabel = VARIANT_LABELS[index] ?? `${index + 1}`;

            return (
              <div
                key={component.id}
                className={`rounded-lg border p-4 ${
                  isActive
                    ? 'border-teal-500 ring-1 ring-teal-500'
                    : 'border-gray-200'
                }`}
              >
                {/* Variant Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 bg-gray-100 rounded px-1.5 py-0.5">
                      {variantLabel}
                    </span>
                    <Badge
                      variant={component.status === 'APPROVED' ? 'success' : 'default'}
                      size="sm"
                    >
                      {component.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {component.rating != null && (
                    <span className="text-xs text-gray-500">
                      {component.rating > 0 ? 'Liked' : 'Disliked'}
                    </span>
                  )}
                </div>

                {/* Content */}
                {component.generatedContent ? (
                  <>
                    <textarea
                      value={component.generatedContent}
                      onChange={(e) => onContentChange(component.id, e.target.value)}
                      className="w-full min-h-[120px] resize-none border-0 bg-transparent text-sm text-gray-900 leading-relaxed focus:ring-0 p-0"
                      disabled={component.status === 'APPROVED'}
                    />
                    {warningsMap.get(component.id)?.map((w, wi) => (
                      <div
                        key={wi}
                        className={`flex items-start gap-1.5 mt-1 text-xs ${
                          w.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                        }`}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 italic">Not yet generated</p>
                )}

                {/* Rating */}
                {component.generatedContent && component.status !== 'APPROVED' && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setComponentRating(component.id, 1)}
                      className={component.rating === 1 ? 'text-emerald-600 bg-emerald-50' : ''}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setComponentRating(component.id, -1)}
                      className={component.rating === -1 ? 'text-red-600 bg-red-50' : ''}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="ml-auto"
                      onClick={() => approveComponent(component.id)}
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
