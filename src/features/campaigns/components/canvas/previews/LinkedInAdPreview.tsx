'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { PreviewFrame } from './PreviewFrame';

const LINKEDIN_BLUE = '#0A66C2';

/** LinkedIn sponsored ad mockup */
export function LinkedInAdPreview({ previewContent, imageVariants, isGenerating }: PlatformPreviewProps) {
  const headline = previewContent.headline?.content ?? '';
  const description = previewContent.description?.content ?? previewContent.body?.content ?? '';
  const cta = previewContent.cta?.content ?? 'Learn More';
  const selectedImage = imageVariants.find((img) => img.isSelected);

  if (isGenerating) {
    return (
      <PreviewFrame platformLabel="LinkedIn Ad" platformColor={LINKEDIN_BLUE}>
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-16 rounded bg-gray-200" />
          <div className="h-40 rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-8 w-24 rounded bg-gray-200" />
        </div>
      </PreviewFrame>
    );
  }

  return (
    <PreviewFrame platformLabel="LinkedIn Ad" platformColor={LINKEDIN_BLUE}>
      {/* Sponsored label */}
      <p className="text-xs text-gray-400 mb-2">Sponsored</p>

      {/* Ad image */}
      {selectedImage && (
        <img
          src={selectedImage.url}
          alt={selectedImage.prompt}
          className="w-full rounded object-cover max-h-40 mb-3"
        />
      )}

      {/* Headline */}
      {headline && (
        <p className="text-sm font-semibold text-gray-900 mb-1">{headline}</p>
      )}

      {/* Description */}
      {description && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-3">{description}</p>
      )}

      {/* CTA button */}
      <button
        type="button"
        className="px-4 py-1.5 text-xs font-semibold rounded-full border border-blue-600 text-blue-600"
      >
        {cta}
      </button>
    </PreviewFrame>
  );
}
