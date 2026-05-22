'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { InlineEditableSection, useEditableEntry, type InlineEditableEntry } from './InlineEditableSection';
import { AdditionalComponentsSection } from './AdditionalComponentsSection';
import { stripMarkdownForPlainText } from '../../../lib/strip-markdown';

const CTA_BG = '#0D9488';

const HANDLED_GROUPS = [
  'leaderboard-headline', 'leaderboard-body', 'leaderboard-cta', 'leaderboard-visual',
  'rectangle-headline', 'rectangle-body', 'rectangle-cta', 'rectangle-visual',
  'skyscraper-headline', 'skyscraper-body', 'skyscraper-cta', 'skyscraper-visual',
  // Suppress legacy single-format groups
  'headline', 'body', 'cta', 'cta-button',
];

interface SizeSlots {
  headline: InlineEditableEntry | null;
  body: InlineEditableEntry | null;
  cta: InlineEditableEntry | null;
}

/**
 * Display-ad creative brief preview — renders the 3 standard Google Display
 * Network sizes side-by-side: 728x90 leaderboard (horizontal scan), 300x250
 * medium rectangle (top-down scan), 160x600 skyscraper (vertical stack).
 * Each size pulls its copy from named groups (leaderboard-*, rectangle-*,
 * skyscraper-*) so the model can tune the message to the scanning pattern.
 */
export function DisplayAdPreview({ isGenerating, heroImage, onAddImage, brandName, imageVariants }: PlatformPreviewProps) {
  const leaderboard: SizeSlots = {
    headline: useEditableEntry('leaderboard-headline'),
    body: useEditableEntry('leaderboard-body'),
    cta: useEditableEntry('leaderboard-cta'),
  };
  const rectangle: SizeSlots = {
    headline: useEditableEntry('rectangle-headline'),
    body: useEditableEntry('rectangle-body'),
    cta: useEditableEntry('rectangle-cta'),
  };
  const skyscraper: SizeSlots = {
    headline: useEditableEntry('skyscraper-headline'),
    body: useEditableEntry('skyscraper-body'),
    cta: useEditableEntry('skyscraper-cta'),
  };

  const name = brandName ?? 'Brand Name';
  const initial = name.charAt(0).toUpperCase();
  const selectedImage = imageVariants.find((img) => img.isSelected);
  const imageUrl = selectedImage?.url ?? heroImage?.url ?? null;

  if (isGenerating) {
    return <DisplayAdSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-2">
      <Leaderboard
        slots={leaderboard}
        imageUrl={imageUrl}
        onAddImage={onAddImage}
        brandName={name}
        initial={initial}
      />

      <div className="flex flex-wrap gap-6 items-start justify-center">
        <MediumRectangle
          slots={rectangle}
          imageUrl={imageUrl}
          onAddImage={onAddImage}
          brandName={name}
        />
        <Skyscraper
          slots={skyscraper}
          imageUrl={imageUrl}
          onAddImage={onAddImage}
          brandName={name}
          initial={initial}
        />
      </div>

      <AdditionalComponentsSection handledGroups={HANDLED_GROUPS} />
    </div>
  );
}

interface BannerProps {
  slots: SizeSlots;
  imageUrl: string | null;
  onAddImage?: () => void;
  brandName: string;
  initial?: string;
}

function Leaderboard({ slots, imageUrl, onAddImage, brandName, initial }: BannerProps) {
  return (
    <div>
      <SizeLabel size="728 × 90" name="Leaderboard" />
      <div
        className="bg-white rounded border border-gray-300 shadow-sm overflow-hidden flex items-stretch"
        style={{ width: 728, height: 90 }}
      >
        <div className="flex-shrink-0" style={{ width: 90 }}>
          {imageUrl ? (
            <img src={imageUrl} alt={brandName} className="w-full h-full object-cover" />
          ) : (
            <HeroImageSlot image={null} onAddImage={onAddImage} aspectRatio="aspect-square" rounded="rounded-none" />
          )}
        </div>
        <div className="flex-1 flex items-center px-3 min-w-0">
          {slots.headline ? (
            <InlineEditableSection
              entry={slots.headline}
              render={(text) => (
                <p className="text-base font-bold text-gray-900 leading-tight line-clamp-2 truncate">
                  {stripMarkdownForPlainText(text)}
                </p>
              )}
            />
          ) : (
            <p className="text-sm text-gray-400 italic">[headline]</p>
          )}
        </div>
        <div className="flex items-center pr-3 flex-shrink-0">
          {slots.cta ? (
            <InlineEditableSection
              entry={slots.cta}
              size="compact"
              render={(text) => (
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-semibold rounded text-white whitespace-nowrap"
                  style={{ backgroundColor: CTA_BG }}
                >
                  {stripMarkdownForPlainText(text).slice(0, 24)}
                </button>
              )}
            />
          ) : (
            <button type="button" className="px-3 py-1.5 text-xs font-semibold rounded text-white" style={{ backgroundColor: CTA_BG }}>
              Learn More
            </button>
          )}
        </div>
      </div>
      <BrandFooter name={brandName} initial={initial ?? '?'} />
    </div>
  );
}

