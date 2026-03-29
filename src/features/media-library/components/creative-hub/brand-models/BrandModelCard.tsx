'use client';

import React from 'react';
import { Boxes, Calendar } from 'lucide-react';
import { Badge } from '@/components/shared';
import type { StyleReferenceWithMeta } from '../../../types/media.types';

// ─── Types ──────────────────────────────────────────────────

interface BrandModelCardProps {
  model: StyleReferenceWithMeta;
  onClick: () => void;
}

// ─── Component ──────────────────────────────────────────────

/** Card component for individual brand model style references in grid view. */
export const BrandModelCard = React.memo(function BrandModelCard({
  model,
  onClick,
}: BrandModelCardProps) {
  const hasImage = model.referenceImages.length > 0;
  const createdDate = new Date(model.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      data-testid={`brand-model-card-${model.id}`}
    >
      {/* Thumbnail area */}
      <div className="relative h-40 bg-gray-50">
        {hasImage ? (
          <img
            src={model.referenceImages[0]}
            alt={model.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Boxes className="w-10 h-10 text-gray-300" />
          </div>
        )}

        {/* Image count overlay */}
        {model.referenceImages.length > 1 && (
          <span className="absolute bottom-2 right-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-black/60 text-white">
            +{model.referenceImages.length - 1}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 line-clamp-1 mb-1">
          {model.name}
        </p>

        {model.modelName && (
          <Badge variant="teal" size="sm" className="mb-1.5">
            {model.modelName}
          </Badge>
        )}

        {model.modelDescription && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
            {model.modelDescription}
          </p>
        )}

        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Calendar className="w-3 h-3" />
          <span>{createdDate}</span>
        </div>
      </div>
    </div>
  );
});
