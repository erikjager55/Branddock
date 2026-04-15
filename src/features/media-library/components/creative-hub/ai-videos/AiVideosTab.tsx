'use client';

import { useState } from 'react';
import { Video, AlertTriangle, Heart } from 'lucide-react';
import { Button, EmptyState, SkeletonCard } from '@/components/shared';
import { useAiVideos, useDeleteAiVideo, useUpdateAiVideo, useSendAiVideoToLibrary } from '@/features/media-library/hooks';
import type { GeneratedVideoWithMeta } from '@/features/media-library/types/media.types';
import { AiVideoCard } from './AiVideoCard';
import { GenerateVideoModal } from './GenerateVideoModal';
import { AiVideoDetailPanel } from './AiVideoDetailPanel';

// ─── Wrapper — hooks must be called per-video, outside of the grid ──

/** Renders an AiVideoCard with its own useUpdateAiVideo + useSendToLibrary hooks. */
function AiVideoCardWithActions({
  video,
  onClick,
  onDelete,
}: {
  video: GeneratedVideoWithMeta;
  onClick: () => void;
  onDelete: (id: string) => void;
}) {
  const updateVideo = useUpdateAiVideo(video.id);
  const sendToLibrary = useSendAiVideoToLibrary();
  return (
    <AiVideoCard
      video={video}
      onClick={onClick}
      onDelete={onDelete}
      onToggleFavorite={() =>
        updateVideo.mutate({ isFavorite: !video.isFavorite })
      }
      onSendToLibrary={(id) => sendToLibrary.mutate({ id })}
    />
  );
}

// ─── Component ──────────────────────────────────────────────

/** Tab component displaying a grid of AI-generated videos. */
export function AiVideosTab() {
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { data, isLoading, isError } = useAiVideos(showFavoritesOnly || undefined);
  const deleteAiVideo = useDeleteAiVideo();
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const videos: GeneratedVideoWithMeta[] = data ?? [];

  const handleDelete = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    deleteAiVideo.mutate(id, {
      onSuccess: () => {
        setSelectedVideoId((prev) => (prev === id ? null : prev));
      },
    });
  };

  return (
    <div data-testid="ai-videos-tab">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Videos</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate short concept videos with AI — text-to-video and image-to-video.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              showFavoritesOnly
                ? 'bg-red-50 text-red-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-red-500' : ''}`} />
            Favorites
          </button>
          <Button
            icon={Video}
            onClick={() => setIsGenerateModalOpen(true)}
            data-testid="generate-video-button"
          >
            Generate Video
          </Button>
        </div>
      </div>

      {/* Content states */}
      {isError ? (
        <div data-testid="error-message" className="text-center py-16">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            Something went wrong
          </h3>
          <p className="text-xs text-gray-500">
            Failed to load AI videos. Please try again later.
          </p>
        </div>
      ) : isLoading ? (
        <div
          data-testid="skeleton-loader"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} height={280} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <EmptyState
          icon={Video}
          title={showFavoritesOnly ? 'No favorite videos yet' : 'No AI videos yet'}
          description={
            showFavoritesOnly
              ? 'Mark videos as favorites to see them here.'
              : 'Generate your first AI video from text or an image.'
          }
          action={
            showFavoritesOnly
              ? undefined
              : {
                  label: 'Generate Video',
                  onClick: () => setIsGenerateModalOpen(true),
                }
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <AiVideoCardWithActions
              key={video.id}
              video={video}
              onClick={() => setSelectedVideoId(video.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Delete error feedback */}
      {deleteAiVideo.isError && (
        <div className="flex items-center gap-2 mt-2" role="alert">
          <p className="text-xs text-red-500">
            Failed to delete video. Please try again.
          </p>
          <button
            type="button"
            onClick={() => deleteAiVideo.reset()}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Generate Modal */}
      <GenerateVideoModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
      />

      {/* Detail Panel — inline detail when a video is selected */}
      {selectedVideoId && (
        <AiVideoDetailPanel
          videoId={selectedVideoId}
          onClose={() => setSelectedVideoId(null)}
        />
      )}
    </div>
  );
}
