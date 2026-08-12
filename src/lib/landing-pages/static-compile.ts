/**
 * P2 compile-to-static (ADR 2026-08-12-compile-to-static-publish): compileer
 * een sectie-tree + de op dít moment geldende brand-context naar een
 * zelfstandig HTML-fragment. Het fragment bevat alles wat de pagina-body
 * nodig heeft (a11y-styles, font-links, secties) en bevriest de styling per
 * publish-versie — de eerlijke snapshot-semantiek.
 *
 * Mogelijk gemaakt door E1: `PageRender` is hook-vrij, dus
 * `renderToStaticMarkup` werkt gewoon in-proces in een route-handler (de
 * screenshot-worker bestond alléén om Pucks hook-crash in de RSC-laag te
 * omzeilen). Dezelfde compiler voedt straks de zip-export en het
 * WordPress-kanaal.
 */
import { createElement } from 'react';
import { PageRender, type RenderablePageData } from './page-render';
import { buildA11yStyleBlock } from './a11y-styles';
import type { BrandTokens } from './brand-tokens';

/** Systeem-fonts die geen Google-Fonts-link nodig hebben (spiegel van useBrandFontLoader). */
const SYSTEM_FONTS = new Set([
  'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto',
  'helvetica', 'helvetica neue', 'arial', 'sans-serif', 'serif', 'monospace',
  'georgia', 'times new roman', 'courier new', 'verdana', 'tahoma',
]);

/** Eerste family-naam uit een font-stack ("'Poppins', sans-serif" → "Poppins"). */
function firstFamily(stack: string | null | undefined): string | null {
  if (!stack) return null;
  const first = stack.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '');
  if (!first || SYSTEM_FONTS.has(first.toLowerCase())) return null;
  return first;
}

/**
 * Google-Fonts-links voor de niet-systeem-fonts uit de tokens. Preconnect +
 * css2-link — geldig in de body (browsers verwerken link-elementen daar ook);
 * de artifact-consument hoeft geen <head>-toegang te hebben.
 */
export function buildFontLinks(tokens: BrandTokens | null | undefined): string {
  const families = [firstFamily(tokens?.headingFont), firstFamily(tokens?.bodyFont)]
    .filter((f): f is string => f !== null);
  const unique = [...new Set(families)];
  if (unique.length === 0) return '';
  const params = unique
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700`)
    .join('&');
  return (
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${params}&display=swap">`
  );
}

export interface CompilePageInput {
  puckData: RenderablePageData;
  /** Config uit buildSpikePuckConfig(ctx) — de aanroeper bezit de context. */
  config: Parameters<typeof PageRender>[0]['config'];
  brandTokens: BrandTokens | null | undefined;
  /** Optioneel: JSON-LD wordt mee-bevroren (ge-escaped script-element). */
  jsonLd?: Record<string, unknown> | null;
}

export interface CompiledPageArtifact {
  html: string;
  bytes: number;
}

/**
 * Compileer naar het bevroren fragment. Sectie-markers staan UIT op het
 * publieke artifact (schone output); a11y-pseudo-class-styles en font-links
 * zitten ín het fragment zodat het zelfstandig bruikbaar is (route, export,
 * WP-push). Gooit bij render-fouten — de aanroeper is fail-soft.
 */
export async function compilePageArtifact({ puckData, config, brandTokens, jsonLd }: CompilePageInput): Promise<CompiledPageArtifact> {
  // Dynamische import: react-dom/server hoort niet in RSC-component-graphs;
  // in route-handlers is het prima maar de statische import triggert Next'
  // bundler-waarschuwing. Lazy load houdt het pad expliciet server-only.
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { serializeJsonLdForHtml } = await import('./html-escape');
  const body = renderToStaticMarkup(
    createElement(PageRender as never, {
      config,
      data: puckData,
      withSectionMarkers: false,
    } as never),
  );
  const a11y = `<style>${buildA11yStyleBlock(brandTokens?.brand ?? '#1FD1B2')}</style>`;
  const jsonLdBlock = jsonLd
    ? `<script type="application/ld+json">${serializeJsonLdForHtml(jsonLd)}</script>`
    : '';
  const html = `${jsonLdBlock}${buildFontLinks(brandTokens)}${a11y}${body}`;
  return { html, bytes: Buffer.byteLength(html, 'utf8') };
}
