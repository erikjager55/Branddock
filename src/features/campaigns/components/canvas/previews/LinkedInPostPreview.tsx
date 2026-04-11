'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { PreviewFrame } from './PreviewFrame';
import { HeroImageSlot } from './HeroImageSlot';
import { ThumbsUp, MessageCircle, Repeat2, Send, Globe } from 'lucide-react';

const LINKEDIN_BLUE = '#0A66C2';

/** LinkedIn organic post mockup */
export function LinkedInPostPreview({ previewContent, isGenerating, heroImage, onAddImage }: PlatformPreviewProps) {
  const body = previewContent.body?.content ?? previewContent.caption?.content ?? '';
  const headline = previewContent.headline?.content ?? '';

  if (isGenerating) {
    return (
      <PreviewFrame platformLabel="LinkedIn Post" platformColor={LINKEDIN_BLUE}>
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <div className="space-y-1.5">
              <div className="h-3 w-24 rounded bg-gray-200" />
              <div className="h-2 w-16 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-3 w-4/5 rounded bg-gray-200" />
          <div className="h-40 rounded bg-gray-200" />
        </div>
      </PreviewFrame>
    );
  }

  return (
    <PreviewFrame platformLabel="LinkedIn Post" platformColor={LINKEDIN_BLUE}>
      {/* Author header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-sm font-semibold text-blue-700">B</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Brand Name</p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            Just now · <Globe className="h-3 w-3" />
          </p>
        </div>
      </div>

      {/* Headline */}
      {headline && (
        <p className="text-sm font-semibold text-gray-900 mb-1">{headline}</p>
      )}

      {/* Body text */}
      {body && (
        <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-6 mb-3">
          {body}
        </p>
      )}

      {/* Hero image slot */}
      <div className="mt-1 mb-1">
        <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-[1.91/1]" />
      </div>

      {/* Engagement bar */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
        <button type="button" className="flex items-center gap-1 text-xs text-gray-500">
          <ThumbsUp className="h-3.5 w-3.5" /> Like
        </button>
        <button type="button" className="flex items-center gap-1 text-xs text-gray-500">
          <MessageCircle className="h-3.5 w-3.5" /> Comment
        </button>
        <button type="button" className="flex items-center gap-1 text-xs text-gray-500">
          <Repeat2 className="h-3.5 w-3.5" /> Repost
        </button>
        <button type="button" className="flex items-center gap-1 text-xs text-gray-500">
          <Send className="h-3.5 w-3.5" /> Send
        </button>
      </div>
    </PreviewFrame>
  );
}
