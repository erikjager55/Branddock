'use client';

import React from 'react';
import { Check, Circle, Loader2, AlertTriangle, Ban, ChevronRight, Zap } from 'lucide-react';
import { Button, ProgressBar } from '@/components/shared';
import { useComponentPipelineStore, getProgress } from '@/lib/studio/stores/component-pipeline-store';
import type { ComponentStatusType } from '@/types/studio';

/** Status icon + className mapping for each component status */
const STATUS_ICON: Record<ComponentStatusType, { icon: React.ElementType; className: string }> = {
  PENDING: { icon: Circle, className: 'text-gray-300' },
  GENERATING: { icon: Loader2, className: 'text-blue-500 animate-spin' },
  GENERATED: { icon: Check, className: 'text-blue-500' },
  NEEDS_REVISION: { icon: AlertTriangle, className: 'text-amber-500' },
  APPROVED: { icon: Check, className: 'text-emerald-500' },
  SKIPPED: { icon: Ban, className: 'text-gray-400' },
};

/**
 * Pipeline Navigator — shows all components in the pipeline as a vertical list
 * with status indicators, a progress bar, and a "Generate All Remaining" button.
 */
export function PipelineNavigator() {
  const components = useComponentPipelineStore((s) => s.components);
  const activeComponentId = useComponentPipelineStore((s) => s.activeComponentId);
  const setActiveComponent = useComponentPipelineStore((s) => s.setActiveComponent);
  const isGeneratingAll = useComponentPipelineStore((s) => s.isGeneratingAll);
  const setIsGeneratingAll = useComponentPipelineStore((s) => s.setIsGeneratingAll);
  const progress = useComponentPipelineStore(getProgress);

  const handleGenerateAll = () => {
    setIsGeneratingAll(true);
    // Actual generation will be handled by the parent via API call
  };

  const approvedTypes = components
    .filter((c) => c.status === 'APPROVED')
    .map((c) => c.componentType);

  return (
    <div className="flex flex-col h-full">
      {/* Header + Progress */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Pipeline</h3>
          <span className="text-xs text-gray-500">
            {progress.approved}/{progress.total} approved
          </span>
        </div>
        <ProgressBar
          value={progress.percentage}
          color="emerald"
          size="sm"
        />
      </div>

      {/* Component List */}
      <div className="flex-1 overflow-y-auto py-2">
        {components.map((component, index) => {
          const isActive = component.id === activeComponentId;
          const statusConfig = STATUS_ICON[component.status];
          const StatusIcon = statusConfig.icon;

          return (
            <button
              key={component.id}
              type="button"
              onClick={() => setActiveComponent(component.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                isActive
                  ? 'bg-teal-50 border-r-2 border-teal-500'
                  : 'hover:bg-gray-50'
              }`}
            >
              <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusConfig.className}`} />
              <span className="text-xs text-gray-400 w-4">{index + 1}.</span>
              <span className={`text-sm flex-1 truncate ${
                isActive ? 'font-medium text-gray-900' : 'text-gray-700'
              }`}>
                {component.label}
              </span>
              {isActive && <ChevronRight className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Cascading Context Indicator */}
      {approvedTypes.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-500 mb-1.5">
            Context: {approvedTypes.length} approved
          </p>
          <div className="flex flex-wrap gap-1">
            {approvedTypes.map((type) => (
              <span
                key={type}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700"
              >
                {type.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-200">
        <Button
          variant="primary"
          size="sm"
          fullWidth
          icon={isGeneratingAll ? Loader2 : Zap}
          isLoading={isGeneratingAll}
          disabled={isGeneratingAll || progress.percentage === 100}
          onClick={handleGenerateAll}
        >
          {isGeneratingAll ? 'Generating All...' : 'Generate All Remaining'}
        </Button>
      </div>
    </div>
  );
}
