'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { PreviewFrame } from './PreviewFrame';
import { Play, Clock } from 'lucide-react';

/** Stub preview for video content (TikTok, YouTube Shorts, etc.) */
export function VideoPreview({ previewContent, isGenerating }: PlatformPreviewProps) {
  const textEntries = Object.entries(previewContent).filter(
    ([, v]) => v.type === 'text' && v.content,
  );
  const videoEntries = Object.entries(previewContent).filter(
    ([, v]) => v.type === 'video',
  );

  if (isGenerating) {
    return (
      <PreviewFrame platformLabel="Video" platformColor="#1a1a2e">
        <div className="animate-pulse space-y-3">
          <div className="aspect-[9/16] rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
        </div>
      </PreviewFrame>
    );
  }

  const hasContent = textEntries.length > 0 || videoEntries.length > 0;
  if (!hasContent) {
    return (
      <PreviewFrame platformLabel="Video" platformColor="#1a1a2e">
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Play className="h-10 w-10 mb-2" />
          <p className="text-sm">Video preview will appear here</p>
          <p className="text-xs mt-1">Generate content to see a script preview</p>
        </div>
      </PreviewFrame>
    );
  }

  return (
    <PreviewFrame platformLabel="Video" platformColor="#1a1a2e">
      {/* Video thumbnail placeholder */}
      <div className="relative aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden mb-3">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
            <Play className="h-7 w-7 text-white ml-0.5" />
          </div>
        </div>
        {videoEntries.length > 0 && videoEntries[0][1].metadata?.duration && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
            <Clock className="h-3 w-3" />
            {videoEntries[0][1].metadata.duration}s
          </div>
        )}
      </div>

      {/* Script / caption */}
      {textEntries.map(([group, value]) => (
        <div key={group} className="mb-2">
          <p className="text-xs font-medium text-gray-400 uppercase mb-1">
            {group.replace(/_/g, ' ')}
          </p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-4">
            {value.content}
          </p>
        </div>
      ))}
    </PreviewFrame>
  );
}
