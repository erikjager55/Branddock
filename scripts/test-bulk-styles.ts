// =============================================================
// Smoke test voor bulk-computed-styles.
//
// Usage:
//   npx tsx scripts/test-bulk-styles.ts <url>
//
// Print top frequencies per design-token property en demonstreert
// hoe heuristics-augmentation een statische heuristics-set verrijkt.
// =============================================================

import { chromium } from 'playwright';
import {
  extractBulkComputedStyles,
  augmentHeuristicsWithRuntime,
  topValues,
  deriveNumericScale,
} from '../src/lib/brandstyle/bulk-computed-styles';
import type { CssVisualHeuristics } from '../src/lib/brandstyle/visual-language.types';

const url = process.argv[2] ?? 'https://stripe.com';

async function main(): Promise<void> {
  console.log(`\n── Bulk computed-styles smoke test: ${url} ──\n`);

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();

    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    const tNav = Date.now() - t0;

    const t1 = Date.now();
    const bulk = await extractBulkComputedStyles(page);
    const tEval = Date.now() - t1;

    console.log(`Navigation: ${tNav}ms · Bulk extract: ${tEval}ms`);
    console.log(`Total elements: ${bulk.totalCount} · Visible (scanned): ${bulk.scannedCount}\n`);

    const props = ['border-radius', 'padding', 'font-size', 'font-weight', 'box-shadow', 'background-color'] as const;
    for (const prop of props) {
      const map = bulk.styles[prop];
      const top = topValues(map, 6);
      console.log(`── ${prop} (${Object.keys(map).length} unique values) ──`);
      for (const t of top) {
        console.log(`  ${String(t.count).padStart(4)}× ${t.value}`);
      }
    }

    console.log('\n── Numeric scale derivation ──');
    const radiusScale = deriveNumericScale(bulk.styles['border-radius']);
    console.log(`Border-radius scale: ${radiusScale.map((s) => `${s.valuePx}px(${s.count})`).join(' · ')}`);
    const paddingScale = deriveNumericScale(bulk.styles['padding']);
    console.log(`Padding scale: ${paddingScale.map((s) => `${s.valuePx}px(${s.count})`).join(' · ')}`);

    console.log('\n── Augmentation demo ──');
    // Simulate empty static heuristics — augmentation should populate values.
    const empty: CssVisualHeuristics = {
      borderRadius: { values: [], median: 0, mostCommon: 0, hasVariation: false },
      boxShadow: { count: 0, hasSubtle: false, hasBold: false, hasColored: false, samples: [] },
      borders: { count: 0, widths: [], medianWidth: 0, colors: [] },
      spacing: { values: [], median: 0, gridBase: null },
      gradients: { count: 0, samples: [] },
      glassmorphism: { detected: false, backdropFilter: false, semiTransparentBg: false },
    };
    const augmented = augmentHeuristicsWithRuntime(empty, bulk);
    console.log(`After augmentation:`);
    console.log(`  border-radius values: ${augmented.borderRadius.values.length} (median: ${augmented.borderRadius.median}px, mode: ${augmented.borderRadius.mostCommon}px)`);
    console.log(`  spacing values: ${augmented.spacing.values.length} (median: ${augmented.spacing.median}px, gridBase: ${augmented.spacing.gridBase})`);
    console.log(`  shadow samples: ${augmented.boxShadow.samples.length}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
