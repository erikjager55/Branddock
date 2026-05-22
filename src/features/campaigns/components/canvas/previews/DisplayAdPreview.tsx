'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { InlineEditableSection, useEditableEntry, type InlineEditableEntry } from './InlineEditableSection';
import { AdditionalComponentsSection } from './AdditionalComponentsSection';
import { stripMarkdownForPlainText } from '../../../lib/strip-markdown';
import { Sparkles, Layout, FileText, Tag, ImageIcon } from 'lucide-react';

const CTA_BG = '#0D9488';

const HANDLED_GROUPS = [
  'short-headline-1', 'short-headline-2', 'short-headline-3', 'short-headline-4', 'short-headline-5',
  'long-headline',
  'description-1', 'description-2', 'description-3', 'description-4', 'description-5',
  'business-name',
  'image',
  // Suppress legacy per-size groups that may linger from older generations
  'leaderboard-headline', 'leaderboard-cta', 'leaderboard-visual',
  'rectangle-headline', 'rectangle-body', 'rectangle-cta', 'rectangle-visual',
  'skyscraper-headline', 'skyscraper-body', 'skyscraper-cta', 'skyscraper-visual',
  // Suppress generic fallbacks the model might emit
  'headline', 'body', 'description', 'cta', 'cta-button',
];

interface AssetSlot {
  group: string;
  entry: InlineEditableEntry | null;
  maxLength: number;
  label: string;
}

/**
 * Google Responsive Display Ad (RDA) asset-library preview. Shows all
 * 13 component slots — 5 short headlines, 1 long headline, 5
 * descriptions, 1 business name, 1 image direction — plus a
 * "sample rendering" panel showing how Google's ML might compose the
 * assets in a feed-card placement. Replaces the legacy 3-fixed-banner
 * mockup (728×90/300×250/160×600) which doesn't reflect how RDA works.
 */
