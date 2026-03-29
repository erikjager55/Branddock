'use client';

import React from 'react';
import { Music2, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/shared';
import type { SoundEffectWithMeta } from '@/features/media-library/types/media.types';
import { VoicePreviewPlayer } from '../brand-voice/VoicePreviewPlayer';

// ─── Constants ──────────────────────────────────────────────

const SOUND_TYPE_LABELS: Record<string, string> = {
  SFX: 'SFX',
  JINGLE: 'Jingle',
  SOUND_LOGO: 'Sound Logo',
  AMBIENT: 'Ambient',
  MUSIC: 'Music',
};

// ─── Types ──────────────────────────────────────────────────

interface SoundEffectCardProps {
  effect: SoundEffectWithMeta;
  onClick: () => void;
  onDelete: (id: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null || !isFinite(seconds)) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
  return `${secs}s`;
}

// ─── Component ──────────────────────────────────────────────

/** Card component for individual sound effect entries in grid view. */
export const SoundEffectCard = React.memo(function SoundEffectCard({
  effect,
  onClick,
  onDelete,
}: SoundEffectCardProps) {
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
      data-testid={`sound-effect-card-${effect.id}`}
    >
      {/* Header area */}
      <div className="relative h-24 bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="flex items-center gap-1.5">
          {/* Waveform visual */}
          <div className="flex items-end gap-0.5 h-8">
            {[4, 7, 5, 9, 3, 8, 6, 4, 7].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-purple-400/60 group-hover:bg-purple-500/70 transition-colors"
                style={{ height: `${h * 3}px` }}
              />
            ))}
          </div>
          <Music2 className="w-6 h-6 text-purple-600 ml-2" />
        </div>

        {/* Default badge */}
        {effect.isDefault && (
          <div className="absolute top-2 right-2">
            <Badge variant="info" size="sm" icon={Star}>
              Default
            </Badge>
          </div>
        )}

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(effect.id);
          }}
          className="absolute top-2 left-2 p-1 rounded-md bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
          aria-label={`Delete ${effect.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Name */}
        <p className="text-sm font-semibold text-gray-900 line-clamp-1">
          {effect.name}
        </p>

        {/* Badge row */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="default" size="sm">
            {SOUND_TYPE_LABELS[effect.soundType] ?? effect.soundType}
          </Badge>
          {effect.source === 'AI_GENERATED' ? (
            <Badge variant="info" size="sm">
              AI Generated
            </Badge>
          ) : (
            <Badge variant="teal" size="sm">
              Upload
            </Badge>
          )}
          {(() => {
            const dur = formatDuration(effect.duration);
            return dur ? (
              <Badge variant="default" size="sm">
                {dur}
              </Badge>
            ) : null;
          })()}
        </div>

        {/* File size */}
        <p className="text-xs text-gray-500">
          {formatFileSize(effect.fileSize)}
        </p>

        {/* Audio preview player */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div onClick={(e) => e.stopPropagation()}>
          <VoicePreviewPlayer audioUrl={effect.fileUrl} voiceName={effect.name} />
        </div>
      </div>
    </div>
  );
});
