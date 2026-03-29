'use client';

import { useState } from 'react';
import { Upload, Wand2, AlertTriangle, Music2 } from 'lucide-react';
import { Button, EmptyState, SkeletonCard } from '@/components/shared';
import { useSoundEffects, useDeleteSoundEffect } from '@/features/media-library/hooks';
import type { SoundEffectWithMeta } from '@/features/media-library/types/media.types';
import { SoundEffectCard } from './SoundEffectCard';
import { UploadSoundModal } from './UploadSoundModal';
import { GenerateSoundModal } from './GenerateSoundModal';
import { SoundEffectDetailPanel } from './SoundEffectDetailPanel';

// ─── Component ──────────────────────────────────────────────

/** Tab component displaying a grid of sound effects. */
export function SoundEffectsTab() {
  const { data, isLoading, isError } = useSoundEffects();
  const deleteSoundEffect = useDeleteSoundEffect();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);

  const effects: SoundEffectWithMeta[] = Array.isArray(data) ? data : [];

  const handleDelete = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this sound effect?')) return;
    deleteSoundEffect.mutate(id, {
      onSuccess: () => {
        setSelectedEffectId((prev) => (prev === id ? null : prev));
      },
      onError: () => {
        // Error state is handled by deleteSoundEffect.isError in the UI
      },
    });
  };

  return (
    <div data-testid="sound-effects-tab">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sound Effects</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your brand&apos;s audio library — upload sounds or generate with AI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={Upload}
            onClick={() => setIsUploadModalOpen(true)}
            data-testid="upload-sound-button"
          >
            Upload Sound
          </Button>
          <Button
            icon={Wand2}
            onClick={() => setIsGenerateModalOpen(true)}
            data-testid="generate-sound-button"
          >
            Generate with AI
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
            Failed to load sound effects. Please try again later.
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
      ) : effects.length === 0 ? (
        <EmptyState
          icon={Music2}
          title="No sound effects yet"
          description="Upload audio files or generate brand sounds with AI."
          action={{
            label: 'Upload Sound',
            onClick: () => setIsUploadModalOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {effects.map((effect) => (
            <SoundEffectCard
              key={effect.id}
              effect={effect}
              onClick={() => setSelectedEffectId(effect.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Delete error feedback */}
      {deleteSoundEffect.isError && (
        <div className="flex items-center gap-2 mt-2" role="alert">
          <p className="text-xs text-red-500">
            Failed to delete sound effect. Please try again.
          </p>
          <button
            type="button"
            onClick={() => deleteSoundEffect.reset()}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Modal */}
      <UploadSoundModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      {/* Generate Modal */}
      <GenerateSoundModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
      />

      {/* Detail Panel — inline detail when an effect is selected */}
      {selectedEffectId && (
        <SoundEffectDetailPanel
          effectId={selectedEffectId}
          onClose={() => setSelectedEffectId(null)}
        />
      )}
    </div>
  );
}
