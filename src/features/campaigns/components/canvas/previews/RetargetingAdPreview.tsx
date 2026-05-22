'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { InlineEditableSection, useEditableEntry, type InlineEditableEntry } from './InlineEditableSection';
import { AdditionalComponentsSection } from './AdditionalComponentsSection';
import { stripMarkdownForPlainText } from '../../../lib/strip-markdown';
import { ShoppingCart, Eye, UserCheck, Clock, Gift } from 'lucide-react';

const HANDLED_GROUPS = [
  'cart-abandoner-primary-text', 'cart-abandoner-headline', 'cart-abandoner-cta',
  'cart-abandoner-creative-direction', 'cart-abandoner-offer-strategy', 'cart-abandoner-frequency-cap',
  'page-visitor-primary-text', 'page-visitor-headline', 'page-visitor-cta',
  'page-visitor-creative-direction', 'page-visitor-offer-strategy', 'page-visitor-frequency-cap',
  'past-customer-primary-text', 'past-customer-headline', 'past-customer-cta',
  'past-customer-creative-direction', 'past-customer-offer-strategy', 'past-customer-frequency-cap',
  'image',
  // Suppress generic fallbacks the model might emit
  'primary-text', 'headline', 'description', 'cta', 'cta-button', 'body',
];

interface ScenarioSlots {
  primaryText: InlineEditableEntry | null;
  headline: InlineEditableEntry | null;
  cta: InlineEditableEntry | null;
  creativeDirection: InlineEditableEntry | null;
  offerStrategy: InlineEditableEntry | null;
  frequencyCap: InlineEditableEntry | null;
}

/**
 * Retargeting ad preview — 3 audience scenarios (cart abandoners,
 * page visitors, past customers) side-by-side. Each scenario is a
 * fundamentally different emotional state and gets its own primary
 * text + headline + CTA + creative-direction + offer-strategy +
 * frequency-cap. The hero image is shared across audiences (different
 * audience-targeting, same creative asset).
 */
export function RetargetingAdPreview({ isGenerating, heroImage, onAddImage, brandName, imageVariants }: PlatformPreviewProps) {
  // Hooks unrolled explicitly (react-hooks/rules-of-hooks) — 18 hook calls
  const cartPrimary = useEditableEntry('cart-abandoner-primary-text');
  const cartHeadline = useEditableEntry('cart-abandoner-headline');
  const cartCta = useEditableEntry('cart-abandoner-cta');
  const cartCreative = useEditableEntry('cart-abandoner-creative-direction');
  const cartOffer = useEditableEntry('cart-abandoner-offer-strategy');
  const cartFrequency = useEditableEntry('cart-abandoner-frequency-cap');

  const pagePrimary = useEditableEntry('page-visitor-primary-text');
  const pageHeadline = useEditableEntry('page-visitor-headline');
  const pageCta = useEditableEntry('page-visitor-cta');
  const pageCreative = useEditableEntry('page-visitor-creative-direction');
  const pageOffer = useEditableEntry('page-visitor-offer-strategy');
  const pageFrequency = useEditableEntry('page-visitor-frequency-cap');

  const pastPrimary = useEditableEntry('past-customer-primary-text');
  const pastHeadline = useEditableEntry('past-customer-headline');
  const pastCta = useEditableEntry('past-customer-cta');
  const pastCreative = useEditableEntry('past-customer-creative-direction');
  const pastOffer = useEditableEntry('past-customer-offer-strategy');
  const pastFrequency = useEditableEntry('past-customer-frequency-cap');

  const name = brandName ?? 'Brand Name';
  const selectedImage = imageVariants.find((img) => img.isSelected);
  const imageUrl = selectedImage?.url ?? heroImage?.url ?? null;

  if (isGenerating) {
    return <RetargetingAdSkeleton />;
  }

  const cartScenario: ScenarioSlots = {
    primaryText: cartPrimary,
    headline: cartHeadline,
    cta: cartCta,
    creativeDirection: cartCreative,
    offerStrategy: cartOffer,
    frequencyCap: cartFrequency,
  };
  const pageScenario: ScenarioSlots = {
    primaryText: pagePrimary,
    headline: pageHeadline,
    cta: pageCta,
    creativeDirection: pageCreative,
    offerStrategy: pageOffer,
    frequencyCap: pageFrequency,
  };
  const pastScenario: ScenarioSlots = {
    primaryText: pastPrimary,
    headline: pastHeadline,
    cta: pastCta,
    creativeDirection: pastCreative,
    offerStrategy: pastOffer,
    frequencyCap: pastFrequency,
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-2">
      <div className="rounded-lg border border-gray-200 bg-blue-50 p-3 text-xs text-blue-900">
        <strong>Retargeting brief.</strong> Three audience scenarios with distinct emotional states — never combine into one ad set. Same hero image, different copy and offer-strategy per audience.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ScenarioCard
          icon={ShoppingCart}
          color="#DC2626"
          bgColor="#FEF2F2"
          label="Cart Abandoner"
          subtitle="Felt desire · hit friction · address SPECIFIC barrier"
          slots={cartScenario}
          imageUrl={imageUrl}
          onAddImage={onAddImage}
          brandName={name}
        />
        <ScenarioCard
          icon={Eye}
          color="#CA8A04"
          bgColor="#FEF3C7"
          label="Page Visitor"
          subtitle="Curious · not convinced · provide proof they didn't see"
          slots={pageScenario}
          imageUrl={imageUrl}
          onAddImage={onAddImage}
          brandName={name}
        />
        <ScenarioCard
          icon={UserCheck}
          color="#16A34A"
          bgColor="#DCFCE7"
          label="Past Customer"
          subtitle="Trusted you · NEVER same-product · novelty/upsell only"
          slots={pastScenario}
          imageUrl={imageUrl}
          onAddImage={onAddImage}
          brandName={name}
        />
      </div>

      <AdditionalComponentsSection handledGroups={HANDLED_GROUPS} />
    </div>
  );
}

