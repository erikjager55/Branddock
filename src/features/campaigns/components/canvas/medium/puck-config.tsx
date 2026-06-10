// GEEN 'use client' — dit zijn pure render-functies zonder hooks/handlers.
// De directive maakte buildSpikePuckConfig een client-reference-proxy,
// waardoor server-side callers (lp-fidelity-check route via lp-screenshotter,
// /p/[slug] RSC) crashten met "Attempted to call buildSpikePuckConfig() from
// the server". Client-importers (PuckPageBuilder e.a.) zitten al achter een
// hogere 'use client'-boundary; interactieve fields (PuckImageField)
// declareren hun eigen boundary.
import type { Config } from '@puckeditor/core';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import ReactMarkdown from 'react-markdown';
import {
  extractBrandTokensFromContext,
  type BrandTokens,
} from '@/lib/landing-pages/brand-tokens';
import { computeBrandRenderHints } from '@/lib/landing-pages/brand-render-rules';
import { getRenderConstraints } from '@/lib/landing-pages/render-constraints';
import { readableTextColor, resolveOnColor, isCardContextMismatch, reserveAccentForHeading, contrastRatio, safeHeadingColor, normalizeColorToHex, blackOrWhiteFor } from '@/lib/landing-pages/wcag';

import {
  buildBackgroundDepth,
  getBackgroundDepthSize,
  pickBackgroundDepth,
} from '@/lib/landing-pages/background-textures';
import { IconBlock } from './lucide-icon-map';
import { isNoOpBorder, isTransparentBackground, isWeakButtonBackground } from '@/lib/landing-pages/scraped-css-helpers';
import { pxFromCssValue } from '@/lib/landing-pages/brand-tokens-v4-mappers';
import { isScrapedOrigin, type TokenProvenance } from '@/lib/landing-pages/token-provenance';
import { PuckImageField } from './PuckImageField';

// ─── Image-field factory ─────────────────────────────────────

/**
 * Puck custom-field voor image-URL props: thumbnail-preview + media-library
 * picker (selecteren/zoeken/genereren) i.p.v. een kaal URL-tekstveld. Hooks
 * leven in PuckImageField zelf (React mount het render-resultaat als
 * component-tree), dus dit is veilig ongeacht hoe Puck `render` aanroept.
 * `allowClear` UIT voor de hero (server-side preserve-guard + self-heal
 * maken een clear toch ongedaan), AAN voor feature-beelden.
 */
function imageField(label: string, allowClear: boolean) {
  return {
    type: 'custom' as const,
    render: ({ value, onChange, readOnly }: { value?: string | null; onChange: (v: string) => void; readOnly?: boolean }) => (
      <PuckImageField value={value} onChange={onChange} label={label} allowClear={allowClear} readOnly={readOnly} />
    ),
  };
}

// ─── CTA-fill resolver ───────────────────────────────────────

/**
 * Kiest een ZICHTBARE CTA-knop-fill + leesbare tekstkleur.
 *
 * Een scraped `tokens.button.background` kan onbruikbaar zijn als solide CTA:
 *  - translucent/transparant (bv. `rgb(255 255 255 / .1)` overlay-button) →
 *    lost op in de sectie-bg → de knop ziet eruit als platte tekst.
 *  - bijna gelijk aan de sectie-bg (figure/ground < 1.5) → onzichtbare vorm.
 * In die gevallen valt de knop terug op de merk-accent (`fallbackBg`) zodat de
 * CTA ALTIJD los-popt. De tekstkleur wordt tegen de gekozen fill geclampt (≥4.5)
 * zodat het label leesbaar blijft. Borgt CTA-zichtbaarheid voor élke klant.
 */
function resolveCtaFill(
  scrapedBg: string | null | undefined,
  scrapedColor: string | null | undefined,
  fallbackBg: string,
  fallbackColor: string,
  sectionBg: string,
): { background: string; color: string; usedFallback: boolean } {
  let background = scrapedBg ?? fallbackBg;
  let usedFallback = !scrapedBg;
  if (isWeakButtonBackground(scrapedBg)) {
    background = fallbackBg;
    usedFallback = true;
  } else if (scrapedBg) {
    const hex = normalizeColorToHex(scrapedBg);
    if (hex && contrastRatio(hex, sectionBg) < 1.5) {
      background = fallbackBg;
      usedFallback = true;
    }
  }
  const baseColor = usedFallback ? fallbackColor : (scrapedColor ?? fallbackColor);
  const color = readableTextColor(baseColor, background, blackOrWhiteFor(background), 4.5);
  return { background, color, usedFallback };
}

// Gedeelde CTA-geometrie-caps zodat hero- + slot-CTA pixel-consistent zijn en
// een ruime brand-padding niet ontspoort naar een absurd blok.
const CTA_PADDING_Y_CAP = 20;
const CTA_PADDING_X_CAP = 48;
const CTA_FONT_SIZE_CAP = 20;

/** Parse een CSS border-shorthand ("2px solid rgb(0,0,0)") naar breedte + kleur. */
function parseBorderShorthand(border: string | null | undefined): { width: number; color: string | null } {
  if (!border) return { width: 2, color: null };
  const widthMatch = border.match(/(\d*\.?\d+)px/);
  const width = widthMatch ? Math.max(1, Math.round(parseFloat(widthMatch[1]))) : 2;
  const colorMatch = border.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)/);
  return { width, color: colorMatch ? colorMatch[0] : null };
}

/**
 * Bepaalt de visuele CTA-stijl (background/color/border) en respecteert het
 * button-TYPE uit de brandstyle:
 *  - OUTLINE-button (scraped border aanwezig, bv. Better Brands 2px solid zwart):
 *    behoud de outline — rand + tekst contrast-safe tegen de sectie-bg (flipt
 *    naar wit op een donkere sectie); achtergrond transparant wanneer de scraped
 *    fill blendt. NIET terugvallen op een accent-fill (dat brak de brand-button).
 *  - FILLED-button: via resolveCtaFill (translucent/blendende fill → merk-accent).
 * Borgt dat de LP-CTA 1-op-1 de Components-tab-button volgt + altijd zichtbaar is.
 */
function resolveCtaVisual(
  button: BrandTokens['button'],
  sectionBg: string,
  fallbackBg: string,
  fallbackColor: string,
): { background: string; color: string; border: string; isOutline: boolean } {
  const hasBorder = !isNoOpBorder(button.border);
  const bgHex = button.background ? normalizeColorToHex(button.background) : null;
  const bgWeak = isWeakButtonBackground(button.background);
  const bgBlends = bgHex ? contrastRatio(bgHex, sectionBg) < 1.3 : false;
  // OUTLINE alleen wanneer er GEEN bruikbare fill is (transparent/blendend) maar
  // WEL een rand → rand + tekst dragen de affordance, contrast tegen de sectie.
  // (Een filled knop mét rand — DTS blauw, Zwarthout oranje — is GEEN outline:
  // de tekst hoort tegen de fill te contrasteren, niet tegen de sectie.)
  if (hasBorder && (bgWeak || bgBlends || !button.background)) {
    const { width, color: borderCol } = parseBorderShorthand(button.border);
    const baseColor = borderCol ?? button.color ?? fallbackColor;
    const textColor = resolveOnColor(button.color ?? baseColor, sectionBg, { fallback: fallbackColor, minRatio: 4.5 });
    const borderColor = resolveOnColor(baseColor, sectionBg, { fallback: textColor, minRatio: 3.0 });
    return { background: 'transparent', color: textColor, border: `${width}px solid ${borderColor}`, isOutline: true };
  }
  // FILLED (evt. met rand): tekst contrast tegen de FILL.
  const fill = resolveCtaFill(button.background, button.color, fallbackBg, fallbackColor, sectionBg);
  // Figure/ground-safety: een filled knop die ≈ de sectie-bg is (pastel-accent op
  // brand-tint) krijgt een definiërende rand zodat de vorm leesbaar blijft.
  const fillHex = normalizeColorToHex(fill.background);
  const lowContrast = fillHex ? contrastRatio(fillHex, sectionBg) < 3 : false;
  const scrapedBorderOk = !fill.usedFallback && hasBorder;
  const border = scrapedBorderOk
    ? (button.border as string)
    : (lowContrast ? `2px solid ${resolveOnColor(fill.background, sectionBg, { fallback: '#000000', minRatio: 3 })}` : 'none');
  return { background: fill.background, color: fill.color, border, isOutline: false };
}

// ─── Sectie-band (achtergrond-ritmiek) ──────────────────────

