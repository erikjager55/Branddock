'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { SimpleMarkdown } from './SimpleMarkdown';
import { extractCta } from './CtaButton';
import { InlineEditableSection, useEditableEntry } from './InlineEditableSection';
import { AdditionalComponentsSection } from './AdditionalComponentsSection';
import { stripMarkdownForPlainText } from '../../../lib/strip-markdown';
import { ThumbsUp, MessageCircle, Repeat2, Send, Globe, MoreHorizontal } from 'lucide-react';
import { dedupeBodyPrefix } from './preview-utils';

/**
 * LinkedIn organic post mockup — styled to match the real LinkedIn feed.
 * Uses LinkedIn's actual font sizes, spacing, and color palette.
 */
export function LinkedInPostPreview({ previewContent, isGenerating, heroImage, onAddImage, mediumConfig, brandName }: PlatformPreviewProps) {
  // Inline-edit entries — null when no content has been generated yet.
  // Hooks are called unconditionally; we pick which body entry to use after.
  // Seed template emits `hook + body + cta + hashtags` — so the headline slot
  // falls back to `hook` and we surface `cta` as an editable component too.
  const headlinePrimary = useEditableEntry('headline');
  const headlineFallback = useEditableEntry('hook');
  const headlineEntry = headlinePrimary ?? headlineFallback;
  const bodyEntryPrimary = useEditableEntry('body');
  const bodyEntryFallback = useEditableEntry('caption');
  const bodyEntry = bodyEntryPrimary ?? bodyEntryFallback;
  const hashtagsEntry = useEditableEntry('hashtags');
  const ctaEntry = useEditableEntry('cta');

  const ctaStyle = (mediumConfig?.ctaStyle as string) ?? '';
  const hashtagStrategy = (mediumConfig?.hashtagStrategy as string) ?? 'moderate';

  if (isGenerating) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mx-auto w-full" style={{ maxWidth: '555px' }}>
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
    // LinkedIn desktop feed-post column is ~555px wide. Capping max-width
    // here keeps the preview realistic regardless of the surrounding
    // container width — variants side-by-side in Step 2 OR full-width
    // single-column in Step 3 both render at LinkedIn-actual proportions.
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mx-auto w-full" style={{ maxWidth: '555px' }}>
      {/* Post header — LinkedIn style */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-12 w-12 rounded-md flex items-center justify-center ring-1 ring-gray-200"
              style={{ backgroundColor: '#0a66c2' }}
            >
              <span className="text-base font-semibold text-white">
                {(brandName ?? 'B').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="leading-tight">
              <p className="text-[14px] font-semibold text-gray-900 flex items-center gap-1">
                {brandName ?? 'Brand Name'}
                <span className="text-[11px] font-normal text-gray-500">· 1st</span>
              </p>
              <p className="text-[12px] text-gray-500">1,234 followers</p>
              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                Just now · <Globe className="h-3 w-3" />
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-gray-500">
            <span className="text-[13px] font-semibold" style={{ color: '#0a66c2' }}>+ Follow</span>
            <MoreHorizontal className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Post content — sections are inline-editable on hover.
          Defensive de-duplication: AI sometimes emits the hook as both a
          `hook` component AND the first line of `body`, which renders the
          headline twice in a row. When that overlap exists we strip the
          duplicate prefix from the body text only (the underlying entry
          stays untouched so inline editing still shows the full content). */}
      <div className="px-4 pb-2">
        {headlineEntry && (
          <InlineEditableSection
            entry={headlineEntry}
            render={(text) => (
              <p className="text-sm font-semibold text-gray-900 mb-1.5">{stripMarkdownForPlainText(text)}</p>
            )}
          />
        )}
        {bodyEntry && (
          <InlineEditableSection
            entry={bodyEntry}
            render={(text) => (
              <div className="text-sm text-gray-800 leading-relaxed">
                <SimpleMarkdown text={dedupeBodyPrefix(text, headlineEntry?.content)} />
              </div>
            )}
          />
        )}
        {hashtagStrategy !== 'none' && hashtagsEntry && (
          <InlineEditableSection
            entry={hashtagsEntry}
            render={(text) => (
              <p className="text-sm mt-2" style={{ color: '#0A66C2' }}>{stripMarkdownForPlainText(text)}</p>
            )}
          />
        )}
      </div>

      {/* Image */}
      <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-[1.91/1]" rounded="rounded-none" />

      {/* Link-preview card — LinkedIn renders shared URLs as a card with a
          thumbnail-spot, headline, and domain. We mirror that layout: small
          square thumbnail placeholder on the left, headline + domain on the
          right, then a generic "Visit" pill so the button label doesn't
          duplicate the headline (the previous render copy/pasted the CTA
          text into the button which read awkwardly). */}
      {(() => {
        const renderCard = (text: string) => (
          <div className="flex items-stretch rounded-lg border border-gray-200 overflow-hidden">
            <div className="h-14 w-14 flex-shrink-0 bg-gray-100 flex items-center justify-center">
              <Globe className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-1 px-3 py-2 min-w-0">
              <p className="text-[13px] font-medium text-gray-900 truncate">
                {stripMarkdownForPlainText(text).slice(0, 80)}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {(brandName ?? 'brand').toLowerCase().replace(/\s+/g, '')}.com
              </p>
            </div>
            <div className="flex items-center pr-3">
              <span
                className="px-3 py-1 rounded-full text-[12px] font-semibold border"
                style={{ color: '#0A66C2', borderColor: '#0A66C2' }}
              >
                Visit
              </span>
            </div>
          </div>
        );
        if (ctaEntry) {
          return (
            <div className="px-4 pb-3">
              <InlineEditableSection entry={ctaEntry} render={renderCard} />
            </div>
          );
        }
        const ctaText = extractCta(previewContent) ?? (ctaStyle && ctaStyle !== 'none' ? (ctaStyle === 'sign-up' ? 'Sign Up' : 'Learn More') : null);
        if (!ctaText) return null;
        return <div className="px-4 pb-3">{renderCard(ctaText)}</div>;
      })()}

      {/* Additional generated components that don't fit the curated slots */}
      <div className="px-4 pb-2">
        <AdditionalComponentsSection handledGroups={['headline', 'hook', 'body', 'caption', 'hashtags', 'cta']} />
      </div>

      {/* Engagement counts — three overlapping reaction badges to match
          LinkedIn's stacked-emoji pattern. */}
      <div className="px-4 pt-2 pb-1.5">
        <div className="flex items-center justify-between text-[12px] text-gray-500">
          <div className="flex items-center gap-1">
            <span className="flex -space-x-1">
              <span className="h-[18px] w-[18px] rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
                <ThumbsUp className="h-2.5 w-2.5 text-white" fill="currentColor" />
              </span>
              <span className="h-[18px] w-[18px] rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[10px] text-white">❤</span>
              <span className="h-[18px] w-[18px] rounded-full bg-yellow-400 border-2 border-white flex items-center justify-center text-[10px]">👏</span>
            </span>
            <span className="ml-1 hover:underline cursor-default">24</span>
          </div>
          <span className="hover:underline cursor-default">3 comments · 1 repost</span>
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
