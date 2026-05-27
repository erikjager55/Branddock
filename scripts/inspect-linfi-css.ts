/**
 * Debug-script: scrape linfi.nl raw + print CSS samples + extractor outputs.
 *
 * Run: DATABASE_URL=... npx tsx scripts/inspect-linfi-css.ts
 */
import { scrapeUrl } from "../src/lib/brandstyle/url-scraper";
import { extractButtonStyles } from "../src/lib/brandstyle/button-extractor";
import { extractTypographyByRole } from "../src/lib/brandstyle/typography-extractor";
import { extractSpacingElevationProfile } from "../src/lib/brandstyle/spacing-elevation-extractor";
import { extractMotionProfile } from "../src/lib/brandstyle/motion-extractor";

async function main() {
  console.log("[inspect] Scraping linfi.nl…");
  const start = Date.now();
  const scraped = await scrapeUrl("https://linfi.nl");
  console.log(`[inspect] Done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);

  console.log("=== Raw CSS sizes ===");
  console.log(`inlineCss:           ${scraped.inlineCss.length} chars`);
  console.log(`linkedCssContent:    ${scraped.linkedCssContent.length} chars`);
  console.log(`linkedStylesheets:   ${scraped.linkedStylesheetCount}`);
  console.log(`cssColors:           ${scraped.cssColors.length} colors`);
  console.log(`cssFonts:            ${scraped.cssFonts.length} fonts`);

  const allCss = scraped.inlineCss + "\n" + scraped.linkedCssContent;
  console.log(`\nallCss total:        ${allCss.length} chars`);

  // Sample selectors
  const buttonMatches = allCss.match(/[^{}]*(?:button|\.btn|\.cta|\.bricks-button)[^{}]*\{[^}]*\}/gi);
  console.log(`\nButton-like CSS rules found: ${buttonMatches?.length ?? 0}`);
  if (buttonMatches && buttonMatches.length > 0) {
    console.log("First 3 button rules:");
    buttonMatches.slice(0, 3).forEach((m, i) => {
      console.log(`  [${i}] ${m.slice(0, 200)}${m.length > 200 ? "…" : ""}`);
    });
  }

  // Bricks Builder + common framework selectors
  const frameworkClasses = ["bricks-", "elementor-", "wp-block-", "btn", "acss-", "et_pb_", "vc_btn"];
  for (const fc of frameworkClasses) {
    const count = (allCss.match(new RegExp(`\\.${fc}`, "gi")) ?? []).length;
    if (count > 0) console.log(`  .${fc}: ${count} matches`);
  }

  // Run extractors
  console.log("\n=== Extractor outputs ===");
  const buttons = extractButtonStyles(allCss);
  console.log(`buttonStyles.length:    ${buttons.length}`);
  if (buttons.length > 0) {
    console.log("First button:", JSON.stringify(buttons[0], null, 2).slice(0, 500));
  }

  const typo = extractTypographyByRole(allCss);
  console.log(`typographyByRole keys:  ${Object.keys(typo).join(", ") || "(empty)"}`);
  if (typo.display) console.log("display:", JSON.stringify(typo.display).slice(0, 300));

  const { spacingProfile, elevationProfile, radiusProfile } = extractSpacingElevationProfile(allCss);
  console.log(`spacing.section.samples:    ${spacingProfile.section.samples.length}`);
  console.log(`spacing.card.samples:       ${spacingProfile.card.samples.length}`);
  console.log(`spacing.button.samples:     ${spacingProfile.button.samples.length}`);
  console.log(`elevation.samples:          ${elevationProfile.samples.length}`);
  console.log(`elevation.dominant:         ${elevationProfile.dominantCategory}`);
  console.log(`radius.cardTypical:         ${radiusProfile.cardTypical}`);
  console.log(`radius.buttonTypical:       ${radiusProfile.buttonTypical}`);

  const motion = extractMotionProfile(allCss);
  console.log(`motion.samples:             ${motion.samples.length}`);
  console.log(`motion.dominantCategory:    ${motion.dominantCategory}`);
  console.log(`motion.averageDurationMs:   ${motion.averageDurationMs}`);
  console.log(`motion.dominantEasing:      ${motion.dominantEasing}`);

  // Dump first 2000 chars of allCss for manual inspection
  console.log("\n=== First 2000 chars of allCss ===");
  console.log(allCss.slice(0, 2000));
}

main().catch((err) => {
  console.error("Crashed:", err);
  process.exit(1);
});
