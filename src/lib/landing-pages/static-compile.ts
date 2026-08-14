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

// ─── P3/P4 runtime-script (beacon + form-enhancement) ────────

/** Bevat de sectie-tree een LeadForm? Bepaalt of het form-deel mee-compileert. */
function hasLeadFormSection(puckData: RenderablePageData): boolean {
  return Array.isArray(puckData?.content)
    && puckData.content.some((item) => item?.type === 'LeadForm');
}

/**
 * P4 view-beacon: leidt workspaceSlug + pagina-slug af uit `location`
 * (subdomein-vorm `<ws>.branddock.app/<slug>` of pad-vorm `/p/<ws>/<slug>`)
 * en stuurt cookieloos één 'view'-event naar `/api/t` via sendBeacon
 * (JSON-string → text/plain, geen preflight). Zelfde-origin werkt op
 * subdomeinen omdat `/api` in de middleware passthrough is (host-router).
 */
const VIEW_BEACON_SNIPPET = [
  "var d=document,L=location,pn=L.pathname,w='',s='';",
  "if(pn.lastIndexOf('/p/',0)===0){var a=pn.split('/');w=a[2]||'';s=a[3]||''}",
  "else{var hn=L.hostname,di=hn.indexOf('.');w=di>0?hn.slice(0,di):'';s=pn.replace(/^\\/+|\\/+$/g,'')}",
  "function t(k){if(!w||!s)return;try{var b=JSON.stringify({w:decodeURIComponent(w),s:decodeURIComponent(s),k:k,r:d.referrer||''});",
  "if(navigator.sendBeacon)navigator.sendBeacon('/api/t',b);else fetch('/api/t',{method:'POST',body:b,keepalive:true}).catch(function(){})}catch(e){}}",
  "t('view');",
].join('');

/**
 * P3 progressive enhancement: ververs `_ts` naar load-tijd (het gecompileerde
 * artifact bevriest de render-timestamp, waardoor de timing-guard anders leeg
 * draait), vul `_src` met de echte pagina-URL, en intercepteer submits →
 * fetch-POST → success-blok inline tonen zonder page-reload. Bij een fout
 * valt hij terug op de native no-JS-submit (303-redirect + `:target`).
 * Bewust GEEN client-side 'form_submit'-beacon: `/api/f` logt het PageEvent
 * server-side — één betrouwbare conversieteller, geen dubbeltelling.
 */
const FORM_ENHANCE_SNIPPET = [
  "function init(){var fs=d.querySelectorAll('form[data-lp-form]');for(var i=0;i<fs.length;i++)(function(f){",
  "var ts=f.querySelector('input[name=\"_ts\"]');if(ts)ts.value=String(Date.now());",
  "var sr=f.querySelector('input[name=\"_src\"]');if(sr)sr.value=L.href;",
  "f.addEventListener('submit',function(ev){ev.preventDefault();",
  "var b=f.querySelector('[type=\"submit\"]');if(b)b.disabled=true;",
  "fetch(f.getAttribute('action')||'',{method:'POST',body:new FormData(f),redirect:'manual'}).then(function(r){",
  "if(r.ok||r.type==='opaqueredirect'){var ok=d.getElementById(f.getAttribute('data-lp-success')||'');",
  "if(ok){ok.style.display='block';if(ok.scrollIntoView)ok.scrollIntoView({block:'center'})}f.style.display='none'}",
  "else{if(b)b.disabled=false;f.submit()}",
  "}).catch(function(){if(b)b.disabled=false;f.submit()})});",
  "})(fs[i])}",
  "if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);else init();",
].join('');

/**
 * Eén klein inline vanilla-script voor het publish-artifact (P3+P4): altijd de
 * view-beacon; het form-enhancement-deel alleen wanneer de pagina een LeadForm
 * bevat. Geen framework, geen externe hosts (CSP-veilig), < 2KB. Exported
 * zodat de smoke-suite de shape kan bewaken.
 */
export function buildPageRuntimeScript(opts: { withForms: boolean }): string {
  return `<script>${buildPageRuntimeScriptBody(opts)}</script>`;
}

/**
 * Alleen de script-BODY (zonder `<script>`-wrapper) — voor het runtime-
 * fallback-renderpad in `/p/[workspace]/[slug]` dat via React's
 * `<script dangerouslySetInnerHTML>` injecteert. Zo meten pre-P2-publishes
 * (zonder artifact) dezelfde views en krijgen hun forms dezelfde
 * enhancement als het bevroren artifact (review 2026-08-13, m4).
 */
export function buildPageRuntimeScriptBody(opts: { withForms: boolean }): string {
  const parts = opts.withForms
    ? `${VIEW_BEACON_SNIPPET}${FORM_ENHANCE_SNIPPET}`
    : VIEW_BEACON_SNIPPET;
  return `(function(){${parts}})();`;
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
  // P3/P4: runtime-script vóór de body (DOMContentLoaded-guard voor de
  // forms) zodat het artifact op de render-body blijft eindigen — de
  // phase51-pariteits-invariant. Beacon altijd; form-enhancement alleen
  // wanneer de tree een LeadForm bevat.
  const runtime = buildPageRuntimeScript({ withForms: hasLeadFormSection(puckData) });
  const html = `${jsonLdBlock}${buildFontLinks(brandTokens)}${a11y}${runtime}${body}`;
  return { html, bytes: Buffer.byteLength(html, 'utf8') };
}
