'use client';

import { useCallback } from 'react';
import { X, Music2, Star, Wand2 } from 'lucide-react';
import { Badge, Button, Skeleton } from '@/components/shared';
import { formatFileSize } from '@/features/media-library/constants/media-constants';
import { useSoundEffectDetail, useUpdateSoundEffect } from '@/features/media-library/hooks';
import { VoicePreviewPlayer } from '../brand-voice/VoicePreviewPlayer';

// ─── Constants ──────────────────────────────────────────────

const SOUND_TYPE_LABELS: Record<string, string> = {
  SFX: 'SFX',
  JINGLE: 'Jingle',
  SOUND_LOGO: 'Sound Logo',
  AMBIENT: 'Ambient',
  MUSIC: 'Music',
};

function formatDuration(seconds: number | null): string {
  if (seconds == null || !isFinite(seconds)) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
  return `${secs}s`;
}

// ─── Types ──────────────────────────────────────────────────

interface SoundEffectDetailPanelProps {
  effectId: string;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────

/** Inline detail panel shown when a sound effect is selected. */
export function SoundEffectDetailPanel({ effectId, onClose }: SoundEffectDetailPanelProps) {
  const { data: effect, isLoading, isError } = useSoundEffectDetail(effectId);
  const updateSoundEffect = useUpdateSoundEffect(effectId);
  const mutate = updateSoundEffect.mutate;

  const handleToggleDefault = useCallback(() => {
    if (!effect) return;
    mutate({ isDefault: !effect.isDefault });
  }, [effect, mutate]);

  if (isLoading) {
    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <Skeleton height={20} width="40%" />
        <Skeleton height={14} width="60%" />
        <Skeleton height={80} />
        <Skeleton height={60} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-sm text-red-500">Failed to load sound effect details.</p>
        <Button variant="secondary" onClick={onClose} className="mt-3">
          Close
        </Button>
      </div>
    );
  }

  if (!effect) return null;

  return (
    <div
      className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden"
      data-testid="sound-effect-detail-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center">
            <Music2 className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{effect.name}</h3>
              {effect.isDefault && (
                <Badge variant="info" size="sm" icon={Star}>
                  Default
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Created {new Date(effect.createdAt).toLocaleDateString('en-US', {
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
        {/* Audio preview */}
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Audio Preview
          </span>
          <VoicePreviewPlayer audioUrl={effect.fileUrl} voiceName={effect.name} />
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Type</span>
            <span className="text-sm text-gray-900">{SOUND_TYPE_LABELS[effect.soundType] ?? effect.soundType}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Duration</span>
            <span className="text-sm text-gray-900">{formatDuration(effect.duration)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">File Size</span>
            <span className="text-sm text-gray-900">{formatFileSize(effect.fileSize)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Format</span>
            <span className="text-sm text-gray-900">{effect.fileType}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Source</span>
            <div className="flex items-center gap-1">
              {effect.source === 'AI_GENERATED' && <Wand2 className="w-3 h-3 text-purple-500" />}
              <span className="text-sm text-gray-900">
                {effect.source === 'AI_GENERATED' ? 'AI Generated' : 'Upload'}
              </span>
            </div>
          </div>
        </div>

        {/* AI prompt section */}
        {effect.source === 'AI_GENERATED' && effect.prompt && (
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">AI Prompt</span>
            <p className="text-sm text-gray-700 bg-purple-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
              {effect.prompt}
            </p>
            {effect.promptInfluence != null && (
              <p className="text-xs text-gray-400 mt-1">
                Prompt influence: {Math.round(effect.promptInfluence * 100)}%
              </p>
            )}
          </div>
        )}

        {/* Update error */}
        {updateSoundEffect.isError && (
          <p className="text-xs text-red-500" role="alert">
            Failed to update sound effect. Please try again.
          </p>
        )}

        {/* Set as Default toggle */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <span className="text-sm font-medium text-gray-700">Default Sound Effect</span>
            <p className="text-xs text-gray-500">Use as the default sound for this workspace</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={effect.isDefault}
            onClick={handleToggleDefault}
            disabled={updateSoundEffect.isPending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 ${
              effect.isDefault ? 'bg-purple-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                effect.isDefault ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
