'use client';

import React from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { MUSIC_TRACKS, AI_VOICES } from '../../../constants/medium-config-data';
import { ConfigSection } from './ConfigSection';

const VOICE_TYPES = [
  { value: 'ai', label: 'AI Voice', description: 'Synthesized voiceover' },
  { value: 'human', label: 'Human', description: 'Professional voice actor' },
  { value: 'none', label: 'No Voice', description: 'Music and text only' },
];

/** Audio settings: music track, volume, voice type, AI voice selection */
export function AudioSettings() {
  const configValues = useCanvasStore((s) => s.mediumConfigValues);
  const setConfigValue = useCanvasStore((s) => s.setMediumConfigValue);

  const musicTrack = (configValues.musicTrack as string) ?? 'track-2';
  const musicVolume = (configValues.musicVolume as number) ?? 40;
  const voiceType = (configValues.voiceType as string) ?? 'ai';
  const aiVoiceId = (configValues.aiVoiceId as string) ?? '';

  return (
    <ConfigSection title="Audio Settings">
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
      >
        {/* Left column: Music */}
        <div className="space-y-4">
          <div>
            <label htmlFor="audio-music-track" className="text-sm font-medium text-gray-700">Music Track</label>
            <select
              id="audio-music-track"
              value={musicTrack}
              onChange={(e) => setConfigValue('musicTrack', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {MUSIC_TRACKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="audio-volume" className="text-sm font-medium text-gray-700">Volume</label>
              <span className="text-sm font-medium text-primary">{musicVolume}%</span>
            </div>
            <input
              id="audio-volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={musicVolume}
              onChange={(e) => setConfigValue('musicVolume', Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        {/* Right column: Voice */}
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-gray-700">Voice Type</legend>
            <div className="space-y-2 mt-1.5">
              {VOICE_TYPES.map((vt) => (
                <label
                  key={vt.value}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="voiceType"
                    value={vt.value}
                    checked={voiceType === vt.value}
                    onChange={() => setConfigValue('voiceType', vt.value)}
                    className="mt-0.5 h-4 w-4 text-primary accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      {vt.label}
                    </span>
                    <p className="text-xs text-gray-400">{vt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* AI Voice selector — conditional on voiceType === 'ai' */}
          {voiceType === 'ai' && (
            <div>
              <label htmlFor="audio-ai-voice" className="text-sm font-medium text-gray-700">AI Voice</label>
              <select
                id="audio-ai-voice"
                value={aiVoiceId}
                onChange={(e) => setConfigValue('aiVoiceId', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Select a voice...</option>
                {AI_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.gender}, {v.tone} ({v.accent})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </ConfigSection>
  );
}
