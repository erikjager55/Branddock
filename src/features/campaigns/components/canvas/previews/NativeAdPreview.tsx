'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { SimpleMarkdown } from './SimpleMarkdown';
import { InlineEditableSection, useEditableEntry } from './InlineEditableSection';
import { AdditionalComponentsSection } from './AdditionalComponentsSection';
import { Bookmark, Share2, ChevronRight } from 'lucide-react';
import { useFormat } from '@/lib/ui-i18n/format';

const HANDLED_GROUPS = [
  'headline', 'subheadline',
  'opening-paragraph', 'body', 'brand-integration', 'closing',
  'disclosure-position',
  'image',
  // Suppress legacy fallbacks the model might emit
  'description', 'cta', 'cta-button',
];

/**
 * Native ad / sponsored article mockup — editorial publisher style.
 * Renders as if appearing on a premium-publisher feed (NYT/Atlantic/
 * HubSpot-style): "Sponsored by Brand" disclosure top, large editorial
 * headline + subheadline, hero image, lead paragraph + body markdown,
 * brand-integration aside, closing thought. Action bar mimics
 * publisher-site engagement (save / share / read-more).
 */
export function NativeAdPreview({ isGenerating, heroImage, onAddImage, brandName, imageVariants }: PlatformPreviewProps) {
  const headline = useEditableEntry('headline');
  const subheadline = useEditableEntry('subheadline');
  const openingParagraph = useEditableEntry('opening-paragraph');
  const body = useEditableEntry('body');
  const brandIntegration = useEditableEntry('brand-integration');
  const closing = useEditableEntry('closing');
  const disclosurePosition = useEditableEntry('disclosure-position');
  const { formatDate } = useFormat();

  const name = brandName ?? 'Brand Name';
  const selectedImage = imageVariants.find((img) => img.isSelected);
  const imageUrl = selectedImage?.url ?? heroImage?.url ?? null;

  if (isGenerating) {
    return <NativeAdSkeleton />;
  }

  return (
    <article className="mx-auto w-full max-w-2xl bg-white">
      {/* Disclosure tag — small, top byline position per FTC/ASA compliance */}
      <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-3 flex items-center gap-2">
        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-sm">Sponsored</span>
        <span>by {name}</span>
      </div>

      {/* Headline — editorial style, large serif-ish */}
      {headline ? (
        <InlineEditableSection
          entry={headline}
          render={(text) => (
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight tracking-tight mb-3">
              {text}
            </h1>
          )}
        />
      ) : (
        <h1 className="text-3xl md:text-4xl font-bold text-gray-400 italic mb-3">[Headline — editorial style, no brand]</h1>
      )}

      {/* Subheadline / deck */}
      {subheadline && (
        <InlineEditableSection
          entry={subheadline}
          render={(text) => (
            <p className="text-lg text-gray-600 leading-relaxed mb-5">{text}</p>
          )}
        />
      )}

      {/* Author byline / dateline placeholder for realism */}
      <div className="text-xs text-gray-500 mb-5 pb-5 border-b border-gray-200 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gray-300" />
        <div>
          <p className="font-semibold text-gray-700">Editorial Staff</p>
          <p>Sponsored content · {formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Hero image */}
      <div className="mb-6 rounded-lg overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full object-cover" style={{ aspectRatio: '16 / 9' }} />
        ) : (
          <HeroImageSlot image={null} onAddImage={onAddImage} aspectRatio="aspect-[16/9]" rounded="rounded-lg" />
        )}
      </div>

      {/* Opening paragraph — lead, no brand mention */}
      {openingParagraph ? (
        <InlineEditableSection
          entry={openingParagraph}
          render={(text) => (
            <p className="text-base text-gray-800 leading-relaxed mb-5 first-letter:text-2xl first-letter:font-semibold first-letter:mr-0.5">
              {text}
            </p>
          )}
        />
      ) : (
        <p className="text-base text-gray-400 italic mb-5">[Opening paragraph — pure editorial value, no brand or product mention]</p>
      )}

      {/* Body — markdown-rich editorial content */}
      {body ? (
        <InlineEditableSection
          entry={body}
          render={(text) => (
            <div className="prose prose-gray max-w-none text-gray-800 mb-5 leading-relaxed">
              <SimpleMarkdown text={text} />
            </div>
          )}
        />
      ) : (
        <p className="text-base text-gray-400 italic mb-5">[Body — data, expert quotes, case studies. Brand emerges naturally from paragraph 3.]</p>
      )}

      {/* Brand integration — subtle aside style, italicized to set apart */}
      {brandIntegration ? (
        <InlineEditableSection
          entry={brandIntegration}
          render={(text) => (
            <div className="border-l-4 border-amber-300 bg-amber-50/50 pl-4 py-3 my-6 rounded-r">
              <p className="text-sm uppercase tracking-wide text-amber-700 font-semibold mb-1">In context</p>
              <p className="text-base text-gray-800 leading-relaxed italic">
                <SimpleMarkdown text={text} />
              </p>
            </div>
          )}
        />
      ) : (
        <div className="border-l-4 border-gray-200 bg-gray-50 pl-4 py-3 my-6 rounded-r">
          <p className="text-sm text-gray-400 italic">[Brand integration — natural mention as one example/solution, not the hero]</p>
        </div>
      )}

      {/* Closing — thought-provoking takeaway, NOT a sales pitch */}
      {closing ? (
        <InlineEditableSection
          entry={closing}
          render={(text) => (
            <p className="text-base text-gray-800 leading-relaxed mb-6 font-medium">
              {text}
            </p>
          )}
        />
      ) : (
        <p className="text-base text-gray-400 italic mb-6">[Closing — forward-looking statement or call-to-reflection, not sales pitch]</p>
      )}

      {/* Disclosure position note — meta-info shown to user, not part of rendered article */}
      {disclosurePosition && (
        <div className="border-t border-gray-200 pt-4 mt-6">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Disclosure placement note</p>
          <InlineEditableSection
            entry={disclosurePosition}
            render={(text) => (
              <p className="text-xs text-gray-600 italic leading-relaxed">{text}</p>
            )}
          />
        </div>
      )}

      {/* Publisher-style action bar */}
      <div className="border-t border-gray-200 mt-6 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Bookmark className="h-4 w-4" />
            Save
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="h-4 w-4" />
            Share
          </span>
        </div>
        <button type="button" className="text-sm text-blue-600 font-semibold hover:underline flex items-center gap-1">
          Read more from {name}
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <AdditionalComponentsSection handledGroups={HANDLED_GROUPS} />
    </article>
  );
}

function NativeAdSkeleton() {
  return (
    <article className="mx-auto w-full max-w-2xl bg-white animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
      <div className="h-10 w-full bg-gray-200 rounded mb-3" />
      <div className="h-10 w-4/5 bg-gray-200 rounded mb-3" />
      <div className="h-5 w-3/4 bg-gray-200 rounded mb-5" />
      <div className="h-12 w-48 bg-gray-200 rounded mb-5" />
      <div className="h-64 w-full bg-gray-200 rounded-lg mb-6" />
      <div className="space-y-2 mb-5">
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-5/6 bg-gray-200 rounded" />
      </div>
      <div className="space-y-2 mb-6">
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-11/12 bg-gray-200 rounded" />
        <div className="h-4 w-4/5 bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
      </div>
    </article>
  );
}
