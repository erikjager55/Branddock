'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { FileText, Copy, Check } from 'lucide-react';
import { HeroImageSlot } from './HeroImageSlot';
import { SimpleMarkdown } from './SimpleMarkdown';
import { InlineEditableSection, useEditableEntries } from './InlineEditableSection';
import { stripMarkdownForPlainText } from '../../../lib/strip-markdown';

/**
 * Fallback preview for unmapped platform/format combinations + the canonical
 * preview for blog-article (preview-map.ts → web/blog-article).
 *
 * Every text variant group is rendered dynamically and made inline-editable
 * via {@link useEditableEntries} — no hardcoded group registry, so newly
 * introduced template group names (introduction, body-sections, value-prop,
 * etc.) become editable automatically.
 */
export function GenericPreview({ previewContent, isGenerating, heroImage, onAddImage }: PlatformPreviewProps) {
  const [copied, setCopied] = React.useState(false);

  const entries = useEditableEntries();

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

      {/* Content — all variant groups rendered with role-appropriate styling */}
      <div className="p-3 space-y-3">
        {textEntries.map(([group, value]) => {
          const g = group.toLowerCase();
          const isTitle = g === 'title' || g === 'headline';
          const isMeta = g.includes('meta');
          const isSubject = g === 'subject' || g === 'subject-line';
          const isCta = g === 'cta' || g === 'call-to-action';
          const isHashtags = g === 'hashtags';
          const isCaption = g === 'caption';
          const entry = entries.get(group);

          // Renders the role-appropriate display for a given text value.
          const renderRole = (text: string) => {
            if (isTitle || isSubject) {
              return (
                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                  {stripMarkdownForPlainText(text)}
                </h1>
              );
            }
            if (isMeta) {
              return <p className="text-sm text-gray-500 italic">{stripMarkdownForPlainText(text)}</p>;
            }
            if (isCta) {
              return (
                <div className="pt-1">
                  <span className="inline-block px-4 py-1.5 rounded bg-teal-600 text-white text-xs font-medium">
                    {stripMarkdownForPlainText(text).slice(0, 80)}
                  </span>
                </div>
              );
            }
            if (isHashtags) {
              return <p className="text-xs text-blue-600">{text}</p>;
            }
            if (isCaption) {
              return <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>;
            }
            return <SimpleMarkdown text={text} />;
          };

          return (
            <div key={group}>
              {/* Group label — hidden for visually obvious roles */}
              {!isTitle && !isSubject && (
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">
                  {group.replace(/[-_]/g, ' ')}
                </p>
              )}

              {entry ? (
                <InlineEditableSection entry={entry} render={renderRole} />
              ) : (
                renderRole(value.content ?? '')
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
