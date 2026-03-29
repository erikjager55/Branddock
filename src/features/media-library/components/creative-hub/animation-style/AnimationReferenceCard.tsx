'use client';

import React from 'react';
import { Film, Calendar } from 'lucide-react';
import { Card, Badge } from '@/components/shared';
import type { StyleReferenceWithMeta } from '@/features/media-library/types/media.types';

interface AnimationReferenceCardProps {
  style: StyleReferenceWithMeta;
  isSelected: boolean;
  onClick: () => void;
}

/** Card showing an animation style reference with preview, name, description, and creation date. */
export function AnimationReferenceCard({ style, isSelected, onClick }: AnimationReferenceCardProps) {
  const hasImage = style.referenceImages.length > 0;
  const previewUrl = hasImage ? style.referenceImages[0] : null;
  const description = style.modelDescription || style.stylePrompt;

  const createdDate = new Date(style.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card
      hoverable
      padding="none"
      onClick={onClick}
      className={isSelected ? 'ring-2 ring-primary/40' : ''}
    >
      {/* Thumbnail area */}
      <div className="relative h-36 bg-gray-900 overflow-hidden rounded-t-xl">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`${style.name} reference`}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-10 h-10 text-gray-500" strokeWidth={1.5} />
          </div>
        )}

        {/* Film badge overlay */}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur-sm">
          <Film className="w-3 h-3" />
          Animation
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">
          {style.name}
        </h4>

        {description ? (
          <p className="text-xs text-gray-500 line-clamp-2">{description}</p>
        ) : (
          <p className="text-xs text-gray-400 italic">No description provided</p>
        )}

        {/* Footer with date badge */}
        <div className="flex items-center justify-between pt-1">
          <Badge variant="default" size="sm" icon={Calendar}>
            {createdDate}
          </Badge>
          {style.modelName && (
            <Badge variant="info" size="sm">
              {style.modelName}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
