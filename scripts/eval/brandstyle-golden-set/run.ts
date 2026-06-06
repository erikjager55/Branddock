/**
 * Brandstyle golden-set runner (V5 deel 2 van het governed-token-layer plan).
 *
 * Itereert alle `brands/*.json` golden-files, draait de token-resolver
 * (`extractBrandTokensWithProvenance`) op de bevroren input, en meet de
 * accuraatheid t.o.v. de verwachte tokens + provenance. Faalt onder de drempel
 * (default 90% — Anthropic's offline-eval-bar uit de self-service-analytics les).
 *
 * **Bewust resolver-niveau, niet full-scrape**: de scraper (`scrapeUrl`) heeft
 * geen offline HTML-seam (alleen netwerk-fetch), dus een golden-set tegen
 * opgeslagen HTML-snapshots vereist eerst een scraper-refactor. Deze golden-set
 * bevriest daarom de StyleguideShape (resolver-input) + verwachte output — het
 * dekt de hele resolve/provenance-laag deterministisch. Full-scrape-coverage is
 * een gedocumenteerde vervolgstap.
 *
 * Een merk toevoegen = `brands/<naam>.json` neerzetten (zie README + _schema).
 *
 * Run: npx tsx scripts/eval/brandstyle-golden-set/run.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractBrandTokensWithProvenance } from "../../../src/lib/landing-pages/brand-tokens";

const HERE = dirname(fileURLToPath(import.meta.url));
const BRANDS_DIR = join(HERE, "brands");
const THRESHOLD = Number(process.env.GOLDEN_THRESHOLD ?? "90");

type Input = Parameters<typeof extractBrandTokensWithProvenance>[0];

interface GoldenBrand {
  name: string;
  note?: string;
  input: Input;
  expect: {
    /** Verwachte token-waarden (subset — alleen wat ertoe doet per merk). */
    tokens?: Record<string, string>;
    /** Verwachte provenance-source per pad (subset). */
    provenanceSource?: Record<string, string>;
  };
}

interface Check {
  ok: boolean;
  label: string;
  detail?: string;
}

function checkBrand(brand: GoldenBrand): Check[] {
  const { tokens, provenance } = extractBrandTokensWithProvenance(brand.input);
  const checks: Check[] = [];

  for (const [key, want] of Object.entries(brand.expect.tokens ?? {})) {
    const got = (tokens as unknown as Record<string, unknown>)[key];
    const gotStr = typeof got === "string" ? got : JSON.stringify(got);
    const ok = typeof got === "string" && got.toLowerCase() === want.toLowerCase();
    checks.push({ ok, label: `token.${key} === ${want}`, detail: ok ? undefined : `got ${gotStr}` });
  }

  for (const [path, want] of Object.entries(brand.expect.provenanceSource ?? {})) {
    const got = provenance[path]?.source;
    const ok = got === want;
    checks.push({ ok, label: `provenance.${path}.source === ${want}`, detail: ok ? undefined : `got ${got}` });
  }

  return checks;
}

function main(): void {
  const files = readdirSync(BRANDS_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  if (files.length === 0) {
    console.error("Geen golden-brands gevonden in brands/ — voeg <naam>.json toe (zie README).");
    process.exit(1);
  }

  let total = 0;
  let passed = 0;
  const failedBrands: string[] = [];

  for (const file of files.sort()) {
    const brand = JSON.parse(readFileSync(join(BRANDS_DIR, file), "utf8")) as GoldenBrand;
    const checks = checkBrand(brand);
    const brandPassed = checks.filter((c) => c.ok).length;
    total += checks.length;
    passed += brandPassed;
    const allOk = brandPassed === checks.length;
    if (!allOk) failedBrands.push(brand.name);

    console.log(`\n${allOk ? "✓" : "✗"} ${brand.name} — ${brandPassed}/${checks.length}${brand.note ? `  (${brand.note})` : ""}`);
    for (const c of checks.filter((c) => !c.ok)) {
      console.log(`    ✗ ${c.label}${c.detail ? ` — ${c.detail}` : ""}`);
    }
  }

  const accuracy = total === 0 ? 0 : Math.round((passed / total) * 1000) / 10;
  console.log(`\n=== Golden-set accuraatheid: ${passed}/${total} = ${accuracy}% (drempel ${THRESHOLD}%) ===\n`);
  if (accuracy < THRESHOLD) {
    console.error(`FAIL — onder drempel. Brands met afwijkingen: ${failedBrands.join(", ")}`);
    process.exit(1);
  }
  console.log("PASS");
}

main();
