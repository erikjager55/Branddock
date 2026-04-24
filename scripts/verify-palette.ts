/**
 * Brandstyle palette verification harness.
 *
 * Runs the scraper + `preprocessScrapeData` pipeline against a configurable
 * set of URLs and dumps the authoritative palette + diagnostic signals to
 * disk so we can diff before/after each fix fase (plugin-CSS filter, logo
 * colour injection, screenshot usage-evidence pass).
 *
 * Run:
 *   npx tsx scripts/verify-palette.ts --label baseline
 *   npx tsx scripts/verify-palette.ts --label fase1 --urls https://dtsede.nl,https://stripe.com
 *
 * Output:
 *   scripts/baselines/<label>/<slug>.json    full diagnostic snapshot per URL
 *   scripts/baselines/<label>/SUMMARY.md     human-readable comparison table
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { config as dotenvConfig } from 'dotenv';

// Load .env.local BEFORE any transitive import touches prisma / @/lib/prisma.
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });
dotenvConfig({ path: resolve(process.cwd(), '.env') });

// Types are compile-time only — safe to import statically.
type AuthoritativeColor =
  import('../src/lib/brandstyle/analysis-prompts').AuthoritativeColor;
type ScrapedData =
  import('../src/lib/brandstyle/url-scraper').ScrapedData;
type ProcessedData =
  import('../src/lib/brandstyle/analysis-prompts').ProcessedData;
type PageScreenshot =
  import('../src/lib/brandstyle/page-screenshotter').PageScreenshot;
type ColorUsageRecord =
  import('../src/lib/brandstyle/color-usage-verifier').ColorUsageRecord;

// Runtime imports happen inside main() after dotenv has populated
// process.env — analysis-engine transitively pulls in prisma, which
// throws at module load if DATABASE_URL is unset.
type ScrapeUrlFn = (url: string) => Promise<ScrapedData>;
type PreprocessFn = (scraped: ScrapedData) => ProcessedData;
type ShotFn = (url: string) => Promise<PageScreenshot[]>;
type VerifyFn = (
  palette: AuthoritativeColor[],
  shots: PageScreenshot[],
  opts?: { enableVision?: boolean; log?: (m: string) => void },
) => Promise<Map<string, ColorUsageRecord>>;
let scrapeUrl: ScrapeUrlFn;
let preprocessScrapeData: PreprocessFn;
let capturePageScreenshots: ShotFn;
let verifyColorUsage: VerifyFn;

// ── CLI args ──────────────────────────────────────────────────
const DEFAULT_URLS = [
  'https://dtsede.nl',
  'https://betterbrands.nl',
  'https://stripe.com',
  'https://vercel.com',
];

interface ParsedArgs {
  urls: string[];
  label: string;
  /** Capture Playwright screenshots + run pixel pass. Default true. */
  screenshots: boolean;
  /** Run the Claude Vision pass on borderline colours. Default true when
   *  ANTHROPIC_API_KEY is set, false otherwise. */
  vision: boolean | null;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let label = 'baseline';
  let urls = DEFAULT_URLS;
  let screenshots = true;
  let vision: boolean | null = null; // null → auto-detect from env
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--label' && args[i + 1]) {
      label = args[i + 1];
      i++;
    } else if (args[i] === '--urls' && args[i + 1]) {
      urls = args[i + 1].split(',').map((u) => u.trim()).filter(Boolean);
      i++;
    } else if (args[i] === '--no-screenshots') {
      screenshots = false;
    } else if (args[i] === '--screenshots') {
      screenshots = true;
    } else if (args[i] === '--no-vision') {
      vision = false;
    } else if (args[i] === '--vision') {
      vision = true;
    }
  }
  return { urls, label, screenshots, vision };
}

// ── Diagnostic helpers ────────────────────────────────────────

function slugify(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .replace(/[^a-z0-9.-]+/gi, '_')
    .toLowerCase();
}

/**
 * Fast HTML stylesheet link survey — independent of the scraper's ranking.
 * Used to show "how many of the N links were admin/plugin noise before
 * the pipeline capped at 15".
 */
