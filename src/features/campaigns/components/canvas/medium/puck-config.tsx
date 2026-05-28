'use client';

import type { Config } from '@puckeditor/core';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import ReactMarkdown from 'react-markdown';
import {
  extractBrandTokensFromContext,
  type BrandTokens,
} from '@/lib/landing-pages/brand-tokens';
import { computeBrandRenderHints } from '@/lib/landing-pages/brand-render-rules';
import { getRenderConstraints } from '@/lib/landing-pages/render-constraints';
import { IconBlock } from './lucide-icon-map';

// ─── Component prop types ────────────────────────────────────

export type SpikeBrandHeroProps = {
  headline: string;
  sub: string;
  ctaLabel: string;
  /** Optional hero-visual URL (afbeelding of GIF). Fase 5 spec §4a v2-stap;
   *  v2 wordt dit een dedicated animatie-slot. */
  heroVisualUrl?: string;
  /** C5 — optionele uppercase eyebrow boven headline (civic / categorie-marker).
   *  Wanneer leeg of absent: renderer skipt het element. */
  eyebrow?: string;
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

/** C9 — StickyCtaBar: fixed bottom-bar met label + CTA, sticky on scroll.
 *  Optioneel toe te voegen in Puck-editor; geen onderdeel van default LP. */
export type StickyCtaBarProps = {
  label: string;
  ctaLabel: string;
  href: string;
};

/** StatsBlock: dark-bg highlights met brand-color display-typography.
 *  Vervangt FeatureGrid-workaround voor impactStats — geeft brand-eigen
 *  uniformiteit (LINFI: 410+ / 90+ / 10+ in gold Cormorant op dark-bg). */
export type StatsItem = {
  value: string;
  label: string;
};
export type StatsBlockProps = {
  items: StatsItem[];
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
  StickyCtaBar: StickyCtaBarProps;
  StatsBlock: StatsBlockProps;
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
      StickyCtaBar: stickyCtaBarComponent(tokens),
      StatsBlock: statsBlockComponent(tokens),
    },
  };
}

/**
 * StatsBlock — dark-bg highlights met brand-color display-typography.
 * Consumeert tokens.brand (number-color) + tokens.typographyByRole.display
 * (uit scraped data) + tokens.headingFont (Cormorant in LINFI case).
 *
 * LINFI-pattern: 410+ / 90+ / 10+ in gold serif op donkere bg.
 * Branddock-pattern: 50K+ / 12% / 3x in teal sans-serif op light bg.
 */
