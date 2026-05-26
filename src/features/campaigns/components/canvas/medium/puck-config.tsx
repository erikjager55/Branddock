'use client';

import type { Config } from '@puckeditor/core';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import ReactMarkdown from 'react-markdown';
import {
  extractBrandTokensFromContext,
  type BrandTokens,
} from '@/lib/landing-pages/brand-tokens';
import { computeBrandRenderHints } from '@/lib/landing-pages/brand-render-rules';
import { IconBlock } from './lucide-icon-map';

// ─── Component prop types ────────────────────────────────────

export type SpikeBrandHeroProps = {
  headline: string;
  sub: string;
  ctaLabel: string;
  /** Optional hero-visual URL (afbeelding of GIF). Fase 5 spec §4a v2-stap;
   *  v2 wordt dit een dedicated animatie-slot. */
  heroVisualUrl?: string;
};

export type SpikeBrandCtaProps = {
  label: string;
  href: string;
  personaId: string;
  /** Optional risico-reductie subhead ("Geen creditcard nodig"). Fase 5
   *  spec §4a — voorheen werd dit als losse RichText onder de CTA gerenderd. */
  riskReducer?: string;
};

export type FeatureItem = {
  title: string;
  description: string;
  /** Optional lucide-icon naam (bv "zap", "shield", "users"). MVP rendert
   *  alleen het label; v2 voegt dynamic lucide-icon rendering toe. */
  icon?: string;
};
export type FeatureGridProps = {
  columns: '2' | '3' | '4';
  features: FeatureItem[];
};

export type TestimonialProps = {
  quote: string;
  author: string;
  personaId: string;
};

export type PricingTier = {
  name: string;
  price: string;
  features: string;
  /** Decoy-effect highlight (spec §1 #16). Middle-tier krijgt highlighted=true
   *  voor sterkere visuele aandacht. Optional voor backward-compat. */
  highlighted?: boolean;
};
export type PricingTableProps = {
  tiers: PricingTier[];
};

export type FaqItem = { question: string; answer: string };
export type FAQProps = {
  items: FaqItem[];
};

export type FooterLink = { label: string; href: string };
export type FooterProps = {
  companyName: string;
  tagline: string;
  links: FooterLink[];
};

export type RichTextProps = {
  content: string;
};

export type SpikePuckProps = {
  BrandHero: SpikeBrandHeroProps;
  BrandCTA: SpikeBrandCtaProps;
  FeatureGrid: FeatureGridProps;
  Testimonial: TestimonialProps;
  PricingTable: PricingTableProps;
  FAQ: FAQProps;
  Footer: FooterProps;
  RichText: RichTextProps;
};

// ─── Config builder ──────────────────────────────────────────

/**
 * Build a brand-aware Puck config by closure-capturing the workspace
 * CanvasContextStack. All 8 components consume tokens via the captured
 * `tokens` constant; persona-bound components read from `ctx.personas`.
 *
 * Phase 2 (per ADR 2026-05-22-landing-page-builder-architectuur):
 *  - Structurele brand-tokens via extractBrandTokensFromStyleguide (server)
 *    of regex-fallback via extractBrandTokensFromContext (client).
 *  - 8 components: BrandHero, BrandCTA, FeatureGrid, Testimonial,
 *    PricingTable, FAQ, Footer, RichText.
 *  - Persona-select fields gebruiken Puck `select` (omzeilt v0.21.2
 *    `external` field typing-issue gevonden in spike).
 */
export function buildSpikePuckConfig(
  ctx: CanvasContextStack | null,
): Config<SpikePuckProps> {
  const tokens: BrandTokens = ctx?.brandTokens ?? extractBrandTokensFromContext(ctx?.brand);
  const personas = ctx?.personas ?? [];
  const personaOptions = [
    { label: '— Geen persona —', value: '' },
    ...personas.map((p) => ({ label: p.name, value: p.id })),
  ];

  return {
    components: {
      BrandHero: brandHeroComponent(tokens),
      BrandCTA: brandCtaComponent(tokens, personas, personaOptions),
      FeatureGrid: featureGridComponent(tokens),
      Testimonial: testimonialComponent(tokens, personas, personaOptions),
      PricingTable: pricingTableComponent(tokens),
      FAQ: faqComponent(tokens),
      Footer: footerComponent(tokens),
      RichText: richTextComponent(tokens),
    },
  };
}

// ─── Component definitions ───────────────────────────────────

