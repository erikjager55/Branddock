'use client';

import { useState } from 'react';
import { Plus, AlertTriangle, Mic } from 'lucide-react';
import { Button, EmptyState, SkeletonCard } from '@/components/shared';
import { useBrandVoices, useDeleteBrandVoice } from '@/features/media-library/hooks';
import type { BrandVoiceWithMeta } from '@/features/media-library/types/media.types';
import { BrandVoiceCard } from './BrandVoiceCard';
import { CreateBrandVoiceModal } from './CreateBrandVoiceModal';
import { VoiceDetailPanel } from './VoiceDetailPanel';

// ─── Component ──────────────────────────────────────────────

/** Tab component displaying a grid of brand voice profiles. */
export function BrandVoiceTab() {
  const { data, isLoading, isError } = useBrandVoices();
  const deleteBrandVoice = useDeleteBrandVoice();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);

  const voices: BrandVoiceWithMeta[] = (data as BrandVoiceWithMeta[] | undefined) ?? [];

  const handleDelete = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this brand voice?')) return;
    deleteBrandVoice.mutate(id, {
      onSuccess: () => {
        if (selectedVoiceId === id) {
          setSelectedVoiceId(null);
        }
      },
    });
  };

  return (
    <div data-testid="brand-voice-tab">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Brand Voice</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Define your brand&apos;s audio identity and voice characteristics for AI generation.
          </p>
        </div>
        <Button
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
          data-testid="create-brand-voice-button"
        >
          Create Brand Voice
        </Button>
      </div>

      {/* Content states */}
      {isError ? (
        <div data-testid="error-message" className="text-center py-16">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            Something went wrong
          </h3>
          <p className="text-xs text-gray-500">
            Failed to load brand voices. Please try again later.
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
      ) : voices.length === 0 ? (
        <EmptyState
          icon={Mic}
          title="No brand voices defined yet"
          description="Create one to define your brand's audio identity."
          action={{
            label: 'Create Brand Voice',
            onClick: () => setIsCreateModalOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {voices.map((voice) => (
            <BrandVoiceCard
              key={voice.id}
              voice={voice}
              onClick={() => setSelectedVoiceId(voice.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateBrandVoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Detail Panel — inline detail when a voice is selected */}
      {selectedVoiceId && (
        <VoiceDetailPanel
          voiceId={selectedVoiceId}
          onClose={() => setSelectedVoiceId(null)}
        />
      )}
    </div>
  );
}
