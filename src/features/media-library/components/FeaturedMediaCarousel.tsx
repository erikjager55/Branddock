'use client';

import React from 'react';
import type { MediaAssetWithMeta } from '../types/media.types';
import { MEDIA_TYPE_ICONS } from '../constants/media-constants';
import { formatFileSize } from '../constants/media-constants';

// ─── Types ────────────────────────────────────────────────

interface FeaturedMediaCarouselProps {
  assets: MediaAssetWithMeta[];
}

// ─── Component ────────────────────────────────────────────

/** Horizontally scrollable carousel of featured media assets */
export function FeaturedMediaCarousel({ assets }: FeaturedMediaCarouselProps) {
  if (assets.length === 0) return null;

  return (
    <div className="mb-6" data-testid="featured-media-carousel">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Featured Media</h3>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {assets.map((asset) => {
          const typeConfig = MEDIA_TYPE_ICONS[asset.mediaType];
          const TypeIcon = typeConfig.icon;

          return (
            <div
              key={asset.id}
              data-testid="featured-media-card"
              className="min-w-[280px] snap-start bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
            >
              {/* Thumbnail area */}
              <div className="h-36 bg-gray-50 flex items-center justify-center overflow-hidden">
                {asset.thumbnailUrl ? (
                  <img
                    src={asset.thumbnailUrl}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <TypeIcon className={`w-10 h-10 ${typeConfig.color}`} />
                )}
              </div>

              {/* Body */}
              <div className="p-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                  {asset.name}
                </h4>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${typeConfig.color}`}
                  >
                    <TypeIcon className="h-3 w-3" />
                    {typeConfig.label}
                  </span>
                  <span>{formatFileSize(asset.fileSize)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FeaturedMediaCarousel;