/** Meng twee hex-kleuren: t=0 → a, t=1 → b. */
function mixHex(a: string, b: string, t: number): string {
  const ha = normalizeColorToHex(a);
  const hb = normalizeColorToHex(b);
  if (!ha || !hb) return a;
  const pa = [parseInt(ha.slice(1, 3), 16), parseInt(ha.slice(3, 5), 16), parseInt(ha.slice(5, 7), 16)];
  const pb = [parseInt(hb.slice(1, 3), 16), parseInt(hb.slice(3, 5), 16), parseInt(hb.slice(5, 7), 16)];
  const mix = pa.map((c, i) => Math.round(c + (pb[i] - c) * t));
  return `#${mix.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Achtergrond voor een sectie-band. 'base' = de surface; 'alt' = een subtiele,
 * contrast-veilige tint zodat aangrenzende secties visueel verschillen
 * (user-eis: ritmiek). De tint is een lichte verschuiving van de surface RICHTING
 * onSurface (donkerder bij een lichte surface, lichter bij een donkere) → blijft
 * universeel veilig: de renderer resolvet alle tekst alsnog tegen déze bg.
 * Prefereert een gescrapete `secondarySurface` wanneer aanwezig.
 */
export const SECTION_ALT_MIX = 0.06;
export function sectionBandBg(tokens: BrandTokens, bandTone: SectionBandTone | undefined): string {
  if (bandTone !== 'alt') return tokens.surface;
  if (tokens.secondarySurface) return tokens.secondarySurface;
  return mixHex(tokens.surface, tokens.onSurface, SECTION_ALT_MIX);
}

// ─── Component prop types ────────────────────────────────────

export type SpikeBrandHeroProps = {
  headline: string;
  sub: string;
  ctaLabel: string;
  /** CTA-doel-URL (uit Step 1 `landingPageUrl`). Wanneer een echte URL: de hero-
   *  CTA wordt een navigerende <a>; bij "#"/leeg blijft het een <button>. */
  ctaHref?: string;
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
  /** Optionele kop-zin (belofte-herhaling) IN dezelfde CTA-sectie. Track 4 —
   *  voorheen een losse RichText-sectie erboven → dubbele gepadde band. */
  heading?: string;
};

export type FeatureItem = {
  title: string;
  description: string;
  /** Optional lucide-icon naam (bv "zap", "shield", "users"). MVP rendert
   *  alleen het label; v2 voegt dynamic lucide-icon rendering toe. */
  icon?: string;
  /** Track 2: optionele per-feature afbeelding. Wanneer aanwezig vervangt
   *  de FeatureGrid de icon-badge door deze foto (materiaal-/product-shot). */
  imageUrl?: string | null;
};
/** Achtergrond-band voor sectie-ritmiek: 'base' = surface, 'alt' = subtiele
 *  contrast-veilige tint. Door de builder afwisselend toegekend; de renderer
 *  resolvet alle tekst/borders tegen de gekozen band-bg. */
export type SectionBandTone = 'base' | 'alt';

export type FeatureGridProps = {
  columns: '2' | '3' | '4';
  features: FeatureItem[];
  bandTone?: SectionBandTone;
};
/** P7 FeatureSplit — editorial A-B-A-B; zelfde items, geen columns. */
export type FeatureSplitProps = {
  features: FeatureItem[];
  bandTone?: SectionBandTone;
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
  bandTone?: SectionBandTone;
};

export type FaqItem = { question: string; answer: string };
export type FAQProps = {
  items: FaqItem[];
  bandTone?: SectionBandTone;
};

export type FooterLink = { label: string; href: string };
export type FooterProps = {
  companyName: string;
  tagline: string;
  links: FooterLink[];
};

export type RichTextProps = {
  content: string;
  bandTone?: SectionBandTone;
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
  bandTone?: SectionBandTone;
};

export type BrandNavLink = { label: string; href: string };
export type BrandNavProps = {
  brandName: string;
  links: BrandNavLink[];
  ctaLabel: string;
  ctaHref: string;
};

export type SpikePuckProps = {
  BrandHero: SpikeBrandHeroProps;
  BrandCTA: SpikeBrandCtaProps;
  FeatureGrid: FeatureGridProps;
  FeatureSplit: FeatureSplitProps;
  Testimonial: TestimonialProps;
  PricingTable: PricingTableProps;
  FAQ: FAQProps;
  Footer: FooterProps;
  RichText: RichTextProps;
  StickyCtaBar: StickyCtaBarProps;
  StatsBlock: StatsBlockProps;
  BrandNav: BrandNavProps;
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
      FeatureSplit: featureSplitComponent(tokens),
      BrandCTA: brandCtaComponent(tokens, personas, personaOptions),
      FeatureGrid: featureGridComponent(tokens, ctx?.brandProvenance),
      Testimonial: testimonialComponent(tokens, personas, personaOptions),
      PricingTable: pricingTableComponent(tokens),
      FAQ: faqComponent(tokens),
      Footer: footerComponent(tokens),
      RichText: richTextComponent(tokens),
      StickyCtaBar: stickyCtaBarComponent(tokens),
      StatsBlock: statsBlockComponent(tokens),
      BrandNav: brandNavComponent(tokens),
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

  // Dark-bg ALLEEN wanneer de bron-website donkere sections heeft
  // (hasDarkSections + een echte donkere section-bg) — die evidence-gate
  // filtert light-only brands al weg. P3/P7/P9: de stats-band is dan een
  // cinematische accent-beat (oversized merk-cijfers op charcoal). Eerder
  // beperkte een archetype-filter (RULER/SAGE/MAGICIAN/OUTLAW/HERO) dit
  // onnodig — een donker-merk als zwarthout (CREATOR) kreeg lichte stats
  // ondanks zijn donkere identiteit.
  const darkBg = tokens.darkSectionBg ?? tokens.onSurface;
  const useDarkBg = tokens.hasDarkSections && tokens.darkSectionBg != null;
  // bg/number/label/border worden per-band IN render berekend (bandTone) zodat
  // contrast tegen de échte band-bg geclampt wordt — zie render().
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
    render: ({ items, bandTone }: StatsBlockProps) => {
      // Band-ritmiek: donker-merk houdt z'n donkere band; een licht-merk krijgt
      // bij 'alt' de subtiele tint. Alle kleuren resolven tegen de échte band-bg.
      const effBg = useDarkBg ? darkBg : sectionBandBg(tokens, bandTone);
      const effNumberColor = useDarkBg
        ? resolveOnColor(tokens.brand, effBg, { fallback: '#FFFFFF', minRatio: 3.0 })
        : resolveOnColor(tokens.brand, effBg, { fallback: tokens.onSurface, minRatio: 3.0 });
      const effLabelColor = useDarkBg ? '#FFFFFF' : readableTextColor(tokens.surfaceMuted, effBg, tokens.onSurface);
      const effBorderColor = useDarkBg ? 'rgba(255,255,255,0.15)' : resolveOnColor(tokens.surfaceBorder, effBg, { fallback: tokens.onSurface, minRatio: 1.3 });
      return (
      <section
        style={{
          background: effBg,
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
                borderLeft: i > 0 ? `1px solid ${effBorderColor}` : undefined,
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
                  color: effNumberColor,
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
                  color: effLabelColor,
                  opacity: 0.85,
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>
      );
    },
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
  const { heroLayout, displayTypography } = hints;
  const ds = tokens.designSystem;
  // C10 — photo-scrim stijl per archetype
  const constraints = getRenderConstraints(tokens.archetype, tokens.layoutStyle);

  // Section padding via tokens.sectionRhythm (scraped-aware), consistent met
  // alle andere secties — niet de pure hints.sectionPadding-preset die voor
  // MINIMAL/EXPERIENTIAL 128px gaf (verbeterplan #2, hero miste deze migratie).
  const sectionPaddingY = tokens.sectionRhythm.sectionPaddingY;
  const sectionPaddingX = tokens.sectionRhythm.sectionPaddingX;

  return {
    fields: {
      eyebrow: { type: 'text' as const },
      headline: { type: 'text' as const },
      sub: { type: 'textarea' as const },
      ctaLabel: { type: 'text' as const },
      heroVisualUrl: imageField('Hero-afbeelding', false),
    },
    defaultProps: {
      eyebrow: '',
      headline: 'Headline placeholder',
      sub: 'Subtitle placeholder',
      ctaLabel: 'Get started',
      heroVisualUrl: '',
    },
    render: ({ headline, sub, ctaLabel, ctaHref, heroVisualUrl, eyebrow }: SpikeBrandHeroProps) => {
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

      // #8 bg-depth — alleen voor solid-surface heroes (geen full-bleed
      // image waar de photo de depth al levert). Voegt subtle/medium/rich
      // grain + mesh aan witte hero zodat het niet vlak voelt.
      const heroDepthLevel = !useFullBleed && heroLayout.background === 'solid-surface'
        ? pickBackgroundDepth(tokens.archetype, tokens.layoutStyle)
        : 'none';
      const heroDepthBg = heroDepthLevel !== 'none'
        ? buildBackgroundDepth(heroDepthLevel, tokens.brand)
        : undefined;

      // ── Section style ──────────────────────────────────────
      const sectionStyle: React.CSSProperties = {
        // BUGFIX: alléén longhands — NOOIT de `background`-shorthand naast de
        // `backgroundImage`-longhand. React's client-render past de shorthand toe
        // en wist daarna background-image omdat de longhand undefined was → de
        // hero-foto verdween (SSR serialiseert undefined wég, dus de harness-
        // render toonde 'm wél; de client wiste 'm). Nu: backgroundColor (basis)
        // + backgroundImage (foto+scrim óf depth-textuur) als losse longhands.
        backgroundColor: sectionBg,
        backgroundImage: backgroundImage ?? heroDepthBg,
        backgroundSize: backgroundImage ? 'cover' : getBackgroundDepthSize(heroDepthLevel),
        backgroundPosition: backgroundImage ? 'center' : undefined,
        color: sectionColor,
        fontFamily: displayFont,
        // Responsive paddingX zodat mobile niet wordt geknepen door
        // desktop-grootte bron-padding (LINFI bv. 100px paddingX, op 375px
        // viewport = 200px padding + 175px content). clamp() schaalt
        // tussen 20px (mobile) en bron-waarde (desktop).
        padding: `${sectionPaddingY}px ${responsivePaddingX(sectionPaddingX)}`,
        // Track 4 (rhythm): forceer 100vh alléén bij een ECHTE hero-image
        // (cinematisch full-bleed). Een schaarse tekst-only hero op MINIMAL/
        // EXPERIENTIAL kreeg een leeg vol-viewport-vlak — geef die een content-
        // grootte i.p.v. een lege 100vh. (Track 2 vult een hero-image → 100vh.)
        minHeight: heroLayout.fullViewportHeight
          ? (useFullBleed || usePlaceholderFrame ? '100vh' : 'clamp(440px, 64vh, 720px)')
          : undefined,
        display: 'flex',
        flexDirection: 'column',
        justifyContent,
        alignItems,
        textAlign: heroLayout.textAlignment,
        position: 'relative',
      };

      // ── Button-style uit hints ─────────────────────────────
      // PRIORITEIT (van hoog naar laag) per visual-property:
      //   1. SCRAPED tokens.button.background/color/fontFamily — exacte
      //      bron-stijl uit website CSS (bv. LINFI's .btn--linfi = wit-bg
      //      met #15191e text + Poppins font). Wint van alles.
      //   2. Hero-bg-adaptive fallback wanneer scrape leeg:
      //      - Donkere hero (full-bleed scrim) → wit + onSurface tekst
      //      - Lichte hero (solid-surface) → brand-color + onBrand tekst
      // Garandeert dat brandstyle-guide-button en LP-hero-button identiek
      // zijn voor élk merk wanneer scraped data aanwezig is.
      const heroIsDark = useFullBleed || sectionBg === tokens.onSurface;
      // P8 accent-reservering: de primaire CTA hoort de merk-accent te dragen
      // ("this is where I act"). Op een donkere hero gebruikten we altijd wit —
      // dat verloor de accent volledig. Nu: brand-accent wanneer een GEVULDE
      // knop comfortabel los-popt (≥4.0 — boven de bare 3:1 non-text-floor zodat
      // een echt-zwakke fill als wit valt, maar legitieme accenten als zwarthout-
      // oranje 4.26 / indigo 4.32 behouden blijven), anders wit (review-fix).
      const darkHeroAccentOk = heroIsDark && contrastRatio(tokens.brand, sectionBg) >= 4.0;
      const fallbackBg = heroIsDark ? (darkHeroAccentOk ? tokens.brand : '#FFFFFF') : tokens.brand;
      const fallbackColor = heroIsDark ? (darkHeroAccentOk ? tokens.onBrand : tokens.onSurface) : tokens.onBrand;
      // CTA-stijl uit de gereconcilieerde tokens.button (= Components-tab-button):
      // outline-buttons behouden hun rand (Better Brands), filled-buttons vallen
      // bij een translucent/blendende fill terug op de merk-accent. We meten tegen
      // de (donkere) sectie-bg — ook bij full-bleed, want over een donkere foto-
      // scrim hoort een SOLIDE knop te poppen (een filled brand-fill blendt dan
      // niet met de donkere basis → blijft gevuld i.p.v. een vage outline).
      const ctaVisual = resolveCtaVisual(
        tokens.button,
        sectionBg,
        fallbackBg,
        fallbackColor,
      );
      const buttonRender: React.CSSProperties & Record<`--${string}`, string> = {
        background: ctaVisual.background,
        color: ctaVisual.color,
        fontFamily: tokens.button.fontFamily ?? bodyFont,
        // Geometrie uit ÉÉN bron (tokens.button) zodat hero- + slot-CTA identiek
        // zijn — niet langer archetype-presets (hints.buttonStyle) in de hero.
        fontWeight: tokens.button.fontWeight,
        fontSize: Math.min(tokens.button.fontSize, CTA_FONT_SIZE_CAP),
        border: ctaVisual.border,
        // Cap button-padding op normale CTA-maten (brede spacing-scale gaf anders
        // een absurd blok). Brand-genereuze padding (20×40) blijft behouden.
        padding: `${Math.min(tokens.button.paddingY, CTA_PADDING_Y_CAP)}px ${Math.min(tokens.button.paddingX, CTA_PADDING_X_CAP)}px`,
        // Radius uit de scraped/gereconcilieerde tokens.button (gecapt op de
        // archetype-max) — Better Brands = 0 (scherp).
        borderRadius: Math.min(tokens.button.radiusPx, constraints.maxRadiusPx),
        cursor: 'pointer',
        textAlign: 'center',
        textTransform: tokens.button.textTransform,
        letterSpacing: tokens.button.letterSpacing,
        transition: tokens.button.transition ?? undefined,
        width: 'fit-content',
        maxWidth: '380px',
        whiteSpace: 'nowrap',
        textDecoration: 'none',
        // Hover CSS-vars worden door .lp-btn:hover in a11y-styles geconsumeerd.
        // Alleen gezet wanneer scraped — empty-string-var triggert geen change.
        ...(tokens.button.hoverBackground
          ? { '--lp-btn-hover-bg': tokens.button.hoverBackground }
          : {}),
        ...(tokens.button.hoverColor
          ? { '--lp-btn-hover-color': tokens.button.hoverColor }
          : {}),
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
                // E-1: per-rol scraped display-family (de échte h1-font van de
                // bron) vóór de globale display-stack; valt terug op displayFont.
                fontFamily: tbr.display.fontFamily ? `"${tbr.display.fontFamily}", ${displayFont}` : displayFont,
                // Responsive font-size: scraped-size = desktop-max, MIN cap
                // = 32px voor mobile-leesbaarheid. clamp() schaalt vloeiend.
                fontSize: (() => {
                  const scraped = tbr.display.fontSize;
                  const rawMax = scraped ?? displayTypography.size;
                  const maxNum = typeof rawMax === 'number' ? rawMax : parseFloat(String(rawMax)) || 64;
                  // Cap de display-max: de preset-fallback loopt tot 272px
                  // (EXPERIENTIAL dramatic) en vult dan het hele viewport. Geen
                  // scrape → hard op 88px; een echt gescrapete size mag groter,
                  // begrensd op 120px tegen absurde waarden.
                  const capped = scraped != null ? Math.min(maxNum, 120) : Math.min(maxNum, 88);
                  return responsiveSize(32, capped);
                })(),
                lineHeight: tbr.display.lineHeight ?? displayTypography.lineHeight,
                fontWeight: tbr.display.fontWeight ?? displayTypography.weight,
                letterSpacing: tbr.display.letterSpacing ?? displayTypography.letterSpacing,
                textTransform: tbr.display.textTransform ?? undefined,
                // Fase B — bron-h1-color expliciet: erft NIET van section
                // wanneer scraper een color op h1 vond. Wel valt het terug
                // op section-color (sectionColor) als display.color null is.
                // Track 1 (contrast): clamp tegen de ECHTE sectie-bg zodat een
                // gescrapte kleur uit een andere context (wit-op-licht) niet lekt.
                // Bij full-bleed staat de tekst over een FOTO+scrim → gebruik de
                // scrim-ontworpen sectionColor (wit), niet clampen tegen de
                // approximatieve scrim-basis (review-fix W1).
                color: useFullBleed ? sectionColor : resolveOnColor(tbr.display.color ?? sectionColor, sectionBg, { fallback: sectionColor, minRatio: 3.0 }),
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
                lineHeight: tbr.body.lineHeight ?? ds.typography.body.lineHeight,
                fontWeight: subWeight,
                letterSpacing: tbr.body.letterSpacing ?? undefined,
                textTransform: tbr.body.textTransform ?? undefined,
                color: useFullBleed ? sectionColor : resolveOnColor(tbr.body.color ?? sectionColor, sectionBg, { fallback: sectionColor }),
                maxWidth: 560,
                margin: heroLayout.textAlignment === 'center'
                  ? `0 auto ${ds.spacing[Math.min(ds.spacing.length - 1, 4)] ?? 24}px`
                  : `0 0 ${ds.spacing[Math.min(ds.spacing.length - 1, 4)] ?? 24}px`,
                opacity: useFullBleed ? 0.85 : 0.95,
              }}
            >
              {sub}
            </p>
            {(() => {
              const heroCtaStyle: React.CSSProperties & Record<`--${string}`, string> = {
                ...buttonRender,
                // Conditional whitespace + letterSpacing cap voor lange labels.
                whiteSpace: (ctaLabel ?? '').length <= 24 ? 'nowrap' : 'normal',
                // tokens.button (gereconcilieerd) i.p.v. archetype-preset zodat de
                // hero-CTA consistent blijft met de slot-CTA.
                letterSpacing: (ctaLabel ?? '').length > 20 ? '0.1em' : tokens.button.letterSpacing,
                // Center button binnen centered hero
                marginInline: heroLayout.textAlignment === 'center' ? 'auto' : undefined,
              };
              // Step 1 `landingPageUrl` → navigerende <a>; bij "#"/leeg blijft de
              // hero-CTA een niet-navigerende <button> (zoals voorheen).
              const hasHref = !!ctaHref && ctaHref !== '#';
              return hasHref ? (
                <a
                  href={ctaHref}
                  className="lp-interactive lp-reveal lp-reveal-3 lp-btn"
                  aria-label={ctaLabel}
                  style={{ ...heroCtaStyle, display: 'inline-block', textAlign: 'center' }}
                >
                  {ctaLabel}
                </a>
              ) : (
                <button
                  type="button"
                  className="lp-interactive lp-reveal lp-reveal-3 lp-btn"
                  aria-label={ctaLabel}
                  style={heroCtaStyle}
                >
                  {ctaLabel}
                </button>
              );
            })()}
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
  const constraints = getRenderConstraints(tokens.archetype, tokens.layoutStyle);
  // Verbeterplan Fase D: gebruik tokens.button (Tier-1 scraped > Tier-2
  // archetype-default) i.p.v. hints.buttonStyle. tokens.sectionRhythm
  // levert section-padding direct.
  const { button: btn, sectionRhythm, motion } = tokens;
  const isCustomBodyFont = !tokens.bodyFont.trim().startsWith('system-ui');
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
  const isCustomHeadingFont = !tokens.headingFont.trim().startsWith('system-ui');
  const headingFont = isCustomHeadingFont ? tokens.headingFont : ds.typography.heading.fontFamily;
  const tbr = tokens.typographyByRole;

  return {
    fields: {
      label: { type: 'text' as const },
      href: { type: 'text' as const },
      personaId: { type: 'select' as const, options: personaOptions },
      riskReducer: { type: 'text' as const },
      heading: { type: 'text' as const },
    },
    defaultProps: {
      label: 'Start your trial',
      href: '#',
      personaId: '',
      riskReducer: '',
      heading: '',
    },
    render: ({ label, href, personaId, riskReducer, heading }: SpikeBrandCtaProps) => {
      const persona = personas.find((p) => p.id === personaId);
      // CTA-redesign: een CONTAINED gebrande panel i.p.v. losse tekst+knop op
      // een leeg wit vlak. Donker-merk → donkere cinematische panel; anders een
      // zachte brand-tint. De CTA-knop draagt ALTIJD de merk-accent (P8) en popt
      // op de panel. Heading/tekst contrast-geclampt tegen de panel-bg.
      const isDarkPanel = tokens.hasDarkSections && tokens.darkSectionBg != null;
      const panelBg = isDarkPanel ? (tokens.darkSectionBg ?? tokens.onSurface) : tokens.brandSubtle;
      // Review-fix: muted meta-tekst tegen de ÉCHTE panel-bg clampen (op een
      // lichte brand-tint kon surfaceMuted onder AA zakken).
      const onPanelMuted = isDarkPanel
        ? 'rgba(255,255,255,0.72)'
        : readableTextColor(tokens.surfaceMuted, panelBg, tokens.onSurface);
      return (
        <section
          style={{
            padding: `${sectionRhythm.sectionPaddingY}px ${responsivePaddingX(sectionRhythm.sectionPaddingX)}`,
            fontFamily: bodyFont,
            background: tokens.surface,
          }}
        >
          <div
            style={{
              maxWidth: 960,
              margin: '0 auto',
              background: panelBg,
              borderRadius: Math.min(20, constraints.maxRadiusPx),
              padding: 'clamp(40px, 6vw, 72px) clamp(24px, 5vw, 56px)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: `${ds.spacing[Math.min(ds.spacing.length - 1, 4)] ?? 24}px`,
            }}
          >
          {heading && heading.trim().length > 0 ? (
            <h2
              style={{
                fontFamily: headingFont,
                fontSize: tbr.heading.fontSize ?? ds.typography.heading.sizes[ds.typography.heading.sizes.length - 1] ?? 32,
                fontWeight: tbr.heading.fontWeight ?? (ds.typography.heading.weights[0] ?? 600),
                lineHeight: tbr.heading.lineHeight ?? ds.typography.heading.lineHeight,
                letterSpacing: tbr.heading.letterSpacing ?? undefined,
                color: safeHeadingColor(tbr.heading.color, tokens.accent, tokens.onSurface, panelBg),
                margin: 0,
                maxWidth: 720,
              }}
            >
              {heading}
            </h2>
          ) : null}
          {persona ? (
            <p
              style={{
                fontSize: 14,
                color: onPanelMuted,
                margin: 0,
                fontStyle: 'italic',
              }}
            >
              Voor: {persona.name}
            </p>
          ) : null}
          {/* CTA-knop draagt ALTIJD de merk-accent (P8 "this is where I act") —
              op de gebrande panel popt de accent (geen vibrant→charcoal-
              downgrade meer; de panel-bg levert het contrast). */}
          {(() => {
            // CTA-stijl uit tokens.button (= Components-tab-button): outline behoudt
            // z'n rand (Better Brands), filled valt bij blendende fill terug op de
            // merk-accent. Eén bron + dezelfde caps als de hero-CTA → consistent.
            const ctaVisual = resolveCtaVisual(tokens.button, panelBg, tokens.brand, tokens.onBrand);
            // Cap letterSpacing voor lange CTA-labels (3px × 30 char = 90px extra).
            const labelLength = (label ?? '').length;
            const capLetterSpacing = labelLength > 20 ? '0.1em' : btn.letterSpacing;
            const ctaStyle: React.CSSProperties & Record<`--${string}`, string> = {
              display: 'inline-block',
              background: ctaVisual.background,
              color: ctaVisual.color,
              fontFamily: tokens.button.fontFamily ?? bodyFont,
              fontWeight: btn.fontWeight,
              fontSize: Math.min(btn.fontSize, CTA_FONT_SIZE_CAP),
              textDecoration: 'none',
              padding: `${Math.min(btn.paddingY, CTA_PADDING_Y_CAP)}px ${Math.min(btn.paddingX, CTA_PADDING_X_CAP)}px`,
              borderRadius: Math.min(btn.radiusPx, constraints.maxRadiusPx),
              border: ctaVisual.border,
              textTransform: btn.textTransform,
              letterSpacing: capLetterSpacing,
              transition: tokens.button.transition
                ?? `all ${motion.transitionDuration} ${motion.easing}`,
              ...(tokens.button.hoverBackground
                ? { '--lp-btn-hover-bg': tokens.button.hoverBackground }
                : {}),
              ...(tokens.button.hoverColor
                ? { '--lp-btn-hover-color': tokens.button.hoverColor }
                : {}),
            };
            return (
              <a
                href={href}
                className="lp-interactive lp-btn"
                aria-label={label}
                style={{
                  ...ctaStyle,
                  // Cap CTA-button breedte zodat hij niet als balk verschijnt.
                  // 380px is breed genoeg voor lange labels (5-7 woorden),
                  // smal genoeg om visueel als 'compact CTA' te lezen i.p.v.
                  // een full-width balk. width:fit-content garandeert dat
                  // padding/letterSpacing de natural-width kunnen vormen
                  // BINNEN de max-cap.
                  width: 'fit-content',
                  maxWidth: '380px',
                  // Center-align tekst voor wanneer label wraps
                  textAlign: 'center',
                  // Whitespace-nowrap voor labels die NET binnen 380px passen
                  whiteSpace: labelLength <= 24 ? 'nowrap' : 'normal',
                  // marginInline auto zodat button blijft centreren in
                  // de centered section ondanks max-width
                  marginInline: 'auto',
                }}
              >
                {label}
              </a>
            );
          })()}
          {riskReducer && riskReducer.trim().length > 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: onPanelMuted,
                fontFamily: bodyFont,
              }}
            >
              {riskReducer}
            </p>
          ) : null}
          </div>
        </section>
      );
    },
  };
}

/**
 * FeatureGrid — brand-emergent (Phase 5). Heading-font + spacing + cardStyle
 * consumeren designSystem + archetype.
 */
function featureGridComponent(tokens: BrandTokens, provenance?: TokenProvenance) {
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
  // forceFlatCards (RULER/SAGE/MINIMAL-archetypes) → ECHT FLAT i.p.v.
  // border-only. Voorheen kreeg LINFI cards-with-1px-border rondom elke
  // feature; matched niet met premium-architectural feel van bron-website.
  // Flat = geen wrapper-card, alleen whitespace + typography (Apple-style).
  //
  // V2 (governed-token-layer): de archetype-preset mag de scraped elevation
  // alléén platslaan wanneer er NIETS gescraped is. Heeft de bron-site een
  // echte card-shadow opgeleverd (provenance.elevation === scraped), dan
  // respecteren we die i.p.v. hem weg te forceren — anders wint een
  // archetype-aanname van merk-fidelity (Zwarthout/Napking preset-bugklasse).
  const elevationIsScraped = isScrapedOrigin(provenance, 'elevation');
  const effectiveElevationCategory = constraints.forceFlatCards && !elevationIsScraped
    ? 'flat'
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
  // Cap feature/trust card-koppen: heading.sizes[1] is voor EXPERIENTIAL ~56px
  // → overmaatse koppen in een feature-card. 32px is ruim voor een card-titel.
  const headingSize = Math.min(
    tbr.heading.fontSize ?? ds.typography.heading.sizes[Math.min(ds.typography.heading.sizes.length - 1, 1)] ?? 22,
    32,
  );
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
          // Zonder dit field stript Puck's onChange de prop bij élke
          // editor-edit (props zonder field-def worden gefilterd, zelfde
          // mechanisme als de bandTone-strip) → gegenereerde feature-beelden
          // verdwenen stil. Field-def = picker + strip-fix in één.
          imageUrl: imageField('Afbeelding', true),
        },
        defaultItemProps: { title: 'Feature', description: 'Korte beschrijving', icon: '', imageUrl: null },
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
    render: ({ features, bandTone }: FeatureGridProps) => {
      // #8 bg-depth — voor FeatureGrid section. Texture matched
      // archetype: JESTER/CREATOR krijgen rich, MINIMAL subtle, etc.
      const depthLevel = pickBackgroundDepth(tokens.archetype, tokens.layoutStyle);
      const depthBg = buildBackgroundDepth(depthLevel, tokens.brand);
      const depthBgSize = getBackgroundDepthSize(depthLevel);
      // Band-ritmiek: bandTone bepaalt base (surface) vs alt (subtiele tint);
      // sectionBandBg prefereert een gescrapete secondarySurface bij 'alt'.
      const featureGridBg = sectionBandBg(tokens, bandTone);
      return (
      <section
        style={{
          padding: `${sectionRhythm.sectionPaddingY}px ${responsivePaddingX(sectionRhythm.sectionPaddingX)}`,
          fontFamily: bodyFont,
          background: featureGridBg,
          backgroundImage: depthBg,
          backgroundSize: depthBgSize,
        }}
      >
        {/* Grid layout per item-count zodat we NIET in 3+1 / 5+1
            asymmetrie eindigen op brede viewports:
              1 item  → 1 col
              2 items → 2 col
              3 items → 3 col
              4 items → 2×2
              5+ items → auto-fit (zelden gebruikt)
            Op smalle viewports (<480px) altijd 1-col via min().
            Werkt voor ELK merk — feature-count grid-symmetrie is
            puur visuele rule, niet brand-specifiek. */}
        {(() => {
          const n = features.length;
          let gridCols: string;
          if (n <= 1) gridCols = '1fr';
          else if (n === 2) gridCols = 'repeat(2, minmax(min(280px, 100%), 1fr))';
          else if (n === 3) gridCols = 'repeat(3, minmax(min(240px, 100%), 1fr))';
          else if (n === 4) gridCols = 'repeat(2, minmax(min(280px, 100%), 1fr))';
          else gridCols = 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))';
          return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: gridCols,
            gap,
            maxWidth: constraints.maxContentWidth,
            margin: '0 auto',
          }}
        >
          {features.map((f, i) => {
            // 1-op-1 fidelity: wanneer brand-styleguide een PRODUCT_CARD-sample
            // heeft, neem die direct over voor pixel-perfect match met
            // Components-tab. Anders fallback op tokens.elevation + archetype-
            // constraints (huidige logic).
            // Card-fix: een gescrapte card uit een tégengestelde licht/donker-
            // context (zwarthout: puur-zwarte card op de lichte feature-sectie)
            // is bijna altijd een verkeerd representatief sample → negeer 'm en
            // val terug op de sectie-passende archetype-card-styling. Tekst
            // herstelt vanzelf via resolveOnColor tegen de nieuwe (lichte) bg.
            const rawProductCard = tokens.styleguideComponents.PRODUCT_CARD;
            const productCard = isCardContextMismatch(rawProductCard?.background, featureGridBg)
              ? null
              : rawProductCard;
            const useCard = effectiveElevationCategory !== 'flat' || productCard !== null;
            const isBorderOnly = effectiveElevationCategory === 'border-only';
            // C3 max-radius constraint (RULER=4, JESTER=24)
            const safeRadius = Math.min(elevation.cardBorderRadius, constraints.maxRadiusPx);
            // 1-op-1 maar respecteer C3 max-radius constraint: scraped
            // PRODUCT_CARD-radius mag de archetype-cap niet overschrijden
            // (RULER=4, JESTER=24) — anders breekt premium-architectural feel.
            // pxFromCssValue handelt rem/em correct (1.5rem → 24px) i.p.v.
            // parseInt-truncatie (1.5rem → 1).
            const productCardRadius = productCard?.borderRadius
              ? Math.min(pxFromCssValue(productCard.borderRadius, safeRadius), constraints.maxRadiusPx)
              : safeRadius;
            // Track 1 (contrast): de ECHTE card-achtergrond — gespiegeld aan de
            // cardWrapper-bg-logica hieronder. Tekst in de card wordt hiertegen
            // gecontrasteerd, NIET tegen tokens.surface (zwarthout: zwarte
            // PRODUCT_CARD met donkere body-tekst was de bug).
            // In TRULY-flat modus (forceFlatCards, geen card-wrapper) zit de tekst
            // direct op de sectie-band → resolve tegen featureGridBg, niet surface.
            const isTrulyFlat = !useCard && constraints.forceFlatCards;
            const cardBg = productCard?.background && !isTransparentBackground(productCard.background)
              ? productCard.background
              : (isTrulyFlat ? featureGridBg : tokens.surface);
            // PRODUCT_CARD fallback-chain: wanneer scraped border + boxShadow
            // beide leeg zijn, valt het terug op archetype-elevation zodat de
            // card niet visueel verdwijnt in de section-bg. Anders raken brands
            // met alleen scraped bg+padding hun visuele afbakening kwijt.
            const scrapedBorder = productCard?.border && !isNoOpBorder(productCard.border)
              ? productCard.border
              : null;
            const scrapedShadow = productCard?.boxShadow ?? null;
            const cardWrapper: React.CSSProperties = productCard
              ? {
                  padding: productCard.padding ?? `${sectionRhythm.cardPaddingY}px ${sectionRhythm.cardPaddingX}px`,
                  borderRadius: productCardRadius,
                  // Fallback border: archetype border-only category geeft
                  // surfaceBorder als geen scraped sample beschikbaar.
                  border: scrapedBorder
                    ?? (scrapedShadow ? undefined : (isBorderOnly ? `1px solid ${tokens.surfaceBorder}` : undefined)),
                  boxShadow: scrapedShadow
                    ?? (scrapedBorder || isBorderOnly ? undefined : (elevation.cardShadow === 'none' ? undefined : elevation.cardShadow)),
                  background: productCard.background && !isTransparentBackground(productCard.background)
                    ? productCard.background
                    : tokens.surface,
                  color: productCard.color ?? undefined,
                }
              : useCard ? {
                padding: `${sectionRhythm.cardPaddingY}px ${sectionRhythm.cardPaddingX}px`,
                borderRadius: safeRadius,
                border: isBorderOnly
                  ? `1px solid ${tokens.surfaceBorder}`
                  : (cardStyle.elevation === 'border-only'
                      ? `${cardStyle.borderWidth}px solid ${tokens.surfaceBorder}`
                      : undefined),
                boxShadow: isBorderOnly ? undefined : (elevation.cardShadow === 'none' ? undefined : elevation.cardShadow),
                background: tokens.surface,
              } : constraints.forceFlatCards ? {} : {
                // Incidenteel-flat (geen scraped card, geen forced-flat editorial):
                // geef tóch een subtiele block-afbakening (surface-bg + 1px border
                // + radius) zodat feature/trust-items als BLOKKEN lezen i.p.v.
                // losse tekst. Eerder maskeerde de achtergrond-textuur dit (die is
                // verwijderd). forceFlatCards-brands (editorial) blijven bewust
                // borderless.
                padding: `${sectionRhythm.cardPaddingY}px ${sectionRhythm.cardPaddingX}px`,
                borderRadius: Math.min(8, constraints.maxRadiusPx),
                border: `1px solid ${tokens.surfaceBorder}`,
                background: tokens.surface,
              };
            return (
              <div key={i} className={useCard ? 'lp-card' : undefined} style={cardWrapper}>
                {f.imageUrl ? (
                  // Track 2: per-feature beeld vervangt de icon-badge. Cover-fit
                  // op een vaste verhouding zodat de grid uitgelijnd blijft; radius
                  // spiegelt de card zodat het beeld binnen de card-vorm valt.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.imageUrl}
                    alt={f.title}
                    loading="lazy"
                    style={{
                      display: 'block',
                      width: '100%',
                      aspectRatio: '4 / 3',
                      objectFit: 'cover',
                      borderRadius: Math.min(productCardRadius, constraints.maxRadiusPx),
                      marginBottom: 16,
                    }}
                  />
                ) : (() => {
                  // 1-op-1 fidelity: FEATURE_ICON scraped sample geeft de
                  // exacte badge-styling (bv. LINFI gold-badge met witte icon).
                  const fIcon = tokens.styleguideComponents.FEATURE_ICON;
                  const iconColor = fIcon?.color ?? tokens.brand;
                  // pxFromCssValue voor rem/em-aware parsing (1.5rem → 24px).
                  // Math.max(16,...) zorgt voor min mobile-tap-target.
                  const iconSize = fIcon?.fontSize
                    ? Math.max(16, pxFromCssValue(fIcon.fontSize, iconography.sizeDefault))
                    : iconography.sizeDefault;
                  // Badge-wrapper alleen wanneer scraped sample een non-transparante
                  // background heeft (rgba alpha=0, transparent, var(...) etc. = geen badge).
                  const hasBadge = !!fIcon?.background && !isTransparentBackground(fIcon.background);
                  const wrapperStyle: React.CSSProperties = hasBadge
                    ? {
                        marginBottom: 12,
                        background: fIcon!.background ?? undefined,
                        padding: fIcon!.padding ?? undefined,
                        borderRadius: fIcon!.borderRadius ?? undefined,
                        boxShadow: fIcon!.boxShadow ?? undefined,
                        display: 'inline-block',
                      }
                    : { marginBottom: 12 };
                  return (
                    <IconBlock
                      name={f.icon ?? ''}
                      color={iconColor}
                      size={iconSize}
                      strokeWeight={iconography.strokeWeight}
                      wrapperStyle={wrapperStyle}
                      fallbackTextStyle={{
                        fontSize: 12,
                        color: iconColor,
                        fontFamily: ds.typography.label.fontFamily,
                        textTransform: ds.typography.label.textTransform ?? 'uppercase',
                        letterSpacing: ds.typography.label.letterSpacing,
                        marginBottom: 8,
                        fontWeight: 600,
                      }}
                    />
                  );
                })()}

                <h3
                  style={{
                    fontFamily: headingFont,
                    fontSize: headingSize,
                    fontWeight: headingWeight,
                    lineHeight: tbr.heading.lineHeight ?? ds.typography.heading.lineHeight,
                    letterSpacing: tbr.heading.letterSpacing ?? undefined,
                    textTransform: tbr.heading.textTransform ?? undefined,
                    margin: '0 0 8px',
                    color: resolveOnColor(reserveAccentForHeading(tbr.heading.color, tokens.accent, tokens.onSurface), cardBg, { fallback: tokens.onSurface, minRatio: 3.0 }),
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    color: resolveOnColor(tbr.body.color ?? tokens.surfaceMuted, cardBg, { fallback: tokens.onSurface }),
                    fontSize: bodySize,
                    fontWeight: tbr.body.fontWeight ?? undefined,
                    lineHeight: tbr.body.lineHeight ?? undefined,
                    letterSpacing: tbr.body.letterSpacing ?? undefined,
                    textTransform: tbr.body.textTransform ?? undefined,
                    margin: 0,
                  }}
                >
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
          );
        })()}
      </section>
      );
    },
  };
}

/**
 * FeatureSplit — P7 editorial A-B-A-B: elke feature als volle-breedte rij met
 * beeld aan de ene kant en tekst aan de andere, afwisselend per rij. Voor
 * EDITORIAL/EXPERIENTIAL-layouts wanneer de features beeld dragen — geeft het
 * asymmetrische editorial-ritme dat een 3-koloms grid mist. Zelfde props-shape
 * als FeatureGrid (FeatureItem[]), dus de mapper kan dezelfde data sturen.
 */
function featureSplitComponent(tokens: BrandTokens) {
  const ds = tokens.designSystem;
  const constraints = getRenderConstraints(tokens.archetype, tokens.layoutStyle);
  const { sectionRhythm } = tokens;
  const isCustomHeadingFont = !tokens.headingFont.trim().startsWith('system-ui');
  const isCustomBodyFont = !tokens.bodyFont.trim().startsWith('system-ui');
  const headingFont = isCustomHeadingFont ? tokens.headingFont : ds.typography.heading.fontFamily;
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
  const tbr = tokens.typographyByRole;
  const headingSize = Math.min(tbr.heading.fontSize ?? 28, 36);
  const headingWeight = tbr.heading.fontWeight ?? ds.typography.heading.weights[0] ?? 600;
  const bodySize = tbr.body.fontSize ?? ds.typography.body.sizes[Math.min(ds.typography.body.sizes.length - 1, 1)] ?? 16;
  const radius = Math.min(tokens.elevation.cardBorderRadius, constraints.maxRadiusPx);
  return {
    fields: {
      features: {
        type: 'array' as const,
        arrayFields: {
          title: { type: 'text' as const },
          description: { type: 'textarea' as const },
          imageUrl: imageField('Afbeelding', true),
        },
      },
    },
    defaultProps: {
      features: [
        { title: 'Eerste pilaar', description: 'Bewijs van de hero-belofte.', imageUrl: null },
        { title: 'Tweede pilaar', description: 'Tweede bewijs, afwisselend uitgelijnd.', imageUrl: null },
      ],
    },
    render: ({ features, bandTone }: FeatureSplitProps) => {
      const sectionBg = sectionBandBg(tokens, bandTone);
      return (
      <section
        style={{
          padding: `${sectionRhythm.sectionPaddingY}px ${responsivePaddingX(sectionRhythm.sectionPaddingX)}`,
          background: sectionBg,
          fontFamily: bodyFont,
        }}
      >
        <div style={{ maxWidth: constraints.maxContentWidth, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 64 }}>
          {features.map((f, i) => {
            const imageRight = i % 2 === 1;
            return (
              <div
                key={i}
                style={{ display: 'flex', flexDirection: imageRight ? 'row-reverse' : 'row', gap: 48, alignItems: 'center', flexWrap: 'wrap' }}
              >
                <div style={{ flex: '1 1 320px', minWidth: 280 }}>
                  {f.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.imageUrl}
                      alt={f.title}
                      loading="lazy"
                      style={{ display: 'block', width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: radius }}
                    />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: radius, background: tokens.surfaceMuted }} />
                  )}
                </div>
                <div style={{ flex: '1 1 320px', minWidth: 280 }}>
                  <h3
                    style={{
                      fontFamily: headingFont,
                      fontSize: responsiveSize(22, headingSize),
                      fontWeight: headingWeight,
                      lineHeight: tbr.heading.lineHeight ?? 1.2,
                      letterSpacing: tbr.heading.letterSpacing ?? undefined,
                      textTransform: tbr.heading.textTransform ?? undefined,
                      margin: '0 0 12px',
                      color: resolveOnColor(reserveAccentForHeading(tbr.heading.color, tokens.accent, tokens.onSurface), sectionBg, { fallback: tokens.onSurface, minRatio: 3.0 }),
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontSize: bodySize,
                      lineHeight: tbr.body.lineHeight ?? 1.6,
                      maxWidth: '40em',
                      margin: 0,
                      color: resolveOnColor(tbr.body.color ?? tokens.surfaceMuted, sectionBg, { fallback: tokens.onSurface }),
                    }}
                  >
                    {f.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      );
    },
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
  const tbr = tokens.typographyByRole;
  // Cap quote-fontSize: testimonial-quotes pakken de scraped heading-size,
  // die display-groot kan zijn (36-48px) en de quote onleesbaar groot maakt.
  // 28px is ruim leesbaar voor een blockquote zonder te domineren.
  const rawQuoteSize = tbr.heading.fontSize
    ?? ds.typography.heading.sizes[Math.min(ds.typography.heading.sizes.length - 1, 1)] ?? 24;
  const quoteSize = Math.min(rawQuoteSize, 28);

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
      // 1-op-1 fidelity: scraped QUOTE_BLOCK-sample wint van archetype-defaults.
      const quoteBlock = tokens.styleguideComponents.QUOTE_BLOCK;
      const testimonialBg = quoteBlock?.background && !isTransparentBackground(quoteBlock.background)
        ? quoteBlock.background
        : (isVibrantBrand && !tokens.hasDarkSections ? tokens.surface : tokens.brandSubtle);
      const testimonialBorder = quoteBlock?.border && !isNoOpBorder(quoteBlock.border)
        ? quoteBlock.border
        : (testimonialBg === tokens.surface ? `1px solid ${tokens.surfaceBorder}` : 'none');
      const quoteCustomPadding = quoteBlock?.padding ?? null;
      const quoteCustomRadius = quoteBlock?.borderRadius ?? null;
      // Scraped QUOTE_BLOCK padding is COMPONENT-level (bv. 24px 32px op de
      // blockquote-wrapper). Section padding is veel groter (80-128px). Pas
      // scraped padding toe op de inner wrapper, niet op de section zelf,
      // anders collapsed de section-hoogte dramatisch.
      return (
        <section
          style={{
            background: testimonialBg,
            borderTop: testimonialBorder,
            borderBottom: testimonialBorder,
            borderRadius: quoteCustomRadius ?? undefined,
            padding: `${sectionRhythm.sectionPaddingY}px ${responsivePaddingX(sectionRhythm.sectionPaddingX)}`,
            textAlign: 'center',
            fontFamily: bodyFont,
          }}
        >
          <div
            style={{
              padding: quoteCustomPadding ?? undefined,
              maxWidth: 720,
              margin: '0 auto',
            }}
          >
          <blockquote
            style={{
              fontFamily: headingFont,
              fontSize: quoteSize,
              fontWeight: tbr.heading.fontWeight ?? undefined,
              lineHeight: tbr.heading.lineHeight ?? ds.typography.heading.lineHeight,
              letterSpacing: tbr.heading.letterSpacing ?? undefined,
              textTransform: tbr.heading.textTransform ?? undefined,
              // Track 1 (contrast): clamp tegen de echte testimonial-bg (oranje
              // op perzik was borderline) — quote = grote tekst → minRatio 3.0.
              color: resolveOnColor(reserveAccentForHeading(tbr.heading.color, tokens.accent, tokens.onSurface), testimonialBg, { fallback: tokens.onSurface, minRatio: 3.0 }),
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
  const tbr = tokens.typographyByRole;
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
    render: ({ tiers, bandTone }: PricingTableProps) => {
      // Band-ritmiek op de sectie; de tier-cards blijven surface (wit) zodat ze
      // op de tint los-poppen — hun tekst resolvet tegen de card-bg (ongewijzigd).
      const sectionBg = sectionBandBg(tokens, bandTone);
      return (
      <section
        style={{
          padding: `${sectionRhythm.sectionPaddingY}px ${responsivePaddingX(sectionRhythm.sectionPaddingX)}`,
          fontFamily: bodyFont,
          background: sectionBg,
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
                className="lp-card"
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
                    fontSize: tbr.heading.fontSize ?? 20,
                    fontWeight: tbr.heading.fontWeight ?? undefined,
                    lineHeight: tbr.heading.lineHeight ?? undefined,
                    letterSpacing: tbr.heading.letterSpacing ?? undefined,
                    textTransform: tbr.heading.textTransform ?? undefined,
                    margin: '0 0 8px',
                    color: safeHeadingColor(tbr.heading.color, tokens.accent, tokens.onSurface, tokens.surface),
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
      );
    },
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
  const tbr = tokens.typographyByRole;
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
    render: ({ items, bandTone }: FAQProps) => {
      // Band-ritmiek: 'alt' geeft een subtiele tint; alle tekst/borders resolven
      // tegen déze bg i.p.v. de hardcoded surface (anders breekt contrast).
      const sectionBg = sectionBandBg(tokens, bandTone);
      const borderColor = resolveOnColor(tokens.surfaceBorder, sectionBg, { fallback: tokens.onSurface, minRatio: 1.3 });
      return (
      <section
        style={{
          padding: `${sectionRhythm.sectionPaddingY}px ${responsivePaddingX(sectionRhythm.sectionPaddingX)}`,
          fontFamily: bodyFont,
          background: sectionBg,
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {items.map((item, i) => (
            <details
              key={i}
              style={{
                borderBottom: `1px solid ${borderColor}`,
                padding: '16px 0',
              }}
            >
              <summary
                style={{
                  fontFamily: headingFont,
                  fontSize: tbr.subheading.fontSize ?? 18,
                  fontWeight: tbr.subheading.fontWeight ?? tbr.heading.fontWeight
                    ?? (ds.typography.heading.weights[0] ?? 600),
                  lineHeight: tbr.subheading.lineHeight ?? undefined,
                  letterSpacing: tbr.subheading.letterSpacing ?? undefined,
                  textTransform: tbr.subheading.textTransform ?? undefined,
                  color: safeHeadingColor(tbr.subheading.color ?? tbr.heading.color, tokens.accent, tokens.onSurface, sectionBg),
                  cursor: 'pointer',
                }}
              >
                {item.question}
              </summary>
              <p
                style={{
                  marginTop: 8,
                  color: readableTextColor(tbr.body.color ?? tokens.surfaceMuted, sectionBg, tokens.onSurface),
                  fontSize: tbr.body.fontSize ?? 15,
                  lineHeight: tbr.body.lineHeight ?? undefined,
                  letterSpacing: tbr.body.letterSpacing ?? undefined,
                }}
              >
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
      );
    },
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
          // Footer-bg 1-op-1 met brand-styleguide: prefer scraped
          // darkSectionBg (LINFI #263238) wanneer hasDarkSections. Anders
          // licht-surface met onSurface tekst. Voorkomt dark-footer mismatch
          // op light-only brands (Better Brands homepage = wit door en door).
          background: tokens.hasDarkSections
            ? (tokens.darkSectionBg ?? tokens.onSurface)
            : tokens.surface,
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
 * BrandNav — top-navigation 1-op-1 met StyleguideComponent[type=TOP_NAVIGATION].
 * Renderer kiest scraped sample wanneer aanwezig en past extractedStyles
 * direct toe; anders een minimale brand-tokens-driven fallback.
 */
function brandNavComponent(tokens: BrandTokens) {
  const ds = tokens.designSystem;
  const isCustomHeadingFont = !tokens.headingFont.trim().startsWith('system-ui');
  const isCustomBodyFont = !tokens.bodyFont.trim().startsWith('system-ui');
  const headingFont = isCustomHeadingFont ? tokens.headingFont : ds.typography.heading.fontFamily;
  const bodyFont = isCustomBodyFont ? tokens.bodyFont : ds.typography.body.fontFamily;
  return {
    fields: {
      brandName: { type: 'text' as const },
      links: {
        type: 'array' as const,
        arrayFields: {
          label: { type: 'text' as const },
          href: { type: 'text' as const },
        },
        defaultItemProps: { label: 'Link', href: '#' },
        getItemSummary: (item: BrandNavLink) => item.label || 'Untitled link',
      },
      ctaLabel: { type: 'text' as const },
      ctaHref: { type: 'text' as const },
    },
    defaultProps: {
      brandName: 'Brand Name',
      links: [
        { label: 'Home', href: '/' },
        { label: 'Producten', href: '/producten' },
        { label: 'Over', href: '/over' },
        { label: 'Contact', href: '/contact' },
      ],
      ctaLabel: 'Start',
      ctaHref: '#cta',
    },
    render: ({ brandName, links, ctaLabel, ctaHref }: BrandNavProps) => {
      const nav = tokens.styleguideComponents.TOP_NAVIGATION;
      const constraints = getRenderConstraints(tokens.archetype, tokens.layoutStyle);
      const navStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        padding: nav?.padding ?? '16px 32px',
        background: nav?.background && !isTransparentBackground(nav.background)
          ? nav.background
          : tokens.surface,
        borderBottom: nav?.border && !isNoOpBorder(nav.border)
          ? nav.border
          : `1px solid ${tokens.surfaceBorder}`,
        fontFamily: nav?.fontFamily ?? bodyFont,
        fontSize: nav?.fontSize ?? '15px',
        color: nav?.color ?? tokens.onSurface,
      };
      const navBg = nav?.background && !isTransparentBackground(nav.background) ? nav.background : tokens.surface;
      const navCtaVisual = resolveCtaVisual(tokens.button, navBg, tokens.brand, tokens.onBrand);
      const ctaInline: React.CSSProperties = {
        background: navCtaVisual.background,
        color: navCtaVisual.color,
        fontFamily: tokens.button.fontFamily ?? bodyFont,
        padding: '8px 18px',
        borderRadius: Math.min(tokens.button.radiusPx, constraints.maxRadiusPx),
        border: navCtaVisual.border,
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: tokens.button.fontWeight,
      };
      return (
        <nav style={navStyle}>
          <span style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 18 }}>
            {brandName}
          </span>
          <ul style={{ display: 'flex', gap: 24, listStyle: 'none', margin: 0, padding: 0 }}>
            {links.map((l, i) => (
              <li key={i}>
                <a href={l.href} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a href={ctaHref} className="lp-interactive lp-btn" style={ctaInline}>
            {ctaLabel}
          </a>
        </nav>
      );
    },
  };
}

/**
 * RichText — brand-emergent (Phase 6). Markdown-render met designSystem-
 * typography (heading-font, body-font, body-size). Section-padding adaptief.
 */
function richTextComponent(tokens: BrandTokens) {
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
    render: ({ content, bandTone }: RichTextProps) => {
      const sectionBg = sectionBandBg(tokens, bandTone);
      const markdownComponents = buildRichTextMarkdownComponents(tokens, sectionBg);
      return (
      <section
        style={{
          padding: `${sectionPaddingY}px ${responsivePaddingX(sectionPaddingX)}`,
          fontFamily: bodyFont,
          background: sectionBg,
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            color: readableTextColor(tokens.onSurface, sectionBg, tokens.onSurface),
            fontSize: bodySize,
            lineHeight: ds.typography.body.lineHeight,
          }}
        >
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        </div>
      </section>
      );
    },
  };
}

/**
 * Brand-aware markdown component-map voor de Puck RichText-render.
 * Heading-fonts gebruiken tokens.headingFont; body-elementen tokens.bodyFont
 * en tokens.secondaryHex. Links gebruiken tokens.primaryHex zodat de
 * brand-kleur consistent doorloopt.
 */
function buildRichTextMarkdownComponents(tokens: BrandTokens, bg: string = tokens.surface) {
  const headingFont = tokens.headingFont;
  const bodyFont = tokens.bodyFont;
  const primary = tokens.primaryHex;
  const text = tokens.secondaryHex;
  const tbr = tokens.typographyByRole;
  // RichText rendert op de sectie-band-bg — clamp élke kop-kleur tegen die bg
  // (accent-reservering + gegarandeerd contrast) zodat een lichte gescrapte
  // kop-kleur niet onleesbaar wordt (systematische contrast-borging).
  const h1Color = resolveOnColor(tbr.display.color ?? text, bg, { fallback: tokens.onSurface, minRatio: 3.0 });
  const h2Color = safeHeadingColor(tbr.heading.color, tokens.accent, tokens.onSurface, bg);
  const h3Color = safeHeadingColor(tbr.subheading.color ?? tbr.heading.color, tokens.accent, tokens.onSurface, bg);
  // Body-tekst contrast-geclampt tegen de band-bg (5.0 = AA-normal).
  const safeText = readableTextColor(text, bg, tokens.onSurface);
  // Code-chip + hr resolven óók tegen de band-bg (anders onzichtbaar op een tint):
  // de code-chip is ALTIJD een stap donkerder dan de sectie; de hr-rand volgt
  // surfaceBorder geclampt tegen de band.
  const codeBg = mixHex(bg, tokens.onSurface, 0.08);
  const codeText = readableTextColor(text, codeBg, tokens.onSurface);
  const hrColor = resolveOnColor(tokens.surfaceBorder, bg, { fallback: tokens.onSurface, minRatio: 1.3 });
  return {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 style={{
        fontFamily: headingFont,
        color: h1Color,
        fontSize: tbr.display.fontSize ?? 32,
        fontWeight: tbr.display.fontWeight ?? 700,
        lineHeight: tbr.display.lineHeight ?? undefined,
        letterSpacing: tbr.display.letterSpacing ?? undefined,
        textTransform: tbr.display.textTransform ?? undefined,
        marginTop: 24, marginBottom: 12,
      }}>{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 style={{
        fontFamily: headingFont,
        color: h2Color,
        fontSize: tbr.heading.fontSize ?? 26,
        fontWeight: tbr.heading.fontWeight ?? 700,
        lineHeight: tbr.heading.lineHeight ?? undefined,
        letterSpacing: tbr.heading.letterSpacing ?? undefined,
        textTransform: tbr.heading.textTransform ?? undefined,
        marginTop: 20, marginBottom: 10,
      }}>{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 style={{
        fontFamily: headingFont,
        color: h3Color,
        fontSize: tbr.subheading.fontSize ?? 21,
        fontWeight: tbr.subheading.fontWeight ?? 600,
        lineHeight: tbr.subheading.lineHeight ?? undefined,
        letterSpacing: tbr.subheading.letterSpacing ?? undefined,
        textTransform: tbr.subheading.textTransform ?? undefined,
        marginTop: 16, marginBottom: 8,
      }}>{children}</h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 style={{ fontFamily: headingFont, color: safeText, fontSize: 18, fontWeight: 600, marginTop: 14, marginBottom: 6 }}>{children}</h4>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      // P12 measure-cap: ~40em ≈ 75-80 tekens + ruime leading voor leesritme.
      <p style={{ fontFamily: bodyFont, color: safeText, marginBottom: 12, maxWidth: '40em', lineHeight: 1.6 }}>{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul style={{ fontFamily: bodyFont, color: safeText, paddingLeft: 24, marginBottom: 12, listStyleType: 'disc' }}>{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol style={{ fontFamily: bodyFont, color: safeText, paddingLeft: 24, marginBottom: 12, listStyleType: 'decimal' }}>{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li style={{ marginBottom: 4 }}>{children}</li>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong style={{ fontWeight: 700, color: safeText }}>{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em style={{ fontStyle: 'italic' }}>{children}</em>
    ),
    a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: primary, textDecoration: 'underline' }}>{children}</a>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote style={{ fontFamily: bodyFont, borderLeft: `4px solid ${primary}`, paddingLeft: 16, fontStyle: 'italic', color: safeText, margin: '12px 0' }}>{children}</blockquote>
    ),
    code: ({ children }: { children?: React.ReactNode }) => (
      <code style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', backgroundColor: codeBg, color: codeText, padding: '2px 6px', borderRadius: 4, fontSize: 14 }}>{children}</code>
    ),
    hr: () => (
      <hr style={{ border: 0, borderTop: `1px solid ${hrColor}`, margin: '20px 0' }} />
    ),
  };
}
