'use client';

import React, { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { InlineEditor } from './InlineEditor';
import { Badge } from '@/components/shared';
import { Check, Pencil, Play, Mic, Clock } from 'lucide-react';
import type { CanvasVariant } from '../../types/canvas.types';

type VariantMediaType = 'text' | 'video' | 'audio';

const VARIANT_LABELS = ['A', 'B', 'C', 'D', 'E'];

interface VariantCardProps {
  group: string;
  variant: CanvasVariant;
  variantIndex: number;
  isSelected: boolean;
  /** Media type for this variant group — determines visual treatment */
  mediaType?: VariantMediaType;
  /** Duration in seconds for video/audio variants */
  duration?: number;
}

export function VariantCard({
  group,
  variant,
  variantIndex,
  isSelected,
  mediaType = 'text',
  duration,
}: VariantCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const setSelection = useCanvasStore((s) => s.setSelection);

  const handleSelect = () => {
    setSelection(group, variantIndex);
    // TODO: fire useSelectVariant API call for DB persistence once componentId mapping is available
  };

  const handleSave = (content: string) => {
    // Update store variant content
    const store = useCanvasStore.getState();
    const variants = store.variantGroups.get(group);
    if (variants) {
      const updated = variants.map((v, i) =>
        i === variantIndex ? { ...v, content } : v,
      );
      store.addVariantGroup(group, updated);
    }
    setIsEditing(false);
  };

  const label = VARIANT_LABELS[variantIndex] ?? String(variantIndex + 1);
  const sanitizedHtml = useMemo(
    () => DOMPurify.sanitize(variant.content),
    [variant.content],
  );
  const plainContent = variant.content.replace(/<[^>]*>/g, '');
  const isLong = plainContent.length > 200;
  const truncatedPlain = isLong && !expanded
    ? plainContent.slice(0, 200) + '...'
    : null;

  return (
    <div
      className={`relative rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-primary-500 shadow-sm'
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
      style={isSelected ? { backgroundColor: '#f0fdfa', boxShadow: '0 0 0 3px rgba(20,184,166,0.15)' } : undefined}
      onClick={!isEditing ? handleSelect : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isEditing) handleSelect();
      }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between gap-3 px-3 py-2 border-b ${isSelected ? 'border-primary-200' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold flex-shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
            {label}
          </span>
          {variant.tone && (
            <span className="min-w-0 overflow-hidden">
              <Badge variant="default" size="sm"><span className="block truncate max-w-[200px]">{variant.tone}</span></Badge>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isSelected && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Check className="h-3.5 w-3.5" />
              Selected
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title="Edit variant"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {isEditing ? (
          <InlineEditor
            initialContent={variant.content}
            onSave={handleSave}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <>
            {/* Video thumbnail placeholder */}
            {mediaType === 'video' && (
              <div className="relative aspect-video bg-gray-900 rounded mb-2 flex items-center justify-center">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Play className="h-4 w-4 text-white ml-0.5" />
                </div>
                {duration != null && (
                  <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                    <Clock className="h-2.5 w-2.5" />
                    {duration}s
                  </div>
                )}
              </div>
            )}

            {/* Audio waveform placeholder */}
            {mediaType === 'audio' && (
              <div className="flex items-center gap-2 bg-gray-100 rounded p-2 mb-2">
                <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Mic className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <div className="flex items-end gap-px h-5 flex-1">
                  {Array.from({ length: 24 }, (_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-violet-300 rounded-full"
                      style={{ height: `${30 + Math.sin(i * 0.6) * 40 + 20}%`, minHeight: '3px' }}
                    />
                  ))}
                </div>
                {duration != null && (
                  <span className="text-[10px] text-gray-500 flex-shrink-0">
                    {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
                  </span>
                )}
              </div>
            )}

            {truncatedPlain ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{truncatedPlain}</p>
            ) : (
              <div
                className="text-sm text-gray-700 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            )}
            {isLong && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="mt-1 text-xs text-primary hover:text-primary-700"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
