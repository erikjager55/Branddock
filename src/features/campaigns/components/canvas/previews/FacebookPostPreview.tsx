'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { SimpleMarkdown } from './SimpleMarkdown';
import { ThumbsUp, MessageCircle, Share2, Globe, MoreHorizontal } from 'lucide-react';
import { extractCta, CtaButton } from './CtaButton';

/**
 * Facebook post mockup — styled to match the real Facebook feed.
 */
export function FacebookPostPreview({ previewContent, isGenerating, heroImage, onAddImage, brandName }: PlatformPreviewProps) {
  const body = previewContent.body?.content ?? previewContent.caption?.content ?? '';
  const hashtags = previewContent.hashtags?.content ?? '';
  const cta = extractCta(previewContent);
  const name = brandName ?? 'Brand Name';
  const initial = name.charAt(0).toUpperCase();

  if (isGenerating) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-gray-200" />
              <div className="h-2.5 w-16 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-48 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Post header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e3f2fd' }}>
              <span className="text-sm font-bold" style={{ color: '#1877F2' }}>{initial}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{name}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                Just now · <Globe className="h-2.5 w-2.5" />
              </p>
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Post content */}
      {body && (
        <div className="px-4 pb-2">
          <div className="text-sm text-gray-900 leading-relaxed">
            <SimpleMarkdown text={body} />
          </div>
          {hashtags && (
            <p className="text-sm mt-1" style={{ color: '#1877F2' }}>{hashtags}</p>
          )}
        </div>
      )}

      {/* Image — 1.91:1 (1200×630) */}
      <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-[1.91/1]" rounded="rounded-none" />

      {/* CTA button */}
      {cta && (
        <div className="px-4 py-2 text-center">
          <CtaButton text={cta} variant="filled" />
        </div>
      )}

      {/* Reactions + counts */}
      <div className="px-4 py-1.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="flex -space-x-0.5">
              <span className="h-[18px] w-[18px] rounded-full bg-blue-500 flex items-center justify-center">
                <ThumbsUp className="h-2.5 w-2.5 text-white" />
              </span>
              <span className="h-[18px] w-[18px] rounded-full bg-red-500 flex items-center justify-center text-[8px] text-white">❤</span>
            </span>
            <span className="ml-1">12</span>
          </div>
          <span>3 comments · 1 share</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="border-t border-gray-200 px-2 py-1 flex items-center justify-around">
        {[
          { icon: ThumbsUp, label: 'Like' },
          { icon: MessageCircle, label: 'Comment' },
          { icon: Share2, label: 'Share' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 px-4 py-2 rounded hover:bg-gray-100 text-sm font-medium text-gray-600">
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
