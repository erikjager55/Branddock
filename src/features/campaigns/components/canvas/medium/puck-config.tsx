'use client';

import type { Config } from '@puckeditor/core';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';

export type SpikeBrandHeroProps = {
  headline: string;
  sub: string;
  ctaLabel: string;
};

export type SpikeBrandCtaProps = {
  label: string;
  href: string;
  personaId: string;
};

export type SpikePuckProps = {
  BrandHero: SpikeBrandHeroProps;
  BrandCTA: SpikeBrandCtaProps;
};

/**
 * Extract a primary hex color from the comma-separated `brandColors`
 * description on BrandContextBlock. Returns a Branddock fallback when no
 * hex appears in the string. Spike-grade — MVP would consume a structured
 * BrandStyle record instead of parsing a description string.
 */
function extractPrimaryHex(ctx: CanvasContextStack | null): string {
  const colors = ctx?.brand?.brandColors;
  if (typeof colors === 'string') {
    const match = colors.match(/#[0-9A-Fa-f]{6}/);
    if (match) return match[0];
  }
  return '#1FD1B2';
}

function extractHeadingFont(ctx: CanvasContextStack | null): string {
  const fonts = ctx?.brand?.brandFonts;
  if (typeof fonts === 'string') {
    const match = fonts.match(/heading[^:]*:\s*([^,\n]+)/i);
    if (match) return match[1].trim();
  }
  return 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
}

/**
 * Build a brand-aware Puck config by closure-capturing the workspace
 * CanvasContextStack. Components consume brand tokens directly from the
 * captured `ctx` so the render functions stay simple and dependency-free.
 *
 * Spike scope: only BrandHero + BrandCTA + persona-select field.
 * MVP would expand to the full 8-component set and consume a structured
 * BrandStyle record instead of parsing free-text brandColors/brandFonts.
 */
export function buildSpikePuckConfig(
  ctx: CanvasContextStack | null,
): Config<SpikePuckProps> {
  const primary = extractPrimaryHex(ctx);
  const headingFont = extractHeadingFont(ctx);
  const personas = ctx?.personas ?? [];

  const personaOptions: { label: string; value: string }[] = [
    { label: '— Geen persona —', value: '' },
    ...personas.map((p) => ({ label: p.name, value: p.id })),
  ];

  return {
    components: {
      BrandHero: {
        fields: {
          headline: { type: 'text' },
          sub: { type: 'textarea' },
          ctaLabel: { type: 'text' },
        },
        defaultProps: {
          headline: 'Headline placeholder',
          sub: 'Subtitle placeholder',
          ctaLabel: 'Get started',
        },
        render: ({ headline, sub, ctaLabel }) => (
          <section
            style={{
              background: primary,
              color: '#ffffff',
              fontFamily: headingFont,
              padding: '64px 32px',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontFamily: headingFont,
                fontSize: '42px',
                lineHeight: 1.1,
                margin: '0 0 16px',
                fontWeight: 700,
              }}
            >
              {headline}
            </h1>
            <p
              style={{
                fontSize: '18px',
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
                color: primary,
                fontFamily: headingFont,
                fontWeight: 600,
                fontSize: '16px',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {ctaLabel}
            </button>
          </section>
        ),
      },
      BrandCTA: {
        fields: {
          label: { type: 'text' },
          href: { type: 'text' },
          personaId: {
            type: 'select',
            options: personaOptions,
          },
        },
        defaultProps: {
          label: 'Start your trial',
          href: '#',
          personaId: '',
        },
        render: ({ label, href, personaId }) => {
          const persona = personas.find((p) => p.id === personaId);
          return (
            <section
              style={{
                padding: '48px 32px',
                textAlign: 'center',
              }}
            >
              {persona ? (
                <p
                  style={{
                    fontSize: '14px',
                    color: '#475569',
                    marginBottom: '12px',
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
                  background: primary,
                  color: '#ffffff',
                  fontFamily: headingFont,
                  fontWeight: 600,
                  fontSize: '16px',
                  textDecoration: 'none',
                  padding: '14px 32px',
                  borderRadius: '8px',
                }}
              >
                {label}
              </a>
            </section>
          );
        },
      },
    },
  };
}
