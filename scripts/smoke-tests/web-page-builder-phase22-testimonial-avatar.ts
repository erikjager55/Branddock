/**
 * Smoke-test voor V2-3 — Testimonial avatar-rendering.
 *
 * Verifies:
 *  - Geen persona match → initial-fallback (gekleurd cirkel met letter)
 *  - Persona match zonder avatarUrl → initial-fallback (uit persona.name)
 *  - Persona match MET avatarUrl → <img src=... />
 *  - Avatar borrows brand-color voor fallback-background
 *  - Cite-block toont author + persona-name (deduped wanneer gelijk)
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase22-testimonial-avatar.ts
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
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`);
    fail++;
  }
}

function group(name: string): void {
  console.log(`\n${name}`);
}

const TOKENS: BrandTokens = {
  ...DEFAULT_BRAND_TOKENS,
  brand: "#1FD1B2",
  onBrand: "#000000",
  brandSubtle: "#E6F9F5",
  surface: "#FFFFFF",
  onSurface: "#0F172A",
  layoutStyle: "COMMERCIAL",
  designSystem: getDesignSystemForLayoutStyle("COMMERCIAL"),
  archetype: "SAGE",
};

function renderTestimonial(
  personas: { id: string; name: string; avatarUrl: string | null }[],
  props: { quote: string; author: string; personaId: string },
): string {
  const ctx = {
    brand: { brandName: "Test" },
    personas: personas.map((p) => ({ ...p, serialized: "" })),
    brief: null,
    concept: null,
    journeyPhase: null,
    medium: null,
    deliverableTypeId: "landing-page",
    products: [],
    brandTokens: TOKENS,
  } as unknown as CanvasContextStack;
  const config = buildSpikePuckConfig(ctx);
  const comp = (config.components as Record<string, { render: (p: unknown) => unknown }>)
    .Testimonial;
  const element = comp.render(props);
  return renderToStaticMarkup(element as React.ReactElement);
}

// ─── No persona match → initial-fallback from author ──────

group("V2-3 — geen persona-match → initial-fallback uit author");
{
  const html = renderTestimonial([], {
    quote: "Geweldig product!",
    author: "Marie de Vries",
    personaId: "",
  });
  assert("no <img> tag", !html.includes("<img"));
  assert(
    "initial 'M' van Marie in markup",
    html.includes(">M</div>") || /M<\/div>/.test(html),
  );
  assert("brand color in fallback bg", html.includes("#1FD1B2"));
  assert("quote zichtbaar", html.includes("Geweldig product!"));
  assert("author zichtbaar", html.includes("Marie de Vries"));
}

// ─── Persona match zonder avatarUrl ──────────────────────

group("V2-3 — persona match zonder avatarUrl → initial uit persona.name");
{
  const html = renderTestimonial(
    [
      { id: "p-1", name: "Pieter Janssen", avatarUrl: null },
      { id: "p-2", name: "Anna Bakker", avatarUrl: null },
    ],
    {
      quote: "Snelle support en goed product.",
      author: "P. Janssen",
      personaId: "p-1",
    },
  );
  assert("no <img> tag (geen avatar)", !html.includes("<img"));
  assert(
    "initial 'P' uit author (P. Janssen)",
    />P<\/div>/.test(html),
  );
  assert(
    "persona-name in cite (Pieter Janssen)",
    html.includes("Pieter Janssen"),
  );
  assert("author behouden", html.includes("P. Janssen"));
}

// ─── Persona match MET avatarUrl ─────────────────────────

group("V2-3 — persona match met avatarUrl → <img> tag");
{
  const html = renderTestimonial(
    [
      {
        id: "p-1",
        name: "Pieter Janssen",
        avatarUrl: "https://cdn.example.com/avatars/pieter.jpg",
      },
    ],
    {
      quote: "Top kwaliteit.",
      author: "Pieter Janssen",
      personaId: "p-1",
    },
  );
  assert("<img> tag aanwezig", html.includes("<img"));
  assert(
    "src attribute correct",
    html.includes('src="https://cdn.example.com/avatars/pieter.jpg"'),
  );
  assert(
    "alt text = persona name",
    html.includes('alt="Pieter Janssen"'),
  );
  assert(
    "border-radius 50% in inline style",
    html.includes("border-radius:50%"),
  );
  assert(
    "object-fit cover",
    html.includes("object-fit:cover"),
  );
  assert("geen initial fallback wanneer image", !/>P<\/div>/.test(html));
  assert(
    "author niet ge-deduped (gelijk aan persona)",
    !html.includes("· Pieter Janssen"),
    "should not show separator when names match",
  );
}

// ─── Edge case: leeg author maar persona aanwezig ─────────

group("V2-3 — leeg author + persona met avatar → initial uit persona");
{
  const html = renderTestimonial(
    [
      {
        id: "p-1",
        name: "Sara Visser",
        avatarUrl: null,
      },
    ],
    {
      quote: "Excellent!",
      author: "",
      personaId: "p-1",
    },
  );
  assert("no <img>", !html.includes("<img"));
  // displayName fallback = persona.name (Sara), initial = S
  assert("initial 'S' (uit persona.name)", />S<\/div>/.test(html));
}

// ─── Aria-hidden op fallback voor a11y ────────────────────

group("V2-3 — accessibility");
{
  const htmlFallback = renderTestimonial([], {
    quote: "Test",
    author: "Test User",
    personaId: "",
  });
  assert(
    "fallback heeft aria-hidden",
    htmlFallback.includes('aria-hidden="true"'),
  );

  const htmlAvatar = renderTestimonial(
    [{ id: "p-1", name: "Test", avatarUrl: "https://x.test/a.jpg" }],
    { quote: "Test", author: "Test", personaId: "p-1" },
  );
  assert(
    "image heeft alt-attribute (geen aria-hidden)",
    htmlAvatar.includes('alt="Test"') &&
      !htmlAvatar.includes('aria-hidden="true"'),
  );
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
