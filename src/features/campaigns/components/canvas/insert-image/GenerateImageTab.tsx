'use client';

import React, { useMemo, useState } from 'react';
import { Wand2, Sparkles, Loader2 } from 'lucide-react';
import { useConsistentModels } from '@/features/consistent-models/hooks';
import { GenerateImageModal } from '@/features/media-library/components/creative-hub/ai-images/GenerateImageModal';
import type { TrainedModelOption } from '@/features/media-library/components/creative-hub/ai-images/GenerateImageModal';
import { useSendAiImageToLibrary } from '@/features/media-library/hooks';
import type { GeneratedImageWithMeta } from '@/features/media-library/types/media.types';
import type { InsertImageTabProps } from './types';

/**
 * Generate Image tab — opens the AI Studio's existing GenerateImageModal
 * as a nested modal. After generation succeeds, automatically sends the
 * new GeneratedImage to the Media Library (creating a MediaAsset) and
 * forwards the resulting URL/id to onSelected so the canvas modal closes
 * and the canvas store updates.
 *
 * Reuses the AI Studio flow verbatim — same Choice screen (Use Trained
 * Model | Generate Image), same provider picker, same brand context,
 * same trained-model selector. No code duplication.
 */
export function GenerateImageTab({ onSelected }: InsertImageTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Fetch trained models for the choice screen
  const { data: modelsData, isLoading: modelsLoading } = useConsistentModels();
  const trainedModels = useMemo<TrainedModelOption[]>(() => {
    const models = modelsData?.models ?? [];
    return models
      .filter((m) => m.status === 'READY' && m.triggerWord)
      .map((m) => ({
        id: m.id,
        name: m.name,
        triggerWord: m.triggerWord ?? 'TOK',
        type: m.type,
      }));
  }, [modelsData]);

  const sendToLibrary = useSendAiImageToLibrary();

  const handleGenerated = async (image: GeneratedImageWithMeta) => {
    setIsLinking(true);
    try {
      // Send the freshly generated image to the Media Library — this
      // creates a MediaAsset record we can link to the canvas deliverable.
      const result = (await sendToLibrary.mutateAsync({ id: image.id })) as {
        asset?: { id: string; fileUrl: string; name?: string };
      };
      const asset = result?.asset;
      if (asset?.fileUrl) {
        // Forward to the parent modal which will set heroImage + persist
        // it on the deliverable.
        onSelected({
          url: asset.fileUrl,
          mediaAssetId: asset.id,
          alt: asset.name ?? image.name ?? undefined,
        });
      } else {
        // Endpoint succeeded but returned an unexpected shape — fall back
        // to the GeneratedImage URL directly.
        onSelected({
          url: image.fileUrl,
          mediaAssetId: null,
          alt: image.name ?? undefined,
        });
      }
    } catch (err) {
      console.error('[GenerateImageTab] failed to send to library:', err);
      // Fallback: still forward the raw GeneratedImage URL so the user
      // sees their image, even if the library link failed.
      onSelected({
        url: image.fileUrl,
        mediaAssetId: null,
        alt: image.name ?? undefined,
      });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 mb-3">
        <Wand2 className="h-7 w-7 text-purple-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        Generate AI Image
      </h3>
      <p className="max-w-sm text-sm text-gray-500 mb-5">
        Use a fine-tuned brand model for consistent output, or pick a fal.ai
        provider with brand context tags. The result is auto-saved to your
        Media Library.
      </p>

      {modelsLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading trained models…
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={isLinking}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 text-sm font-medium transition-colors"
        >
          {isLinking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving to library...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Open generator
            </>
          )}
        </button>
      )}

      {/* Nested modal — AI Studio's GenerateImageModal verbatim */}
      <GenerateImageModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        trainedModels={trainedModels}
        onGenerated={handleGenerated}
      />
    </div>
  );
}
