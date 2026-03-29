'use client';

import React from 'react';
import { Mic, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/shared';
import type { BrandVoiceWithMeta } from '@/features/media-library/types/media.types';
import { VoicePreviewPlayer } from './VoicePreviewPlayer';

// ─── Types ──────────────────────────────────────────────────

interface BrandVoiceCardProps {
  voice: BrandVoiceWithMeta;
  onClick: () => void;
  onDelete: (id: string) => void;
}

// ─── Component ──────────────────────────────────────────────

/** Card component for individual brand voice entries in grid view. */
export const BrandVoiceCard = React.memo(function BrandVoiceCard({
  voice,
  onClick,
  onDelete,
}: BrandVoiceCardProps) {
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
      data-testid={`brand-voice-card-${voice.id}`}
    >
      {/* Header area with mic icon / waveform visual */}
      <div className="relative h-24 bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center">
        <div className="flex items-center gap-1.5">
          {/* Simple waveform bars visual */}
          <div className="flex items-end gap-0.5 h-8">
            {[3, 5, 8, 6, 9, 4, 7, 5, 3].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-teal-400/60 group-hover:bg-teal-500/70 transition-colors"
                style={{ height: `${h * 3}px` }}
              />
            ))}
          </div>
          <Mic className="w-6 h-6 text-teal-600 ml-2" />
        </div>

        {/* Default badge */}
        {voice.isDefault && (
          <div className="absolute top-2 right-2">
            <Badge variant="teal" size="sm" icon={Star}>
              Default
            </Badge>
          </div>
        )}

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(voice.id);
          }}
          className="absolute top-2 left-2 p-1 rounded-md bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white opacity-0 group-hover:opacity-100 transition-all"
          aria-label={`Delete ${voice.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Name */}
        <p className="text-sm font-semibold text-gray-900 line-clamp-1">
          {voice.name}
        </p>

        {/* Badge row: voiceGender, voiceAge, voiceTone */}
        <div className="flex flex-wrap gap-1">
          {voice.voiceGender && (
            <Badge variant="default" size="sm">
              {voice.voiceGender}
            </Badge>
          )}
          {voice.voiceAge && (
            <Badge variant="info" size="sm">
              {voice.voiceAge}
            </Badge>
          )}
          {voice.voiceTone && (
            <Badge variant="teal" size="sm">
              {voice.voiceTone}
            </Badge>
          )}
        </div>

        {/* Secondary text: accent + pace */}
        {(voice.voiceAccent || voice.speakingPace) && (
          <p className="text-xs text-gray-500 line-clamp-1">
            {[voice.voiceAccent, voice.speakingPace ? `${voice.speakingPace} pace` : null]
              .filter(Boolean)
              .join(' \u00B7 ')}
          </p>
        )}

        {/* Audio preview player */}
        <VoicePreviewPlayer audioUrl={voice.sampleAudioUrl} voiceName={voice.name} />
      </div>
    </div>
  );
});
