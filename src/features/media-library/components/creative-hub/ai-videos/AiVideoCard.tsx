'use client';

import React from 'react';
import { Video, Heart, Trash2, Play } from 'lucide-react';
import { Badge } from '@/components/shared';
import { formatFileSize } from '@/features/media-library/constants/media-constants';
import type { GeneratedVideoWithMeta } from '@/features/media-library/types/media.types';

// ─── Types ──────────────────────────────────────────────────

interface AiVideoCardProps {
  video: GeneratedVideoWithMeta;
  onClick: () => void;
  onDelete: (id: string) => void;
  onToggleFavorite: () => void;
}

// ─── Component ──────────────────────────────────────────────

/** Card component for individual AI-generated video entries in grid view. */
export const AiVideoCard = React.memo(function AiVideoCard({
  video,
  onClick,
  onDelete,
  onToggleFavorite,
}: AiVideoCardProps) {
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
      data-testid={`ai-video-card-${video.id}`}
    >
      {/* Thumbnail area */}
      <div className="relative h-40 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Video className="w-8 h-8 text-indigo-400" />
        )}

        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* Provider badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="info" size="sm">
            {video.provider === 'RUNWAY' ? 'Runway' : video.provider}
          </Badge>
        </div>

        {/* Duration badge */}
        {video.duration != null && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-medium text-white tabular-nums">
              {video.duration.toFixed(1)}s
            </span>
          </div>
        )}

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(video.id);
          }}
          className="absolute top-2 left-2 p-1 rounded-md bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
          aria-label={`Delete ${video.name}`}
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
          aria-label={video.isFavorite ? `Unfavorite ${video.name}` : `Favorite ${video.name}`}
        >
          <Heart
            className={`w-3.5 h-3.5 ${
              video.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
            }`}
          />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-semibold text-gray-900 line-clamp-1">
          {video.name}
        </p>

        <p className="text-xs text-gray-500 line-clamp-2">
          {video.prompt}
        </p>

        {/* Badge row */}
        <div className="flex flex-wrap items-center gap-1">
          {video.aspectRatio && (
            <Badge variant="default" size="sm">
              {video.aspectRatio}
            </Badge>
          )}
          <span className="text-xs text-gray-400">
            {formatFileSize(video.fileSize)}
          </span>
        </div>
      </div>
    </div>
  );
});
