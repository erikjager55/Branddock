'use client';

import React, { useState } from 'react';
import { Video, Heart, Trash2, Play, FolderPlus } from 'lucide-react';
import { Badge } from '@/components/shared';
import { formatFileSize } from '@/features/media-library/constants/media-constants';
import { getProviderShortLabel } from '@/features/media-library/lib/provider-labels';
import type { GeneratedVideoWithMeta } from '@/features/media-library/types/media.types';

// ─── Types ──────────────────────────────────────────────────

interface AiVideoCardProps {
  video: GeneratedVideoWithMeta;
  onClick: () => void;
  onDelete: (id: string) => void;
  onToggleFavorite: () => void;
  onSendToLibrary?: (id: string) => void;
}

// ─── Component ──────────────────────────────────────────────

/** Card component for individual AI-generated video entries in grid view. */
export const AiVideoCard = React.memo(function AiVideoCard({
  video,
  onClick,
  onDelete,
  onToggleFavorite,
  onSendToLibrary,
}: AiVideoCardProps) {
  const [thumbFailed, setThumbFailed] = useState(false);

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
        {video.thumbnailUrl && !thumbFailed ? (
          <img
            src={video.thumbnailUrl}
            alt={video.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setThumbFailed(true)}
          />
        ) : video.fileUrl ? (
          <video
            src={video.fileUrl}
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            onLoadedData={(e) => {
              const el = e.currentTarget;
              el.currentTime = 0.5;
            }}
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

        {/* Action buttons (top-left) */}
        <div className="absolute top-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all">
          {onSendToLibrary && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSendToLibrary(video.id);
              }}
              className="p-1 rounded-md bg-white/80 text-gray-400 hover:text-teal-600 hover:bg-white transition-all"
              aria-label={`Save ${video.name} to library`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(video.id);
            }}
            className="p-1 rounded-md bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white transition-all"
            aria-label={`Delete ${video.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

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
