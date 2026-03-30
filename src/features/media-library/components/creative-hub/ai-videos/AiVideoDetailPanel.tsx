'use client';

import { useCallback } from 'react';
import { X, Video, Heart, Download } from 'lucide-react';
import { Badge, Button, Skeleton } from '@/components/shared';
import { formatFileSize } from '@/features/media-library/constants/media-constants';
import { useAiVideoDetail, useUpdateAiVideo } from '@/features/media-library/hooks';

// ─── Types ──────────────────────────────────────────────────

interface AiVideoDetailPanelProps {
  videoId: string;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────

/** Inline detail panel shown when an AI-generated video is selected. */
export function AiVideoDetailPanel({ videoId, onClose }: AiVideoDetailPanelProps) {
  const { data: video, isLoading, isError } = useAiVideoDetail(videoId);
  const updateVideo = useUpdateAiVideo(videoId);
  const mutate = updateVideo.mutate;

  const handleToggleFavorite = useCallback(() => {
    if (!video) return;
    mutate({ isFavorite: !video.isFavorite });
  }, [video, mutate]);

  if (isLoading) {
    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <Skeleton height={20} width="40%" />
        <Skeleton height={200} />
        <Skeleton height={14} width="60%" />
        <Skeleton height={60} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-sm text-red-500">Failed to load video details.</p>
        <Button variant="secondary" onClick={onClose} className="mt-3">
          Close
        </Button>
      </div>
    );
  }

  if (!video) return null;

  return (
    <div
      className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden"
      data-testid="ai-video-detail-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center">
            <Video className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{video.name}</h3>
              <Badge variant="info" size="sm">
                {video.provider === 'RUNWAY' ? 'Runway' : video.provider}
              </Badge>
              {video.isFavorite && (
                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
              )}
            </div>
            <p className="text-xs text-gray-500">
              Created {new Date(video.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Close detail panel">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5">
        {/* Video player */}
        <div className="flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden">
          {video.fileUrl ? (
            <video
              src={video.fileUrl}
              controls
              className="max-h-[400px] w-full"
              poster={video.thumbnailUrl ?? undefined}
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="py-16">
              <Video className="w-12 h-12 text-gray-500 mx-auto" />
            </div>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Provider</span>
            <span className="text-sm text-gray-900">{video.provider === 'RUNWAY' ? 'Runway ML' : video.provider}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Model</span>
            <span className="text-sm text-gray-900">{video.model}</span>
          </div>
          {video.duration != null && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Duration</span>
              <span className="text-sm text-gray-900">{video.duration.toFixed(1)}s</span>
            </div>
          )}
          {video.width && video.height && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Resolution</span>
              <span className="text-sm text-gray-900">{video.width} x {video.height}</span>
            </div>
          )}
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">File Size</span>
            <span className="text-sm text-gray-900">{formatFileSize(video.fileSize)}</span>
          </div>
          {video.aspectRatio && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Aspect Ratio</span>
              <span className="text-sm text-gray-900">{video.aspectRatio}</span>
            </div>
          )}
        </div>

        {/* Prompt section */}
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Prompt</span>
          <p className="text-sm text-gray-700 bg-indigo-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
            {video.prompt}
          </p>
        </div>

        {/* Update error */}
        {updateVideo.isError && (
          <p className="text-xs text-red-500" role="alert">
            Failed to update video. Please try again.
          </p>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {/* Favorite toggle */}
            <div>
              <span className="text-sm font-medium text-gray-700">Favorite</span>
              <p className="text-xs text-gray-500">Mark this video as a favorite</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={video.isFavorite}
              onClick={handleToggleFavorite}
              disabled={updateVideo.isPending}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
                video.isFavorite ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  video.isFavorite ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Download button */}
          {video.fileUrl && (
            <a
              href={video.fileUrl}
              download={video.fileName}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
