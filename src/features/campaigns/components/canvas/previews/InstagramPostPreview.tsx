'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { extractCta, CtaButton } from './CtaButton';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';

/**
 * Instagram feed post mockup — styled to match the real Instagram app.
 */
export function InstagramPostPreview({ previewContent, isGenerating, heroImage, onAddImage, brandName }: PlatformPreviewProps) {
  const caption = previewContent.caption?.content ?? previewContent.body?.content ?? '';
  const hashtags = previewContent.hashtags?.content ?? '';
  const cta = extractCta(previewContent);
  const brandHandle = (brandName ?? 'brandname').toLowerCase().replace(/\s+/g, '');

  if (isGenerating) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="animate-pulse space-y-3 p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-200" />
            <div className="h-3 w-20 rounded bg-gray-200" />
          </div>
          <div className="aspect-square rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Profile header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full p-[2px]" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
            <div className="h-full w-full rounded-full bg-white p-[1px]">
              <div className="h-full w-full rounded-full bg-pink-100 flex items-center justify-center">
                <span className="text-[10px] font-bold text-pink-600">{brandHandle.charAt(0).toUpperCase()}</span>
              </div>
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-900">{brandHandle}</p>
        </div>
        <MoreHorizontal className="h-4 w-4 text-gray-900" />
      </div>

      {/* Image (square) */}
      <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-square" rounded="rounded-none" />

      {/* Action bar */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Heart className="h-5 w-5 text-gray-900" />
            <MessageCircle className="h-5 w-5 text-gray-900" />
            <Send className="h-5 w-5 text-gray-900" />
          </div>
          <Bookmark className="h-5 w-5 text-gray-900" />
        </div>
      </div>

      {/* Likes */}
      <div className="px-3 pb-1">
        <p className="text-xs font-semibold text-gray-900">142 likes</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-2.5">
        {caption && (
          <p className="text-xs text-gray-900 leading-relaxed">
            <span className="font-semibold">{brandHandle} </span>
            <span>{caption}</span>
          </p>
        )}
        {hashtags && (
          <p className="text-xs mt-1" style={{ color: '#00376b' }}>{hashtags}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">View all 8 comments</p>
        <p className="text-[10px] text-gray-400 mt-1 uppercase">2 hours ago</p>
      </div>

      {/* CTA — link in bio style */}
      {cta && (
        <div className="px-3 pb-2.5">
          <div className="text-center py-2 mt-1 rounded-lg bg-gray-50">
            <CtaButton text={cta} variant="pill" />
          </div>
        </div>
      )}

      {/* Add a comment */}
      <div className="px-3 py-2.5 border-t border-gray-100">
        <p className="text-xs text-gray-400">Add a comment...</p>
      </div>
    </div>
  );
}
