'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { SimpleMarkdown } from './SimpleMarkdown';
import { extractCta } from './CtaButton';

/**
 * Email client mockup — styled like a real email template rendering.
 */
export function EmailPreview({ previewContent, isGenerating, heroImage, onAddImage, mediumConfig, brandName }: PlatformPreviewProps) {
  const subject = previewContent.subject?.content ?? previewContent.headline?.content ?? '';
  const preheader = previewContent.preheader?.content ?? '';
  const body = previewContent.body?.content ?? '';
  const cta = extractCta(previewContent) ?? '';
  const templateStyle = (mediumConfig?.templateStyle as string) ?? 'minimal';
  const ctaPlacement = (mediumConfig?.ctaPlacement as string) ?? 'bottom';
  const personalize = (mediumConfig?.personalize as boolean) ?? false;
  const isBranded = templateStyle === 'branded';
  const accentColor = isBranded ? '#0d9488' : '#1f2937';

  if (isGenerating) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="animate-pulse p-4 space-y-3">
          <div className="h-4 w-2/3 rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-32 rounded bg-gray-200" />
          <div className="h-8 w-28 rounded bg-gray-200 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 rounded-lg border border-gray-200 overflow-hidden">
      {/* Email client chrome */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 w-10">From:</span>
            <span className="text-gray-700 font-medium">{brandName ?? 'Brand Name'} &lt;hello@{(brandName ?? 'brand').toLowerCase().replace(/\s+/g, '')}.com&gt;</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 w-10">To:</span>
            <span className="text-gray-700">{personalize ? '{{firstName}} {{lastName}}' : 'subscriber@email.com'}</span>
          </div>
          {subject && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 w-10">Subject:</span>
              <span className="text-gray-900 font-semibold">{subject}</span>
            </div>
          )}
        </div>
      </div>

      {/* Email body — centered card on gray background */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Brand header bar */}
          <div className="h-1.5" style={{ backgroundColor: accentColor }} />

          {/* Hero image */}
          <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-[3/1]" rounded="rounded-none" />

          {/* Content */}
          <div className="px-6 py-5 space-y-4">
            {/* Greeting */}
            {personalize && (
              <p className="text-sm text-gray-700">Hi {'{{firstName}}'},</p>
            )}

            {/* Preheader / preview text */}
            {preheader && (
              <p className="text-xs text-gray-400 italic">{preheader}</p>
            )}

            {/* CTA top placement */}
            {ctaPlacement === 'top' && cta && (
              <div className="text-center py-2">
                <span className="inline-block px-6 py-2.5 text-sm font-semibold text-white rounded-md" style={{ backgroundColor: accentColor }}>
                  {cta}
                </span>
              </div>
            )}

            {/* Body */}
            {body && (
              <div className="text-sm text-gray-700 leading-relaxed">
                <SimpleMarkdown text={body} />
              </div>
            )}

            {/* CTA bottom placement */}
            {ctaPlacement !== 'top' && cta && (
              <div className="text-center py-2">
                <span className="inline-block px-6 py-2.5 text-sm font-semibold text-white rounded-md" style={{ backgroundColor: accentColor }}>
                  {cta}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-6 py-3 bg-gray-50">
            <p className="text-[10px] text-gray-400 text-center leading-relaxed">
              {brandName ?? 'Brand Name'} · 123 Street · City, Country<br />
              <span className="underline">Unsubscribe</span> · <span className="underline">View in browser</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