/**
 * BrandHero — brand-emergent render (Pad C Sub-Sprint B Phase 3).
 *
 * Consumeert computeBrandRenderHints(archetype, designSystem) zodat de
 * visuele beslissingen (background-type, text-positie, typography-emphasis,
 * button-shape) emergeren uit brand-archetype + layoutStyle. Geen
 * hardcoded template — elke combinatie produceert eigen visuele uitstraling.
 *
 * Vier hero-layouts:
 *  - full-bleed-image: foto met overlay-gradient (RULER/MAGICIAN/EXPLORER/HERO/
 *    LOVER/OUTLAW × MINIMAL/EDITORIAL/EXPERIENTIAL) — Zwarthout-stijl premium
 *  - solid-brand: brand-color fill (COMMERCIAL altijd; default fallback)
 *  - solid-surface: wit/light met dark text (SAGE/CARETAKER × MINIMAL/EDITORIAL)
 *  - gradient-brand: brand-color gradient (INNOCENT/JESTER × PLAYFUL)
 *
 * Backward-compat: tokens zonder v3 designSystem → fallback solid-brand
 * pattern uit v2-render (zelfde gedrag als pre-Pad-C).
 */
function brandHeroComponent(tokens: BrandTokens) {
  const hints = computeBrandRenderHints(tokens.archetype, tokens.designSystem);
  const { heroLayout, displayTypography, buttonStyle, sectionPadding } = hints;
  const ds = tokens.designSystem;

  // Section padding op basis van layoutStyle (sparse = grote, tight = klein)
  const sectionPaddingY = sectionPadding;
  const sectionPaddingX = ds.spacing[Math.min(ds.spacing.length - 1, 5)] ?? 32;

  return {
    fields: {
      headline: { type: 'text' as const },
      sub: { type: 'textarea' as const },
      ctaLabel: { type: 'text' as const },
      heroVisualUrl: { type: 'text' as const },
    },
    defaultProps: {
      headline: 'Headline placeholder',
      sub: 'Subtitle placeholder',
      ctaLabel: 'Get started',
      heroVisualUrl: '',
    },
    render: ({ headline, sub, ctaLabel, heroVisualUrl }: SpikeBrandHeroProps) => {
      // ── Resolve background-style ──────────────────────────
      const hasHeroVisual = !!heroVisualUrl && heroVisualUrl.trim().length > 0;
      const useFullBleed = heroLayout.background === 'full-bleed-image' && hasHeroVisual;
      const usePlaceholderFrame =
        heroLayout.background === 'full-bleed-image' && !hasHeroVisual
        && ds.imageStrategy.placeholderStyle === 'dark-framed';

      let sectionBg: string;
      let sectionColor: string;
      let backgroundImage: string | undefined;
      if (useFullBleed) {
        // Foto met overlay-gradient (Zwarthout-pattern)
        const onSurfaceRGB = hexToRgbString(tokens.onSurface);
        const overlay = heroLayout.overlayOpacity;
        backgroundImage = `linear-gradient(to top, rgba(${onSurfaceRGB},${overlay}) 0%, rgba(${onSurfaceRGB},0.2) 100%), url(${heroVisualUrl})`;
        sectionBg = tokens.onSurface;  // donker fallback bg
        sectionColor = '#FFFFFF';      // wit op donkere overlay altijd safe
      } else if (usePlaceholderFrame) {
        // Donker architectuur-frame placeholder (RULER/MAGICIAN style)
        sectionBg = tokens.onSurface;
        sectionColor = '#FFFFFF';
      } else if (heroLayout.background === 'solid-surface') {
        sectionBg = tokens.surface;
        sectionColor = tokens.onSurface;
      } else if (heroLayout.background === 'gradient-brand') {
        const brandRGB = hexToRgbString(tokens.brand);
        backgroundImage = `linear-gradient(135deg, rgba(${brandRGB},1) 0%, ${tokens.brandSubtle} 100%)`;
        sectionBg = tokens.brand;
        sectionColor = tokens.onBrand;
      } else {
        // solid-brand (default)
        sectionBg = tokens.brand;
        sectionColor = tokens.onBrand;
      }

      // ── Flex-alignment op basis van hint ───────────────────
      const justifyContent =
        heroLayout.textVerticalPosition === 'top' ? 'flex-start'
        : heroLayout.textVerticalPosition === 'bottom' ? 'flex-end'
        : 'center';
      const alignItems =
        heroLayout.textAlignment === 'left' ? 'flex-start'
        : heroLayout.textAlignment === 'right' ? 'flex-end'
        : 'center';

      // ── Typography uit hints ───────────────────────────────
      // Brand-specifieke fonts (tokens.headingFont/bodyFont uit styleguide
      // primaryFontName) overrulen layoutStyle-default display-font wanneer
      // expliciet ingesteld. system-ui = default = niet expliciet.
      const isCustomHeadingFont = !tokens.headingFont.includes('system-ui');
      const isCustomBodyFont = !tokens.bodyFont.includes('system-ui');
      const displayFont = isCustomHeadingFont ? tokens.headingFont : ds.typography.display.fontFamily;
      const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
      const subSize = ds.typography.body.sizes[Math.min(ds.typography.body.sizes.length - 1, 2)] ?? 18;
      const subWeight = ds.typography.body.weights[0] ?? 400;

      // ── Section style ──────────────────────────────────────
      const sectionStyle: React.CSSProperties = {
        background: backgroundImage ?? sectionBg,
        backgroundSize: backgroundImage ? 'cover' : undefined,
        backgroundPosition: backgroundImage ? 'center' : undefined,
        color: sectionColor,
        fontFamily: displayFont,
        padding: `${sectionPaddingY}px ${sectionPaddingX}px`,
        minHeight: heroLayout.fullViewportHeight ? '100vh' : undefined,
        display: 'flex',
        flexDirection: 'column',
        justifyContent,
        alignItems,
        textAlign: heroLayout.textAlignment,
        position: 'relative',
      };

      // ── Button-style uit hints ─────────────────────────────
      const buttonRender: React.CSSProperties = {
        background: useFullBleed || sectionBg === tokens.onSurface ? '#FFFFFF' : tokens.onBrand,
        color: useFullBleed || sectionBg === tokens.onSurface ? tokens.onSurface : tokens.brand,
        fontFamily: ds.typography.label.fontFamily,
        fontWeight: buttonStyle.fontWeight,
        fontSize: 16,
        border: 'none',
        padding: `${buttonStyle.paddingY}px ${buttonStyle.paddingX}px`,
        borderRadius: buttonStyle.radiusPx,
        cursor: 'pointer',
        textTransform: buttonStyle.textTransform,
        letterSpacing: buttonStyle.letterSpacing,
        textDecoration: buttonStyle.underlineHover ? 'underline' : 'none',
        textUnderlineOffset: buttonStyle.underlineHover ? '4px' : undefined,
      };

      return (
        <section style={sectionStyle}>
          {usePlaceholderFrame ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.3)',
                fontFamily: ds.typography.label.fontFamily,
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                pointerEvents: 'none',
              }}
            >
              {ds.imageStrategy.placeholderLabel}
            </div>
          ) : null}
          <div style={{ position: 'relative', maxWidth: 800, width: '100%' }}>
            <h1
              style={{
                fontSize: displayTypography.size,
                lineHeight: displayTypography.lineHeight,
                fontWeight: displayTypography.weight,
                letterSpacing: displayTypography.letterSpacing,
                margin: `0 0 ${ds.spacing[Math.min(ds.spacing.length - 1, 3)] ?? 16}px`,
              }}
            >
              {headline}
            </h1>
            <p
              style={{
                fontFamily: bodyFont,
                fontSize: subSize,
                lineHeight: ds.typography.body.lineHeight,
                fontWeight: subWeight,
                maxWidth: 560,
                margin: heroLayout.textAlignment === 'center'
                  ? `0 auto ${ds.spacing[Math.min(ds.spacing.length - 1, 4)] ?? 24}px`
                  : `0 0 ${ds.spacing[Math.min(ds.spacing.length - 1, 4)] ?? 24}px`,
                opacity: useFullBleed ? 0.85 : 0.95,
              }}
            >
              {sub}
            </p>
            <button type="button" style={buttonRender}>
              {ctaLabel}
            </button>
          </div>
        </section>
      );
    },
  };
}

