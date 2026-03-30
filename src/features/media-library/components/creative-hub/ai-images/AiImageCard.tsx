'use client';

import React from 'react';
import { ImageIcon, Heart, Trash2 } from 'lucide-react';
import { Badge } from '@/components/shared';
import type { GeneratedImageWithMeta } from '@/features/media-library/types/media.types';

// ─── Helpers ────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Types ──────────────────────────────────────────────────

interface AiImageCardProps {
  image: GeneratedImageWithMeta;
  onClick: () => void;
  onDelete: (id: string) => void;
  onToggleFavorite: () => void;
}

// ─── Component ──────────────────────────────────────────────

/** Card component for individual AI-generated image entries in grid view. */
export const AiImageCard = React.memo(function AiImageCard({
  image,
  onClick,
  onDelete,
  onToggleFavorite,
}: AiImageCardProps) {
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
      data-testid={`ai-image-card-${image.id}`}
    >
      {/* Image area */}
      <div className="relative h-40 bg-gradient-to-br from-blue-50 to-violet-50 flex items-center justify-center">
        {image.fileUrl ? (
          <img
            src={image.fileUrl}
            alt={image.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="w-8 h-8 text-violet-400" />
        )}

        {/* Provider badge */}
        <div className="absolute top-2 right-2">
          <Badge
            variant={image.provider === 'IMAGEN' ? 'info' : 'teal'}
            size="sm"
          >
            {image.provider === 'IMAGEN' ? 'Imagen' : 'DALL-E'}
          </Badge>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(image.id);
          }}
          className="absolute top-2 left-2 p-1 rounded-md bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
          aria-label={`Delete ${image.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Favorite button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="absolute bottom-2 right-2 p-1 rounded-md bg-white/80 hover:bg-white transition-all"
          aria-label={image.isFavorite ? `Unfavorite ${image.name}` : `Favorite ${image.name}`}
        >
          <Heart
            className={`w-3.5 h-3.5 ${
              image.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
            }`}
          />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-semibold text-gray-900 line-clamp-1">
          {image.name}
        </p>

        <p className="text-xs text-gray-500 line-clamp-2">
          {image.prompt}
        </p>

        {/* Badge row */}
        <div className="flex flex-wrap items-center gap-1">
          {image.aspectRatio && (
            <Badge variant="default" size="sm">
              {image.aspectRatio}
            </Badge>
          )}
          <span className="text-xs text-gray-400">
            {formatFileSize(image.fileSize)}
          </span>
        </div>
      </div>
    </div>
  );
});
