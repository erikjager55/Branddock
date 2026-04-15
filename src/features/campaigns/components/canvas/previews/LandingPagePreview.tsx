'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { Globe, ExternalLink, Lock } from 'lucide-react';

/**
 * Landing page mockup — browser chrome with URL bar + structured page sections.
 */
export function LandingPagePreview({ previewContent, isGenerating, heroImage, onAddImage, brandName }: PlatformPreviewProps) {
  const textEntries = Object.entries(previewContent).filter(
    ([, v]) => v.type === 'text' && v.content,
  );
  const name = brandName ?? 'Brand Name';
  const domain = name.toLowerCase().replace(/\s+/g, '') + '.com';

  if (isGenerating) {
    return (
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b border-gray-200">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 h-5 rounded-md bg-white border border-gray-200" />
        </div>
        <div className="bg-white p-4 animate-pulse space-y-3">
          <div className="h-24 rounded bg-gray-200" />
          <div className="h-5 w-2/3 mx-auto rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-9 w-1/3 mx-auto rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (textEntries.length === 0 && !heroImage) {
    return (
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b border-gray-200">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-white">
          <Globe className="h-10 w-10 mb-2" />
          <p className="text-sm">Landing page preview will appear here</p>
          <p className="text-xs mt-1">Generate content to see page sections</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 h-6 rounded-md bg-white border border-gray-200 px-2.5 flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-green-600" />
          <span className="text-[11px] text-gray-600 truncate">{domain}/campaign</span>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
      </div>

      {/* Page content */}
      <div className="bg-white">
        {/* Hero image */}
        <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-[2.5/1]" rounded="rounded-none" />

        {/* Content sections */}
        <div className="p-4 space-y-4">
          {textEntries.map(([group, value]) => {
            const lower = group.toLowerCase();
            const isHeadline = lower.includes('headline') || lower.includes('hero') || lower.includes('title');
            const isCta = lower.includes('cta') || lower.includes('button');
            const isSubheading = lower.includes('sub') || lower.includes('description');

            if (isCta) {
              return (
                <div key={group} className="text-center py-1">
                  <span className="inline-block px-6 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold">
                    {value.content}
                  </span>
                </div>
              );
            }

            if (isHeadline) {
              return (
                <p key={group} className="text-lg font-bold text-gray-900 text-center leading-tight">
                  {value.content}
                </p>
              );
            }

            if (isSubheading) {
              return (
                <p key={group} className="text-sm text-gray-500 text-center max-w-xs mx-auto">
                  {value.content}
                </p>
              );
            }

            return (
              <div key={group} className="border-t border-gray-100 pt-3">
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">{group.replace(/_/g, ' ')}</p>
                <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-4">{value.content}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
