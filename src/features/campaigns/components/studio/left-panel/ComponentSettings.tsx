'use client';

import React from 'react';
import { Sparkles, Image } from 'lucide-react';
import { Button, Select } from '@/components/shared';
import { useComponentPipelineStore } from '@/lib/studio/stores/component-pipeline-store';
import type { ImageSourceType } from '@/types/studio';

const AI_MODELS = [
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro' },
];

const IMAGE_SOURCES: { value: ImageSourceType; label: string }[] = [
  { value: 'ai_generated', label: 'AI Generated' },
  { value: 'stock_photo', label: 'Stock Photo' },
  { value: 'upload', label: 'Upload' },
  { value: 'product_library', label: 'Product Library' },
  { value: 'illustration', label: 'Illustration' },
];

const IMAGE_COMPONENT_TYPES = [
  'hero_image', 'post_image', 'slide_image', 'thumbnail',
];

/**
 * Component Settings — settings panel for the currently active pipeline component.
 * Shows AI model selector, image source selector (for image components),
 * and a generate button.
 */
export function ComponentSettings() {
  const components = useComponentPipelineStore((s) => s.components);
  const activeComponentId = useComponentPipelineStore((s) => s.activeComponentId);
  const setComponentModel = useComponentPipelineStore((s) => s.setComponentModel);
  const setImageSource = useComponentPipelineStore((s) => s.setImageSource);
  const isGenerating = useComponentPipelineStore((s) => s.isGenerating);

  const activeComponent = components.find((c) => c.id === activeComponentId);

  if (!activeComponent) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-gray-400">Select a component to configure</p>
      </div>
    );
  }

  const isImageComponent = IMAGE_COMPONENT_TYPES.includes(activeComponent.componentType);
  const canGenerate =
    activeComponent.status !== 'GENERATING' &&
    activeComponent.status !== 'APPROVED';
  const isCurrentlyGenerating = isGenerating && activeComponent.status === 'GENERATING';

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Component Settings
        </h4>
        <p className="text-sm font-medium text-gray-900 mb-1">{activeComponent.label}</p>
        <p className="text-xs text-gray-500 capitalize">
          {activeComponent.componentType.replace(/_/g, ' ')}
        </p>
      </div>

      {/* AI Model */}
      <div>
        <Select
          label="AI Model"
          value={activeComponent.aiModel ?? 'claude-sonnet-4-5'}
          onChange={(value) => {
            if (value && activeComponentId) {
              setComponentModel(activeComponentId, value);
            }
          }}
          options={AI_MODELS}
        />
      </div>

      {/* Image Source (only for image components) */}
      {isImageComponent && (
        <div>
          <Select
            label="Image Source"
            value={activeComponent.imageSource ?? 'ai_generated'}
            onChange={(value) => {
              if (value && activeComponentId) {
                setImageSource(activeComponentId, value as ImageSourceType);
              }
            }}
            options={IMAGE_SOURCES}
          />
        </div>
      )}

      {/* Generate Button */}
      <Button
        variant="primary"
        size="sm"
        fullWidth
        icon={Sparkles}
        isLoading={isCurrentlyGenerating}
        disabled={!canGenerate || isGenerating}
      >
        {isCurrentlyGenerating
          ? 'Generating...'
          : `Generate ${activeComponent.label}`}
      </Button>
    </div>
  );
}
