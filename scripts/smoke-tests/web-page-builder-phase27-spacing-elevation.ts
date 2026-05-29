/**
 * Smoke-test voor Fase A3 — spacing + elevation + radius extractie.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase27-spacing-elevation.ts
 */

import { extractSpacingElevationProfile } from "../../src/lib/brandstyle/spacing-elevation-extractor";

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

// ─── Spacing per context ──────────────────────────────────

group("A3 — spacing per context");
{
  const css = `
    section { padding: 80px 24px; }
    .section-hero { padding: 120px 32px; }
    .card { padding: 32px 24px; }
    .feature-card { padding: 24px 20px; }
    .btn { padding: 12px 24px; }
    button { padding: 14px 28px; }
    input { padding: 8px 12px; }
    .container { padding: 0 24px; }
  `;
  const { spacingProfile } = extractSpacingElevationProfile(css);

  assert("section heeft samples", spacingProfile.section.samples.length === 2);
  assert("card heeft samples", spacingProfile.card.samples.length === 2);
  assert("button heeft samples", spacingProfile.button.samples.length === 2);
  assert("input heeft sample", spacingProfile.input.samples.length === 1);
  assert("container heeft sample", spacingProfile.container.samples.length === 1);

  assert("button typical paddingY", spacingProfile.button.typical?.paddingY !== null);
  assert("card typical paddingX", spacingProfile.card.typical?.paddingX !== null);
}

// ─── Padding-shorthand variants ───────────────────────────

group("A3 — padding-shorthand split");
{
  const css = `
    .card { padding: 24px; }
    .feature { padding: 16px 32px; }
    .tile { padding: 8px 16px 12px; }
  `;
  const { spacingProfile } = extractSpacingElevationProfile(css);
  const samples = spacingProfile.card.samples;
  assert("drie card-samples", samples.length === 3);
  assert("1-value → Y=X=24px", samples[0].paddingY === "24px" && samples[0].paddingX === "24px");
  assert("2-value → Y=16px X=32px", samples[1].paddingY === "16px" && samples[1].paddingX === "32px");
}

// ─── Border-radius ────────────────────────────────────────

group("A3 — border-radius per context");
{
  const css = `
    .card { border-radius: 12px; padding: 24px; }
    .feature-card { border-radius: 12px; }
    .feature-tile { border-radius: 16px; }
    .btn { border-radius: 4px; padding: 12px; }
    button { border-radius: 4px; padding: 12px; }
    input { border-radius: 6px; padding: 8px; }
  `;
  const { radiusProfile } = extractSpacingElevationProfile(css);
  assert("card-radius=12px (typical)", radiusProfile.cardTypical === "12px");
  assert("button-radius=4px (typical)", radiusProfile.buttonTypical === "4px");
  assert("input-radius=6px (typical)", radiusProfile.inputTypical === "6px");
}

// ─── Box-shadow classification ────────────────────────────

group("A3 — box-shadow categorisatie");
{
  const css = `
    .card { box-shadow: 0 1px 2px rgba(0,0,0,0.05); padding: 24px; }
    .feature { box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 24px; }
    .testimonial { box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 24px; }
    .tile { box-shadow: 0 12px 32px rgba(0,0,0,0.2); padding: 24px; }
  `;
  const { elevationProfile } = extractSpacingElevationProfile(css);
  assert("vier shadow-samples", elevationProfile.samples.length === 4);

  const cats = elevationProfile.samples.map((s) => s.category);
  assert("subtle-shadow gevonden", cats.includes("subtle-shadow"));
  assert(
    "medium-shadow gevonden",
    cats.includes("medium-shadow"),
    `cats=${cats.join(",")}`,
  );
  assert("strong-shadow gevonden", cats.includes("strong-shadow"));
}

// ─── Dominant shadow category ─────────────────────────────

group("A3 — dominant shadow-category = meest-voorkomend");
{
  const css = `
    .card-1 { box-shadow: 0 1px 2px rgba(0,0,0,0.05); padding: 24px; }
    .card-2 { box-shadow: 0 1px 3px rgba(0,0,0,0.08); padding: 24px; }
    .card-3 { box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 24px; }
    .card-4 { box-shadow: 0 12px 32px rgba(0,0,0,0.2); padding: 24px; }
  `;
  const { elevationProfile } = extractSpacingElevationProfile(css);
  // 3 subtle (blur ≤ 4) of medium (blur ≤ 15), 1 strong (blur 32) → dominant = subtle/medium
  assert(
    "dominant != strong-shadow (alleen 1 sample)",
    elevationProfile.dominantCategory !== "strong-shadow",
    `got ${elevationProfile.dominantCategory}`,
  );
}

// ─── No data → empty ──────────────────────────────────────

group("A3 — geen data → empty profiles");
{
  const css = `body { color: black; }`;
  const { spacingProfile, elevationProfile, radiusProfile } =
    extractSpacingElevationProfile(css);
  assert("section empty", spacingProfile.section.samples.length === 0);
  assert("card empty", spacingProfile.card.samples.length === 0);
  assert("elevation empty", elevationProfile.samples.length === 0);
  assert("dominant=none", elevationProfile.dominantCategory === "none");
  assert("radius cards empty", radiusProfile.card.length === 0);
}

// ─── Skip pseudo + modal ──────────────────────────────────

group("A3 — pseudo + modal selectors uitgesloten");
{
  const css = `
    .card { padding: 24px; }
    .card:hover { padding: 32px; }
    .modal .card { padding: 16px; }
    .popup .card { padding: 8px; }
  `;
  const { spacingProfile } = extractSpacingElevationProfile(css);
  assert(
    "alleen 1 base .card sample",
    spacingProfile.card.samples.length === 1,
    `got ${spacingProfile.card.samples.length}`,
  );
}

// ─── LINFI fixture (premium scenario) ─────────────────────

group("A3 — LINFI scenario");
{
  const css = `
    section { padding: 160px 32px; }
    .hero { padding: 200px 32px; }
    .card { padding: 48px 32px; border-radius: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.06); }
    button { padding: 18px 36px; border-radius: 0; }
    .btn-primary { padding: 18px 36px; border-radius: 0; }
  `;
  const { spacingProfile, radiusProfile, elevationProfile } =
    extractSpacingElevationProfile(css);

  // MINIMAL: grote section-padding
  assert(
    "section paddingY ≥ 160px",
    parseInt(spacingProfile.section.typical?.paddingY ?? "0") >= 160,
  );
  // RULER: scherpe corners
  assert("card radius = 0", radiusProfile.cardTypical === "0");
  assert("button radius = 0", radiusProfile.buttonTypical === "0");
  // Subtle/no shadows
  assert(
    "dominant subtle/none",
    elevationProfile.dominantCategory === "subtle-shadow" ||
      elevationProfile.dominantCategory === "none",
  );
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
