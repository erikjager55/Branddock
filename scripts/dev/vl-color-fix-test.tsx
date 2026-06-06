/**
 * Dev-tool — verifieert de visualLanguage Bootstrap-pollutie-fix: roept de
 * analyzer aan met de RESOLVED rol-gelabelde Zwarthout-palette en checkt dat de
 * output (promptFragment/colorApplication) #E06000 beschrijft en GEEN Bootstrap-
 * default (#7A00DF / #198754 / #DC3545 / #0A58CA).
 *
 * Run: export $(grep ANTHROPIC_API_KEY .env.local|xargs); npx tsx scripts/dev/vl-color-fix-test.tsx
 */
import { analyzeVisualLanguage } from "../../src/lib/brandstyle/visual-language-analyzer";
import type { CssVisualHeuristics } from "../../src/lib/brandstyle/visual-language.types";

const heuristics: CssVisualHeuristics = {
  borderRadius: { values: [0, 3], median: 3, mostCommon: 3, hasVariation: true },
  boxShadow: { count: 4, hasSubtle: true, hasBold: false, hasColored: false, samples: ["0 0.5rem 1rem rgba(33,37,41,0.15)"] },
  borders: { count: 6, widths: [1], medianWidth: 1, colors: ["#CED4DA", "#DEE2E6"] },
  spacing: { values: [8, 16, 24, 32], median: 16, gridBase: 8 },
  gradients: { count: 0, samples: [] },
  glassmorphism: { detected: false, backdropFilter: false, semiTransparentBg: false },
};

async function main() {
  const profile = await analyzeVisualLanguage(
    heuristics,
    {
      // De FIX: resolved rol-gelabelde palette (zoals analysis-engine nu stuurt).
      colors: ["PRIMARY #E06000", "NEUTRAL #F8F9FA", "NEUTRAL #212529"],
      fonts: ["Sen", "Roboto"],
      photographyStyle: "dark, moody, atmospheric",
      designLanguageSummary: "clean, angular, charred-wood architectural brand",
    },
    "https://zwarthout.com/",
  );

  const blob = JSON.stringify({
    promptFragment: profile.promptFragment,
    colorApplication: profile.colorApplication,
    summary: profile.summary,
  }).toLowerCase();

  console.log("=== promptFragment ===\n" + profile.promptFragment);
  console.log("\n=== colorApplication ===\n" + JSON.stringify(profile.colorApplication, null, 2));

  const bootstrap = ["#7a00df", "#198754", "#dc3545", "#0a58ca", "#997404", "purple", "paars"];
  const leaked = bootstrap.filter((b) => blob.includes(b));
  const mentionsBrand = blob.includes("#e06000") || blob.includes("orange") || blob.includes("oranje") || blob.includes("burnt");

  console.log("\n=== CHECK ===");
  console.log("noemt merk-accent (#E06000/orange):", mentionsBrand ? "JA ✓" : "NEE ✗");
  console.log("framework-lek:", leaked.length === 0 ? "GEEN ✓" : `LEK: ${leaked.join(", ")} ✗`);
  process.exit(mentionsBrand && leaked.length === 0 ? 0 : 1);
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); });