function MediumRectangle({ slots, imageUrl, onAddImage, brandName }: BannerProps) {
  return (
    <div>
      <SizeLabel size="300 × 250" name="Medium Rectangle" />
      <div
        className="bg-white rounded border border-gray-300 shadow-sm overflow-hidden flex flex-col"
        style={{ width: 300, height: 250 }}
      >
        <div className="flex-shrink-0" style={{ height: 110 }}>
          {imageUrl ? (
            <img src={imageUrl} alt={brandName} className="w-full h-full object-cover" />
          ) : (
            <HeroImageSlot image={null} onAddImage={onAddImage} aspectRatio="aspect-[300/110]" rounded="rounded-none" />
          )}
        </div>
        <div className="flex-1 flex flex-col justify-between px-3 py-2.5 min-h-0">
          <div className="space-y-1">
            {slots.headline ? (
              <InlineEditableSection
                entry={slots.headline}
                render={(text) => (
                  <p className="text-base font-bold text-gray-900 leading-tight line-clamp-2">{stripMarkdownForPlainText(text)}</p>
                )}
              />
            ) : (
              <p className="text-sm text-gray-400 italic">[headline]</p>
            )}
            {slots.body && (
              <InlineEditableSection
                entry={slots.body}
                render={(text) => (
                  <p className="text-xs text-gray-600 leading-tight line-clamp-2">{stripMarkdownForPlainText(text)}</p>
                )}
              />
            )}
          </div>
          {slots.cta ? (
            <InlineEditableSection
              entry={slots.cta}
              size="compact"
              render={(text) => (
                <button
                  type="button"
                  className="self-start px-3 py-1.5 text-xs font-semibold rounded text-white"
                  style={{ backgroundColor: CTA_BG }}
                >
                  {stripMarkdownForPlainText(text).slice(0, 24)}
                </button>
              )}
            />
          ) : (
            <button type="button" className="self-start px-3 py-1.5 text-xs font-semibold rounded text-white" style={{ backgroundColor: CTA_BG }}>
              Learn More
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Skyscraper({ slots, imageUrl, onAddImage, brandName, initial }: BannerProps) {
  return (
    <div>
      <SizeLabel size="160 × 600" name="Skyscraper" />
      <div
        className="bg-white rounded border border-gray-300 shadow-sm overflow-hidden flex flex-col"
        style={{ width: 160, height: 600 }}
      >
        <div className="flex items-center gap-1.5 px-2 py-2 border-b border-gray-100 flex-shrink-0">
          <div className="h-5 w-5 rounded-sm flex items-center justify-center flex-shrink-0" style={{ backgroundColor: CTA_BG }}>
            <span className="text-[10px] font-bold text-white">{initial ?? '?'}</span>
          </div>
          <p className="text-[10px] font-semibold text-gray-700 truncate">{brandName}</p>
        </div>
        <div className="flex-shrink-0" style={{ height: 220 }}>
          {imageUrl ? (
            <img src={imageUrl} alt={brandName} className="w-full h-full object-cover" />
          ) : (
            <HeroImageSlot image={null} onAddImage={onAddImage} aspectRatio="aspect-[160/220]" rounded="rounded-none" />
          )}
        </div>
        <div className="flex-1 flex flex-col justify-between px-3 py-3 min-h-0">
          <div className="space-y-2">
            {slots.headline ? (
              <InlineEditableSection
                entry={slots.headline}
                render={(text) => (
                  <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-3">{stripMarkdownForPlainText(text)}</p>
                )}
              />
            ) : (
              <p className="text-sm text-gray-400 italic">[headline]</p>
            )}
            {slots.body && (
              <InlineEditableSection
                entry={slots.body}
                render={(text) => (
                  <p className="text-xs text-gray-600 leading-snug line-clamp-4">{stripMarkdownForPlainText(text)}</p>
                )}
              />
            )}
          </div>
          {slots.cta ? (
            <InlineEditableSection
              entry={slots.cta}
              size="compact"
              render={(text) => (
                <button
                  type="button"
                  className="w-full px-2 py-2 text-xs font-semibold rounded text-white"
                  style={{ backgroundColor: CTA_BG }}
                >
                  {stripMarkdownForPlainText(text).slice(0, 16)}
                </button>
              )}
            />
          ) : (
            <button type="button" className="w-full px-2 py-2 text-xs font-semibold rounded text-white" style={{ backgroundColor: CTA_BG }}>
              Learn More
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SizeLabel({ size, name }: { size: string; name: string }) {
  return (
    <p className="text-xs text-gray-500 mb-1.5">
      <span className="font-mono">{size}</span> <span className="text-gray-400">· {name}</span>
    </p>
  );
}

function BrandFooter({ name, initial }: { name: string; initial: string }) {
  return (
    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
      <span className="h-3 w-3 rounded-sm flex items-center justify-center" style={{ backgroundColor: CTA_BG }}>
        <span className="text-[8px] font-bold text-white">{initial}</span>
      </span>
      Ad by {name}
    </p>
  );
}

function DisplayAdSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-2 animate-pulse">
      <div>
        <div className="h-3 w-32 bg-gray-200 rounded mb-1.5" />
        <div className="bg-gray-200 rounded" style={{ width: 728, height: 90 }} />
      </div>
      <div className="flex gap-6">
        <div>
          <div className="h-3 w-40 bg-gray-200 rounded mb-1.5" />
          <div className="bg-gray-200 rounded" style={{ width: 300, height: 250 }} />
        </div>
        <div>
          <div className="h-3 w-32 bg-gray-200 rounded mb-1.5" />
          <div className="bg-gray-200 rounded" style={{ width: 160, height: 600 }} />
        </div>
      </div>
    </div>
  );
}