export function DisplayAdPreview({ isGenerating, heroImage, onAddImage, brandName, imageVariants }: PlatformPreviewProps) {
  // Hooks must be called directly in the component body (not in map/loop/
  // callback) — react-hooks/rules-of-hooks. Call each useEditableEntry
  // explicitly, then assemble into asset-slot arrays.
  const sh1 = useEditableEntry('short-headline-1');
  const sh2 = useEditableEntry('short-headline-2');
  const sh3 = useEditableEntry('short-headline-3');
  const sh4 = useEditableEntry('short-headline-4');
  const sh5 = useEditableEntry('short-headline-5');
  const longHeadline = useEditableEntry('long-headline');
  const d1 = useEditableEntry('description-1');
  const d2 = useEditableEntry('description-2');
  const d3 = useEditableEntry('description-3');
  const d4 = useEditableEntry('description-4');
  const d5 = useEditableEntry('description-5');
  const businessName = useEditableEntry('business-name');

  const shortHeadlines: AssetSlot[] = [
    { group: 'short-headline-1', entry: sh1, maxLength: 30, label: 'Short headline 1' },
    { group: 'short-headline-2', entry: sh2, maxLength: 30, label: 'Short headline 2' },
    { group: 'short-headline-3', entry: sh3, maxLength: 30, label: 'Short headline 3' },
    { group: 'short-headline-4', entry: sh4, maxLength: 30, label: 'Short headline 4' },
    { group: 'short-headline-5', entry: sh5, maxLength: 30, label: 'Short headline 5' },
  ];
  const descriptions: AssetSlot[] = [
    { group: 'description-1', entry: d1, maxLength: 90, label: 'Description 1' },
    { group: 'description-2', entry: d2, maxLength: 90, label: 'Description 2' },
    { group: 'description-3', entry: d3, maxLength: 90, label: 'Description 3' },
    { group: 'description-4', entry: d4, maxLength: 90, label: 'Description 4' },
    { group: 'description-5', entry: d5, maxLength: 90, label: 'Description 5' },
  ];

  const name = brandName ?? 'Brand Name';
  const initial = name.charAt(0).toUpperCase();
  const selectedImage = imageVariants.find((img) => img.isSelected);
  const imageUrl = selectedImage?.url ?? heroImage?.url ?? null;

  if (isGenerating) {
    return <DisplayAdSkeleton />;
  }

  const filledShorts = shortHeadlines.filter((s) => s.entry).length;
  const filledDescriptions = descriptions.filter((s) => s.entry).length;
  const strength = computeAdStrength(filledShorts, filledDescriptions, !!longHeadline, !!businessName, !!imageUrl);

  // Pick assets for the sample-rendering panel: first available short
  // headline + first available description + the business name.
  const sampleShort = shortHeadlines.find((s) => s.entry)?.entry ?? null;
  const sampleDescription = descriptions.find((s) => s.entry)?.entry ?? null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-2">
      <AdStrengthBadge strength={strength} filledShorts={filledShorts} filledDescriptions={filledDescriptions} hasLong={!!longHeadline} hasBusinessName={!!businessName} hasImage={!!imageUrl} />

      <AssetSection icon={Layout} title="Short headlines" subtitle="Each ≤30 chars · Google rotates pairs · 5 distinct angles drives Excellent">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {shortHeadlines.map((slot, idx) => (
            <AssetRow key={slot.group} slot={slot} required={idx === 0} />
          ))}
        </div>
      </AssetSection>

      <AssetSection icon={Sparkles} title="Long headline" subtitle="≤90 chars · single asset · used in placements that allow extended text">
        {longHeadline ? (
          <InlineEditableSection
            entry={longHeadline}
            render={(text) => (
              <p className="text-base text-gray-900 leading-snug">{stripMarkdownForPlainText(text)}</p>
            )}
          />
        ) : (
          <EmptySlotMessage required label="Long headline" />
        )}
      </AssetSection>

      <AssetSection icon={FileText} title="Descriptions" subtitle="Each ≤90 chars · 5 distinct slots add new info per row">
        <div className="space-y-2">
          {descriptions.map((slot, idx) => (
            <AssetRow key={slot.group} slot={slot} required={idx === 0} />
          ))}
        </div>
      </AssetSection>

      <AssetSection icon={Tag} title="Business name" subtitle="≤25 chars · appears in ad header">
        {businessName ? (
          <InlineEditableSection
            entry={businessName}
            render={(text) => (
              <p className="text-base font-semibold text-gray-900">{stripMarkdownForPlainText(text)}</p>
            )}
          />
        ) : (
          <EmptySlotMessage required label="Business name" />
        )}
      </AssetSection>

      <AssetSection icon={ImageIcon} title="Sample rendering" subtitle="How Google might compose your assets in an in-feed placement">
        <SampleAdCard
          imageUrl={imageUrl}
          onAddImage={onAddImage}
          name={(businessName?.content?.trim()) || name}
          initial={initial}
          shortHeadline={sampleShort}
          description={sampleDescription}
        />
      </AssetSection>

      <AdditionalComponentsSection handledGroups={HANDLED_GROUPS} />
    </div>
  );
}

interface AdStrengthInfo {
  label: 'Incomplete' | 'Poor' | 'Average' | 'Good' | 'Excellent';
  score: number;
  color: string;
  bg: string;
}

function computeAdStrength(
  filledShorts: number,
  filledDescriptions: number,
  hasLong: boolean,
  hasBusinessName: boolean,
  hasImage: boolean,
): AdStrengthInfo {
  if (!hasImage || !hasBusinessName || filledShorts === 0 || filledDescriptions === 0 || !hasLong) {
    return { label: 'Incomplete', score: 0, color: '#6B7280', bg: '#F3F4F6' };
  }
  // Google Ad Strength heuristic — primary signal is quantity + diversity
  // of headlines + descriptions. We approximate with filled-slot counts.
  const headlineScore = (filledShorts / 5) * 50;
  const descriptionScore = (filledDescriptions / 5) * 40;
  const longHeadlineScore = hasLong ? 10 : 0;
  const score = Math.round(headlineScore + descriptionScore + longHeadlineScore);
  if (score >= 90) return { label: 'Excellent', score, color: '#16A34A', bg: '#DCFCE7' };
  if (score >= 70) return { label: 'Good', score, color: '#CA8A04', bg: '#FEF3C7' };
  if (score >= 40) return { label: 'Average', score, color: '#EA580C', bg: '#FED7AA' };
  return { label: 'Poor', score, color: '#DC2626', bg: '#FECACA' };
}

