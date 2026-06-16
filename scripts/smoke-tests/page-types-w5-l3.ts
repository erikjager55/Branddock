/**
 * Smoke-test voor W5 — logo-garantie L-Fase 3 (plan §5): opt-in hero-logo-
 * overlay + anchor-curatie.
 *
 *  - pickLogoForBackground: donkere hoek → LIGHT-variant, lichte hoek → DARK,
 *    polariteit-eerst, fallback-volgorde, lege set → null.
 *  - sampleCornerLuminance: leest de juiste hoek uit een geconstrueerd beeld
 *    (donkere top-right → lage luminantie; lichte → hoge) + degradeert naar
 *    128 bij rommel-input.
 *  - compositeLogoOverlay: stempelt een logo via imageBuffer (geen fetch) en
 *    eist imageBuffer OF imageUrl.
 *  - summarizeAnchorLogoAudit: dominante logo's → waarschuwing + tellingen;
 *    geen dominante → geen waarschuwing.
 *
 * Run: npx tsx scripts/smoke-tests/page-types-w5-l3.ts
 */

import sharp from "sharp";
import {
  pickLogoForBackground,
  type BrandLogo,
} from "../../src/lib/brand/get-brand-logo";
import {
  sampleCornerLuminance,
  compositeLogoOverlay,
  DARK_CORNER_LUMINANCE_THRESHOLD,
} from "../../src/lib/visual/logo-overlay";
import {
  summarizeAnchorLogoAudit,
  type AnchorLogoFinding,
} from "../../src/lib/ai/brand-style-anchors";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

const logo = (variant: string): BrandLogo => ({ url: `/${variant}.png`, fileType: "png", variant, width: 200, height: 80 });

// ─── A. pickLogoForBackground ──────────────────────────

group("A. pickLogoForBackground");
const fullSet = [logo("PRIMARY"), logo("LIGHT"), logo("DARK"), logo("ICON")];
assert("donkere hoek → LIGHT-variant", pickLogoForBackground(fullSet, true)?.variant === "LIGHT");
assert("lichte hoek → DARK-variant", pickLogoForBackground(fullSet, false)?.variant === "DARK");
assert(
  "donkere hoek zonder LIGHT → PRIMARY (fallback-volgorde)",
  pickLogoForBackground([logo("PRIMARY"), logo("DARK"), logo("ICON")], true)?.variant === "PRIMARY",
);
assert(
  "lichte hoek zonder DARK/PRIMARY → LOCKUP voor ICON",
  pickLogoForBackground([logo("ICON"), logo("LOCKUP"), logo("LIGHT")], false)?.variant === "LOCKUP",
);
assert("lege set → null", pickLogoForBackground([], true) === null);
assert("één onbekende variant → die variant (laatste fallback)", pickLogoForBackground([logo("WORDMARK")], false)?.variant === "WORDMARK");

// ─── B. sampleCornerLuminance ──────────────────────────

group("B. sampleCornerLuminance");
async function runLuminance() {
  // 100×100: linkerhelft zwart, rechterhelft wit → top-right licht, top-left donker.
  const split = await sharp({
    create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([{ input: { create: { width: 50, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } } }, left: 50, top: 0 }])
    .png()
    .toBuffer();

  const trLum = await sampleCornerLuminance(split, "top-right");
  const tlLum = await sampleCornerLuminance(split, "top-left");
  assert("top-right (witte helft) → hoge luminantie", trLum > DARK_CORNER_LUMINANCE_THRESHOLD, String(trLum));
  assert("top-left (zwarte helft) → lage luminantie", tlLum < DARK_CORNER_LUMINANCE_THRESHOLD, String(tlLum));
  assert("rommel-input → degradeert naar 128 (neutraal)", (await sampleCornerLuminance(Buffer.from("not-an-image"), "top-right")) === 128);

  // ── C. compositeLogoOverlay via imageBuffer ──────────
  group("C. compositeLogoOverlay (imageBuffer-pad)");
  const base = await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 20, g: 20, b: 20 } } }).png().toBuffer();
  const logoPng = await sharp({ create: { width: 120, height: 48, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer();
  const { writeFile, mkdir, rm } = await import("fs/promises");
  const { join } = await import("path");
  const dir = join("public", "uploads", "_smoke_l3");
  await mkdir(dir, { recursive: true });
  const logoPath = join(dir, "logo.png");
  await writeFile(logoPath, logoPng);
  try {
    const out = await compositeLogoOverlay({
      imageBuffer: base,
      logoUrl: "/uploads/_smoke_l3/logo.png",
      logoFileType: "png",
      position: "top-right",
    });
    const meta = await sharp(out).metadata();
    assert("overlay-output behoudt base-afmetingen", meta.width === 400 && meta.height === 300, `${meta.width}x${meta.height}`);
    assert("overlay-output is een geldige PNG (>base bytes)", out.length > 0);
    // top-right hoek is nu lichter dan vóór de overlay (wit logo op donkere bg).
    const corner = await sampleCornerLuminance(out, "top-right");
    assert("wit logo lichtte de donkere top-right-hoek op", corner > 20, String(corner));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  let threw = false;
  try {
    await compositeLogoOverlay({ logoUrl: "/x.png", logoFileType: "png", position: "top-right" });
  } catch { threw = true; }
  assert("zonder imageBuffer én imageUrl → throw", threw);
}

// ─── D. summarizeAnchorLogoAudit ───────────────────────

function runAudit() {
  group("D. summarizeAnchorLogoAudit");
  const finding = (id: string, visibleLogo: boolean, prominence: "none" | "incidental" | "dominant"): AnchorLogoFinding =>
    ({ mediaAssetId: id, alt: null, visibleLogo, prominence, rationale: "x" });

  const dominant = summarizeAnchorLogoAudit([
    finding("a", true, "dominant"),
    finding("b", true, "incidental"),
    finding("c", false, "none"),
  ]);
  assert("dominante logo-anchor → waarschuwing aanwezig", dominant.warning !== null && dominant.warning.includes("prominent logo"));
  assert("tellingen: 1 dominant, 2 visible", dominant.dominantCount === 1 && dominant.visibleCount === 2);

  const clean = summarizeAnchorLogoAudit([
    finding("a", false, "none"),
    finding("b", true, "incidental"),
  ]);
  assert("geen dominante logo's → geen waarschuwing", clean.warning === null && clean.dominantCount === 0);
  assert("incidenteel logo telt wel als visible", clean.visibleCount === 1);

  const empty = summarizeAnchorLogoAudit([]);
  assert("lege findings → geen waarschuwing", empty.warning === null && empty.dominantCount === 0 && empty.findings.length === 0);
}

async function main() {
  await runLuminance();
  runAudit();
  console.log(`\n${"=".repeat(50)}`);
  console.log(`TOTAAL: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
