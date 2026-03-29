'use client';

import React from 'react';
import { Camera, Columns2 } from 'lucide-react';
import { Card, Badge } from '@/components/shared';
import type { StyleReferenceWithMeta } from '@/features/media-library/types/media.types';

interface StyleGuideCardProps {
  style: StyleReferenceWithMeta;
  isSelected: boolean;
  onClick: () => void;
  onCompare?: () => void;
}

/** Card showing a photography style reference with thumbnail previews, name, prompt, and model badge. */
export function StyleGuideCard({ style, isSelected, onClick, onCompare }: StyleGuideCardProps) {
  const hasImages = style.referenceImages.length > 0;
  const previewImages = style.referenceImages.slice(0, 3);

  return (
    <Card
      hoverable
      padding="none"
      onClick={onClick}
      className={isSelected ? 'ring-2 ring-primary/40' : ''}
    >
      {/* Thumbnail area */}
      <div className="relative h-36 bg-gray-50 overflow-hidden rounded-t-xl">
        {hasImages ? (
          <div className="flex h-full">
            {previewImages.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`${style.name} reference ${idx + 1}`}
                className="h-full object-cover flex-1"
                style={{
                  borderRight:
                    idx < previewImages.length - 1 ? '2px solid white' : undefined,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
          </div>
        )}

        {/* Compare button overlay */}
        {onCompare && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCompare();
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition hover:bg-white"
            aria-label="Select for comparison"
          >
            <Columns2 className="w-3.5 h-3.5 text-gray-600" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">
            {style.name}
          </h4>
          {style.modelName && (
            <Badge variant="default" size="sm">
              {style.modelName}
            </Badge>
          )}
        </div>

        {style.stylePrompt && (
          <p className="text-xs text-gray-500 line-clamp-2">{style.stylePrompt}</p>
        )}

        {!style.stylePrompt && !style.modelDescription && (
          <p className="text-xs text-gray-400 italic">No description provided</p>
        )}
      </div>
    </Card>
  );
}
