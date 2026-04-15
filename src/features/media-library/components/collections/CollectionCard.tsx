'use client';

import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { Badge } from '@/components/shared';
import type { MediaCollectionWithMeta } from '../../types/media.types';

interface CollectionCardProps {
  collection: MediaCollectionWithMeta;
  onClick?: (id: string) => void;
}

const DEFAULT_COLOR = '#6B7280';

/** Card component for a single media collection. */
export function CollectionCard({ collection, onClick }: CollectionCardProps) {
  const bgColor = collection.color ?? DEFAULT_COLOR;
  const [imgFailed, setImgFailed] = useState(false);
  const previewUrl = collection.previewAssetUrl;
  const showPreview = previewUrl && !imgFailed;

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group"
      onClick={() => onClick?.(collection.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(collection.id);
        }
      }}
    >
      {/* Cover area */}
      <div className="relative aspect-video">
        {showPreview ? (
          <img
            src={previewUrl}
            alt={collection.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: `${bgColor}18` }}
          >
            <FolderOpen
              className="w-10 h-10"
              style={{ color: bgColor }}
              strokeWidth={1.5}
            />
          </div>
        )}

        {/* Color dot indicator */}
        {collection.color && (
          <div
            className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: collection.color }}
          />
        )}
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {collection.name}
          </h3>
          <Badge variant="default" size="sm">
            {collection._count.assets} {collection._count.assets === 1 ? 'asset' : 'assets'}
          </Badge>
        </div>

        {collection.description && (
          <p className="text-xs text-gray-500 line-clamp-1 mt-1">
            {collection.description}
          </p>
        )}
      </div>
    </div>
  );
}
