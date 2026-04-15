'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { MessageCircle, Repeat2, Heart, BarChart3, Share, MoreHorizontal, BadgeCheck } from 'lucide-react';
import { extractCta, CtaButton } from './CtaButton';

/**
 * X (Twitter) post mockup — styled to match the real X feed.
 */
export function XPostPreview({ previewContent, isGenerating, heroImage, onAddImage, brandName }: PlatformPreviewProps) {
  const body = previewContent.body?.content ?? previewContent.caption?.content ?? '';
  const cta = extractCta(previewContent);
  const name = brandName ?? 'Brand Name';
  const handle = '@' + name.toLowerCase().replace(/\s+/g, '');

  if (isGenerating) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <div className="space-y-1">
              <div className="h-3.5 w-24 rounded bg-gray-200" />
              <div className="h-2.5 w-16 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-3 w-4/5 rounded bg-gray-200" />
          <div className="h-44 rounded-2xl bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4">
        {/* Header — avatar + name + handle + time */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-2.5">
            <div className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">{name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-bold text-gray-900">{name}</p>
                <BadgeCheck className="h-4 w-4" style={{ color: '#1D9BF0' }} />
              </div>
              <p className="text-sm text-gray-500">{handle}</p>
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-gray-400" />
        </div>

        {/* Post text */}
        {body && (
          <p className="text-[15px] text-gray-900 leading-relaxed whitespace-pre-wrap mb-3">{body}</p>
        )}

        {/* CTA link */}
        {cta && (
          <div className="mb-3">
            <CtaButton text={cta} variant="link" />
          </div>
        )}

        {/* Image — 16:9 rounded */}
        <div className="rounded-2xl overflow-hidden border border-gray-200">
          <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-[16/9]" rounded="rounded-none" />
        </div>

        {/* Timestamp */}
        <p className="text-xs text-gray-500 mt-3">Just now</p>

        {/* Engagement counts */}
        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
          <span><strong className="text-gray-900">5</strong> Reposts</span>
          <span><strong className="text-gray-900">2</strong> Quotes</span>
          <span><strong className="text-gray-900">24</strong> Likes</span>
          <span><strong className="text-gray-900">1.2K</strong> Views</span>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-around mt-2 pt-2 border-t border-gray-100">
          {[
            { icon: MessageCircle, label: '3' },
            { icon: Repeat2, label: '5' },
            { icon: Heart, label: '24' },
            { icon: BarChart3, label: '1.2K' },
            { icon: Share, label: '' },
          ].map(({ icon: Icon, label }, idx) => (
            <div key={idx} className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
              <Icon className="h-4 w-4" />
              {label && <span className="text-xs">{label}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
