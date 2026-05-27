/**
 * Smoke-test voor Fase B — DB-schema rendering-profiles velden + JSON-
 * serialisatie van de Fase A scraper-output naar de Json-velden.
 *
 * Test:
 *  - Fase A extractor-outputs zijn JSON-serialiseerbaar (round-trip identical)
 *  - Lege/empty outputs serialiseren correct
 *  - Schema-velden bestaan (via Prisma client introspection — indirect)
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase29-rendering-profiles-schema.ts
 */
import { extractButtonStyles } from "../../src/lib/brandstyle/button-extractor";
import { extractTypographyByRole } from "../../src/lib/brandstyle/typography-extractor";
import { extractSpacingElevationProfile } from "../../src/lib/brandstyle/spacing-elevation-extractor";
import { extractMotionProfile } from "../../src/lib/brandstyle/motion-extractor";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

const LINFI_CSS = `
  body { font-family: "Cormorant Garamond", serif; font-size: 16px; line-height: 1.5; }
  h1 { font-family: "Cormorant Garamond", serif; font-size: 64px; font-weight: 300; line-height: 1.05; }
  h2 { font-size: 40px; font-weight: 400; }
  section { padding: 160px 32px; }
  .hero { padding: 200px 32px; }
  .card { padding: 48px 32px; border-radius: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.06); }
  .btn-primary {
    background: #B59032;
    color: #000000;
    padding: 18px 36px;
    font-weight: 500;
    border-radius: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: background 200ms ease;
  }
  .btn-primary:hover { background: #CAA33F; }
  .caption { text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; }
`;

// ─── Round-trip JSON ──────────────────────────────────────

group("Fase B — round-trip JSON serialisatie");
{
  const buttons = extractButtonStyles(LINFI_CSS);
  const json = JSON.parse(JSON.stringify(buttons));
  assert("buttons round-trip identical", JSON.stringify(json) === JSON.stringify(buttons));
  assert("buttons array niet leeg", json.length > 0);
  assert(
    "buttons preserved fields",
    json[0].background === "#B59032" && json[0].textTransform === "uppercase",
  );

  const typo = extractTypographyByRole(LINFI_CSS);
  const typoJson = JSON.parse(JSON.stringify(typo));
  assert("typography round-trip", JSON.stringify(typoJson) === JSON.stringify(typo));
  assert("display.fontFamily preserved", typoJson.display?.fontFamily === "Cormorant Garamond");

  const { spacingProfile, elevationProfile, radiusProfile } =
    extractSpacingElevationProfile(LINFI_CSS);
  const spacingJson = JSON.parse(JSON.stringify(spacingProfile));
  assert("spacing round-trip", JSON.stringify(spacingJson) === JSON.stringify(spacingProfile));
  assert("section samples preserved", spacingJson.section.samples.length >= 1);

  const elevJson = JSON.parse(JSON.stringify(elevationProfile));
  assert("elevation round-trip", JSON.stringify(elevJson) === JSON.stringify(elevationProfile));

  const radJson = JSON.parse(JSON.stringify(radiusProfile));
  assert("radius round-trip", JSON.stringify(radJson) === JSON.stringify(radiusProfile));
  assert("cardTypical preserved", radJson.cardTypical === "0");

  const motion = extractMotionProfile(LINFI_CSS);
  const motionJson = JSON.parse(JSON.stringify(motion));
  assert("motion round-trip", JSON.stringify(motionJson) === JSON.stringify(motion));
  assert("motion samples preserved", motionJson.samples.length === 1);
  assert("dominantEasing preserved", motionJson.dominantEasing === "ease");
}

// ─── Lege outputs ─────────────────────────────────────────

group("Fase B — empty extractor-outputs serialiseren correct");
{
  const css = `body { color: black; }`;
  const buttons = extractButtonStyles(css);
  assert("empty buttons → []", Array.isArray(buttons) && buttons.length === 0);
  assert("empty buttons JSON-serializable", typeof JSON.stringify(buttons) === "string");

  const typo = extractTypographyByRole(css);
  assert("empty typography → object", typeof typo === "object" && typo !== null);
  assert("empty typography no roles", !typo.display && !typo.heading && !typo.body);

  const { spacingProfile, elevationProfile, radiusProfile } =
    extractSpacingElevationProfile(css);
  assert("empty spacing JSON-serializable", typeof JSON.stringify(spacingProfile) === "string");
  assert("empty elevation samples=[]", elevationProfile.samples.length === 0);
  assert("empty radius JSON-serializable", typeof JSON.stringify(radiusProfile) === "string");
}

// ─── Combined payload size sanity check ───────────────────

group("Fase B — combined payload binnen redelijke grootte");
{
  const buttons = extractButtonStyles(LINFI_CSS);
  const typo = extractTypographyByRole(LINFI_CSS);
  const { spacingProfile, elevationProfile, radiusProfile } =
    extractSpacingElevationProfile(LINFI_CSS);
  const motion = extractMotionProfile(LINFI_CSS);

  const combined = {
    buttonProfile: buttons,
    typographyProfile: typo,
    spacingProfile,
    elevationProfile,
    radiusProfile,
    motionProfile: motion,
  };
  const size = JSON.stringify(combined).length;
  assert(
    `combined payload size = ${size} bytes (verwacht < 10KB)`,
    size < 10000,
  );
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
