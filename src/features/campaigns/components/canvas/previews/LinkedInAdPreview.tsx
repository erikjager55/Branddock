'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { SimpleMarkdown } from './SimpleMarkdown';
import { ThumbsUp, MessageCircle, Repeat2, Send, Globe, MoreHorizontal } from 'lucide-react';
import { InlineEditableSection, useEditableEntry } from './InlineEditableSection';
import { AdditionalComponentsSection } from './AdditionalComponentsSection';
import { stripMarkdownForPlainText } from '../../../lib/strip-markdown';

const LINKEDIN_BLUE = '#0A66C2';

/**
 * LinkedIn sponsored ad mockup — pixel-accurate replica of the real LinkedIn
 * sponsored post format with advertiser header, 1.91:1 image, link card,
 * and action bar.
 *
 * Seed template emits `headline + body + description + cta-button` — the
 * cta slot falls back from `cta` to `cta-button` so the generated CTA is
 * always editable inside the action button.
 */
export function LinkedInAdPreview({ previewContent, heroImage, onAddImage, isGenerating, brandName, imageVariants }: PlatformPreviewProps) {
  // Inline-edit entries — null when no content has been generated yet.
  const introTextEntryPrimary = useEditableEntry('body');
  const introTextEntryFallback = useEditableEntry('description');
  const introTextEntry = introTextEntryPrimary ?? introTextEntryFallback;
  const headlineEntry = useEditableEntry('headline');
  const descriptionEntryPrimary = useEditableEntry('description');
  const descriptionEntryFallback = useEditableEntry('caption');
  const descriptionEntry = descriptionEntryPrimary ?? descriptionEntryFallback;
  const ctaPrimary = useEditableEntry('cta');
  const ctaButtonFallback = useEditableEntry('cta-button');
  const ctaEntry = ctaPrimary ?? ctaButtonFallback;

  const fallbackCta = previewContent.cta?.content ?? 'Learn More';
  const name = brandName ?? 'Brand Name';
  const initial = name.charAt(0).toUpperCase();
  const selectedImage = imageVariants.find((img) => img.isSelected);
  const hasIntroText = !!introTextEntry;

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
          <div className="h-40 rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-8 w-24 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mx-auto w-full" style={{ maxWidth: '555px' }}>
      {/* Advertiser header — LinkedIn style */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-sm flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#dbeafe' }}
            >
              <span className="text-sm font-bold" style={{ color: '#1d4ed8' }}>{initial}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{name}</p>
              <p className="text-xs text-gray-500 leading-tight">1,234 followers</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                Promoted · <Globe className="h-2.5 w-2.5" />
              </p>
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Intro text (body above image) */}
      {introTextEntry && (
        <div className="px-4 pb-2">
          <InlineEditableSection
            entry={introTextEntry}
            render={(text) => (
              <div className="text-sm text-gray-800 leading-relaxed line-clamp-3">
                <SimpleMarkdown text={text} />
              </div>
            )}
          />
        </div>
      )}

      {/* Ad image — 1.91:1 aspect ratio (1200×628) */}
      {selectedImage ? (
        <img
          src={selectedImage.url}
          alt={selectedImage.prompt}
          className="w-full object-cover"
          style={{ aspectRatio: '1.91 / 1' }}
        />
      ) : (
        <HeroImageSlot
          image={heroImage}
          onAddImage={onAddImage}
          aspectRatio="aspect-[1.91/1]"
          rounded="rounded-none"
        />
      )}

      {/* Link card below image — LinkedIn ad style */}
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 mb-0.5">
              {name.toLowerCase().replace(/\s+/g, '')}.com
            </p>
            {headlineEntry && (
              <InlineEditableSection
                entry={headlineEntry}
                render={(text) => (
                  <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{stripMarkdownForPlainText(text)}</p>
                )}
              />
            )}
            {descriptionEntry && !hasIntroText && (
              <InlineEditableSection
                entry={descriptionEntry}
                render={(text) => (
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{stripMarkdownForPlainText(text)}</p>
                )}
              />
            )}
          </div>
          {ctaEntry ? (
            <InlineEditableSection
              entry={ctaEntry}
              size="compact"
              render={(text) => (
                <button
                  type="button"
                  className="flex-shrink-0 px-4 py-1.5 text-sm font-semibold rounded-full text-white"
                  style={{ backgroundColor: LINKEDIN_BLUE }}
                >
                  {stripMarkdownForPlainText(text).slice(0, 80)}
                </button>
              )}
            />
          ) : (
            <button
              type="button"
              className="flex-shrink-0 px-4 py-1.5 text-sm font-semibold rounded-full text-white"
              style={{ backgroundColor: LINKEDIN_BLUE }}
            >
              {fallbackCta}
            </button>
          )}
        </div>
      </div>

      {/* Engagement counts */}
      <div className="px-4 py-1.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="flex -space-x-1">
              <span className="h-4 w-4 rounded-full bg-blue-500 border border-white flex items-center justify-center">
                <ThumbsUp className="h-2 w-2 text-white" />
              </span>
            </span>
            <span>12</span>
          </div>
          <span>2 comments</span>
        </div>
      </div>

      {/* Additional generated components that don't fit the curated slots */}
      <div className="px-4 pb-2">
        <AdditionalComponentsSection
          handledGroups={['headline', 'body', 'description', 'caption', 'cta', 'cta-button']}
        />
      </div>

      {/* Action bar — LinkedIn four buttons */}
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
