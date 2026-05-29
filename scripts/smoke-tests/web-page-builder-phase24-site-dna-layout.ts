/**
 * Smoke-test voor V2-2b — Site-DNA LayoutStyle inference (pure helper).
 *
 * Test inferLayoutStyleFromSiteData zonder Prisma/AI:
 *  - Empty input → null (no signal)
 *  - LINFI fixture (sophisticated/architectural photography + Golden Bronze)
 *    → MINIMAL of EDITORIAL (premium / refined / architectural)
 *  - Playful fixture (vibrant photography + high-saturation color) → PLAYFUL
 *  - Conversion fixture (commercial/scannable mood) → COMMERCIAL
 *  - Story fixture (immersive narrative mood) → EXPERIENTIAL
 *  - Magazine fixture (editorial narrative mood) → EDITORIAL
 *  - Confidence scaling: 1 keyword medium, ≥2 + color signal high
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase24-site-dna-layout.ts
 */
import { inferLayoutStyleFromSiteData } from "../../src/lib/brandstyle/infer-layout-style";

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

// ─── Empty / weak signal ──────────────────────────────────

group("V2-2b — geen signals → null");
{
  const result = inferLayoutStyleFromSiteData({});
  assert("empty input → null", result === null);

  const onlyEmptyMood = inferLayoutStyleFromSiteData({
    photographyMood: "",
    brandHex: null,
  });
  assert("empty strings → null", onlyEmptyMood === null);
}

// ─── LINFI fixture ────────────────────────────────────────

group("V2-2b — LINFI: sophisticated architectural luxury + golden bronze");
{
  const result = inferLayoutStyleFromSiteData({
    photographyMood:
      "Sophisticated, architectural, aspirational — showcasing luxury residential interiors with natural light, clean lines, and high-end finishes",
    brandHex: "#B59032",
  });
  assert("non-null result", result !== null);
  assert(
    "MINIMAL of EDITORIAL gekozen",
    result?.layoutStyle === "MINIMAL" || result?.layoutStyle === "EDITORIAL",
    `got ${result?.layoutStyle}`,
  );
  assert(
    "confidence medium of high",
    result?.confidence === "medium" || result?.confidence === "high",
  );
  assert(
    "reasoning bevat photographyMood",
    (result?.reasoning ?? "").includes("photographyMood"),
  );
}

// ─── Playful fixture ──────────────────────────────────────

group("V2-2b — Playful brand: vibrant + warm");
{
  const result = inferLayoutStyleFromSiteData({
    photographyMood:
      "Playful, vibrant, fun, energetic — colorful imagery with joyful moments and warm casual lifestyle",
    brandHex: "#FF6B6B",  // vibrant red
  });
  assert("non-null", result !== null);
  assert("PLAYFUL wint", result?.layoutStyle === "PLAYFUL", `got ${result?.layoutStyle}`);
}

// ─── Conversion (commercial) ──────────────────────────────

group("V2-2b — Commercial conversion brand");
{
  const result = inferLayoutStyleFromSiteData({
    photographyMood:
      "Modern professional product-focused imagery, scannable B2B corporate, efficient and tight",
    brandHex: "#1FD1B2",
  });
  assert("non-null", result !== null);
  assert(
    "COMMERCIAL gekozen",
    result?.layoutStyle === "COMMERCIAL",
    `got ${result?.layoutStyle}`,
  );
}

// ─── Experiential narrative ───────────────────────────────

group("V2-2b — Experiential / story-driven brand");
{
  const result = inferLayoutStyleFromSiteData({
    photographyMood:
      "Immersive, story-driven, cinematic, atmospheric, moody aspirational lifestyle narrative",
    brandHex: "#2B2B2B",
  });
  assert("non-null", result !== null);
  assert(
    "EXPERIENTIAL of EDITORIAL gekozen (overlap)",
    result?.layoutStyle === "EXPERIENTIAL" || result?.layoutStyle === "EDITORIAL",
    `got ${result?.layoutStyle}`,
  );
}

// ─── Editorial / magazine ─────────────────────────────────

group("V2-2b — Editorial / magazine brand");
{
  const result = inferLayoutStyleFromSiteData({
    photographyMood:
      "Magazine-style editorial feature journalistic, considered intentional vakmanschap craft",
    brandHex: "#0A0A0A",
  });
  assert("non-null", result !== null);
  assert(
    "EDITORIAL wint (of MINIMAL bij donkere kleur)",
    result?.layoutStyle === "EDITORIAL" || result?.layoutStyle === "MINIMAL",
    `got ${result?.layoutStyle}`,
  );
}

// ─── Color-only signal (geen mood) ────────────────────────

group("V2-2b — alleen brand-color signal werkt");
{
  // Heel licht/wit → MINIMAL signaal
  const lightResult = inferLayoutStyleFromSiteData({
    brandHex: "#F8F8F8",
  });
  if (lightResult) {
    assert("light color → MINIMAL push", lightResult.scores.MINIMAL >= 1);
  }

  // Hoog gesatureerd kleurrijk → PLAYFUL push
  const vibrantResult = inferLayoutStyleFromSiteData({
    brandHex: "#FF3399",
  });
  if (vibrantResult) {
    assert(
      "high-saturation → PLAYFUL push",
      vibrantResult.scores.PLAYFUL >= 1,
    );
  }
}

// ─── Confidence scaling ───────────────────────────────────

group("V2-2b — confidence scaling");
{
  // 1 keyword → low/medium
  const single = inferLayoutStyleFromSiteData({
    photographyMood: "premium",
  });
  assert(
    "single keyword → low/medium confidence",
    single === null || single.confidence === "low" || single.confidence === "medium",
  );

  // Veel keywords + matching color → high confidence
  const strong = inferLayoutStyleFromSiteData({
    photographyMood:
      "minimal minimalist sophisticated premium luxury refined quiet elegant clean understated subtle",
    brandHex: "#1A1A1A",
  });
  assert("strong signal → non-null", strong !== null);
  assert(
    "strong signal → high confidence",
    strong?.confidence === "high",
    `got ${strong?.confidence}`,
  );
}

// ─── Image-density signal ─────────────────────────────────

group("V2-2b — image-density beïnvloedt scores");
{
  const photoHeavy = inferLayoutStyleFromSiteData({
    photographyMood: "lifestyle warm",
    imageDensity: 40,
  });
  if (photoHeavy) {
    assert(
      "high imageDensity → EXPERIENTIAL/EDITORIAL push",
      photoHeavy.scores.EXPERIENTIAL >= 1 || photoHeavy.scores.EDITORIAL >= 1,
    );
  }

  const sparse = inferLayoutStyleFromSiteData({
    photographyMood: "professional clean",
    imageDensity: 2,
  });
  if (sparse) {
    assert(
      "low imageDensity → MINIMAL/COMMERCIAL push",
      sparse.scores.MINIMAL >= 1 || sparse.scores.COMMERCIAL >= 1,
    );
  }
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
