/**
 * Smoke-test voor #2 — overige renderers (Testimonial/Pricing/FAQ/Footer/
 * RichText) gebruiken tokens.sectionRhythm voor section-padding.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase33-renderers-rhythm-complete.ts
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

const TOKENS_LINFI: BrandTokens = {
  ...DEFAULT_BRAND_TOKENS,
  layoutStyle: "MINIMAL",
  designSystem: getDesignSystemForLayoutStyle("MINIMAL"),
  archetype: "RULER",
  sectionRhythm: {
    sectionPaddingY: 160,
    sectionPaddingX: 32,
    cardPaddingY: 48,
    cardPaddingX: 32,
    alternateBg: false,
  },
};

function makeCtx(tokens: BrandTokens): CanvasContextStack {
  return {
    brand: { brandName: "Test" },
    personas: [{ id: "p1", name: "Test", serialized: "", avatarUrl: null }],
    brief: null,
    concept: null,
    journeyPhase: null,
    medium: null,
    deliverableTypeId: "landing-page",
    products: [],
    brandTokens: tokens,
  } as unknown as CanvasContextStack;
}

// ─── Testimonial ──────────────────────────────────────────

group("#2 — Testimonial gebruikt sectionRhythm");
{
  const config = buildSpikePuckConfig(makeCtx(TOKENS_LINFI));
  const t = (config.components as Record<string, { render: (p: unknown) => unknown }>).Testimonial;
  const html = renderToStaticMarkup(
    t.render({ quote: "Top!", author: "Anna", personaId: "" }) as React.ReactElement,
  );
  assert("section padding 160px 32px", html.includes("padding:160px 32px"));
}

// ─── PricingTable ─────────────────────────────────────────

group("#2 — PricingTable gebruikt sectionRhythm");
{
  const config = buildSpikePuckConfig(makeCtx(TOKENS_LINFI));
  const t = (config.components as Record<string, { render: (p: unknown) => unknown }>).PricingTable;
  const html = renderToStaticMarkup(
    t.render({
      tiers: [{ name: "Pro", price: "€99", features: "F1\nF2", highlighted: false }],
    }) as React.ReactElement,
  );
  assert("section padding 160px 32px", html.includes("padding:160px 32px"));
}

// ─── FAQ ──────────────────────────────────────────────────

group("#2 — FAQ gebruikt sectionRhythm");
{
  const config = buildSpikePuckConfig(makeCtx(TOKENS_LINFI));
  const t = (config.components as Record<string, { render: (p: unknown) => unknown }>).FAQ;
  const html = renderToStaticMarkup(
    t.render({ items: [{ question: "Q", answer: "A" }] }) as React.ReactElement,
  );
  assert("section padding 160px 32px", html.includes("padding:160px 32px"));
}

// ─── Footer (0.5× multiplier) ─────────────────────────────

group("#2 — Footer gebruikt sectionRhythm * 0.5");
{
  const config = buildSpikePuckConfig(makeCtx(TOKENS_LINFI));
  const t = (config.components as Record<string, { render: (p: unknown) => unknown }>).Footer;
  const html = renderToStaticMarkup(
    t.render({
      companyName: "LINFI",
      tagline: "x",
      links: [{ label: "Privacy", href: "/p" }],
    }) as React.ReactElement,
  );
  // 160 * 0.5 = 80
  assert("footer padding 80px 32px", html.includes("padding:80px 32px"));
}

// ─── RichText (0.6× multiplier) ───────────────────────────

group("#2 — RichText gebruikt sectionRhythm * 0.6");
{
  const config = buildSpikePuckConfig(makeCtx(TOKENS_LINFI));
  const t = (config.components as Record<string, { render: (p: unknown) => unknown }>).RichText;
  const html = renderToStaticMarkup(
    t.render({ content: "Hello world" }) as React.ReactElement,
  );
  // 160 * 0.6 = 96
  assert("richtext padding 96px 32px", html.includes("padding:96px 32px"));
}

// ─── Compact fixture (COMMERCIAL) ─────────────────────────

group("#2 — COMMERCIAL workspace (compactere padding)");
{
  const tokens: BrandTokens = {
    ...DEFAULT_BRAND_TOKENS,
    sectionRhythm: {
      sectionPaddingY: 64,
      sectionPaddingX: 24,
      cardPaddingY: 24,
      cardPaddingX: 20,
      alternateBg: false,
    },
  };
  const config = buildSpikePuckConfig(makeCtx(tokens));
  const faq = (config.components as Record<string, { render: (p: unknown) => unknown }>).FAQ;
  const html = renderToStaticMarkup(
    faq.render({ items: [{ question: "Q", answer: "A" }] }) as React.ReactElement,
  );
  assert("FAQ COMMERCIAL padding 64px 24px", html.includes("padding:64px 24px"));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
