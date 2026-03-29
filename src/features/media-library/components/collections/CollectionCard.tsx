'use client';

import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Badge } from '@/components/shared';
import type { MediaCollectionWithMeta } from '../../types/media.types';

// ─── Types ────────────────────────────────────────────────

interface CollectionCardProps {
  collection: MediaCollectionWithMeta;
  onClick?: (id: string) => void;
}

// ─── Color fallback ───────────────────────────────────────

const DEFAULT_COLOR = '#6B7280';

// ─── Component ────────────────────────────────────────────

/** Card component for a single media collection. */
export function CollectionCard({ collection, onClick }: CollectionCardProps) {
  const bgColor = collection.color ?? DEFAULT_COLOR;

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
      <div className="relative h-36">
        {collection.coverImageUrl ? (
          <img
            src={collection.coverImageUrl}
            alt={collection.name}
            className="w-full h-full object-cover"
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
      </div>

      {/* Body */}
      <div className="p-3.5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {collection.name}
          </h3>
          <Badge variant="default" size="sm">
            {collection._count.assets} {collection._count.assets === 1 ? 'asset' : 'assets'}
          </Badge>
        </div>

        {collection.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-1">
            {collection.description}
          </p>
        )}

        {collection._count.children > 0 && (
          <p className="text-xs text-gray-400 mt-1.5">
            {collection._count.children} sub-collection{collection._count.children !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