function AdStrengthBadge({
  strength,
  filledShorts,
  filledDescriptions,
  hasLong,
  hasBusinessName,
  hasImage,
}: {
  strength: AdStrengthInfo;
  filledShorts: number;
  filledDescriptions: number;
  hasLong: boolean;
  hasBusinessName: boolean;
  hasImage: boolean;
}) {
  const missing: string[] = [];
  if (filledShorts < 5) missing.push(`${5 - filledShorts} short headline${5 - filledShorts === 1 ? '' : 's'}`);
  if (filledDescriptions < 5) missing.push(`${5 - filledDescriptions} description${5 - filledDescriptions === 1 ? '' : 's'}`);
  if (!hasLong) missing.push('long headline');
  if (!hasBusinessName) missing.push('business name');
  if (!hasImage) missing.push('image');

  return (
    <div className="rounded-lg border border-gray-200 p-3 flex items-center justify-between" style={{ backgroundColor: strength.bg }}>
      <div className="flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: strength.color }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: strength.color }}>
            Ad Strength: {strength.label} {strength.label !== 'Incomplete' && `· ${strength.score}/100`}
          </p>
          {missing.length > 0 && (
            <p className="text-xs text-gray-600 mt-0.5">Add {missing.join(', ')} to boost Ad Strength.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetSection({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-2 mb-3">
        <Icon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function AssetRow({ slot, required }: { slot: AssetSlot; required: boolean }) {
  if (!slot.entry) {
    return <EmptySlotMessage required={required} label={slot.label} />;
  }
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wide text-gray-400 flex-shrink-0">{slot.label}</span>
      <InlineEditableSection
        entry={slot.entry}
        render={(text) => {
          const clean = stripMarkdownForPlainText(text);
          const overCap = clean.length > slot.maxLength;
          return (
            <span className={`text-sm leading-snug ${overCap ? 'text-red-600' : 'text-gray-900'}`}>
              {clean}
              {overCap && <span className="text-[10px] ml-1 text-red-500">({clean.length}/{slot.maxLength})</span>}
            </span>
          );
        }}
      />
    </div>
  );
}

function EmptySlotMessage({ required, label }: { required?: boolean; label: string }) {
  return (
    <p className={`text-xs italic ${required ? 'text-amber-600' : 'text-gray-400'}`}>
      [{label}] {required ? 'required for Ad Strength' : 'optional — boosts Ad Strength'}
    </p>
  );
}

function SampleAdCard({
  imageUrl,
  onAddImage,
  name,
  initial,
  shortHeadline,
  description,
}: {
  imageUrl: string | null;
  onAddImage?: () => void;
  name: string;
  initial: string;
  shortHeadline: InlineEditableEntry | null;
  description: InlineEditableEntry | null;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mx-auto" style={{ maxWidth: '380px' }}>
      <div style={{ aspectRatio: '1.91 / 1' }}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <HeroImageSlot image={null} onAddImage={onAddImage} aspectRatio="aspect-[1.91/1]" rounded="rounded-none" />
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: CTA_BG }}>
            <span className="text-[10px] font-bold text-white">{initial}</span>
          </div>
          <p className="text-xs font-semibold text-gray-700 truncate">{name}</p>
          <span className="text-[10px] text-gray-400 ml-auto">Ad · Sponsored</span>
        </div>
        {shortHeadline ? (
          <InlineEditableSection
            entry={shortHeadline}
            render={(text) => (
              <p className="text-base font-semibold text-gray-900 leading-tight line-clamp-2">{stripMarkdownForPlainText(text)}</p>
            )}
          />
        ) : (
          <p className="text-sm text-gray-400 italic">[short headline]</p>
        )}
        {description ? (
          <InlineEditableSection
            entry={description}
            render={(text) => (
              <p className="text-xs text-gray-600 leading-snug line-clamp-2">{stripMarkdownForPlainText(text)}</p>
            )}
          />
        ) : (
          <p className="text-xs text-gray-400 italic">[description]</p>
        )}
        <button
          type="button"
          className="w-full mt-2 px-3 py-2 text-sm font-semibold rounded text-white"
          style={{ backgroundColor: CTA_BG }}
        >
          Learn More
        </button>
      </div>
    </div>
  );
}

function DisplayAdSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-2 animate-pulse">
      <div className="h-14 bg-gray-200 rounded-lg" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="h-3 w-32 bg-gray-200 rounded mb-3" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-200 rounded" />
            <div className="h-3 w-4/5 bg-gray-200 rounded" />
            <div className="h-3 w-3/4 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
