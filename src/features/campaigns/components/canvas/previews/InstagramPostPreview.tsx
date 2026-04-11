'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { PreviewFrame } from './PreviewFrame';
import { HeroImageSlot } from './HeroImageSlot';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';

const INSTAGRAM_GRADIENT = '#E1306C';

/** Instagram feed post mockup */
export function InstagramPostPreview({ previewContent, isGenerating, heroImage, onAddImage }: PlatformPreviewProps) {
  const caption = previewContent.caption?.content ?? previewContent.body?.content ?? '';

  if (isGenerating) {
    return (
      <PreviewFrame platformLabel="Instagram Post" platformColor={INSTAGRAM_GRADIENT}>
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-200" />
            <div className="h-3 w-20 rounded bg-gray-200" />
          </div>
          <div className="aspect-square rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-200" />
        </div>
      </PreviewFrame>
    );
  }

  return (
    <PreviewFrame platformLabel="Instagram Post" platformColor={INSTAGRAM_GRADIENT}>
      {/* Profile header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center">
          <span className="text-xs font-bold text-pink-600">B</span>
        </div>
        <p className="text-xs font-semibold text-gray-900">brandname</p>
      </div>

      {/* Hero image slot — square for Instagram feed */}
      <div className="mb-3">
        <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-square" />
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Heart className="h-4 w-4 text-gray-700" />
          <MessageCircle className="h-4 w-4 text-gray-700" />
          <Send className="h-4 w-4 text-gray-700" />
        </div>
        <Bookmark className="h-4 w-4 text-gray-700" />
      </div>

      {/* Caption */}
      {caption && (
        <p className="text-xs text-gray-800">
          <span className="font-semibold">brandname </span>
          <span className="line-clamp-3">{caption}</span>
        </p>
      )}
    </PreviewFrame>
  );
}