function statsBlockComponent(tokens: BrandTokens) {
  const ds = tokens.designSystem;
  const constraints = getRenderConstraints(tokens.archetype, tokens.layoutStyle);
  // 'system-ui' staat nu ALTIJD in de stack (fallback-chain in brand-tokens),
  // dus we kunnen niet meer op die substring detecteren. Check op het EERSTE
  // token (de echte brand-font naam). Als die uit DEFAULT_BRAND_TOKENS komt
  // (begint met 'system-ui'), is er geen custom font.
  const isCustomHeadingFont = !tokens.headingFont.trim().startsWith('system-ui');
  const headingFont = isCustomHeadingFont ? tokens.headingFont : ds.typography.display.fontFamily;
  const isCustomBodyFont = !tokens.bodyFont.trim().startsWith('system-ui');
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
  const tbr = tokens.typographyByRole;

  // Dark-bg ALLEEN wanneer bron-website ook donkere sections heeft
  // (hasDarkSections evidence). Voorheen archetype-driven (RULER/SAGE/
  // MAGICIAN/OUTLAW/HERO → automatisch dark) wat mismatch gaf op
  // light-only brands die toevallig in een van die archetypes vallen.
  // Voor RULER/MAGICIAN-light-design brands geeft dit nu light-bg stats
  // die matchen met hun bron — geen dark-bg meer zonder evidence.
  const useDarkBg = tokens.hasDarkSections && (
    tokens.archetype === 'RULER' || tokens.archetype === 'SAGE' ||
    tokens.archetype === 'MAGICIAN' || tokens.archetype === 'OUTLAW' ||
    tokens.archetype === 'HERO'
  );
  const sectionBg = useDarkBg ? tokens.onSurface : tokens.surface;
  const numberColor = useDarkBg ? tokens.brand : tokens.brand;
  const labelColor = useDarkBg ? '#FFFFFF' : tokens.surfaceMuted;
  // Number sizes — gebruik scraped display.fontSize wanneer aanwezig, anders
  // archetype-default 64-88px range
  const numberFontSize = tbr.display.fontSize ?? (useDarkBg ? 72 : 48);
  const numberFontWeight = tbr.display.fontWeight ?? 400;
  const numberLineHeight = tbr.display.lineHeight ?? '1.0';

  return {
    fields: {
      items: {
        type: 'array' as const,
        arrayFields: {
          value: { type: 'text' as const },
          label: { type: 'text' as const },
        },
        defaultItemProps: { value: '0+', label: 'Metric' },
        getItemSummary: (item: StatsItem) => `${item.value} ${item.label}`,
      },
    },
    defaultProps: {
      items: [
        { value: '500+', label: 'Klanten' },
        { value: '99%', label: 'Tevredenheid' },
        { value: '24/7', label: 'Support' },
      ],
    },
    render: ({ items }: StatsBlockProps) => (
      <section
        style={{
          background: sectionBg,
          padding: `${tokens.sectionRhythm.sectionPaddingY}px ${responsivePaddingX(tokens.sectionRhythm.sectionPaddingX)}`,
          fontFamily: bodyFont,
        }}
      >
        <div
          style={{
            display: 'grid',
            // Responsive: auto-fit met min-width = 180px (stats zijn compact,
            // 1 cijfer + 1 label). Op brede schermen tot 4 kolommen, op
            // smalle automatisch wraps.
            gridTemplateColumns: `repeat(auto-fit, minmax(min(180px, 100%), 1fr))`,
            gap: 0,
            maxWidth: constraints.maxContentWidth,
            margin: '0 auto',
            position: 'relative',
          }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                borderLeft: i > 0 ? `1px solid ${useDarkBg ? 'rgba(255,255,255,0.15)' : tokens.surfaceBorder}` : undefined,
              }}
            >
              <div
                style={{
                  fontFamily: headingFont,
                  // Responsive: big stat-numbers schalen tussen 40px mobile
                  // en de scraped/preset desktop-grootte. Voorkomt dat
                  // '410+' overrun krijgt op smalle viewports.
                  fontSize: (() => {
                    const max = typeof numberFontSize === 'number' ? numberFontSize : parseFloat(String(numberFontSize)) || 64;
                    return responsiveSize(40, max);
                  })(),
                  fontWeight: numberFontWeight,
                  lineHeight: numberLineHeight,
                  color: numberColor,
                  marginBottom: 12,
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  fontFamily: ds.typography.label.fontFamily,
                  fontSize: tokens.text.banner.fontSize,
                  fontWeight: tokens.text.banner.weight,
                  letterSpacing: tokens.text.banner.letterSpacing,
                  textTransform: tokens.text.banner.textTransform,
                  color: labelColor,
                  opacity: 0.85,
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
  };
}

/**
 * C9 — StickyCtaBar: optionele Puck-component voor fixed bottom-bar.
 * Brand-colored CTA met motion + subtle elevation shadow.
 */
function stickyCtaBarComponent(tokens: BrandTokens) {
  const { button: btn, motion } = tokens;
  const constraints = getRenderConstraints(tokens.archetype, tokens.layoutStyle);
  const isCustomBodyFont = !tokens.bodyFont.trim().startsWith('system-ui');
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : tokens.designSystem.typography.body.fontFamily;
  return {
    fields: {
      label: { type: 'text' as const },
      ctaLabel: { type: 'text' as const },
      href: { type: 'text' as const },
    },
    defaultProps: {
      label: 'Klaar om te starten?',
      ctaLabel: 'Plan een afspraak',
      href: '#',
    },
    render: ({ label, ctaLabel, href }: StickyCtaBarProps) => {
      return (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            background: tokens.surface,
            borderTop: `1px solid ${tokens.surfaceBorder}`,
            boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
            padding: `${Math.min(16, btn.paddingY)}px 24px`,
            fontFamily: bodyFont,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            maxWidth: constraints.maxContentWidth,
            margin: '0 auto',
            zIndex: 50,
          }}
        >
          <span style={{ color: tokens.onSurface, fontWeight: 500 }}>
            {label}
          </span>
          <a
            href={href}
            className="lp-interactive"
            aria-label={ctaLabel}
            style={{
              display: 'inline-block',
              background: tokens.brand,
              color: tokens.onBrand,
              fontWeight: btn.fontWeight,
              fontSize: btn.fontSize,
              textDecoration: 'none',
              padding: `${btn.paddingY}px ${btn.paddingX}px`,
              borderRadius: Math.min(btn.radiusPx, constraints.maxRadiusPx),
              textTransform: btn.textTransform,
              letterSpacing: btn.letterSpacing,
              transition: `all ${motion.transitionDuration} ${motion.easing}`,
            }}
          >
            {ctaLabel}
          </a>
        </div>
      );
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
  const hints = computeBrandRenderHints(
    tokens.archetype,
    tokens.designSystem,
    (tokens.heroPattern as import('@/lib/landing-pages/brand-render-rules').HeroPatternKey | null) ?? null,
    tokens.hasDarkSections,
    isVibrantSaturatedColor(tokens.brand),
  );
  const { heroLayout, displayTypography, buttonStyle, sectionPadding } = hints;
  const ds = tokens.designSystem;
  // C10 — photo-scrim stijl per archetype
  const constraints = getRenderConstraints(tokens.archetype, tokens.layoutStyle);

  // Section padding op basis van layoutStyle (sparse = grote, tight = klein)
  const sectionPaddingY = sectionPadding;
  const sectionPaddingX = ds.spacing[Math.min(ds.spacing.length - 1, 5)] ?? 32;

  return {
    fields: {
      eyebrow: { type: 'text' as const },
      headline: { type: 'text' as const },
      sub: { type: 'textarea' as const },
      ctaLabel: { type: 'text' as const },
      heroVisualUrl: { type: 'text' as const },
    },
    defaultProps: {
      eyebrow: '',
      headline: 'Headline placeholder',
      sub: 'Subtitle placeholder',
      ctaLabel: 'Get started',
      heroVisualUrl: '',
    },
    render: ({ headline, sub, ctaLabel, heroVisualUrl, eyebrow }: SpikeBrandHeroProps) => {
      // ── Resolve background-style ──────────────────────────
      const hasHeroVisual = !!heroVisualUrl && heroVisualUrl.trim().length > 0;
      // C10: gebruiker heeft expliciet hero-image gezet → altijd full-bleed
      // (anders blokkeert pickHeroLayout=surface/gradient de visual).
      // Scrim-stijl komt uit archetype-constraints (constraints.scrimStyle).
      const useFullBleed = hasHeroVisual;
      const usePlaceholderFrame =
        heroLayout.background === 'full-bleed-image' && !hasHeroVisual
        && ds.imageStrategy.placeholderStyle === 'dark-framed';

      let sectionBg: string;
      let sectionColor: string;
      let backgroundImage: string | undefined;
      if (useFullBleed) {
        // C10 — scrim-stijl per archetype (DTS-plan)
        const onSurfaceRGB = hexToRgbString(tokens.onSurface);
        const brandRGB = hexToRgbString(tokens.brand);
        const op = constraints.scrimOpacity;
        if (constraints.scrimStyle === 'solid-brand') {
          // DTS-pattern: translucent brand-color over heel het beeld
          backgroundImage = `linear-gradient(rgba(${brandRGB},${op}), rgba(${brandRGB},${op})), url(${heroVisualUrl})`;
          sectionBg = tokens.brand;
          sectionColor = tokens.onBrand;
        } else if (constraints.scrimStyle === 'gradient-brand') {
          // JESTER/LOVER: subtiele brand-tint van transparant naar brand
          backgroundImage = `linear-gradient(to bottom, transparent 0%, rgba(${brandRGB},${op}) 100%), url(${heroVisualUrl})`;
          sectionBg = tokens.brand;
          sectionColor = '#FFFFFF';
        } else if (constraints.scrimStyle === 'dark-cinematic') {
          // EXPLORER/MAGICIAN: donker-gradient bottom-up (cinematic feel)
          backgroundImage = `linear-gradient(to top, rgba(0,0,0,${op}) 0%, rgba(0,0,0,0.15) 60%, transparent 100%), url(${heroVisualUrl})`;
          sectionBg = '#000000';
          sectionColor = '#FFFFFF';
        } else {
          // 'scrim-soft' (SAGE/CARETAKER/INNOCENT/REGULAR_GUY): zachte scrim met onSurface
          backgroundImage = `linear-gradient(to top, rgba(${onSurfaceRGB},${op}) 0%, rgba(${onSurfaceRGB},0.2) 100%), url(${heroVisualUrl})`;
          sectionBg = tokens.onSurface;
          sectionColor = '#FFFFFF';
        }
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
      } else if (tokens.heroBgColor) {
        // Fase A — Usage-aware: bron-website heeft EXPLICIET een hero-bg
        // kleur (uit usage:hero-bg tag van de scraper). Sterkste signaal —
        // de site gebruikt deze kleur écht als hero-achtergrond. Geen
        // heuristic-gokken meer nodig.
        sectionBg = tokens.heroBgColor;
        // sectionColor: prefer headingTextColor uit usage-tags, anders
        // contrast-pick (onBrand voor donkere bgs, onSurface voor lichte).
        const heroIsLight = /^#?[a-f0-9]{6}$/i.test(tokens.heroBgColor)
          && parseInt(tokens.heroBgColor.replace(/^#/, ''), 16) > 0x808080;
        sectionColor = tokens.headingTextColor
          ?? (heroIsLight ? tokens.onSurface : '#FFFFFF');
      } else if (isVibrantSaturatedColor(tokens.brand)) {
        // Geen usage-signal MAAR brand-color is vibrant accent-territory.
        // Auto-correct: surface-bg + brand als heading-color zodat de brand
        // herkenbaar blijft zonder vol-veld dat NERGENS op de site staat.
        sectionBg = tokens.surface;
        sectionColor = tokens.headingTextColor ?? tokens.brand;
      } else {
        // solid-brand (default — voor gedempte/lichte brand-colors zoals
        // Soft Cream of pastel-tints werkt vol-veld wel natuurlijk).
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

      // ── Typography uit hints + scraped per-rol (DTS audit-fix) ───
      // Brand-specifieke fonts (tokens.headingFont/bodyFont uit styleguide
      // primaryFontName) overrulen layoutStyle-default display-font wanneer
      // expliciet ingesteld. system-ui = default = niet expliciet.
      // 'system-ui' staat nu ALTIJD in de stack (fallback-chain in brand-tokens),
  // dus we kunnen niet meer op die substring detecteren. Check op het EERSTE
  // token (de echte brand-font naam). Als die uit DEFAULT_BRAND_TOKENS komt
  // (begint met 'system-ui'), is er geen custom font.
  const isCustomHeadingFont = !tokens.headingFont.trim().startsWith('system-ui');
      const isCustomBodyFont = !tokens.bodyFont.trim().startsWith('system-ui');
      const displayFont = isCustomHeadingFont ? tokens.headingFont : ds.typography.display.fontFamily;
      const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
      // tokens.typographyByRole wint van archetype-preset wanneer scraped
      // data aanwezig is. Voorkomt mismatch tussen brandstyle (Cormorant
      // 64px) en LP-render (preset 96px).
      const tbr = tokens.typographyByRole;
      const subSize = tbr.body.fontSize ?? ds.typography.body.sizes[Math.min(ds.typography.body.sizes.length - 1, 2)] ?? 18;
      const subWeight = tbr.body.fontWeight ?? ds.typography.body.weights[0] ?? 400;

      // ── Section style ──────────────────────────────────────
      const sectionStyle: React.CSSProperties = {
        background: backgroundImage ?? sectionBg,
        backgroundSize: backgroundImage ? 'cover' : undefined,
        backgroundPosition: backgroundImage ? 'center' : undefined,
        color: sectionColor,
        fontFamily: displayFont,
        // Responsive paddingX zodat mobile niet wordt geknepen door
        // desktop-grootte bron-padding (LINFI bv. 100px paddingX, op 375px
        // viewport = 200px padding + 175px content). clamp() schaalt
        // tussen 20px (mobile) en bron-waarde (desktop).
        padding: `${sectionPaddingY}px ${responsivePaddingX(sectionPaddingX)}`,
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
        // underlineHover was foutief default-state geworden; underline-on-hover
        // vereist :hover CSS wat inline-styles niet kunnen. Defaulten naar 'none'.
        textDecoration: 'none',
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
          <div style={{ position: 'relative', maxWidth: 1100, width: '100%' }}>
            {eyebrow && eyebrow.trim().length > 0 ? (
              <div
                style={{
                  fontFamily: ds.typography.label.fontFamily,
                  fontSize: tokens.text.banner.fontSize,
                  fontWeight: tokens.text.banner.weight,
                  letterSpacing: tokens.text.banner.letterSpacing,
                  textTransform: tokens.text.banner.textTransform,
                  marginBottom: ds.spacing[Math.min(ds.spacing.length - 1, 2)] ?? 12,
                  opacity: 0.85,
                }}
              >
                {eyebrow}
              </div>
            ) : null}
            <h1
              className="lp-reveal lp-reveal-1"
              style={{
                fontFamily: displayFont,
                // Responsive font-size: scraped-size = desktop-max, MIN cap
                // = 32px voor mobile-leesbaarheid. clamp() schaalt vloeiend.
                fontSize: (() => {
                  const max = tbr.display.fontSize ?? displayTypography.size;
                  const maxNum = typeof max === 'number' ? max : parseFloat(String(max)) || 64;
                  return responsiveSize(32, maxNum);
                })(),
                lineHeight: tbr.display.lineHeight ?? displayTypography.lineHeight,
                fontWeight: tbr.display.fontWeight ?? displayTypography.weight,
                letterSpacing: tbr.display.letterSpacing ?? displayTypography.letterSpacing,
                // Fase B — bron-h1-color expliciet: erft NIET van section
                // wanneer scraper een color op h1 vond. Wel valt het terug
                // op section-color (sectionColor) als display.color null is.
                color: tbr.display.color ?? undefined,
                margin: `0 0 ${ds.spacing[Math.min(ds.spacing.length - 1, 3)] ?? 16}px`,
                // overflowWrap:break-word alleen volstaat (geen hyphens:auto
                // — brak NL compound-nouns midden in woord).
                overflowWrap: 'break-word',
              }}
            >
              {headline}
            </h1>
            <p
              className="lp-reveal lp-reveal-2"
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
            <button
              type="button"
              className="lp-interactive lp-reveal lp-reveal-3"
              aria-label={ctaLabel}
              style={buttonRender}
            >
              {ctaLabel}
            </button>
          </div>
        </section>
      );
    },
  };
}

/**
 * True wanneer de hex-kleur 'vibrant-saturated' is — een kleur die op
 * websites typisch als ACCENT (tekst, CTAs, links) wordt gebruikt en NIET
 * als full-bleed achtergrond. Verzadigd (S > 65) + niet té licht en niet
 * té donker (L tussen 25-65) = klassiek accent-bereik. Voorbeelden:
 *   - #20C509 Vibrant Green (L=40, S=95) → vibrant ✓
 *   - #FF3366 Hot Pink (L=60, S=100) → vibrant ✓
 *   - #B59032 Luxe Gold (L=45, S=56) → gedempt-warm, niet vibrant ✗
 *   - #FBF4BC Soft Cream (L=86, S=88) → pastel, niet vibrant ✗
 *   - #002838 Deep Teal (L=11, S=100) → te donker, niet vibrant ✗
 * Gedempte/pastel/donkere brand-colors blijven full-bleed-eligible omdat
 * die WEL natuurlijk als hero-bg werken.
 */
function isVibrantSaturatedColor(hex: string): boolean {
  const cleaned = hex.replace(/^#/, '');
  if (cleaned.length !== 6) return false;
  const num = parseInt(cleaned, 16);
  if (Number.isNaN(num)) return false;
  const r = ((num >> 16) & 0xff) / 255;
  const g = ((num >> 8) & 0xff) / 255;
  const b = (num & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return false; // grey
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const lPct = l * 100;
  const sPct = s * 100;
  return sPct > 65 && lPct >= 25 && lPct <= 65;
}

/**
 * Responsive-size helper. Genereert een CSS clamp() expression zodat
 * font-sizes en paddings vloeiend schalen tussen mobile (375px viewport)
 * en desktop. Inline-styles ondersteunen geen media-queries dus clamp()
 * is hier de enige optie.
 *
 *   responsiveSize(32, 64)       → clamp(32px, 32px + 2vw, 64px)
 *
 * IDEAL = scraped-size (vaak desktop-mid-large); MIN garandeert mobile-
 * leesbaarheid; MAX cap voorkomt absurd-grote text op ultrawide.
 */
function responsiveSize(min: number, max: number): string {
  if (max <= min) return `${max}px`;
  // Lineaire interpolation in viewport-width: groei tussen MIN en MAX
  // tussen 375px en 1440px breed scherm.
  // formule: min + (max - min) * (vw - 375) / (1440 - 375)
  const slope = ((max - min) * 100) / (1440 - 375);
  const base = min - (slope * 375) / 100;
  return `clamp(${min}px, ${base.toFixed(2)}px + ${slope.toFixed(3)}vw, ${max}px)`;
}

/** Reduce een 'desktop-sized' padding-X waarde voor mobile-correctness.
 *  100px desktop padding wordt op 375px viewport ondraaglijk; clamp het
 *  vanaf 20px minimum tot de bron-waarde maximum. */
function responsivePaddingX(scrapedPx: number): string {
  const min = Math.min(20, scrapedPx);
  return responsiveSize(min, scrapedPx);
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
  const ds = tokens.designSystem;
  // Verbeterplan Fase D: gebruik tokens.button (Tier-1 scraped > Tier-2
  // archetype-default) i.p.v. hints.buttonStyle. tokens.sectionRhythm
  // levert section-padding direct.
  const { button: btn, sectionRhythm, motion } = tokens;
  const isCustomBodyFont = !tokens.bodyFont.trim().startsWith('system-ui');
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
            padding: `${sectionRhythm.sectionPaddingY}px ${responsivePaddingX(sectionRhythm.sectionPaddingX)}`,
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
          {/* Final-CTA button: voor VIBRANT brand-colors (Better Brands
              fel groen, hot pink, helder blauw) is een vol-veld brand-
              button visueel té agressief op de witte CTA-section. Match
              de hero-logica: vibrant-saturated → donkere knop met witte
              tekst (= elegant, herkenbaar accent). Gedempte/pastel
              brands behouden de vol-veld brand-treatment. */}
          {(() => {
            const useDarkButton = isVibrantSaturatedColor(tokens.brand);
            const ctaBg = useDarkButton ? tokens.onSurface : tokens.brand;
            const ctaColor = useDarkButton ? '#FFFFFF' : tokens.onBrand;
            return (
              <a
                href={href}
                className="lp-interactive"
                aria-label={label}
                style={{
                  display: 'inline-block',
                  background: ctaBg,
                  color: ctaColor,
                  fontFamily: ds.typography.label.fontFamily,
                  fontWeight: btn.fontWeight,
                  fontSize: btn.fontSize,
                  textDecoration: 'none',
                  padding: `${btn.paddingY}px ${btn.paddingX}px`,
                  borderRadius: btn.radiusPx,
                  textTransform: btn.textTransform,
                  letterSpacing: btn.letterSpacing,
                  transition: `all ${motion.transitionDuration} ${motion.easing}`,
                }}
              >
                {label}
              </a>
            );
          })()}
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
  const hints = computeBrandRenderHints(
    tokens.archetype,
    tokens.designSystem,
    (tokens.heroPattern as import('@/lib/landing-pages/brand-render-rules').HeroPatternKey | null) ?? null,
    tokens.hasDarkSections,
    isVibrantSaturatedColor(tokens.brand),
  );
  const { cardStyle } = hints;
  const ds = tokens.designSystem;
  // Verbeterplan Fase D: section/card padding + elevation + iconography
  // uit tokens.sectionRhythm / tokens.elevation / tokens.iconography
  // (Tier-1 scraped > Tier-2 archetype). Card-elevation gebruikt hints
  // cardStyle alleen wanneer tokens geen scraped-data heeft.
  const { sectionRhythm, elevation, iconography } = tokens;
  // C11 — Flat-card enforcement: MINIMAL/EDITORIAL forceren border-only.
  const constraints = getRenderConstraints(tokens.archetype, tokens.layoutStyle);
  const effectiveElevationCategory = constraints.forceFlatCards
    ? 'border-only'
    : elevation.cardElevationCategory;
  const gap = ds.spacing[Math.min(ds.spacing.length - 1, 5)] ?? 32;
  // 'system-ui' staat nu ALTIJD in de stack (fallback-chain in brand-tokens),
  // dus we kunnen niet meer op die substring detecteren. Check op het EERSTE
  // token (de echte brand-font naam). Als die uit DEFAULT_BRAND_TOKENS komt
  // (begint met 'system-ui'), is er geen custom font.
  const isCustomHeadingFont = !tokens.headingFont.trim().startsWith('system-ui');
  const isCustomBodyFont = !tokens.bodyFont.trim().startsWith('system-ui');
  const headingFont = isCustomHeadingFont ? tokens.headingFont : ds.typography.heading.fontFamily;
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
  // Scraped per-rol typography wint van archetype-preset
  const tbr = tokens.typographyByRole;
  const headingSize = tbr.heading.fontSize ?? ds.typography.heading.sizes[Math.min(ds.typography.heading.sizes.length - 1, 1)] ?? 22;
  const headingWeight = tbr.heading.fontWeight ?? ds.typography.heading.weights[0] ?? 600;
  const bodySize = tbr.body.fontSize ?? ds.typography.body.sizes[Math.min(ds.typography.body.sizes.length - 1, 1)] ?? 15;

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
          padding: `${sectionRhythm.sectionPaddingY}px ${responsivePaddingX(sectionRhythm.sectionPaddingX)}`,
          fontFamily: bodyFont,
          background: tokens.surface,
        }}
      >
        {/* Responsive grid: `auto-fit` met minmax(240px, 1fr) zorgt dat het
            aantal kolommen automatisch reduceert op smalle viewports. Op
            een 1200px scherm krijg je tot `columns` kolommen; op 768px
            wraps het naar 2-3; op mobile 1 kolom — zonder media-queries
            (inline-style limiet). 240px is de min-leesbare breedte voor
            een feature-card (icon + 3-woord heading + 1 zin body). */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(min(240px, 100%), 1fr))`,
            gap,
            maxWidth: constraints.maxContentWidth,
            margin: '0 auto',
          }}
        >
          {features.map((f, i) => {
            // Verbeterplan Fase D + C11: card-styling uit tokens.elevation
            // met archetype-constraints override (forceFlatCards = border-only)
            const useCard = effectiveElevationCategory !== 'flat';
            const isBorderOnly = effectiveElevationCategory === 'border-only';
            // C3 max-radius constraint (RULER=4, JESTER=24)
            const safeRadius = Math.min(elevation.cardBorderRadius, constraints.maxRadiusPx);
            const cardWrapper: React.CSSProperties = useCard ? {
              padding: `${sectionRhythm.cardPaddingY}px ${sectionRhythm.cardPaddingX}px`,
              borderRadius: safeRadius,
              border: isBorderOnly
                ? `1px solid ${tokens.surfaceBorder}`
                : (cardStyle.elevation === 'border-only'
                    ? `${cardStyle.borderWidth}px solid ${tokens.surfaceBorder}`
                    : undefined),
              boxShadow: isBorderOnly ? undefined : (elevation.cardShadow === 'none' ? undefined : elevation.cardShadow),
              background: tokens.surface,
            } : {};
            return (
              <div key={i} style={cardWrapper}>
                <IconBlock
                  name={f.icon ?? ''}
                  color={tokens.brand}
                  size={iconography.sizeDefault}
                  strokeWeight={iconography.strokeWeight}
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
  // Verbeterplan #2: tokens.sectionRhythm vervangt hints.sectionPadding
  const { sectionRhythm } = tokens;
  const ds = tokens.designSystem;
  // 'system-ui' staat nu ALTIJD in de stack (fallback-chain in brand-tokens),
  // dus we kunnen niet meer op die substring detecteren. Check op het EERSTE
  // token (de echte brand-font naam). Als die uit DEFAULT_BRAND_TOKENS komt
  // (begint met 'system-ui'), is er geen custom font.
  const isCustomHeadingFont = !tokens.headingFont.trim().startsWith('system-ui');
  const isCustomBodyFont = !tokens.bodyFont.trim().startsWith('system-ui');
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
      // Testimonial-bg: voor vibrant-brand sites (Better Brands green)
      // wordt brandSubtle een felgroene wash die niet matched met de
      // ingetogen bron-stijl. Voor vibrant-brand zonder dark-section-
      // evidence: gebruik surface met subtle border ipv brandSubtle.
      // Pastel/gedempt-brand: brandSubtle blijft (Soft Cream wash werkt
      // natuurlijk in LINFI's editorial palette).
      const isVibrantBrand = isVibrantSaturatedColor(tokens.brand);
      const testimonialBg = isVibrantBrand && !tokens.hasDarkSections
        ? tokens.surface
        : tokens.brandSubtle;
      const testimonialBorder = testimonialBg === tokens.surface
        ? `1px solid ${tokens.surfaceBorder}`
        : 'none';
      return (
        <section
          style={{
            background: testimonialBg,
            borderTop: testimonialBorder,
            borderBottom: testimonialBorder,
            padding: `${sectionRhythm.sectionPaddingY}px ${responsivePaddingX(sectionRhythm.sectionPaddingX)}`,
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
  const hints = computeBrandRenderHints(
    tokens.archetype,
    tokens.designSystem,
    (tokens.heroPattern as import('@/lib/landing-pages/brand-render-rules').HeroPatternKey | null) ?? null,
    tokens.hasDarkSections,
    isVibrantSaturatedColor(tokens.brand),
  );
  const { cardStyle } = hints;
  // Verbeterplan #2 + C8: section-padding + max-width uit tokens/constraints
  const { sectionRhythm } = tokens;
  const constraints = getRenderConstraints(tokens.archetype, tokens.layoutStyle);
  const ds = tokens.designSystem;
  // 'system-ui' staat nu ALTIJD in de stack (fallback-chain in brand-tokens),
  // dus we kunnen niet meer op die substring detecteren. Check op het EERSTE
  // token (de echte brand-font naam). Als die uit DEFAULT_BRAND_TOKENS komt
  // (begint met 'system-ui'), is er geen custom font.
  const isCustomHeadingFont = !tokens.headingFont.trim().startsWith('system-ui');
  const isCustomBodyFont = !tokens.bodyFont.trim().startsWith('system-ui');
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
          padding: `${sectionRhythm.sectionPaddingY}px ${responsivePaddingX(sectionRhythm.sectionPaddingX)}`,
          fontFamily: bodyFont,
          background: tokens.surface,
        }}
      >
        <div
          style={{
            display: 'grid',
            // Pricing-tier-cards zijn breder dan features (prijs + features-
            // lijst + CTA), dus min 260px voor leesbaarheid. Auto-fit wraps
            // op smalle viewports.
            gridTemplateColumns: `repeat(auto-fit, minmax(min(260px, 100%), 1fr))`,
            gap: ds.spacing[Math.min(ds.spacing.length - 1, 4)] ?? 24,
            maxWidth: constraints.maxContentWidth,
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
                    // Responsive: clamp tussen mobile 24px en desktop 32px
                    fontSize: responsiveSize(24, 32),
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
  // Verbeterplan #2: section-padding uit tokens.sectionRhythm
  const { sectionRhythm } = tokens;
  const ds = tokens.designSystem;
  // 'system-ui' staat nu ALTIJD in de stack (fallback-chain in brand-tokens),
  // dus we kunnen niet meer op die substring detecteren. Check op het EERSTE
  // token (de echte brand-font naam). Als die uit DEFAULT_BRAND_TOKENS komt
  // (begint met 'system-ui'), is er geen custom font.
  const isCustomHeadingFont = !tokens.headingFont.trim().startsWith('system-ui');
  const isCustomBodyFont = !tokens.bodyFont.trim().startsWith('system-ui');
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
          padding: `${sectionRhythm.sectionPaddingY}px ${responsivePaddingX(sectionRhythm.sectionPaddingX)}`,
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
  const ds = tokens.designSystem;
  // C8 — max-width uit constraints
  const constraints = getRenderConstraints(tokens.archetype, tokens.layoutStyle);
  // 'system-ui' staat nu ALTIJD in de stack (fallback-chain in brand-tokens),
  // dus we kunnen niet meer op die substring detecteren. Check op het EERSTE
  // token (de echte brand-font naam). Als die uit DEFAULT_BRAND_TOKENS komt
  // (begint met 'system-ui'), is er geen custom font.
  const isCustomHeadingFont = !tokens.headingFont.trim().startsWith('system-ui');
  const isCustomBodyFont = !tokens.bodyFont.trim().startsWith('system-ui');
  const headingFont = isCustomHeadingFont ? tokens.headingFont : ds.typography.heading.fontFamily;
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
  // Verbeterplan #2: section-padding uit tokens.sectionRhythm; footer compacter
  const sectionPaddingX = tokens.sectionRhythm.sectionPaddingX;
  const footerPaddingY = Math.round(tokens.sectionRhythm.sectionPaddingY * 0.5);
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
          // Footer-bg duurzaam: dark-bg ALLEEN wanneer bron-website ook
          // donkere sections heeft (hasDarkSections evidence). Anders licht
          // op surface met onSurface tekst. Voorkomt dark-footer mismatch
          // op light-only brands (Better Brands homepage = wit door en door).
          background: tokens.hasDarkSections ? tokens.onSurface : tokens.surface,
          color: tokens.hasDarkSections ? tokens.surface : tokens.onSurface,
          padding: `${footerPaddingY}px ${responsivePaddingX(sectionPaddingX)}`,
          fontFamily: bodyFont,
          borderTop: tokens.hasDarkSections ? 'none' : `1px solid ${tokens.surfaceBorder}`,
        }}
      >
        <div
          style={{
            maxWidth: constraints.maxContentWidth,
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
          <nav style={{ display: 'flex', gap: 24 }} aria-label="Footer">
            {links.map((l, i) => (
              <a
                key={i}
                href={l.href}
                className="lp-interactive"
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
  const ds = tokens.designSystem;
  // Verbeterplan #2: section-padding uit tokens.sectionRhythm; richtext compacter
  const sectionPaddingY = Math.round(tokens.sectionRhythm.sectionPaddingY * 0.6);
  const sectionPaddingX = tokens.sectionRhythm.sectionPaddingX;
  const isCustomBodyFont = !tokens.bodyFont.trim().startsWith('system-ui');
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
          padding: `${sectionPaddingY}px ${responsivePaddingX(sectionPaddingX)}`,
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
