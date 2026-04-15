'use client';

import React, { useState } from 'react';
import { Heart, Play } from 'lucide-react';
import type { MediaAssetWithMeta } from '../types/media.types';
import {
  MEDIA_TYPE_ICONS,
  MEDIA_CATEGORY_CONFIG,
  formatFileSize,
  formatDuration,
} from '../constants/media-constants';
import { getPreviewImageUrl, isPreviewableImage } from '../utils/preview-url';

interface MediaAssetCardProps {
  asset: MediaAssetWithMeta;
  onClick: () => void;
  onFavorite: () => void;
  onDelete: () => void;
}

/** Card component for individual media assets in grid view. */
export const MediaAssetCard = React.memo(function MediaAssetCard({
  asset,
  onClick,
  onFavorite,
}: MediaAssetCardProps) {
  const typeConfig = MEDIA_TYPE_ICONS[asset.mediaType];
  const categoryConfig = MEDIA_CATEGORY_CONFIG[asset.category];
  const TypeIcon = typeConfig.icon;
  const [imageFailed, setImageFailed] = useState(false);
  const previewUrl = getPreviewImageUrl(asset);
  const showImagePreview = isPreviewableImage(asset) && previewUrl && !imageFailed;

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group flex flex-col"
      onClick={onClick}
    >
      {/* Thumbnail area — square via aspect-square */}
      <div className="relative aspect-square overflow-hidden">
        {showImagePreview ? (
          <img
            src={previewUrl}
            alt={asset.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : asset.mediaType === 'VIDEO' ? (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
            {asset.thumbnailUrl ? (
              <img
                src={asset.thumbnailUrl}
                alt={asset.name}
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
            ) : asset.fileUrl ? (
              <video
                src={asset.fileUrl}
                muted
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover opacity-60"
                onLoadedData={(e) => {
                  e.currentTarget.currentTime = 0.5;
                }}
              />
            ) : null}
            <Play className="relative z-10 w-10 h-10 text-white fill-white/80" />
          </div>
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
            <TypeIcon className={`w-10 h-10 ${typeConfig.color}`} />
          </div>
        )}

        {/* Favorite button - top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
          className={`absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-sm transition ${
            asset.isFavorite
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart
            className={`w-4 h-4 ${
              asset.isFavorite
                ? 'fill-red-500 text-red-500'
                : 'fill-transparent text-gray-600'
            }`}
          />
        </button>

        {/* Media type badge - top left */}
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/80 backdrop-blur-sm ${typeConfig.color}`}
        >
          <TypeIcon className="w-3 h-3" />
          {typeConfig.label}
        </span>

        {/* Duration overlay - bottom right (for video/audio) */}
        {asset.duration != null && (
          <span className="absolute bottom-2 right-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-black/70 text-white">
            {formatDuration(asset.duration)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex-shrink-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-1 mb-1">
          {asset.name}
        </p>
        <p className="text-xs text-gray-500 mb-2">
          {categoryConfig.label}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{formatFileSize(asset.fileSize)}</span>
          <span>
            {asset.mediaType === 'IMAGE' &&
            asset.width != null &&
            asset.height != null
              ? `${asset.width} x ${asset.height}`
              : asset.duration != null
                ? formatDuration(asset.duration)
                : null}
          </span>
        </div>
      </div>
    </div>
  );
});

