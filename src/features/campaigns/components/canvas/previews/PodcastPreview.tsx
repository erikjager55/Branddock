'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { PreviewFrame } from './PreviewFrame';
import { Mic, Clock, Radio } from 'lucide-react';

/** Stub preview for podcast/audio content */
export function PodcastPreview({ previewContent, isGenerating }: PlatformPreviewProps) {
  const textEntries = Object.entries(previewContent).filter(
    ([, v]) => v.type === 'text' && v.content,
  );
  const audioEntries = Object.entries(previewContent).filter(
    ([, v]) => v.type === 'audio',
  );

  if (isGenerating) {
    return (
      <PreviewFrame platformLabel="Podcast" platformColor="#7c3aed">
        <div className="animate-pulse space-y-3">
          <div className="h-16 rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
        </div>
      </PreviewFrame>
    );
  }

  const hasContent = textEntries.length > 0 || audioEntries.length > 0;
  if (!hasContent) {
    return (
      <PreviewFrame platformLabel="Podcast" platformColor="#7c3aed">
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Mic className="h-10 w-10 mb-2" />
          <p className="text-sm">Podcast preview will appear here</p>
          <p className="text-xs mt-1">Generate content to see episode notes</p>
        </div>
      </PreviewFrame>
    );
  }

  return (
    <PreviewFrame platformLabel="Podcast" platformColor="#7c3aed">
      {/* Audio waveform placeholder */}
      <div className="bg-gray-100 rounded-lg p-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Radio className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1">
            {/* Waveform bars mockup */}
            <div className="flex items-end gap-0.5 h-8">
              {Array.from({ length: 40 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-violet-300 rounded-full"
                  style={{
                    height: `${20 + Math.sin(i * 0.5) * 40 + Math.sin(i * 1.3) * 20 + Math.cos(i * 0.7) * 10}%`,
                    minHeight: '4px',
                  }}
                />
              ))}
            </div>
          </div>
          {audioEntries.length > 0 && audioEntries[0][1].metadata?.duration && (
            <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
              <Clock className="h-3 w-3" />
              {Math.floor(audioEntries[0][1].metadata.duration / 60)}:{String(audioEntries[0][1].metadata.duration % 60).padStart(2, '0')}
            </div>
          )}
        </div>
      </div>

      {/* Show notes / script */}
      {textEntries.map(([group, value]) => (
        <div key={group} className="mb-2">
          <p className="text-xs font-medium text-gray-400 uppercase mb-1">
            {group.replace(/_/g, ' ')}
          </p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-6">
            {value.content}
          </p>
        </div>
      ))}
    </PreviewFrame>
  );
}
