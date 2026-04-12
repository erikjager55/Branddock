'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { FileText, Copy, Check } from 'lucide-react';
import { HeroImageSlot } from './HeroImageSlot';
import { SimpleMarkdown } from './SimpleMarkdown';

/** Fallback preview for unmapped platform/format combinations */
export function GenericPreview({ previewContent, isGenerating, heroImage, onAddImage }: PlatformPreviewProps) {
  const [copied, setCopied] = React.useState(false);

  const textEntries = Object.entries(previewContent).filter(
    ([, v]) => v.type === 'text' && v.content
  );

  const allText = textEntries.map(([, v]) => v.content).join('\n\n');

  const handleCopy = async () => {
    if (!allText) return;
    try {
      await navigator.clipboard.writeText(allText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available in all contexts
    }
  };

  if (isGenerating) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-5/6 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (textEntries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <FileText className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          Select variants to see a preview
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-600">Content Preview</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Hero image (blog header position) */}
      {onAddImage !== undefined && (
        <div className="px-3 py-4">
          <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-[16/9]" />
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-3">
        {textEntries.map(([group, value]) => {
          const isTitle = group.toLowerCase() === 'title';
          const isMeta = group.toLowerCase().includes('meta');
          return (
            <div key={group}>
              {!isTitle && (
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">
                  {group.replace(/_/g, ' ')}
                </p>
              )}
              {isTitle ? (
                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                  {value.content}
                </h1>
              ) : isMeta ? (
                <p className="text-sm text-gray-500 italic">{value.content}</p>
              ) : (
                <SimpleMarkdown text={value.content ?? ''} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
