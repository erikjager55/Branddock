'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { SimpleMarkdown } from './SimpleMarkdown';
import { ThumbsUp, MessageCircle, Share2, Heart, Globe, MoreHorizontal } from 'lucide-react';
import { InlineEditableSection, useEditableEntry } from './InlineEditableSection';
import { AdditionalComponentsSection } from './AdditionalComponentsSection';
import { stripMarkdownForPlainText } from '../../../lib/strip-markdown';

const FACEBOOK_BLUE = '#1877F2';

/**
 * Facebook sponsored ad mockup — replica of Meta's link-card ad format:
 * circular avatar + Sponsored badge, primary text above 1.91:1 image, link
 * card with domain + headline + CTA button, action bar (Like/Comment/Share).
 *
 * Seed template `facebook/ad` emits `headline + body + description +
 * cta-button + image`. Fallback-chain handles legacy naming drift (body ←
 * primary-text / caption).
 */
export function FacebookAdPreview({ previewContent, heroImage, onAddImage, isGenerating, brandName, imageVariants }: PlatformPreviewProps) {
  const introTextPrimary = useEditableEntry('body');
  const introTextFallback1 = useEditableEntry('primary-text');
  const introTextFallback2 = useEditableEntry('caption');
  const introTextEntry = introTextPrimary ?? introTextFallback1 ?? introTextFallback2;

  const headlineEntry = useEditableEntry('headline');

  const descriptionPrimary = useEditableEntry('description');
  const descriptionFallback = useEditableEntry('link-description');
  const descriptionEntry = descriptionPrimary ?? descriptionFallback;

  const ctaPrimary = useEditableEntry('cta');
  const ctaFallback = useEditableEntry('cta-button');
  const ctaEntry = ctaPrimary ?? ctaFallback;

  const fallbackCta = previewContent.cta?.content ?? 'Learn More';
  const name = brandName ?? 'Brand Name';
  const initial = name.charAt(0).toUpperCase();
  const domain = name.toLowerCase().replace(/\s+/g, '') + '.com';
  const selectedImage = imageVariants.find((img) => img.isSelected);

  if (isGenerating) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mx-auto w-full" style={{ maxWidth: '500px' }}>
        <div className="p-4 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-gray-200" />
              <div className="h-2.5 w-16 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-3 w-4/5 rounded bg-gray-200" />
          <div className="h-44 rounded bg-gray-200" />
          <div className="h-12 w-full rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mx-auto w-full" style={{ maxWidth: '500px' }}>
      {/* Advertiser header — Facebook style: round avatar + Sponsored badge */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: FACEBOOK_BLUE }}
            >
              <span className="text-sm font-bold text-white">{initial}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{name}</p>
              <p className="text-xs text-gray-500 leading-tight flex items-center gap-1 mt-0.5">
                Sponsored · <Globe className="h-2.5 w-2.5" />
              </p>
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Primary text (body above image) */}
      {introTextEntry && (
        <div className="px-4 pb-2">
          <InlineEditableSection
            entry={introTextEntry}
            render={(text) => (
              <div className="text-sm text-gray-800 leading-relaxed">
                <SimpleMarkdown text={text} />
              </div>
            )}
          />
        </div>
      )}

      {/* Ad image — 1.91:1 aspect ratio (1200×628), Meta link-ad standard */}
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

      {/* Link card below image — Facebook ad style */}
      <div className="bg-gray-100 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">{domain}</p>
            {headlineEntry && (
              <InlineEditableSection
                entry={headlineEntry}
                render={(text) => (
                  <p className="text-base font-semibold text-gray-900 leading-snug line-clamp-2">{stripMarkdownForPlainText(text)}</p>
                )}
              />
            )}
            {descriptionEntry && (
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
                  className="flex-shrink-0 px-4 py-2 text-sm font-semibold rounded bg-gray-200 text-gray-900 hover:bg-gray-300"
                >
                  {stripMarkdownForPlainText(text).slice(0, 80)}
                </button>
              )}
            />
          ) : (
            <button
              type="button"
              className="flex-shrink-0 px-4 py-2 text-sm font-semibold rounded bg-gray-200 text-gray-900"
            >
              {fallbackCta}
            </button>
          )}
        </div>
      </div>

      {/* Engagement counts */}
      <div className="px-4 py-2 border-b border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="flex -space-x-1">
              <span className="h-4 w-4 rounded-full border border-white flex items-center justify-center" style={{ backgroundColor: FACEBOOK_BLUE }}>
                <ThumbsUp className="h-2 w-2 text-white" />
              </span>
              <span className="h-4 w-4 rounded-full bg-red-500 border border-white flex items-center justify-center">
                <Heart className="h-2 w-2 text-white fill-white" />
              </span>
            </span>
            <span>12</span>
          </div>
          <span>2 comments · 1 share</span>
        </div>
      </div>

      {/* Additional generated components that don't fit the curated slots */}
      <div className="px-4 pb-1">
        <AdditionalComponentsSection
          handledGroups={[
            'body', 'primary-text', 'caption',
            'headline',
            'description', 'link-description',
            'cta', 'cta-button',
            'hashtags',
          ]}
        />
      </div>

      {/* Action bar — Facebook three buttons */}
      <div className="px-2 py-1 flex items-center justify-around">
        {[
          { icon: ThumbsUp, label: 'Like' },
          { icon: MessageCircle, label: 'Comment' },
          { icon: Share2, label: 'Share' },
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
