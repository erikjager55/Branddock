'use client';

import React, { useEffect } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { MediumConfigLayout } from './MediumConfigLayout';
import { VideoSpecifications } from './VideoSpecifications';
import { VisualStyle } from './VisualStyle';
import { SceneStructure } from './SceneStructure';
import { AudioSettings } from './AudioSettings';

interface VideoConfigPanelProps {
  onAdvance: () => void;
  deliverableId?: string;
}

/** Custom config panel for video medium (4 sections) */
export function VideoConfigPanel({ onAdvance, deliverableId }: VideoConfigPanelProps) {
  // Initialize video defaults on mount, removing stale keys from previous categories
  useEffect(() => {
    const current = useCanvasStore.getState().mediumConfigValues;
    const defaults: Record<string, unknown> = {
      duration: '30s',
      aspectRatio: '9:16',
      quality: '1080p',
      footageType: 'mixed',
      modelId: '',
      textOverlay: 'bold-headlines',
      colorGrade: 'natural',
      voiceType: 'ai',
      aiVoiceId: '',
      musicTrack: 'track-2',
      musicVolume: 40,
      timelineSplit1: 3,
      timelineSplit2: 18,
    };

    const validKeys = new Set(Object.keys(defaults));
    const cleaned: Record<string, unknown> = { ...defaults };
    let needsUpdate = false;
    for (const [key, value] of Object.entries(current)) {
      if (validKeys.has(key)) {
        cleaned[key] = value;
      }
    }
    // Check if the cleaned config differs from current
    for (const key of validKeys) {
      if (current[key] !== cleaned[key]) {
        needsUpdate = true;
        break;
      }
    }
    // Also check for stale keys not in validKeys
    if (!needsUpdate) {
      for (const key of Object.keys(current)) {
        if (!validKeys.has(key)) {
          needsUpdate = true;
          break;
        }
      }
    }
    if (needsUpdate) {
      useCanvasStore.getState().setMediumConfigValues(cleaned);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally run only on mount

  return (
    <MediumConfigLayout onAdvance={onAdvance} deliverableId={deliverableId}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Video Configuration</h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure specifications, visual style, scene structure and audio for your video.
        </p>
      </div>

      <VideoSpecifications />
      <VisualStyle />
      <SceneStructure />
      <AudioSettings />
    </MediumConfigLayout>
  );
}
