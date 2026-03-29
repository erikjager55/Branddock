'use client';

import { Heart, Trash2, Image, FileText, Video, Music } from 'lucide-react';
import { MEDIA_TYPE_ICONS, MEDIA_CATEGORY_CONFIG, formatFileSize } from '../constants/media-constants';
import type { MediaAssetWithMeta } from '../types/media.types';

interface MediaCardListProps {
  assets: MediaAssetWithMeta[];
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Fallback icon map keyed by media type for assets without a thumbnail. */
const FALLBACK_ICONS: Record<string, typeof Image> = {
  IMAGE: Image,
  DOCUMENT: FileText,
  VIDEO: Video,
  AUDIO: Music,
};

/** Format a date string into a human-readable short date. */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Table-style list view of media assets. */
export function MediaCardList({ assets, onSelect, onFavorite, onDelete }: MediaCardListProps) {
  return (
    <div>
      {/* Header row */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-gray-500 uppercase border-b">
        <div className="col-span-4">Name</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-1">Size</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-1">Actions</div>
      </div>

      {/* Asset rows */}
      {assets.map((asset) => {
        const typeConfig = MEDIA_TYPE_ICONS[asset.mediaType];
        const categoryConfig = MEDIA_CATEGORY_CONFIG[asset.category];
        const FallbackIcon = FALLBACK_ICONS[asset.mediaType] ?? Image;

        return (
          <div
            key={asset.id}
            className="grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            onClick={() => onSelect(asset.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(asset.id);
              }
            }}
          >
            {/* Name */}
            <div className="col-span-4 flex items-center gap-3 min-w-0">
              {asset.thumbnailUrl ? (
                <img
                  src={asset.thumbnailUrl}
                  alt={asset.name}
                  className="h-10 w-10 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <FallbackIcon className={`w-5 h-5 ${typeConfig.color}`} />
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 truncate">{asset.name}</span>
            </div>

            {/* Type badge */}
            <div className="col-span-2">
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 ${typeConfig.color}`}
              >
                <typeConfig.icon className="w-3 h-3" />
                {typeConfig.label}
              </span>
            </div>

            {/* Category */}
            <div className="col-span-2">
              <span className="text-sm text-gray-600">{categoryConfig.label}</span>
            </div>

            {/* Size */}
            <div className="col-span-1">
              <span className="text-sm text-gray-500">{formatFileSize(asset.fileSize)}</span>
            </div>

            {/* Date */}
            <div className="col-span-2">
              <span className="text-sm text-gray-500">{formatDate(asset.createdAt)}</span>
            </div>

            {/* Actions */}
            <div className="col-span-1 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite(asset.id);
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label={asset.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  className={`w-4 h-4 ${
                    asset.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(asset.id);
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label="Delete asset"
              >
                <Trash2 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
