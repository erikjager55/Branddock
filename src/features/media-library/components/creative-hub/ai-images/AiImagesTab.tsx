'use client';

import { useState } from 'react';
import { Wand2, AlertTriangle, ImageIcon, Heart } from 'lucide-react';
import { Button, EmptyState, SkeletonCard } from '@/components/shared';
import { useAiImages, useDeleteAiImage, useUpdateAiImage } from '@/features/media-library/hooks';
import type { GeneratedImageWithMeta } from '@/features/media-library/types/media.types';
import { AiImageCard } from './AiImageCard';
import { GenerateImageModal } from './GenerateImageModal';
import { AiImageDetailPanel } from './AiImageDetailPanel';

// ─── Wrapper — hooks must be called per-image, outside of the grid ──

/** Renders an AiImageCard with its own useUpdateAiImage hook. */
function AiImageCardWithFavorite({
  image,
  onClick,
  onDelete,
}: {
  image: GeneratedImageWithMeta;
  onClick: () => void;
  onDelete: (id: string) => void;
}) {
  const updateImage = useUpdateAiImage(image.id);
  return (
    <AiImageCard
      image={image}
      onClick={onClick}
      onDelete={onDelete}
      onToggleFavorite={() =>
        updateImage.mutate({ isFavorite: !image.isFavorite })
      }
    />
  );
}

// ─── Component ──────────────────────────────────────────────

/** Tab component displaying a grid of AI-generated images. */
export function AiImagesTab() {
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { data, isLoading, isError } = useAiImages(showFavoritesOnly || undefined);
  const deleteAiImage = useDeleteAiImage();
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const images: GeneratedImageWithMeta[] = data ?? [];

  const handleDelete = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    deleteAiImage.mutate(id, {
      onSuccess: () => {
        setSelectedImageId((prev) => (prev === id ? null : prev));
      },
    });
  };

  return (
    <div data-testid="ai-images-tab">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Images</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate images with AI — powered by Imagen 4 and DALL-E 3.
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
            icon={Wand2}
            onClick={() => setIsGenerateModalOpen(true)}
            data-testid="generate-image-button"
          >
            Generate Image
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
            Failed to load AI images. Please try again later.
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
      ) : images.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={showFavoritesOnly ? 'No favorite images yet' : 'No AI images yet'}
          description={
            showFavoritesOnly
              ? 'Mark images as favorites to see them here.'
              : 'Generate your first image with Imagen 4 or DALL-E 3.'
          }
          action={
            showFavoritesOnly
              ? undefined
              : {
                  label: 'Generate Image',
                  onClick: () => setIsGenerateModalOpen(true),
                }
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <AiImageCardWithFavorite
              key={image.id}
              image={image}
              onClick={() => setSelectedImageId(image.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Delete error feedback */}
      {deleteAiImage.isError && (
        <div className="flex items-center gap-2 mt-2" role="alert">
          <p className="text-xs text-red-500">
            Failed to delete image. Please try again.
          </p>
          <button
            type="button"
            onClick={() => deleteAiImage.reset()}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Generate Modal */}
      <GenerateImageModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
      />

      {/* Detail Panel — inline detail when an image is selected */}
      {selectedImageId && (
        <AiImageDetailPanel
          imageId={selectedImageId}
          onClose={() => setSelectedImageId(null)}
        />
      )}
    </div>
  );
}
