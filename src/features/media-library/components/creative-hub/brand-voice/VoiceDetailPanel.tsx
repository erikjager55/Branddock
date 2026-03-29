'use client';

import { useCallback, useState } from 'react';
import { X, Mic, Star, Wand2, AlertCircle } from 'lucide-react';
import { Badge, Button, Skeleton } from '@/components/shared';
import { useBrandVoiceDetail, useUpdateBrandVoice, useGenerateSample } from '@/features/media-library/hooks';
import type { UpdateBrandVoiceBody } from '@/features/media-library/types/media.types';
import { VoicePreviewPlayer } from './VoicePreviewPlayer';
import { TtsSettingsPanel } from './TtsSettingsPanel';

// ─── Types ──────────────────────────────────────────────────

interface VoiceDetailPanelProps {
  voiceId: string;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────

/** Inline detail panel shown when a brand voice is selected. */
export function VoiceDetailPanel({ voiceId, onClose }: VoiceDetailPanelProps) {
  const { data: voice, isLoading } = useBrandVoiceDetail(voiceId);
  const updateVoice = useUpdateBrandVoice(voiceId);
  const generateSample = useGenerateSample(voiceId);
  const [sampleText, setSampleText] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleTtsChange = useCallback(
    (updates: Partial<UpdateBrandVoiceBody>) => {
      updateVoice.mutate(updates);
    },
    [updateVoice],
  );

  const handleGenerateSample = useCallback(() => {
    if (!sampleText.trim()) return;
    setGenerateError(null);
    generateSample.mutate(sampleText.trim(), {
      onSuccess: () => setSampleText(''),
      onError: (err) => setGenerateError(err instanceof Error ? err.message : 'Failed to generate sample'),
    });
  }, [sampleText, generateSample]);

  if (isLoading) {
    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <Skeleton height={20} width="40%" />
        <Skeleton height={14} width="60%" />
        <Skeleton height={80} />
        <Skeleton height={120} />
      </div>
    );
  }

  if (!voice) return null;

  const typedVoice = voice as import('@/features/media-library/types/media.types').BrandVoiceWithMeta;

  return (
    <div
      className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden"
      data-testid="voice-detail-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center">
            <Mic className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{typedVoice.name}</h3>
              {typedVoice.isDefault && (
                <Badge variant="teal" size="sm" icon={Star}>
                  Default
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Created {new Date(typedVoice.createdAt).toLocaleDateString('en-US', {
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
        {/* Characteristics summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {typedVoice.voiceGender && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Gender</span>
              <span className="text-sm text-gray-900">{typedVoice.voiceGender}</span>
            </div>
          )}
          {typedVoice.voiceAge && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Age</span>
              <span className="text-sm text-gray-900">{typedVoice.voiceAge}</span>
            </div>
          )}
          {typedVoice.voiceTone && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Tone</span>
              <span className="text-sm text-gray-900">{typedVoice.voiceTone}</span>
            </div>
          )}
          {typedVoice.voiceAccent && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Accent</span>
              <span className="text-sm text-gray-900">{typedVoice.voiceAccent}</span>
            </div>
          )}
          {typedVoice.speakingPace && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Pace</span>
              <span className="text-sm text-gray-900">{typedVoice.speakingPace}</span>
            </div>
          )}
        </div>

        {/* Voice prompt */}
        {typedVoice.voicePrompt && (
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Voice Prompt</span>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
              {typedVoice.voicePrompt}
            </p>
          </div>
        )}

        {/* Audio preview */}
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Sample Audio
          </span>
          <VoicePreviewPlayer
            audioUrl={typedVoice.sampleAudioUrl}
            voiceName={typedVoice.name}
          />
        </div>

        {/* Generate Sample */}
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Generate Sample
          </span>
          <textarea
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            placeholder="Enter text to generate audio sample..."
            maxLength={500}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{sampleText.length}/500</span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateSample}
              disabled={!typedVoice.ttsVoiceId || !sampleText.trim() || generateSample.isPending}
              isLoading={generateSample.isPending}
            >
              <Wand2 className="w-3.5 h-3.5 mr-1.5" />
              Generate Sample
            </Button>
          </div>
          {!typedVoice.ttsVoiceId && (
            <p className="mt-1.5 text-xs text-gray-500">
              Select a TTS voice below to enable sample generation.
            </p>
          )}
          {generateError && (
            <div className="flex items-start gap-2 mt-2 rounded-md bg-red-50 border border-red-100 px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-red-700">{generateError}</p>
                <button
                  type="button"
                  onClick={handleGenerateSample}
                  className="text-xs text-red-600 underline mt-1"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TTS Settings */}
        <TtsSettingsPanel
          ttsProvider={typedVoice.ttsProvider}
          ttsVoiceId={typedVoice.ttsVoiceId}
          ttsSettings={typedVoice.ttsSettings}
          onChange={handleTtsChange}
        />
      </div>
    </div>
  );
}
