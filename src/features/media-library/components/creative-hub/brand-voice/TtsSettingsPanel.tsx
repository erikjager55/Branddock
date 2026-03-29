'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Settings2, Search, Play, Pause, AlertCircle } from 'lucide-react';
import { Input, Select } from '@/components/shared';
import { useElevenLabsVoices } from '@/features/media-library/hooks';
import type { UpdateBrandVoiceBody, ElevenLabsVoice } from '@/features/media-library/types/media.types';

// ─── Types ──────────────────────────────────────────────────

interface TtsSettingsPanelProps {
  ttsProvider: string | null;
  ttsVoiceId: string | null;
  ttsSettings: Record<string, unknown> | null;
  onChange: (updates: Partial<UpdateBrandVoiceBody>) => void;
}

// ─── Constants ──────────────────────────────────────────────

const PROVIDER_OPTIONS = [
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google Cloud TTS' },
];

// ─── Voice Option Component ─────────────────────────────────

function VoiceOption({
  voice,
  isSelected,
  onSelect,
}: {
  voice: ElevenLabsVoice;
  isSelected: boolean;
  onSelect: (voiceId: string) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handlePreview = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!voice.previewUrl) return;

      if (isPlaying && audio) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
        return;
      }

      const newAudio = new Audio(voice.previewUrl);
      newAudio.addEventListener('ended', () => setIsPlaying(false));
      newAudio.addEventListener('error', () => setIsPlaying(false));
      newAudio.play().catch(() => setIsPlaying(false));
      setAudio(newAudio);
      setIsPlaying(true);
    },
    [voice.previewUrl, isPlaying, audio],
  );

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audio]);

  const labelEntries = Object.entries(voice.labels).filter(([, v]) => v);

  return (
    <button
      type="button"
      onClick={() => onSelect(voice.voiceId)}
      className={`
        w-full text-left px-3 py-2.5 rounded-lg border transition-colors
        ${isSelected
          ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900">{voice.name}</span>
          {labelEntries.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {labelEntries.map(([key, value]) => (
                <span
                  key={key}
                  className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                >
                  {value}
                </span>
              ))}
            </div>
          )}
        </div>
        {voice.previewUrl && (
          <button
            type="button"
            onClick={handlePreview}
            className="ml-2 flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            aria-label={isPlaying ? 'Stop preview' : 'Preview voice'}
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 text-gray-700" />
            ) : (
              <Play className="w-3 h-3 text-gray-700 ml-0.5" />
            )}
          </button>
        )}
      </div>
    </button>
  );
}

// ─── Component ──────────────────────────────────────────────

/** Configuration panel for TTS provider settings. */
export const TtsSettingsPanel = React.memo(function TtsSettingsPanel({
  ttsProvider,
  ttsVoiceId,
  ttsSettings,
  onChange,
}: TtsSettingsPanelProps) {
  const [settingsJson, setSettingsJson] = useState<string>(
    ttsSettings ? JSON.stringify(ttsSettings, null, 2) : '{}',
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [voiceSearch, setVoiceSearch] = useState('');

  const { data: voicesData, isLoading: voicesLoading } = useElevenLabsVoices();

  const isElevenLabs = ttsProvider === 'elevenlabs';
  const voices = voicesData?.voices ?? [];
  const voicesError = voicesData?.error;

  const filteredVoices = useMemo(() => {
    if (!voiceSearch.trim()) return voices;
    const term = voiceSearch.toLowerCase();
    return voices.filter(
      (v) =>
        v.name.toLowerCase().includes(term) ||
        Object.values(v.labels).some((label) => label.toLowerCase().includes(term)),
    );
  }, [voices, voiceSearch]);

  // Sync external ttsSettings changes to local state
  useEffect(() => {
    setSettingsJson(ttsSettings ? JSON.stringify(ttsSettings, null, 2) : '{}');
    setJsonError(null);
  }, [ttsSettings]);

  const handleSettingsJsonChange = useCallback(
    (value: string) => {
      setSettingsJson(value);
      try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        setJsonError(null);
        onChange({ ttsSettings: parsed });
      } catch {
        setJsonError('Invalid JSON format');
      }
    },
    [onChange],
  );

  const handleSelectVoice = useCallback(
    (voiceId: string) => {
      onChange({ ttsVoiceId: voiceId, ttsProvider: 'elevenlabs' });
    },
    [onChange],
  );

  return (
    <div
      className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4"
      data-testid="tts-settings-panel"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings2 className="w-4 h-4 text-gray-500" />
        <h4 className="text-sm font-medium text-gray-900">TTS Configuration</h4>
      </div>

      {/* Provider selector */}
      <Select
        label="Provider"
        value={ttsProvider}
        onChange={(value) => onChange({ ttsProvider: value ?? undefined })}
        options={PROVIDER_OPTIONS}
        placeholder="Select TTS provider..."
      />

      {/* ElevenLabs voice selector */}
      {isElevenLabs && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Voice</label>

          {voicesError && voices.length === 0 && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-100 px-3 py-2 mb-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{voicesError}</p>
            </div>
          )}

          {voicesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : voices.length > 0 ? (
            <>
              {/* Search */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={voiceSearch}
                  onChange={(e) => setVoiceSearch(e.target.value)}
                  placeholder="Search voices..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Voice list */}
              <div className="max-h-[240px] overflow-y-auto space-y-1.5">
                {filteredVoices.length > 0 ? (
                  filteredVoices.map((voice) => (
                    <VoiceOption
                      key={voice.voiceId}
                      voice={voice}
                      isSelected={ttsVoiceId === voice.voiceId}
                      onSelect={handleSelectVoice}
                    />
                  ))
                ) : (
                  <p className="text-xs text-gray-500 py-3 text-center">
                    No voices match &quot;{voiceSearch}&quot;
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Fallback to manual input when no voices available */
            <Input
              value={ttsVoiceId ?? ''}
              onChange={(e) => onChange({ ttsVoiceId: e.target.value || undefined })}
              placeholder="e.g., EXAVITQu4vr4xnSDxMaL"
              helperText="Enter your ElevenLabs voice ID manually"
            />
          )}
        </div>
      )}

      {/* Manual Voice ID for non-ElevenLabs providers */}
      {!isElevenLabs && ttsProvider && (
        <Input
          label="Voice ID"
          value={ttsVoiceId ?? ''}
          onChange={(e) => onChange({ ttsVoiceId: e.target.value || undefined })}
          placeholder="e.g., alloy"
          helperText="The voice identifier from your chosen provider"
        />
      )}

      {/* Settings JSON editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Advanced Settings
        </label>
        <textarea
          value={settingsJson}
          onChange={(e) => handleSettingsJsonChange(e.target.value)}
          className={`
            w-full border rounded-lg px-3 py-2 text-sm font-mono text-gray-900
            placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent
            transition-shadow min-h-[100px] resize-y
            ${jsonError ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-primary'}
          `}
          placeholder='{"stability": 0.5, "similarity_boost": 0.75}'
          spellCheck={false}
        />
        {jsonError && (
          <p className="mt-1.5 text-xs text-red-500">{jsonError}</p>
        )}
        {!jsonError && (
          <p className="mt-1.5 text-xs text-gray-500">
            Provider-specific settings in JSON format
          </p>
        )}
      </div>
    </div>
  );
});