async function surveyStylesheetLinks(url: string): Promise<{
  total: number;
  plugins: number;
  samples: Array<{ href: string; id: string; kind: 'plugin' | 'theme' | 'other' }>;
} | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const links: Array<{ href: string; id: string; kind: 'plugin' | 'theme' | 'other' }> = [];
    const linkRe = /<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*>/gi;
    for (const m of html.matchAll(linkRe)) {
      const tag = m[0];
      const href = (tag.match(/href\s*=\s*["']([^"']+)["']/i) || [, ''])[1];
      const id = (tag.match(/id\s*=\s*["']([^"']+)["']/i) || [, ''])[1];
      const combined = `${id} ${href}`.toLowerCase();
      let kind: 'plugin' | 'theme' | 'other' = 'other';
      if (/admin|gutenberg|wp-block-library|jquery-ui|cookie|popup|gdpr|datepicker|shadowbox|advertenties|events-widget|countdown|club-stats|wedstrijdverslag|mainsponsor|widgetarchive|clublogos|fontawesome|font-awesome|material-icons|ionicons/.test(combined)) {
        kind = 'plugin';
      } else if (/style|main|app|index|framework|globals|tokens|theme|brand|palette/.test(combined)) {
        kind = 'theme';
      }
      links.push({ href, id, kind });
    }
    return {
      total: links.length,
      plugins: links.filter((l) => l.kind === 'plugin').length,
      samples: links.slice(0, 30),
    };
  } catch {
    return null;
  }
}

/** Label a hex for quick visual scanning in tables. */
function hexHue(hex: string): string {
  const c = hex.replace('#', '');
  if (c.length < 6) return 'invalid';
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 20) {
    if (max < 50) return 'black-ish';
    if (max > 220) return 'white-ish';
    return 'gray';
  }
  if (b > r + 20 && b > g + 20) return 'blue';
  if (g > 100 && b > 100 && Math.abs(g - b) < 40 && r < Math.min(g, b) - 20) return 'teal';
  if (g > r + 20 && g > b + 20) return 'green';
  if (r > 180 && g > 140 && b < 100) return 'yellow/orange';
  if (r > g + 30 && r > b + 30) return 'red';
  if (r > 150 && b > 150 && g < Math.min(r, b) - 20) return 'magenta';
  return 'neutral';
}

interface PaletteSnapshot {
  url: string;
  scrapedAt: string;
  title: string | null;
  description: string | null;
  stylesheetSurvey: Awaited<ReturnType<typeof surveyStylesheetLinks>>;
  /** Total `<link rel="stylesheet">` tags the scraper saw (not fetched — it
   *  caps fetches at MAX_LINKED_STYLESHEETS=15 and prioritises by rank). */
  scraperStylesheetLinkCount: number;
  fonts: {
    body: string | null;
    heading: string | null;
    all: string[];
  };
  logoUrls: string[];
  logoColors: Array<{ hex: string; dominance: number; source: string; hue: string }>;
  usageVerification: {
    ran: boolean;
    screenshotCount: number;
    visionRan: boolean;
    perColor: Array<{
      hex: string;
      pixelCoverage: number;
      pixelVerdict: string;
      visionRole: string | null;
      visionReasoning: string | null;
      finalEvidence: string;
    }>;
  };
  cssVariableCount: number;
  cssVariablesSample: Array<{ name: string; value: string; context: string }>;
  colorFrequencyCount: number;
  colorFrequencyTop: Array<{ hex: string; count: number; contexts: string[]; hue: string }>;
  authoritativePalette: Array<AuthoritativeColor & { hue: string }>;
  authoritativeBuckets: { high: number; medium: number; low: number };
  semanticVarHits: string[];
  symptoms: {
    missingPrimaryBlue: boolean;
    blueCandidatesInPalette: string[];
    semanticColorsInPalette: string[];
  };
}

