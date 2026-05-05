/**
 * scripts/fidelity/test-tell-detector.ts
 *
 * Test de AI-tell detector tegen alle 12 drift-outputs.
 * Genereert per output een rapport in research/fidelity-week1/scores/tells/.
 * Plus een samenvatting per merk × conditie.
 *
 * Run:
 *   npx tsx scripts/fidelity/test-tell-detector.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
} catch {
  // ignore
}

async function main() {
  const { detectAiTells, formatTellReport } = await import('../../src/lib/brand-fidelity/ai-tell-detector');
  const { PATHS } = await import('./config');

  const outDir = join(PATHS.outputRoot, 'scores', 'tells');
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(PATHS.outputs)
    .filter((f) => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.error(`No outputs found in ${PATHS.outputs}`);
    process.exit(1);
  }

  console.log(`→ Testing ${files.length} outputs against AI-tell detector\n`);

  interface SummaryRow {
    key: string;
    wordCount: number;
    score: number;
    scorePer1000: number;
    uniqueTells: number;
    totalMatches: number;
    verdict: string;
  }

  const summary: SummaryRow[] = [];

  for (const f of files) {
    const filepath = join(PATHS.outputs, f);
    const text = readFileSync(filepath, 'utf8');
    const result = detectAiTells(text);
    const key = f.replace('.md', '');

    summary.push({
      key,
      wordCount: result.wordCount,
      score: result.score,
      scorePer1000: result.scorePer1000Words,
      uniqueTells: result.uniqueTellCount,
      totalMatches: result.totalMatches,
      verdict: result.verdict,
    });

    const report = formatTellReport(result, key);
    writeFileSync(join(outDir, `${key}.md`), report, 'utf8');

    console.log(
      `  ${key.padEnd(45)} ${result.verdict.padEnd(11)} score=${String(result.score).padStart(3)} (${result.scorePer1000Words.toFixed(1).padStart(4)}/1k) tells=${result.uniqueTellCount} matches=${result.totalMatches}`,
    );
  }

  // Summary per merk × conditie
  const summaryLines: string[] = [];
  summaryLines.push('# AI-Tell Detector — Drift-Outputs Summary');
  summaryLines.push('');
  summaryLines.push(`Datum: ${new Date().toISOString().slice(0, 10)}`);
  summaryLines.push(`Outputs gescoord: ${summary.length}`);
  summaryLines.push('');
  summaryLines.push('## Per output');
  summaryLines.push('');
  summaryLines.push('| Output | Words | Score | /1000w | Unique tells | Total matches | Verdict |');
  summaryLines.push('|---|---|---|---|---|---|---|');
  for (const r of summary) {
    summaryLines.push(
      `| ${r.key} | ${r.wordCount} | ${r.score} | ${r.scorePer1000.toFixed(1)} | ${r.uniqueTells} | ${r.totalMatches} | ${r.verdict} |`,
    );
  }
  summaryLines.push('');

  // Aggregate per condition
  const aPerBrand: Record<string, { score: number; tells: number; n: number }> = {};
  const bPerBrand: Record<string, { score: number; tells: number; n: number }> = {};
  for (const r of summary) {
    const m = r.key.match(/^([a-z-]+)-(case-study|thought-leadership)-([AB])$/);
    if (!m) continue;
    const [, brand, , cond] = m;
    const target = cond === 'A' ? aPerBrand : bPerBrand;
    if (!target[brand]) target[brand] = { score: 0, tells: 0, n: 0 };
    target[brand].score += r.scorePer1000;
    target[brand].tells += r.uniqueTells;
    target[brand].n += 1;
  }

  summaryLines.push('## Per merk × conditie (gemiddeld)');
  summaryLines.push('');
  summaryLines.push('| Merk | A score/1k | A tells | B score/1k | B tells | Δ score/1k | Δ tells |');
  summaryLines.push('|---|---|---|---|---|---|---|');
  for (const brand of Object.keys(aPerBrand).sort()) {
    const a = aPerBrand[brand];
    const b = bPerBrand[brand];
    if (!b) continue;
    const aAvgScore = a.score / a.n;
    const bAvgScore = b.score / b.n;
    const aAvgTells = a.tells / a.n;
    const bAvgTells = b.tells / b.n;
    summaryLines.push(
      `| ${brand} | ${aAvgScore.toFixed(1)} | ${aAvgTells.toFixed(1)} | ${bAvgScore.toFixed(1)} | ${bAvgTells.toFixed(1)} | ${(bAvgScore - aAvgScore).toFixed(1)} | ${(bAvgTells - aAvgTells).toFixed(1)} |`,
    );
  }
  summaryLines.push('');

  const reportPath = join(PATHS.reports, 'tell-detector-summary.md');
  mkdirSync(PATHS.reports, { recursive: true });
  writeFileSync(reportPath, summaryLines.join('\n'), 'utf8');

  console.log('');
  console.log(`✓ Per-output reports: ${outDir}/`);
  console.log(`✓ Summary: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
