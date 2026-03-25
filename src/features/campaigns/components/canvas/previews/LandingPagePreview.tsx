'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { PreviewFrame } from './PreviewFrame';
import { Globe, ExternalLink } from 'lucide-react';

/** Preview for landing page content — shows structured page sections */
export function LandingPagePreview({ previewContent, isGenerating }: PlatformPreviewProps) {
  const textEntries = Object.entries(previewContent).filter(
    ([, v]) => v.type === 'text' && v.content,
  );

  if (isGenerating) {
    return (
      <PreviewFrame platformLabel="Landing Page" platformColor="#0891b2">
        <div className="animate-pulse space-y-3">
          <div className="h-20 rounded bg-gray-200" />
          <div className="h-4 w-2/3 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-8 w-1/3 rounded bg-gray-200" />
        </div>
      </PreviewFrame>
    );
  }

  if (textEntries.length === 0) {
    return (
      <PreviewFrame platformLabel="Landing Page" platformColor="#0891b2">
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Globe className="h-10 w-10 mb-2" />
          <p className="text-sm">Landing page preview will appear here</p>
          <p className="text-xs mt-1">Generate content to see page sections</p>
        </div>
      </PreviewFrame>
    );
  }

  return (
    <PreviewFrame platformLabel="Landing Page" platformColor="#0891b2">
      {/* Browser chrome mockup */}
      <div className="rounded border border-gray-200 overflow-hidden">
        {/* URL bar */}
        <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <div className="h-2 w-2 rounded-full bg-gray-300" />
          </div>
          <div className="flex-1 h-4 rounded bg-white border border-gray-200 px-2 flex items-center">
            <span className="text-[10px] text-gray-400 truncate">yoursite.com/campaign</span>
          </div>
          <ExternalLink className="h-3 w-3 text-gray-400" />
        </div>

        {/* Page content sections */}
        <div className="p-3 space-y-3 bg-white">
          {textEntries.map(([group, value]) => {
            const isHeadline = group.toLowerCase().includes('headline') || group.toLowerCase().includes('hero');
            const isCta = group.toLowerCase().includes('cta') || group.toLowerCase().includes('button');

            if (isCta) {
              return (
                <div key={group} className="text-center">
                  <span className="inline-block px-4 py-1.5 rounded bg-teal-600 text-white text-xs font-medium">
                    {value.content}
                  </span>
                </div>
              );
            }

            return (
              <div key={group}>
                {isHeadline ? (
                  <p className="text-sm font-semibold text-gray-900 text-center">
                    {value.content}
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">
                      {group.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-4">
                      {value.content}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PreviewFrame>
  );
}
