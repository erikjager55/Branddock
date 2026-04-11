'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { PreviewFrame } from './PreviewFrame';
import { HeroImageSlot } from './HeroImageSlot';

const EMAIL_COLOR = '#6B7280';

/** Email client mockup (newsletter / promotional) */
export function EmailPreview({ previewContent, isGenerating, heroImage, onAddImage }: PlatformPreviewProps) {
  const subject = previewContent.subject?.content ?? previewContent.headline?.content ?? '';
  const preheader = previewContent.preheader?.content ?? '';
  const body = previewContent.body?.content ?? '';
  const cta = previewContent.cta?.content ?? '';

  if (isGenerating) {
    return (
      <PreviewFrame platformLabel="Email" platformColor={EMAIL_COLOR}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-2/3 rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-32 rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-3 w-4/5 rounded bg-gray-200" />
          <div className="h-8 w-28 rounded bg-gray-200" />
        </div>
      </PreviewFrame>
    );
  }

  return (
    <PreviewFrame platformLabel="Email" platformColor={EMAIL_COLOR}>
      {/* Email header */}
      <div className="border-b border-gray-100 pb-2 mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <span className="font-medium text-gray-700">From:</span>
          <span>Brand Name &lt;hello@brand.com&gt;</span>
        </div>
        {subject && (
          <p className="text-sm font-semibold text-gray-900">{subject}</p>
        )}
        {preheader && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{preheader}</p>
        )}
      </div>

      {/* Hero image (header banner) */}
      <div className="mb-3">
        <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-[3/1]" />
      </div>

      {/* Body */}
      {body && (
        <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-8 mb-3">
          {body}
        </p>
      )}

      {/* CTA */}
      {cta && (
        <div className="text-center">
          <span className="inline-block px-5 py-2 text-xs font-semibold text-white bg-gray-800 rounded">
            {cta}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-2 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center">
          Unsubscribe · View in browser
        </p>
      </div>
    </PreviewFrame>
  );
}
