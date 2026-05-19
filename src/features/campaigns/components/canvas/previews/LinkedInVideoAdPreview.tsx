'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { SimpleMarkdown } from './SimpleMarkdown';
import { ThumbsUp, MessageCircle, Repeat2, Send, Globe, MoreHorizontal, Play, Volume2, VolumeX } from 'lucide-react';
import { InlineEditableSection, useEditableEntry } from './InlineEditableSection';
import { AdditionalComponentsSection } from './AdditionalComponentsSection';
import { stripMarkdownForPlainText } from '../../../lib/strip-markdown';

const LINKEDIN_BLUE = '#0A66C2';

/**
 * LinkedIn sponsored video ad mockup (2026-05-19).
 *
 * Vergelijkbaar met LinkedInAdPreview maar met video-treatment:
 * - Thumbnail-with-play-overlay (16:9 aspect, LinkedIn paid-video preferred)
 * - "Sponsored video" badge overlay
 * - Volume-mute indicator (LinkedIn paid is silent-autoplay default)
 * - Duration-pill rechtsonder
 *
 * Component-input shape (per content-type-inputs.ts linkedin-video-ad):
 * - `body` group → intro-caption boven video (sponsored-post text)
 * - `headline` group → onder video als link-card title
 * - `description` group → onder headline (klein)
 * - `cta` of `cta-button` group → blauwe CTA-button rechts
 * - `imageVariants` → thumbnail-candidates voor video-preview-frame
 *
 * MediumConfigLayout bypasst deze component wanneer `composedVideoUrl`
 * staat — dan rendert direct `<video controls>`. Deze preview is dus
 * voor de pre-compose state (script + thumbnail) of als fallback wanneer
 * geen composed-video is.
 */
export function LinkedInVideoAdPreview({
  previewContent,
  imageVariants,
  heroImage,
  onAddImage,
  isGenerating,
  brandName,
  mediumConfig,
}: PlatformPreviewProps) {
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
  const selectedImage = imageVariants.find((img) => img.isSelected) ?? imageVariants[0];
  const hasIntroText = !!introTextEntry;

  // Read duration uit videoProviderConfig (LinkedIn paid sweet-spot 8s) of fallback.
  const duration = (mediumConfig?.duration as number | undefined) ?? 8;
  const durationLabel = `0:${String(duration).padStart(2, '0')}`;

  if (isGenerating) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mx-auto w-full" style={{ maxWidth: '555px' }}>
        <div className="p-4 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-sm bg-gray-200" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-gray-200" />
              <div className="h-2.5 w-20 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="aspect-video rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-8 w-24 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mx-auto w-full" style={{ maxWidth: '555px' }}>
      {/* Advertiser header */}
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

      {/* Intro text (body above video) */}
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

      {/* Video-thumbnail area — 16:9 aspect with play-overlay + mute indicator + duration pill */}
      <div className="relative" style={{ aspectRatio: '16 / 9' }}>
        {selectedImage ? (
          <img
            src={selectedImage.url}
            alt={selectedImage.prompt}
            className="w-full h-full object-cover"
          />
        ) : (
          <HeroImageSlot
            image={heroImage}
            onAddImage={onAddImage}
            aspectRatio="aspect-video"
            rounded="rounded-none"
          />
        )}

        {/* Dark gradient overlay for legibility of icons */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-black/10" />

        {/* Center play-button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-14 w-14 rounded-full bg-white/95 shadow-lg flex items-center justify-center">
            <Play className="h-6 w-6 text-gray-900" fill="currentColor" style={{ marginLeft: 2 }} />
          </div>
        </div>

        {/* "Sponsored video" badge top-left */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium uppercase tracking-wide">
          Sponsored video
        </div>

        {/* Volume-mute indicator top-right (LinkedIn paid is silent-autoplay) */}
        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white">
          <VolumeX className="h-3.5 w-3.5" aria-label="Silent autoplay (LinkedIn paid default)" />
        </div>

        {/* Duration pill bottom-right */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-white text-[10px] font-medium tabular-nums">
          {durationLabel}
        </div>

        {/* Soft-volume affordance bottom-left — visual hint dat clicking unmutes */}
        <div className="absolute bottom-2 left-2 p-1.5 rounded-full bg-black/60 text-white opacity-80">
          <Volume2 className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Link card below video — LinkedIn ad style */}
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
            <span>24</span>
          </div>
          <span>4 comments · 1,892 views</span>
        </div>
      </div>

      {/* Additional generated components that don't fit the curated slots
          (e.g. caption-groups uit script-output). Scene-breakdown
          hook/body/cta worden NIET hier getoond — die zit in Step 2
          edit-panel. */}
      <div className="px-4 pb-2">
        <AdditionalComponentsSection
          handledGroups={[
            'headline',
            'body',
            'description',
            'caption',
            'cta',
            'cta-button',
            // Script-segments worden in Step 2 SceneBreakdown bewerkt,
            // niet in preview gerenderd (vermijd duplicatie).
            'hook',
            'intro',
            'proof',
            'offer',
            'conclusion',
            'thumbnail',
          ]}
        />
      </div>

      {/* Action bar */}
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
