'use client';

import React from 'react';
import { FileText, Image, Video, LayoutGrid, FileSearch, Eye } from 'lucide-react';
import { useComponentPipelineStore } from '@/lib/studio/stores/component-pipeline-store';
import { TextComponentEditor } from './TextComponentEditor';
import { VisualBriefEditor } from './VisualBriefEditor';
import { ImageSourceSelector } from './ImageSourceSelector';
import { VariantComparisonView } from './VariantComparisonView';

const TEXT_TYPES = [
  'headline', 'subheadline', 'body_text', 'caption', 'cta',
  'hashtags', 'subject_line', 'preview_text', 'meta_description',
  'seo_keywords', 'alt_text', 'video_script', 'shot_list',
  'talking_points', 'outline',
];

const IMAGE_TYPES = ['hero_image', 'post_image', 'slide_image', 'thumbnail'];
const VISUAL_BRIEF_TYPES = ['visual_brief'];

interface ComponentCanvasProps {
  deliverableTypeId?: string;
}

export function ComponentCanvas({ deliverableTypeId }: ComponentCanvasProps) {
  const components = useComponentPipelineStore((s) => s.components);
  const activeComponentId = useComponentPipelineStore((s) => s.activeComponentId);
  const updateComponentContent = useComponentPipelineStore((s) => s.updateComponentContent);

  const activeComponent = components.find((c) => c.id === activeComponentId);

  if (!activeComponent) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <LayoutGrid className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Select a component from the pipeline</p>
        </div>
      </div>
    );
  }

  // Check if this is a variant group (multiple components of same type)
  const sameTypeComponents = components.filter(
    (c) => c.componentType === activeComponent.componentType && c.groupType === 'variant'
  );
  const isVariantGroup = sameTypeComponents.length > 1;

  if (isVariantGroup) {
    return (
      <VariantComparisonView
        components={sameTypeComponents}
        activeComponentId={activeComponent.id}
        onContentChange={(id, content) => updateComponentContent(id, { generatedContent: content })}
        deliverableTypeId={deliverableTypeId}
      />
    );
  }

  if (VISUAL_BRIEF_TYPES.includes(activeComponent.componentType)) {
    return (
      <VisualBriefEditor
        component={activeComponent}
        onUpdate={(updates) => updateComponentContent(activeComponent.id, updates)}
      />
    );
  }

  if (IMAGE_TYPES.includes(activeComponent.componentType)) {
    return (
      <ImageSourceSelector
        component={activeComponent}
        onUpdate={(updates) => updateComponentContent(activeComponent.id, updates)}
      />
    );
  }

  // Default: text component editor
  return (
    <TextComponentEditor
      component={activeComponent}
      onContentChange={(content) =>
        updateComponentContent(activeComponent.id, { generatedContent: content })
      }
      deliverableTypeId={deliverableTypeId}
    />
  );
}