async function snapshot(
  url: string,
  options: { screenshots: boolean; vision: boolean | null },
): Promise<PaletteSnapshot | { url: string; error: string }> {
  const [survey, scraped] = await Promise.all([
    surveyStylesheetLinks(url),
    scrapeUrl(url).catch((err) => {
      throw err instanceof Error ? err : new Error(String(err));
    }),
  ]);

  const processed = preprocessScrapeData(scraped);

  // ── Usage verification: optional screenshot + Vision pass ─────
  let usageVerification: PaletteSnapshot['usageVerification'] = {
    ran: false,
    screenshotCount: 0,
    visionRan: false,
    perColor: [],
  };
  if (options.screenshots && processed.authoritativeColors.length > 0) {
    let shots: PageScreenshot[] = [];
    try {
      shots = await capturePageScreenshots(url);
    } catch (err) {
      console.warn(
        `  [screenshots] ${url} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (shots.length > 0) {
      const enableVision =
        options.vision === null ? Boolean(process.env.ANTHROPIC_API_KEY) : options.vision;
      try {
        const evidenceMap = await verifyColorUsage(
          processed.authoritativeColors,
          shots,
          {
            enableVision,
            log: (m) => process.stdout.write(m.includes('[color-usage') ? '' : ''),
          },
        );
        for (const color of processed.authoritativeColors) {
          const rec = evidenceMap.get(color.hex);
          if (!rec) continue;
          color.usageEvidence = rec.finalEvidence;
          color.visionRole = rec.visionRole;
        }
        usageVerification = {
          ran: true,
          screenshotCount: shots.length,
          visionRan: enableVision,
          perColor: Array.from(evidenceMap.values()).map((rec) => ({
            hex: rec.hex,
            pixelCoverage: rec.pixelCoverage,
            pixelVerdict: rec.pixelVerdict,
            visionRole: rec.visionRole ?? null,
            visionReasoning: rec.visionReasoning ?? null,
            finalEvidence: rec.finalEvidence,
          })),
        };
      } catch (err) {
        console.warn(
          `  [usage-verifier] ${url} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  const palette = processed.authoritativeColors.map((c) => ({ ...c, hue: hexHue(c.hex) }));

  const buckets = { high: 0, medium: 0, low: 0 };
  for (const c of palette) buckets[c.confidence]++;

  const blueCandidates = palette.filter((c) => c.hue === 'blue').map((c) => c.hex);
  const semanticVarHits = processed.cssVariables
    .filter((v) => /success|error|warning|danger|info/i.test(v.name))
    .map((v) => `${v.name}: ${v.value}`);

  // Rough "semantic color" proxy: reds or greens classified as high/medium
  // in the palette that might get tagged SEMANTIC by Claude.
  const semanticColorCandidates = palette
    .filter((c) => ['red', 'green'].includes(c.hue))
    .map((c) => c.hex);

  return {
    url,
    scrapedAt: new Date().toISOString(),
    title: scraped.title,
    description: scraped.description,
    stylesheetSurvey: survey,
    scraperStylesheetLinkCount: scraped.linkedStylesheetCount ?? 0,
    fonts: {
      body: scraped.bodyFont ?? null,
      heading: scraped.headingFont ?? null,
      all: scraped.cssFonts,
    },
    logoUrls: scraped.logoUrls,
    logoColors: (scraped.logoColors ?? []).map((lc) => ({
      hex: lc.hex,
      dominance: lc.dominance,
      source: lc.source,
      hue: hexHue(lc.hex),
    })),
    usageVerification,
    cssVariableCount: processed.cssVariables.length,
    cssVariablesSample: processed.cssVariables.slice(0, 20).map((v) => ({
      name: v.name,
      value: v.value.slice(0, 60),
      context: v.context,
    })),
    colorFrequencyCount: scraped.colorFrequency.length,
    colorFrequencyTop: scraped.colorFrequency.slice(0, 20).map((c) => ({
      hex: c.hex,
      count: c.count,
      contexts: c.contexts,
      hue: hexHue(c.hex),
    })),
    authoritativePalette: palette,
    authoritativeBuckets: buckets,
    semanticVarHits,
    symptoms: {
      missingPrimaryBlue:
        blueCandidates.length === 0 &&
        (scraped.logoUrls.length > 0 || /logo/i.test(scraped.title ?? '')),
      blueCandidatesInPalette: blueCandidates,
      semanticColorsInPalette: semanticColorCandidates,
    },
  };
}

// ── Formatting ────────────────────────────────────────────────

function formatSnapshot(snap: PaletteSnapshot): string {
  const lines: string[] = [];
  lines.push(`## ${snap.url}`);
  lines.push('');
  lines.push(`- Title: \`${snap.title ?? '—'}\``);
  lines.push(`- Stylesheet links in HTML: ${snap.stylesheetSurvey?.total ?? '?'} (${snap.stylesheetSurvey?.plugins ?? '?'} plugin-like)`);
  lines.push(`- Scraper saw ${snap.scraperStylesheetLinkCount} link tags — will fetch top 15 by rankStylesheets() priority`);
  lines.push(`- CSS colour-vars found: ${snap.cssVariableCount} (semantic-named: ${snap.semanticVarHits.length})`);
  lines.push(`- Colour frequency rows (post-filter): ${snap.colorFrequencyCount}`);
  lines.push(`- Fonts: body=\`${snap.fonts.body ?? '—'}\`, heading=\`${snap.fonts.heading ?? '—'}\` (total ${snap.fonts.all.length})`);
  lines.push(`- Logo URLs: ${snap.logoUrls.length}`);
  if (snap.logoUrls[0]) lines.push(`    - ${snap.logoUrls[0]}`);
  if (snap.logoColors.length > 0) {
    const logoLine = snap.logoColors
      .map((lc) => `\`${lc.hex}\` (${lc.hue}, ${(lc.dominance * 100).toFixed(0)}% ${lc.source})`)
      .join(', ');
    lines.push(`- Logo-extracted colours: ${logoLine}`);
  } else {
    lines.push(`- Logo-extracted colours: none`);
  }
  lines.push('');
  lines.push(`### Authoritative palette (${snap.authoritativePalette.length}/12)`);
  lines.push(`Confidence split → high: ${snap.authoritativeBuckets.high}, medium: ${snap.authoritativeBuckets.medium}, low: ${snap.authoritativeBuckets.low}`);
  lines.push('');
  lines.push('| # | hex | hue | source | conf | detector / var | freq | usage | vision |');
  lines.push('|---|-----|-----|--------|------|----------------|------|-------|--------|');
  snap.authoritativePalette.forEach((c, i) => {
    const meta = c.detectorName
      ? `${c.detectorName}:${c.detectorRole ?? ''}`
      : c.variableName ?? '';
    const usage = c.usageEvidence ?? '—';
    const vision = c.visionRole ?? '—';
    lines.push(
      `| ${i + 1} | \`${c.hex}\` | ${c.hue} | ${c.source} | ${c.confidence} | ${meta || '—'} | ${c.frequency ?? ''} | ${usage} | ${vision} |`,
    );
  });
  if (snap.usageVerification.ran) {
    lines.push('');
    const covSummary = snap.usageVerification.perColor
      .slice()
      .sort((a, b) => b.pixelCoverage - a.pixelCoverage)
      .slice(0, 5)
      .map((r) => `${r.hex} ${(r.pixelCoverage * 100).toFixed(2)}%`)
      .join(', ');
    lines.push(
      `### Usage verification — ${snap.usageVerification.screenshotCount} screenshot(s), Vision: ${snap.usageVerification.visionRan ? 'on' : 'off'}`,
    );
    lines.push(`Top pixel coverage: ${covSummary || '—'}`);
    const noneColors = snap.usageVerification.perColor
      .filter((r) => r.finalEvidence === 'none')
      .map((r) => r.hex);
    if (noneColors.length > 0) {
      lines.push(`Flagged as unused on page: ${noneColors.join(', ')}`);
    }
    const visionNotes = snap.usageVerification.perColor
      .filter((r) => r.visionReasoning)
      .slice(0, 4)
      .map((r) => `- \`${r.hex}\` (${r.visionRole ?? '—'}): ${r.visionReasoning}`);
    if (visionNotes.length > 0) {
      lines.push(`Vision notes:`);
      lines.push(...visionNotes);
    }
  } else {
    lines.push('');
    lines.push(`### Usage verification — skipped (no screenshots or palette empty)`);
  }
  lines.push('');
  lines.push(`### Symptoms`);
  lines.push(`- missingPrimaryBlue heuristic: ${snap.symptoms.missingPrimaryBlue ? '⚠️  YES' : 'ok'}`);
  lines.push(`- blue candidates in palette: ${snap.symptoms.blueCandidatesInPalette.join(', ') || '—'}`);
  lines.push(`- red/green in palette (may be SEMANTIC-labelled): ${snap.symptoms.semanticColorsInPalette.join(', ') || '—'}`);
  if (snap.semanticVarHits.length > 0) {
    lines.push(`- CSS vars named success/error/warning: ${snap.semanticVarHits.slice(0, 5).join(' | ')}`);
  }
  lines.push('');
  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Wire up runtime imports now that dotenv has run. Dynamic imports so
  // module evaluation (and therefore prisma bootstrapping) only happens
  // after env vars are set.
  const scraperModule = await import('../src/lib/brandstyle/url-scraper');
  const engineModule = await import('../src/lib/brandstyle/analysis-engine');
  const shotterModule = await import('../src/lib/brandstyle/page-screenshotter');
  const verifierModule = await import('../src/lib/brandstyle/color-usage-verifier');
  scrapeUrl = scraperModule.scrapeUrl;
  preprocessScrapeData = engineModule.preprocessScrapeData;
  capturePageScreenshots = shotterModule.capturePageScreenshots;
  verifyColorUsage = verifierModule.verifyColorUsage;

  const { urls, label, screenshots, vision } = parseArgs();
  const outDir = resolve(process.cwd(), 'scripts', 'baselines', label);
  mkdirSync(outDir, { recursive: true });

  const visionResolved = vision === null ? Boolean(process.env.ANTHROPIC_API_KEY) : vision;
  console.log(`\nverify-palette → label=${label} → ${outDir}`);
  console.log(
    `  screenshots: ${screenshots ? 'on (Playwright)' : 'off'}, vision: ${visionResolved ? 'on (Claude)' : 'off'}\n`,
  );
  console.log(`URLs (${urls.length}): ${urls.join(', ')}\n`);

  const summary: string[] = [
    `# Brandstyle palette verification — \`${label}\``,
    '',
    `Run: ${new Date().toISOString()}`,
    '',
  ];

  for (const url of urls) {
    process.stdout.write(`  scraping ${url} ... `);
    try {
      const snap = await snapshot(url, { screenshots, vision });
      if ('error' in snap) {
        console.log(`FAIL: ${snap.error}`);
        summary.push(`## ${url}\n\n**Error:** ${snap.error}\n`);
        continue;
      }
      const slug = slugify(url);
      writeFileSync(join(outDir, `${slug}.json`), JSON.stringify(snap, null, 2));
      summary.push(formatSnapshot(snap));
      const strong = snap.authoritativePalette.filter((c) => c.usageEvidence === 'strong').length;
      const none = snap.authoritativePalette.filter((c) => c.usageEvidence === 'none').length;
      const usageTag = snap.usageVerification.ran ? `, usage ${strong}↑/${none}↓` : '';
      console.log(
        `done (palette ${snap.authoritativePalette.length}, high=${snap.authoritativeBuckets.high}, blue=${snap.symptoms.blueCandidatesInPalette.length}${usageTag})`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`ERROR: ${msg}`);
      summary.push(`## ${url}\n\n**Error:** ${msg}\n`);
    }
  }

  const summaryPath = join(outDir, 'SUMMARY.md');
  writeFileSync(summaryPath, summary.join('\n'));
  console.log(`\nSummary written to ${summaryPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
