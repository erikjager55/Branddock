'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { SimpleMarkdown } from './SimpleMarkdown';
import { extractCta } from './CtaButton';
import { ThumbsUp, MessageCircle, Repeat2, Send, Globe, MoreHorizontal } from 'lucide-react';

/**
 * LinkedIn organic post mockup — styled to match the real LinkedIn feed.
 * Uses LinkedIn's actual font sizes, spacing, and color palette.
 */
export function LinkedInPostPreview({ previewContent, isGenerating, heroImage, onAddImage, mediumConfig, brandName }: PlatformPreviewProps) {
  const body = previewContent.body?.content ?? previewContent.caption?.content ?? '';
  const headline = previewContent.headline?.content ?? '';
  const hashtags = previewContent.hashtags?.content ?? '';
  const ctaStyle = (mediumConfig?.ctaStyle as string) ?? '';
  const hashtagStrategy = (mediumConfig?.hashtagStrategy as string) ?? 'moderate';

  if (isGenerating) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gray-200" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-gray-200" />
              <div className="h-2.5 w-20 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-3 w-4/5 rounded bg-gray-200" />
          <div className="h-48 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Post header — LinkedIn style */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-sm flex items-center justify-center" style={{ backgroundColor: '#dbeafe' }}>
              <span className="text-sm font-bold" style={{ color: '#1d4ed8' }}>{(brandName ?? 'B').charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{brandName ?? 'Brand Name'}</p>
              <p className="text-xs text-gray-500 leading-tight">1,234 followers</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                Just now · <Globe className="h-2.5 w-2.5" />
              </p>
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Post content */}
      <div className="px-4 pb-2">
        {headline && (
          <p className="text-sm font-semibold text-gray-900 mb-1.5">{headline}</p>
        )}
        {body && (
          <div className="text-sm text-gray-800 leading-relaxed">
            <SimpleMarkdown text={body} />
          </div>
        )}
        {hashtagStrategy !== 'none' && hashtags && (
          <p className="text-sm mt-2" style={{ color: '#0A66C2' }}>{hashtags}</p>
        )}
      </div>

      {/* Image */}
      <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-[1.91/1]" rounded="rounded-none" />

      {/* CTA button — uses generated CTA text or medium config fallback */}
      {(() => {
        const ctaText = extractCta(previewContent) ?? (ctaStyle && ctaStyle !== 'none' ? (ctaStyle === 'sign-up' ? 'Sign Up' : 'Learn More') : null);
        if (!ctaText) return null;
        return (
          <div className="px-4 py-2 border-t border-gray-100">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{ctaText}</p>
                <p className="text-xs text-gray-500">{(brandName ?? 'brand').toLowerCase().replace(/\s+/g, '')}.com</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold border" style={{ color: '#0A66C2', borderColor: '#0A66C2' }}>
                {ctaText}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Engagement counts */}
      <div className="px-4 py-1.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="flex -space-x-1">
              <span className="h-4 w-4 rounded-full bg-blue-500 border border-white flex items-center justify-center">
                <ThumbsUp className="h-2 w-2 text-white" />
              </span>
              <span className="h-4 w-4 rounded-full bg-red-400 border border-white flex items-center justify-center text-[8px] text-white">❤</span>
            </span>
            <span>24</span>
          </div>
          <span>3 comments · 1 repost</span>
        </div>
      </div>

      {/* Action bar — LinkedIn's four buttons */}
      <div className="border-t border-gray-200 px-2 py-1 flex items-center justify-around">
        {[
          { icon: ThumbsUp, label: 'Like' },
          { icon: MessageCircle, label: 'Comment' },
          { icon: Repeat2, label: 'Repost' },
          { icon: Send, label: 'Send' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 px-3 py-2 rounded hover:bg-gray-100 text-xs font-medium text-gray-600">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