function ScenarioCard({
  icon: Icon,
  color,
  bgColor,
  label,
  subtitle,
  slots,
  imageUrl,
  onAddImage,
  brandName,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bgColor: string;
  label: string;
  subtitle: string;
  slots: ScenarioSlots;
  imageUrl: string | null;
  onAddImage?: () => void;
  brandName: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
      <div className="px-3 py-2.5 flex items-start gap-2.5" style={{ backgroundColor: bgColor }}>
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color }} />
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color }}>{label}</p>
          <p className="text-[10px] text-gray-600 leading-snug">{subtitle}</p>
        </div>
      </div>

      <div style={{ aspectRatio: '1.91 / 1' }}>
        {imageUrl ? (
          <img src={imageUrl} alt={brandName} className="w-full h-full object-cover" />
        ) : (
          <HeroImageSlot image={null} onAddImage={onAddImage} aspectRatio="aspect-[1.91/1]" rounded="rounded-none" />
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col gap-3">
        {slots.primaryText ? (
          <InlineEditableSection
            entry={slots.primaryText}
            render={(text) => (
              <p className="text-sm text-gray-800 leading-relaxed">{stripMarkdownForPlainText(text)}</p>
            )}
          />
        ) : (
          <p className="text-xs text-gray-400 italic">[primary text]</p>
        )}

        {slots.headline ? (
          <InlineEditableSection
            entry={slots.headline}
            render={(text) => (
              <p className="text-base font-bold text-gray-900 leading-tight">{stripMarkdownForPlainText(text)}</p>
            )}
          />
        ) : (
          <p className="text-sm text-gray-400 italic">[headline]</p>
        )}

        {slots.cta ? (
          <InlineEditableSection
            entry={slots.cta}
            size="compact"
            render={(text) => (
              <button
                type="button"
                className="self-start px-3 py-1.5 text-sm font-semibold rounded text-white"
                style={{ backgroundColor: color }}
              >
                {stripMarkdownForPlainText(text).slice(0, 24)}
              </button>
            )}
          />
        ) : (
          <button type="button" className="self-start px-3 py-1.5 text-sm font-semibold rounded text-white" style={{ backgroundColor: color }}>
            [CTA]
          </button>
        )}

        <div className="border-t border-gray-100 pt-2 mt-1 space-y-2">
          <MetaRow
            icon={Gift}
            label="Offer strategy"
            entry={slots.offerStrategy}
          />
          <MetaRow
            icon={Clock}
            label="Frequency cap"
            entry={slots.frequencyCap}
          />
          <MetaRow
            icon={Eye}
            label="Creative direction"
            entry={slots.creativeDirection}
          />
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  entry,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  entry: InlineEditableEntry | null;
}) {
  if (!entry) return null;
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <Icon className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <InlineEditableSection
          entry={entry}
          render={(text) => (
            <p className="text-xs text-gray-700 leading-snug">{stripMarkdownForPlainText(text)}</p>
          )}
        />
      </div>
    </div>
  );
}

function RetargetingAdSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-2 animate-pulse">
      <div className="h-10 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="h-12 bg-gray-200" />
            <div className="aspect-[1.91/1] bg-gray-200" />
            <div className="p-3 space-y-2">
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-5/6 bg-gray-200 rounded" />
              <div className="h-4 w-2/3 bg-gray-200 rounded mt-2" />
              <div className="h-8 w-20 bg-gray-200 rounded mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
