'use client';

import React from 'react';
import { Image, Sparkles, Search, Upload, Package, Brush } from 'lucide-react';
import { Badge } from '@/components/shared';
import type { DeliverableComponentState, ImageSourceType } from '@/types/studio';

const SOURCE_OPTIONS: { value: ImageSourceType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'ai_generated', label: 'AI Generated', icon: Sparkles, description: 'Generate an image using AI based on the visual brief' },
  { value: 'stock_photo', label: 'Stock Photo', icon: Search, description: 'Search and select from stock photo libraries' },
  { value: 'upload', label: 'Upload', icon: Upload, description: 'Upload your own image file' },
  { value: 'product_library', label: 'Product Library', icon: Package, description: 'Select from your product image library' },
  { value: 'illustration', label: 'Illustration', icon: Brush, description: 'Generate or select an illustration' },
];

interface ImageSourceSelectorProps {
  component: DeliverableComponentState;
  onUpdate: (updates: Partial<DeliverableComponentState>) => void;
}

export function ImageSourceSelector({ component, onUpdate }: ImageSourceSelectorProps) {
  const selectedSource = (component.imageSource ?? 'ai_generated') as ImageSourceType;

  const handleSourceSelect = (source: ImageSourceType) => {
    onUpdate({ imageSource: source });
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-900">{component.label}</span>
          <Badge variant={component.status === 'APPROVED' ? 'success' : 'default'} size="sm">
            {component.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Image Preview */}
        {component.imageUrl ? (
          <div className="mb-6">
            <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={component.imageUrl}
                alt={component.label}
                className="w-full max-h-96 object-contain"
              />
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-center h-48 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
            <div className="text-center">
              <Image className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">No image yet</p>
            </div>
          </div>
        )}

        {/* Source Selection */}
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Image Source
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {SOURCE_OPTIONS.map(({ value, label, icon: Icon, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleSourceSelect(value)}
              disabled={component.status === 'APPROVED'}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                selectedSource === value
                  ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                selectedSource === value ? 'text-teal-600' : 'text-gray-400'
              }`} />
              <div>
                <span className={`text-sm font-medium ${
                  selectedSource === value ? 'text-teal-900' : 'text-gray-900'
                }`}>
                  {label}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
