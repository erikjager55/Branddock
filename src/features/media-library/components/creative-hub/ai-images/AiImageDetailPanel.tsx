'use client';

import { useCallback } from 'react';
import { X, ImageIcon, Heart, Sparkles, FolderPlus, Package } from 'lucide-react';
import { Badge, Button, Skeleton } from '@/components/shared';
import { formatFileSize } from '@/features/media-library/constants/media-constants';
import { useAiImageDetail, useUpdateAiImage } from '@/features/media-library/hooks';

// ─── Types ──────────────────────────────────────────────────

interface AiImageDetailPanelProps {
  imageId: string;
  onClose: () => void;
  onSendToLibrary?: () => void;
}

// ─── Component ──────────────────────────────────────────────

/** Inline detail panel shown when an AI-generated image is selected. */
export function AiImageDetailPanel({ imageId, onClose, onSendToLibrary }: AiImageDetailPanelProps) {
  const { data: image, isLoading, isError } = useAiImageDetail(imageId);
  const updateImage = useUpdateAiImage(imageId);
  const mutate = updateImage.mutate;

  const handleToggleFavorite = useCallback(() => {
    if (!image) return;
    mutate({ isFavorite: !image.isFavorite });
  }, [image, mutate]);

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
        <p className="text-sm text-red-500">Failed to load image details.</p>
        <Button variant="secondary" onClick={onClose} className="mt-3">
          Close
        </Button>
      </div>
    );
  }

  if (!image) return null;

  return (
    <div
      className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden"
      data-testid="ai-image-detail-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{image.name}</h3>
              <Badge
                variant={image.provider === 'TRAINED_MODEL' ? 'teal' : image.provider === 'IMAGEN' ? 'info' : 'default'}
                size="sm"
              >
                {{ IMAGEN: 'Imagen 4', DALLE: 'DALL-E 3', FLUX_PRO: 'Flux Pro', RECRAFT: 'Recraft', IDEOGRAM: 'Ideogram', TRAINED_MODEL: 'Trained Model' }[image.provider] ?? image.provider}
              </Badge>
              {image.isFavorite && (
                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
              )}
            </div>
            <p className="text-xs text-gray-500">
              Created {new Date(image.createdAt).toLocaleDateString('en-US', {
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
        {/* Full-size image preview */}
        <div className="flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
          {image.fileUrl ? (
            <img
              src={image.fileUrl}
              alt={image.name}
              className="max-h-[400px] object-contain"
            />
          ) : (
            <div className="py-16">
              <ImageIcon className="w-12 h-12 text-gray-300 mx-auto" />
            </div>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Provider</span>
            <span className="text-sm text-gray-900">{{ IMAGEN: 'Google Imagen 4', DALLE: 'OpenAI DALL-E 3', FLUX_PRO: 'Flux Pro (fal.ai)', RECRAFT: 'Recraft V3 (fal.ai)', IDEOGRAM: 'Ideogram V2 (fal.ai)', TRAINED_MODEL: 'Trained Model (fal.ai)' }[image.provider] ?? image.provider}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Model</span>
            <span className="text-sm text-gray-900">{image.model}</span>
          </div>
          {image.width && image.height && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Dimensions</span>
              <span className="text-sm text-gray-900">{image.width} x {image.height}</span>
            </div>
          )}
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">File Size</span>
            <span className="text-sm text-gray-900">{formatFileSize(image.fileSize)}</span>
          </div>
          {image.aspectRatio && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Aspect Ratio</span>
              <span className="text-sm text-gray-900">{image.aspectRatio}</span>
            </div>
          )}
          {image.style && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Style</span>
              <span className="text-sm text-gray-900 capitalize">{image.style}</span>
            </div>
          )}
          {image.quality && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Quality</span>
              <span className="text-sm text-gray-900 uppercase">{image.quality}</span>
            </div>
          )}
        </div>

        {/* Prompt section */}
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Prompt</span>
          <p className="text-sm text-gray-700 bg-purple-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
            {image.prompt}
          </p>
        </div>

        {/* Revised prompt (DALL-E only) */}
        {image.revisedPrompt && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Revised Prompt</span>
            </div>
            <p className="text-sm text-gray-700 bg-indigo-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
              {image.revisedPrompt}
            </p>
          </div>
        )}

        {/* Update error */}
        {updateImage.isError && (
          <p className="text-xs text-red-500" role="alert">
            Failed to update image. Please try again.
          </p>
        )}

        {/* Action buttons */}
        {onSendToLibrary && (
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <Button
              variant="secondary"
              icon={FolderPlus}
              onClick={onSendToLibrary}
              className="flex-1"
            >
              Save to Library
            </Button>
          </div>
        )}

        {/* Favorite toggle */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <span className="text-sm font-medium text-gray-700">Favorite</span>
            <p className="text-xs text-gray-500">Mark this image as a favorite</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={image.isFavorite}
            onClick={handleToggleFavorite}
            disabled={updateImage.isPending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 ${
              image.isFavorite ? 'bg-violet-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                image.isFavorite ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
