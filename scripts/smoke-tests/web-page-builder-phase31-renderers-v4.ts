/**
 * Smoke-test voor Fase D — renderers data-driven met v4 tokens.
 *
 * Verifies dat BrandCTA + FeatureGrid scraper-data uit tokens.button /
 * elevation / iconography / sectionRhythm consumeren (i.p.v. archetype-
 * defaults via hints).
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase31-renderers-v4.ts
 */
import { renderToStaticMarkup } from "react-dom/server";
import type * as React from "react";
import { buildSpikePuckConfig } from "../../src/features/campaigns/components/canvas/medium/puck-config";
import type { CanvasContextStack } from "../../src/lib/ai/canvas-context";
import { getDesignSystemForLayoutStyle } from "../../src/lib/landing-pages/design-system";
import {
  DEFAULT_BRAND_TOKENS,
  type BrandTokens,
} from "../../src/lib/landing-pages/brand-tokens";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

function makeCtx(tokens: BrandTokens): CanvasContextStack {
  return {
    brand: { brandName: "Test" },
    personas: [],
    brief: null,
    concept: null,
    journeyPhase: null,
    medium: null,
    deliverableTypeId: "landing-page",
    products: [],
    brandTokens: tokens,
  } as unknown as CanvasContextStack;
}

// ─── BrandCTA: tokens.button overrules hints ──────────────

group("D — BrandCTA gebruikt tokens.button scraped paddings");
{
  const tokens: BrandTokens = {
    ...DEFAULT_BRAND_TOKENS,
    brand: "#B59032",
    onBrand: "#000000",
    layoutStyle: "MINIMAL",
    designSystem: getDesignSystemForLayoutStyle("MINIMAL"),
    archetype: "RULER",
    button: {
      paddingY: 18,
      paddingX: 36,
      radiusPx: 0,
      fontWeight: 500,
      fontSize: 16,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      hoverStyle: "lighten",
    },
    motion: { transitionDuration: "200ms", easing: "ease" },
    sectionRhythm: {
      sectionPaddingY: 160,
      sectionPaddingX: 32,
      cardPaddingY: 48,
      cardPaddingX: 32,
      alternateBg: false,
    },
  };

  const config = buildSpikePuckConfig(makeCtx(tokens));
  const cta = (config.components as Record<string, { render: (p: unknown) => unknown }>).BrandCTA;
  const html = renderToStaticMarkup(
    cta.render({ label: "Plan een afspraak", href: "#", personaId: "", riskReducer: "" }) as React.ReactElement,
  );

  assert("button uses paddingY=18 + paddingX=36", html.includes("padding:18px 36px"));
  assert("button radius=0", html.includes("border-radius:0"));
  assert("button text-transform=uppercase", html.includes("text-transform:uppercase"));
  assert("button letter-spacing=0.05em", html.includes("letter-spacing:0.05em"));
  assert("font-size=16", html.includes("font-size:16px"));
  assert(
    "section padding Y from sectionRhythm",
    html.includes("padding:160px ") && html.includes(", 32px)"),
  );
  assert(
    "transition uit motion-tokens",
    html.includes("200ms") && html.includes("ease"),
  );
}

// ─── FeatureGrid: tokens.elevation border-only ────────────

group("D — FeatureGrid gebruikt tokens.elevation border-only");
{
  const tokens: BrandTokens = {
    ...DEFAULT_BRAND_TOKENS,
    brand: "#B59032",
    layoutStyle: "MINIMAL",
    designSystem: getDesignSystemForLayoutStyle("MINIMAL"),
    archetype: "RULER",
    elevation: {
      cardShadow: "0 0 0 1px rgba(0,0,0,0.06)",
      cardBorderRadius: 0,
      cardBorderWidth: 1,
      cardElevationCategory: "border-only",
    },
    sectionRhythm: {
      sectionPaddingY: 160,
      sectionPaddingX: 32,
      cardPaddingY: 48,
      cardPaddingX: 32,
      alternateBg: false,
    },
    iconography: { strokeWeight: 1.25, sizeDefault: 32, style: "outline" },
  };

  const config = buildSpikePuckConfig(makeCtx(tokens));
  const fg = (config.components as Record<string, { render: (p: unknown) => unknown }>).FeatureGrid;
  const html = renderToStaticMarkup(
    fg.render({
      columns: "3",
      features: [
        { title: "Snel", description: "Een ding", icon: "zap" },
        { title: "Eenvoudig", description: "Twee ding", icon: "sparkles" },
      ],
    }) as React.ReactElement,
  );

  assert(
    "card padding 48px 32px",
    html.includes("padding:48px 32px"),
  );
  assert(
    "border-only: 1px solid border",
    html.includes("border:1px solid"),
  );
  assert(
    "border-radius=0",
    html.includes("border-radius:0"),
  );
  assert(
    "geen box-shadow bij border-only",
    !html.includes("box-shadow"),
  );
  assert(
    "section padding 160px 32px",
    html.includes("padding:160px ") && html.includes(", 32px)"),
  );
  // IconBlock strokeWidth=1.25 (RULER premium-thin)
  assert("svg met stroke-width 1.25", html.includes('stroke-width="1.25"'));
}

// ─── FeatureGrid: strong-shadow PLAYFUL ───────────────────

group("D — FeatureGrid PLAYFUL: strong-shadow");
{
  const tokens: BrandTokens = {
    ...DEFAULT_BRAND_TOKENS,
    layoutStyle: "PLAYFUL",
    designSystem: getDesignSystemForLayoutStyle("PLAYFUL"),
    archetype: "JESTER",
    elevation: {
      cardShadow: "0 12px 32px rgba(0,0,0,0.15)",
      cardBorderRadius: 16,
      cardBorderWidth: 0,
      cardElevationCategory: "strong-shadow",
    },
    sectionRhythm: {
      sectionPaddingY: 64,
      sectionPaddingX: 24,
      cardPaddingY: 24,
      cardPaddingX: 20,
      alternateBg: false,
    },
    iconography: { strokeWeight: 2, sizeDefault: 28, style: "outline" },
  };

  const config = buildSpikePuckConfig(makeCtx(tokens));
  const fg = (config.components as Record<string, { render: (p: unknown) => unknown }>).FeatureGrid;
  const html = renderToStaticMarkup(
    fg.render({
      columns: "3",
      features: [{ title: "A", description: "a", icon: "heart" }],
    }) as React.ReactElement,
  );

  assert("box-shadow aanwezig", html.includes("box-shadow"));
  assert("border-radius 16", html.includes("border-radius:16"));
  assert("JESTER stroke-width 2", html.includes('stroke-width="2"'));
}

// ─── Backward-compat: defaults werken ─────────────────────

group("D — backward-compat: DEFAULT_BRAND_TOKENS renders zonder crash");
{
  const config = buildSpikePuckConfig(makeCtx(DEFAULT_BRAND_TOKENS));
  const cta = (config.components as Record<string, { render: (p: unknown) => unknown }>).BrandCTA;
  const html = renderToStaticMarkup(
    cta.render({ label: "Test", href: "#", personaId: "", riskReducer: "" }) as React.ReactElement,
  );
  assert("renders niet leeg", html.length > 100);
  assert("default padding 14/28", html.includes("padding:14px 28px"));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