function hexToRgbString(hex: string): string {
  const cleaned = hex.replace(/^#/, '');
  if (cleaned.length !== 6) return '0,0,0';
  const num = parseInt(cleaned, 16);
  if (Number.isNaN(num)) return '0,0,0';
  return `${(num >> 16) & 0xff},${(num >> 8) & 0xff},${num & 0xff}`;
}

/**
 * BrandCTA — brand-emergent (Pad C Sub-Sprint B Phase 4).
 * Consumeert buttonStyle + sectionPadding hints; button-shape/typography
 * passen bij archetype (RULER uppercase 0.1em / JESTER lowercase friendly).
 */
function brandCtaComponent(
  tokens: BrandTokens,
  personas: { id: string; name: string; avatarUrl: string | null }[],
  personaOptions: { label: string; value: string }[],
) {
  const hints = computeBrandRenderHints(tokens.archetype, tokens.designSystem);
  const { buttonStyle, sectionPadding } = hints;
  const ds = tokens.designSystem;
  const sectionPaddingX = ds.spacing[Math.min(ds.spacing.length - 1, 5)] ?? 32;
  const isCustomBodyFont = !tokens.bodyFont.includes('system-ui');
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;

  return {
    fields: {
      label: { type: 'text' as const },
      href: { type: 'text' as const },
      personaId: { type: 'select' as const, options: personaOptions },
      riskReducer: { type: 'text' as const },
    },
    defaultProps: {
      label: 'Start your trial',
      href: '#',
      personaId: '',
      riskReducer: '',
    },
    render: ({ label, href, personaId, riskReducer }: SpikeBrandCtaProps) => {
      const persona = personas.find((p) => p.id === personaId);
      return (
        <section
          style={{
            padding: `${sectionPadding}px ${sectionPaddingX}px`,
            textAlign: 'center',
            fontFamily: bodyFont,
            background: tokens.surface,
          }}
        >
          {persona ? (
            <p
              style={{
                fontSize: 14,
                color: tokens.surfaceMuted,
                marginBottom: ds.spacing[Math.min(ds.spacing.length - 1, 2)] ?? 12,
                fontStyle: 'italic',
              }}
            >
              Voor: {persona.name}
            </p>
          ) : null}
          <a
            href={href}
            style={{
              display: 'inline-block',
              background: tokens.brand,
              color: tokens.onBrand,
              fontFamily: ds.typography.label.fontFamily,
              fontWeight: buttonStyle.fontWeight,
              fontSize: 16,
              textDecoration: 'none',
              padding: `${buttonStyle.paddingY}px ${buttonStyle.paddingX}px`,
              borderRadius: buttonStyle.radiusPx,
              textTransform: buttonStyle.textTransform,
              letterSpacing: buttonStyle.letterSpacing,
            }}
          >
            {label}
          </a>
          {riskReducer && riskReducer.trim().length > 0 ? (
            <p
              style={{
                marginTop: ds.spacing[Math.min(ds.spacing.length - 1, 2)] ?? 12,
                fontSize: 13,
                color: tokens.surfaceMuted,
                fontFamily: bodyFont,
              }}
            >
              {riskReducer}
            </p>
          ) : null}
        </section>
      );
    },
  };
}

/**
 * FeatureGrid — brand-emergent (Phase 5). Heading-font + spacing + cardStyle
 * consumeren designSystem + archetype.
 */
function featureGridComponent(tokens: BrandTokens) {
  const hints = computeBrandRenderHints(tokens.archetype, tokens.designSystem);
  const { cardStyle, sectionPadding } = hints;
  const ds = tokens.designSystem;
  const sectionPaddingX = ds.spacing[Math.min(ds.spacing.length - 1, 5)] ?? 32;
  const gap = ds.spacing[Math.min(ds.spacing.length - 1, 5)] ?? 32;
  const isCustomHeadingFont = !tokens.headingFont.includes('system-ui');
  const isCustomBodyFont = !tokens.bodyFont.includes('system-ui');
  const headingFont = isCustomHeadingFont ? tokens.headingFont : ds.typography.heading.fontFamily;
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
  const headingSize = ds.typography.heading.sizes[Math.min(ds.typography.heading.sizes.length - 1, 1)] ?? 22;
  const headingWeight = ds.typography.heading.weights[0] ?? 600;
  const bodySize = ds.typography.body.sizes[Math.min(ds.typography.body.sizes.length - 1, 1)] ?? 15;

  return {
    fields: {
      columns: {
        type: 'select' as const,
        options: [
          { label: '2 kolommen', value: '2' },
          { label: '3 kolommen', value: '3' },
          { label: '4 kolommen', value: '4' },
        ],
      },
      features: {
        type: 'array' as const,
        arrayFields: {
          title: { type: 'text' as const },
          description: { type: 'textarea' as const },
          icon: { type: 'text' as const },
        },
        defaultItemProps: { title: 'Feature', description: 'Korte beschrijving', icon: '' },
        getItemSummary: (item: FeatureItem) => item.title || 'Untitled feature',
      },
    },
    defaultProps: {
      columns: '3' as const,
      features: [
        { title: 'Snel', description: 'In minuten opgezet, niet weken.', icon: 'zap' },
        { title: 'Eenvoudig', description: 'Geen technische kennis nodig.', icon: 'sparkles' },
        { title: 'Schaalbaar', description: 'Groeit mee met je business.', icon: 'trending-up' },
      ],
    },
    render: ({ columns, features }: FeatureGridProps) => (
      <section
        style={{
          padding: `${sectionPadding}px ${sectionPaddingX}px`,
          fontFamily: bodyFont,
          background: tokens.surface,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap,
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          {features.map((f, i) => {
            // cardStyle bepaalt of features in cards staan of flat
            const useCard = cardStyle.elevation !== 'flat';
            const cardBoxShadow =
              cardStyle.elevation === 'subtle-shadow' ? '0 2px 8px rgba(0,0,0,0.06)' :
              cardStyle.elevation === 'strong-shadow' ? '0 8px 24px rgba(0,0,0,0.12)' :
              undefined;
            const cardWrapper: React.CSSProperties = useCard ? {
              padding: `${cardStyle.paddingY}px ${cardStyle.paddingX}px`,
              borderRadius: cardStyle.radiusPx,
              border: cardStyle.elevation === 'border-only' ? `${cardStyle.borderWidth}px solid ${tokens.surfaceBorder}` : undefined,
              boxShadow: cardBoxShadow,
              background: tokens.surface,
            } : {};
            return (
              <div key={i} style={cardWrapper}>
                <IconBlock
                  name={f.icon ?? ''}
                  color={tokens.brand}
                  size={28}
                  wrapperStyle={{ marginBottom: 12 }}
                  fallbackTextStyle={{
                    fontSize: 12,
                    color: tokens.brand,
                    fontFamily: ds.typography.label.fontFamily,
                    textTransform: ds.typography.label.textTransform ?? 'uppercase',
                    letterSpacing: ds.typography.label.letterSpacing,
                    marginBottom: 8,
                    fontWeight: 600,
                  }}
                />

                <h3
                  style={{
                    fontFamily: headingFont,
                    fontSize: headingSize,
                    fontWeight: headingWeight,
                    lineHeight: ds.typography.heading.lineHeight,
                    margin: '0 0 8px',
                    color: tokens.onSurface,
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ color: tokens.surfaceMuted, fontSize: bodySize, margin: 0 }}>
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    ),
  };
}

/**
 * Testimonial — brand-emergent (Phase 5). Background uit brandSubtle,
 * blockquote uit heading-typography, alternation-aware.
 */
function testimonialComponent(
  tokens: BrandTokens,
  personas: { id: string; name: string; avatarUrl: string | null }[],
  personaOptions: { label: string; value: string }[],
) {
  const hints = computeBrandRenderHints(tokens.archetype, tokens.designSystem);
  const { sectionPadding } = hints;
  const ds = tokens.designSystem;
  const sectionPaddingX = ds.spacing[Math.min(ds.spacing.length - 1, 5)] ?? 32;
  const isCustomHeadingFont = !tokens.headingFont.includes('system-ui');
  const isCustomBodyFont = !tokens.bodyFont.includes('system-ui');
  const headingFont = isCustomHeadingFont ? tokens.headingFont : ds.typography.heading.fontFamily;
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
  const quoteSize = ds.typography.heading.sizes[Math.min(ds.typography.heading.sizes.length - 1, 1)] ?? 24;

  return {
    fields: {
      quote: { type: 'textarea' as const },
      author: { type: 'text' as const },
      personaId: { type: 'select' as const, options: personaOptions },
    },
    defaultProps: {
      quote: '"Branddock heeft onze launch-snelheid verdubbeld."',
      author: 'Tevreden klant',
      personaId: '',
    },
    render: ({ quote, author, personaId }: TestimonialProps) => {
      const persona = personas.find((p) => p.id === personaId);
      const displayName = persona?.name ?? author;
      const avatarUrl = persona?.avatarUrl ?? null;
      const initial = (displayName || '?').trim().charAt(0).toUpperCase() || '?';
      const avatarSize = 56;
      return (
        <section
          style={{
            background: tokens.brandSubtle,
            padding: `${sectionPadding}px ${sectionPaddingX}px`,
            textAlign: 'center',
            fontFamily: bodyFont,
          }}
        >
          <blockquote
            style={{
              fontFamily: headingFont,
              fontSize: quoteSize,
              lineHeight: ds.typography.heading.lineHeight,
              color: tokens.onSurface,
              maxWidth: 640,
              margin: '0 auto 16px',
              fontStyle: 'italic',
            }}
          >
            {quote}
          </blockquote>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginTop: 12,
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Puck-renderer draait buiten Next image-pipeline (iframe + server-side renderToStaticMarkup voor F-VAL); next/image vereist Next-context die hier niet beschikbaar is
              <img
                src={avatarUrl}
                alt={displayName}
                width={avatarSize}
                height={avatarSize}
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `2px solid ${tokens.surface}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              />
            ) : (
              <div
                aria-hidden="true"
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: '50%',
                  background: tokens.brand,
                  color: tokens.onBrand,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: headingFont,
                  fontSize: Math.round(avatarSize * 0.4),
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {initial}
              </div>
            )}
            <cite
              style={{
                color: tokens.surfaceMuted,
                fontStyle: 'normal',
                fontSize: 14,
                fontFamily: ds.typography.label.fontFamily,
                letterSpacing: ds.typography.label.letterSpacing,
                textTransform: ds.typography.label.textTransform ?? 'none',
                textAlign: 'left',
              }}
            >
              {author}
              {persona && persona.name !== author ? ` · ${persona.name}` : ''}
            </cite>
          </div>
        </section>
      );
    },
  };
}

function pricingTableComponent(tokens: BrandTokens) {
  const hints = computeBrandRenderHints(tokens.archetype, tokens.designSystem);
  const { cardStyle, sectionPadding } = hints;
  const ds = tokens.designSystem;
  const sectionPaddingX = ds.spacing[Math.min(ds.spacing.length - 1, 5)] ?? 32;
  const isCustomHeadingFont = !tokens.headingFont.includes('system-ui');
  const isCustomBodyFont = !tokens.bodyFont.includes('system-ui');
  const headingFont = isCustomHeadingFont ? tokens.headingFont : ds.typography.heading.fontFamily;
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
  return {
    fields: {
      tiers: {
        type: 'array' as const,
        arrayFields: {
          name: { type: 'text' as const },
          price: { type: 'text' as const },
          features: { type: 'textarea' as const },
          highlighted: {
            type: 'radio' as const,
            options: [
              { label: 'Normaal', value: false },
              { label: 'Uitgelicht (decoy-middle)', value: true },
            ],
          },
        },
        defaultItemProps: { name: 'Tier', price: '€0/mnd', features: 'Feature 1\nFeature 2', highlighted: false },
        getItemSummary: (item: PricingTier) =>
          `${item.name} — ${item.price}${item.highlighted ? ' ★' : ''}`,
      },
    },
    defaultProps: {
      tiers: [
        { name: 'Starter', price: '€19/mnd', features: 'Basis features\nE-mail support', highlighted: false },
        { name: 'Pro', price: '€49/mnd', features: 'Alle features\nPriority support', highlighted: true },
      ],
    },
    render: ({ tiers }: PricingTableProps) => (
      <section
        style={{
          padding: `${sectionPadding}px ${sectionPaddingX}px`,
          fontFamily: bodyFont,
          background: tokens.surface,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(Math.max(tiers.length, 1), 4)}, minmax(0, 1fr))`,
            gap: ds.spacing[Math.min(ds.spacing.length - 1, 4)] ?? 24,
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          {tiers.map((t, i) => {
            const baseShadow =
              cardStyle.elevation === 'subtle-shadow' ? '0 2px 8px rgba(0,0,0,0.06)' :
              cardStyle.elevation === 'strong-shadow' ? '0 8px 24px rgba(0,0,0,0.12)' :
              undefined;
            return (
              <div
                key={i}
                style={{
                  border: t.highlighted
                    ? `2px solid ${tokens.brand}`
                    : `1px solid ${tokens.surfaceBorder}`,
                  borderRadius: cardStyle.radiusPx,
                  padding: `${cardStyle.paddingY}px ${cardStyle.paddingX}px`,
                  textAlign: 'center',
                  transform: t.highlighted ? 'scale(1.05)' : 'none',
                  boxShadow: t.highlighted ? `0 8px 24px ${tokens.brand}22` : baseShadow,
                  position: 'relative',
                  background: tokens.surface,
                }}
              >
                {t.highlighted ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: tokens.brand,
                      color: tokens.onBrand,
                      fontSize: 11,
                      fontFamily: ds.typography.label.fontFamily,
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: cardStyle.radiusPx >= 999 ? 999 : 12,
                      textTransform: 'uppercase',
                      letterSpacing: ds.typography.label.letterSpacing,
                    }}
                  >
                    Aanbevolen
                  </div>
                ) : null}
                <h3
                  style={{
                    fontFamily: headingFont,
                    fontSize: 20,
                    margin: '0 0 8px',
                    color: tokens.onSurface,
                  }}
                >
                  {t.name}
                </h3>
                <p
                  style={{
                    fontFamily: headingFont,
                    fontSize: 32,
                    fontWeight: 700,
                    color: tokens.brand,
                    margin: '0 0 16px',
                  }}
                >
                  {t.price}
                </p>
                <div
                  style={{
                    color: tokens.surfaceMuted,
                    fontSize: 14,
                    whiteSpace: 'pre-line',
                    textAlign: 'left',
                    fontFamily: bodyFont,
                  }}
                >
                  {t.features}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    ),
  };
}

/**
 * FAQ — brand-emergent (Phase 6). Heading-typography + designSystem.spacing.
 */
function faqComponent(tokens: BrandTokens) {
  const hints = computeBrandRenderHints(tokens.archetype, tokens.designSystem);
  const { sectionPadding } = hints;
  const ds = tokens.designSystem;
  const sectionPaddingX = ds.spacing[Math.min(ds.spacing.length - 1, 5)] ?? 32;
  const isCustomHeadingFont = !tokens.headingFont.includes('system-ui');
  const isCustomBodyFont = !tokens.bodyFont.includes('system-ui');
  const headingFont = isCustomHeadingFont ? tokens.headingFont : ds.typography.heading.fontFamily;
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
  return {
    fields: {
      items: {
        type: 'array' as const,
        arrayFields: {
          question: { type: 'text' as const },
          answer: { type: 'textarea' as const },
        },
        defaultItemProps: { question: 'Vraag?', answer: 'Antwoord.' },
        getItemSummary: (item: FaqItem) => item.question || 'Untitled question',
      },
    },
    defaultProps: {
      items: [
        { question: 'Hoe werkt het?', answer: 'Zeer eenvoudig.' },
        { question: 'Wat kost het?', answer: 'Zie pricing.' },
      ],
    },
    render: ({ items }: FAQProps) => (
      <section
        style={{
          padding: `${sectionPadding}px ${sectionPaddingX}px`,
          fontFamily: bodyFont,
          background: tokens.surface,
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {items.map((item, i) => (
            <details
              key={i}
              style={{
                borderBottom: `1px solid ${tokens.surfaceBorder}`,
                padding: '16px 0',
              }}
            >
              <summary
                style={{
                  fontFamily: headingFont,
                  fontSize: 18,
                  fontWeight: ds.typography.heading.weights[0] ?? 600,
                  color: tokens.onSurface,
                  cursor: 'pointer',
                }}
              >
                {item.question}
              </summary>
              <p style={{ marginTop: 8, color: tokens.surfaceMuted, fontSize: 15 }}>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    ),
  };
}

/**
 * Footer — brand-emergent (Phase 6). Donker bg uit onSurface, typography
 * uit designSystem.label voor nav-links.
 */
function footerComponent(tokens: BrandTokens) {
  const hints = computeBrandRenderHints(tokens.archetype, tokens.designSystem);
  const ds = tokens.designSystem;
  const isCustomHeadingFont = !tokens.headingFont.includes('system-ui');
  const isCustomBodyFont = !tokens.bodyFont.includes('system-ui');
  const headingFont = isCustomHeadingFont ? tokens.headingFont : ds.typography.heading.fontFamily;
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
  const sectionPaddingX = ds.spacing[Math.min(ds.spacing.length - 1, 5)] ?? 32;
  const footerPaddingY = Math.round(hints.sectionPadding * 0.5);
  return {
    fields: {
      companyName: { type: 'text' as const },
      tagline: { type: 'text' as const },
      links: {
        type: 'array' as const,
        arrayFields: {
          label: { type: 'text' as const },
          href: { type: 'text' as const },
        },
        defaultItemProps: { label: 'Link', href: '#' },
        getItemSummary: (item: FooterLink) => item.label || 'Untitled link',
      },
    },
    defaultProps: {
      companyName: 'Brand Name',
      tagline: 'Korte tagline',
      links: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    render: ({ companyName, tagline, links }: FooterProps) => (
      <footer
        style={{
          background: tokens.onSurface,
          color: tokens.surface,
          padding: `${footerPaddingY}px ${sectionPaddingX}px`,
          fontFamily: bodyFont,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: headingFont,
                fontWeight: ds.typography.heading.weights[ds.typography.heading.weights.length - 1] ?? 700,
                fontSize: 18,
              }}
            >
              {companyName}
            </div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{tagline}</div>
          </div>
          <nav style={{ display: 'flex', gap: 24 }}>
            {links.map((l, i) => (
              <a
                key={i}
                href={l.href}
                style={{
                  color: tokens.surface,
                  textDecoration: 'none',
                  fontSize: 14,
                  opacity: 0.85,
                  fontFamily: ds.typography.label.fontFamily,
                  letterSpacing: ds.typography.label.letterSpacing,
                  textTransform: ds.typography.label.textTransform ?? 'none',
                }}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    ),
  };
}

/**
 * RichText — brand-emergent (Phase 6). Markdown-render met designSystem-
 * typography (heading-font, body-font, body-size). Section-padding adaptief.
 */
function richTextComponent(tokens: BrandTokens) {
  const markdownComponents = buildRichTextMarkdownComponents(tokens);
  const hints = computeBrandRenderHints(tokens.archetype, tokens.designSystem);
  const ds = tokens.designSystem;
  const sectionPaddingY = Math.round(hints.sectionPadding * 0.6);
  const sectionPaddingX = ds.spacing[Math.min(ds.spacing.length - 1, 5)] ?? 32;
  const isCustomBodyFont = !tokens.bodyFont.includes('system-ui');
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
  const bodySize = ds.typography.body.sizes[Math.min(ds.typography.body.sizes.length - 1, 2)] ?? 16;
  return {
    fields: {
      content: { type: 'textarea' as const },
    },
    defaultProps: {
      content: 'Schrijf hier je inhoud.',
    },
    render: ({ content }: RichTextProps) => (
      <section
        style={{
          padding: `${sectionPaddingY}px ${sectionPaddingX}px`,
          fontFamily: bodyFont,
          background: tokens.surface,
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            color: tokens.onSurface,
            fontSize: bodySize,
            lineHeight: ds.typography.body.lineHeight,
          }}
        >
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        </div>
      </section>
    ),
  };
}

/**
 * Brand-aware markdown component-map voor de Puck RichText-render.
 * Heading-fonts gebruiken tokens.headingFont; body-elementen tokens.bodyFont
 * en tokens.secondaryHex. Links gebruiken tokens.primaryHex zodat de
 * brand-kleur consistent doorloopt.
 */
function buildRichTextMarkdownComponents(tokens: BrandTokens) {
  const headingFont = tokens.headingFont;
  const bodyFont = tokens.bodyFont;
  const primary = tokens.primaryHex;
  const text = tokens.secondaryHex;
  return {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 style={{ fontFamily: headingFont, color: text, fontSize: 32, fontWeight: 700, marginTop: 24, marginBottom: 12 }}>{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 style={{ fontFamily: headingFont, color: text, fontSize: 26, fontWeight: 700, marginTop: 20, marginBottom: 10 }}>{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 style={{ fontFamily: headingFont, color: text, fontSize: 21, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>{children}</h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 style={{ fontFamily: headingFont, color: text, fontSize: 18, fontWeight: 600, marginTop: 14, marginBottom: 6 }}>{children}</h4>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p style={{ fontFamily: bodyFont, color: text, marginBottom: 12 }}>{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul style={{ fontFamily: bodyFont, color: text, paddingLeft: 24, marginBottom: 12, listStyleType: 'disc' }}>{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol style={{ fontFamily: bodyFont, color: text, paddingLeft: 24, marginBottom: 12, listStyleType: 'decimal' }}>{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li style={{ marginBottom: 4 }}>{children}</li>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong style={{ fontWeight: 700, color: text }}>{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em style={{ fontStyle: 'italic' }}>{children}</em>
    ),
    a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: primary, textDecoration: 'underline' }}>{children}</a>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote style={{ fontFamily: bodyFont, borderLeft: `4px solid ${primary}`, paddingLeft: 16, fontStyle: 'italic', color: text, margin: '12px 0' }}>{children}</blockquote>
    ),
    code: ({ children }: { children?: React.ReactNode }) => (
      <code style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 14 }}>{children}</code>
    ),
    hr: () => (
      <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />
    ),
  };
}
