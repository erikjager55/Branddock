'use client';

import type { Config } from '@puckeditor/core';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import ReactMarkdown from 'react-markdown';
import {
  extractBrandTokensFromContext,
  type BrandTokens,
} from '@/lib/landing-pages/brand-tokens';

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

function brandHeroComponent(tokens: BrandTokens) {
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
    render: ({ headline, sub, ctaLabel, heroVisualUrl }: SpikeBrandHeroProps) => (
      <section
        style={{
          background: tokens.primaryHex,
          color: '#ffffff',
          fontFamily: tokens.headingFont,
          padding: '64px 32px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 42, lineHeight: 1.1, margin: '0 0 16px', fontWeight: 700 }}>
          {headline}
        </h1>
        <p
          style={{
            fontFamily: tokens.bodyFont,
            fontSize: 18,
            lineHeight: 1.5,
            maxWidth: 560,
            margin: '0 auto 24px',
            opacity: 0.9,
          }}
        >
          {sub}
        </p>
        <button
          type="button"
          style={{
            background: '#ffffff',
            color: tokens.primaryHex,
            fontFamily: tokens.headingFont,
            fontWeight: 600,
            fontSize: 16,
            border: 'none',
            padding: '12px 28px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          {ctaLabel}
        </button>
        {heroVisualUrl && heroVisualUrl.trim().length > 0 ? (
          <div style={{ marginTop: 32, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
            {/* Puck render-context (iframe/portal) ondersteunt geen next/image
                optimalisatie betrouwbaar — plain <img> voor MVP. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroVisualUrl}
              alt=""
              style={{ width: '100%', height: 'auto', borderRadius: 12, display: 'block' }}
            />
          </div>
        ) : null}
      </section>
    ),
  };
}

function brandCtaComponent(
  tokens: BrandTokens,
  personas: { id: string; name: string }[],
  personaOptions: { label: string; value: string }[],
) {
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
        <section style={{ padding: '48px 32px', textAlign: 'center', fontFamily: tokens.bodyFont }}>
          {persona ? (
            <p style={{ fontSize: 14, color: tokens.neutralHex, marginBottom: 12, fontStyle: 'italic' }}>
              Voor: {persona.name}
            </p>
          ) : null}
          <a
            href={href}
            style={{
              display: 'inline-block',
              background: tokens.primaryHex,
              color: '#ffffff',
              fontFamily: tokens.headingFont,
              fontWeight: 600,
              fontSize: 16,
              textDecoration: 'none',
              padding: '14px 32px',
              borderRadius: 8,
            }}
          >
            {label}
          </a>
          {riskReducer && riskReducer.trim().length > 0 ? (
            <p
              style={{
                marginTop: 12,
                fontSize: 13,
                color: tokens.neutralHex,
                fontFamily: tokens.bodyFont,
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

function featureGridComponent(tokens: BrandTokens) {
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
      <section style={{ padding: '64px 32px', fontFamily: tokens.bodyFont }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: 32,
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          {features.map((f, i) => (
            <div key={i}>
              {f.icon && f.icon.trim().length > 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: tokens.primaryHex,
                    fontFamily: tokens.bodyFont,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: 8,
                    fontWeight: 600,
                  }}
                  aria-hidden
                >
                  {/* MVP: text-label voor lucide-icon naam. v2: dynamic lucide-icon render. */}
                  {f.icon}
                </div>
              ) : null}
              <h3
                style={{
                  fontFamily: tokens.headingFont,
                  fontSize: 22,
                  margin: '0 0 8px',
                  color: tokens.secondaryHex,
                }}
              >
                {f.title}
              </h3>
              <p style={{ color: tokens.neutralHex, fontSize: 15, margin: 0 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>
    ),
  };
}

function testimonialComponent(
  tokens: BrandTokens,
  personas: { id: string; name: string }[],
  personaOptions: { label: string; value: string }[],
) {
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
      return (
        <section
          style={{
            background: '#f8fafc',
            padding: '64px 32px',
            textAlign: 'center',
            fontFamily: tokens.bodyFont,
          }}
        >
          <blockquote
            style={{
              fontFamily: tokens.headingFont,
              fontSize: 24,
              lineHeight: 1.4,
              color: tokens.secondaryHex,
              maxWidth: 640,
              margin: '0 auto 16px',
              fontStyle: 'italic',
            }}
          >
            {quote}
          </blockquote>
          <cite
            style={{ display: 'block', color: tokens.neutralHex, fontStyle: 'normal', fontSize: 14 }}
          >
            — {author}
            {persona ? ` (${persona.name})` : ''}
          </cite>
        </section>
      );
    },
  };
}

function pricingTableComponent(tokens: BrandTokens) {
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
      <section style={{ padding: '64px 32px', fontFamily: tokens.bodyFont }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(Math.max(tiers.length, 1), 4)}, minmax(0, 1fr))`,
            gap: 24,
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          {tiers.map((t, i) => (
            <div
              key={i}
              style={{
                border: t.highlighted
                  ? `2px solid ${tokens.primaryHex}`
                  : `1px solid ${tokens.neutralHex}`,
                borderRadius: 12,
                padding: 24,
                textAlign: 'center',
                transform: t.highlighted ? 'scale(1.05)' : 'none',
                boxShadow: t.highlighted ? `0 8px 24px ${tokens.primaryHex}22` : 'none',
                position: 'relative',
              }}
            >
              {t.highlighted ? (
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: tokens.primaryHex,
                    color: '#ffffff',
                    fontSize: 11,
                    fontFamily: tokens.headingFont,
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Aanbevolen
                </div>
              ) : null}
              <h3
                style={{
                  fontFamily: tokens.headingFont,
                  fontSize: 20,
                  margin: '0 0 8px',
                  color: tokens.secondaryHex,
                }}
              >
                {t.name}
              </h3>
              <p
                style={{
                  fontFamily: tokens.headingFont,
                  fontSize: 32,
                  fontWeight: 700,
                  color: tokens.primaryHex,
                  margin: '0 0 16px',
                }}
              >
                {t.price}
              </p>
              <div
                style={{ color: tokens.neutralHex, fontSize: 14, whiteSpace: 'pre-line', textAlign: 'left' }}
              >
                {t.features}
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
  };
}

function faqComponent(tokens: BrandTokens) {
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
      <section style={{ padding: '64px 32px', fontFamily: tokens.bodyFont }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {items.map((item, i) => (
            <details
              key={i}
              style={{
                borderBottom: `1px solid ${tokens.neutralHex}33`,
                padding: '16px 0',
              }}
            >
              <summary
                style={{
                  fontFamily: tokens.headingFont,
                  fontSize: 18,
                  fontWeight: 600,
                  color: tokens.secondaryHex,
                  cursor: 'pointer',
                }}
              >
                {item.question}
              </summary>
              <p style={{ marginTop: 8, color: tokens.neutralHex, fontSize: 15 }}>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    ),
  };
}

function footerComponent(tokens: BrandTokens) {
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
          background: tokens.secondaryHex,
          color: '#ffffff',
          padding: '40px 32px',
          fontFamily: tokens.bodyFont,
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
            <div style={{ fontFamily: tokens.headingFont, fontWeight: 700, fontSize: 18 }}>
              {companyName}
            </div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{tagline}</div>
          </div>
          <nav style={{ display: 'flex', gap: 24 }}>
            {links.map((l, i) => (
              <a
                key={i}
                href={l.href}
                style={{ color: '#ffffff', textDecoration: 'none', fontSize: 14, opacity: 0.85 }}
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

function richTextComponent(tokens: BrandTokens) {
  const markdownComponents = buildRichTextMarkdownComponents(tokens);
  return {
    fields: {
      content: { type: 'textarea' as const },
    },
    defaultProps: {
      content: 'Schrijf hier je inhoud.',
    },
    render: ({ content }: RichTextProps) => (
      <section style={{ padding: '48px 32px', fontFamily: tokens.bodyFont }}>
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            color: tokens.secondaryHex,
            fontSize: 16,
            lineHeight: 1.6,
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
