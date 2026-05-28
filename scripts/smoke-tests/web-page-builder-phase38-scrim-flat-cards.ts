/**
 * Smoke voor C10 (photo-scrim per archetype) + C11 (flat-card MINIMAL/EDITORIAL).
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
import type { BrandArchetype } from "../../src/lib/landing-pages/brand-archetype-classifier";
import type { LayoutStyle } from "../../src/lib/landing-pages/design-system";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

function ctx(archetype: BrandArchetype | null, layoutStyle: LayoutStyle): CanvasContextStack {
  const tokens: BrandTokens = {
    ...DEFAULT_BRAND_TOKENS,
    brand: "#B59032",
    onBrand: "#000000",
    onSurface: "#000000",
    layoutStyle,
    designSystem: getDesignSystemForLayoutStyle(layoutStyle),
    archetype,
    elevation: {
      cardShadow: "0 8px 24px rgba(0,0,0,0.12)",
      cardBorderRadius: 12,
      cardBorderWidth: 0,
      cardElevationCategory: "strong-shadow",  // expliciet shadow → MINIMAL moet dit overrulen
    },
  };
  return {
    brand: { brandName: "T" },
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

function renderHero(c: CanvasContextStack, heroVisualUrl: string): string {
  const cfg = buildSpikePuckConfig(c);
  const comp = (cfg.components as Record<string, { render: (p: unknown) => unknown }>).BrandHero;
  return renderToStaticMarkup(comp.render({ headline: "x", sub: "y", ctaLabel: "z", heroVisualUrl }) as React.ReactElement);
}

function renderFeatures(c: CanvasContextStack): string {
  const cfg = buildSpikePuckConfig(c);
  const comp = (cfg.components as Record<string, { render: (p: unknown) => unknown }>).FeatureGrid;
  return renderToStaticMarkup(comp.render({ columns: "3", features: [{ title: "A", description: "a", icon: "zap" }] }) as React.ReactElement);
}

// ─── C10 photo-scrim per archetype ────────────────────────

group("C10 — RULER dark-cinematic scrim (full-bleed)");
{
  const html = renderHero(ctx("RULER", "MINIMAL"), "https://x.test/a.jpg");
  // RULER scrim nu dark-cinematic (was solid-brand — premium luxury wil
  // foto goed zichtbaar i.p.v. zware kleur-overlay)
  assert("scrim bevat rgba(0,0,0", html.includes("rgba(0,0,0"));
  assert("scrim 'to top' gradient", html.includes("to top"));
  assert("background-image bevat hero URL", html.includes("a.jpg"));
}

group("C10 — JESTER gradient-brand scrim");
{
  const html = renderHero(ctx("JESTER", "PLAYFUL"), "https://x.test/b.jpg");
  // JESTER scrim = transparent → brand gradient
  assert("scrim heeft 'to bottom' richting", html.includes("to bottom"));
  assert("scrim bevat transparent stop", html.includes("transparent"));
}

group("C10 — EXPLORER dark-cinematic scrim");
{
  const html = renderHero(ctx("EXPLORER", "EXPERIENTIAL"), "https://x.test/c.jpg");
  assert("dark-cinematic bevat rgba(0,0,0)", html.includes("rgba(0,0,0"));
  assert("dark-cinematic 'to top'", html.includes("to top"));
}

group("C10 — SAGE scrim-soft (onSurface)");
{
  const html = renderHero(ctx("SAGE", "EDITORIAL"), "https://x.test/d.jpg");
  // scrim-soft gebruikt onSurface (zwart in fixture) als kleur
  assert("scrim-soft 'to top'", html.includes("to top"));
}

group("C10 — null archetype → defaults (gradient-brand)");
{
  const html = renderHero(ctx(null, "COMMERCIAL"), "https://x.test/e.jpg");
  assert("default scrim renders linear-gradient", html.includes("linear-gradient"));
  assert("hero image url in background", html.includes("e.jpg"));
}

// ─── C11 flat-card enforcement ────────────────────────────

// 2026-05-28: forceFlatCards → 'flat' i.p.v. 'border-only' (geen wrapper).
// User-feedback LINFI: cards-with-border voldoen niet de premium-flat
// aesthetic van de bron-website. Smoke aangepast naar GEEN border voor
// forceFlatCards archetypes (JESTER+MINIMAL, HERO+EDITORIAL, RULER, SAGE).
group("C11 — MINIMAL JESTER (forceFlatCards) → echt FLAT (geen card)");
{
  const html = renderFeatures(ctx("JESTER", "MINIMAL"));
  assert("flat: geen border", !html.includes("border:1px solid"));
  assert("flat: geen box-shadow", !html.includes("box-shadow"));
}

group("C11 — EDITORIAL HERO (forceFlatCards) → echt FLAT");
{
  const html = renderFeatures(ctx("HERO", "EDITORIAL"));
  assert("EDITORIAL flat: geen border", !html.includes("border:1px solid"));
  assert("EDITORIAL flat: geen box-shadow", !html.includes("box-shadow"));
}

group("C11 — COMMERCIAL JESTER → behoudt strong-shadow");
{
  const html = renderFeatures(ctx("JESTER", "COMMERCIAL"));
  assert("COMMERCIAL JESTER box-shadow aanwezig", html.includes("box-shadow"));
}

group("C11 — PLAYFUL HERO → behoudt strong-shadow (geen force)");
{
  const html = renderFeatures(ctx("HERO", "PLAYFUL"));
  assert("PLAYFUL HERO behoudt shadow", html.includes("box-shadow"));
}

// ─── C3 max-radius constraint ─────────────────────────────

group("C3 — RULER MINIMAL flat-cards (geen border-radius op cards)");
{
  const html = renderFeatures(ctx("RULER", "MINIMAL"));
  // RULER+MINIMAL forceert nu 'flat' (geen card-wrapper) — geen border,
  // geen radius, geen shadow. Whitespace + typography vormen hierarchie.
  assert("RULER+MINIMAL geen card-border", !html.includes("border:1px solid"));
  assert("RULER+MINIMAL geen box-shadow", !html.includes("box-shadow"));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
