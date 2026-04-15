'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { Play, Download, MoreHorizontal, Radio } from 'lucide-react';

/**
 * Podcast episode mockup — styled after Spotify's episode card design.
 */
export function PodcastPreview({ previewContent, isGenerating, brandName }: PlatformPreviewProps) {
  const title = previewContent.headline?.content ?? previewContent.hook?.content ?? '';
  const description = previewContent.body?.content ?? previewContent.caption?.content ?? '';
  const name = brandName ?? 'Brand Name';
  const duration = previewContent.body?.metadata?.duration ?? 23;

  if (isGenerating) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="animate-pulse p-4 space-y-3">
          <div className="flex gap-3">
            <div className="h-16 w-16 rounded-lg bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-200" />
              <div className="h-3 w-1/3 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-1.5 w-full rounded-full bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Episode header */}
      <div className="p-4">
        <div className="flex gap-3 mb-3">
          {/* Artwork */}
          <div className="h-16 w-16 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1DB954 0%, #191414 100%)' }}>
            <Radio className="h-7 w-7 text-white" />
          </div>
          {/* Episode meta */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
              {title || 'Episode Title'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Just now · {duration} min
            </p>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 mb-3">{description}</p>
        )}

        {/* Player bar */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#1DB954' }}
          >
            <Play className="h-4 w-4 text-white ml-0.5" fill="white" />
          </button>
          <div className="flex-1">
            <div className="h-1 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full rounded-full w-0" style={{ backgroundColor: '#1DB954' }} />
            </div>
          </div>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{duration} min</span>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Download className="h-4 w-4 text-gray-400" />
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        </div>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Podcast</span>
      </div>
    </div>
  );
}
