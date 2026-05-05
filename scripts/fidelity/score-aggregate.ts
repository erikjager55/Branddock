/**
 * scripts/fidelity/score-aggregate.ts
 *
 * Aggregeert LLM-judge scores naar een drift-meting rapport.
 * Implementeert:
 *  - Agreement-meting tussen GPT-5 en Sonnet 4.6 per output
 *  - Filtering van high-disagreement outputs (delta > 1.5 mean)
 *  - Per-conditie composite voice-fit
 *  - Drift Conditie B vs A
 *
 * Output: research/fidelity-week1/reports/llm-aggregate.md
 *
 * Run:
 *   npx tsx scripts/fidelity/score-aggregate.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// ─── Env loading (minimal — geen DB nodig) ──────────────────

const envPath = resolve(process.cwd(), '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const hashIdx = value.indexOf('#');
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    }
    if (value) process.env[key] = value;
  }
} catch {
  // ignore
}

// ─── Constants ──────────────────────────────────────────────

const AGREEMENT_DELTA_THRESHOLD = 1.5;
const MIN_AGREEMENT_SCORE = 7;

// ─── Types ──────────────────────────────────────────────────

interface JudgeScoreFile {
  run: { brand: string; type: string; condition: 'A' | 'B'; key: string };
  judgeProvider: 'openai' | 'anthropic';
  judgeModel: string;
  scores: {
    voiceFit: { score: number };
    brandRecognition: { score: number };
    naturalness: { score: number };
    fluency: { score: number };
  };
  compositeScore: number;
  computedAt: string;
}

interface AgreementResult {
  key: string;
  meanDelta: number;
  agreementScore: number; // 0-10
  isHighAgreement: boolean;
  perDimension: { voiceFit: number; brandRecognition: number; naturalness: number; fluency: number };
}

// ─── Utility ────────────────────────────────────────────────

function loadScores(dir: string): Map<string, JudgeScoreFile> {
  const map = new Map<string, JudgeScoreFile>();
  if (!existsSync(dir)) return map;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const content = JSON.parse(readFileSync(join(dir, f), 'utf8')) as JudgeScoreFile;
    map.set(content.run.key, content);
  }
  return map;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  const { PATHS } = await import('./config');

  const gpt5 = loadScores(PATHS.scoresGpt5);
  const sonnet = loadScores(PATHS.scoresSonnet);

  if (gpt5.size === 0 && sonnet.size === 0) {
    console.error('No scores found. Run scripts/fidelity/judge.ts --execute first.');
    process.exit(1);
  }

  console.log(`→ GPT-5 scores: ${gpt5.size}`);
  console.log(`→ Sonnet 4.6 scores: ${sonnet.size}`);

  // Compute agreement per output
  const agreements: AgreementResult[] = [];
  for (const key of gpt5.keys()) {
    const g = gpt5.get(key);
    const s = sonnet.get(key);
    if (!g || !s) continue;
    const dVF = Math.abs(g.scores.voiceFit.score - s.scores.voiceFit.score);
    const dBR = Math.abs(g.scores.brandRecognition.score - s.scores.brandRecognition.score);
    const dNat = Math.abs(g.scores.naturalness.score - s.scores.naturalness.score);
    const dFlu = Math.abs(g.scores.fluency.score - s.scores.fluency.score);
    const meanDelta = (dVF + dBR + dNat + dFlu) / 4;
    const agreementScore = Math.max(0, 10 - meanDelta * 2);
    agreements.push({
      key,
      meanDelta,
      agreementScore,
      isHighAgreement: meanDelta <= AGREEMENT_DELTA_THRESHOLD && agreementScore >= MIN_AGREEMENT_SCORE,
      perDimension: { voiceFit: dVF, brandRecognition: dBR, naturalness: dNat, fluency: dFlu },
    });
  }

  // Per-condition aggregation (high-agreement only for LLM aggregate)
  const highAgreementKeys = new Set(agreements.filter((a) => a.isHighAgreement).map((a) => a.key));
  function condStats(condition: 'A' | 'B', src: Map<string, JudgeScoreFile>) {
    const filtered = Array.from(src.values()).filter((v) => v.run.condition === condition && highAgreementKeys.has(v.run.key));
    const voiceFits = filtered.map((v) => v.scores.voiceFit.score);
    const composites = filtered.map((v) => v.compositeScore);
    return { n: filtered.length, voiceFitMean: mean(voiceFits), voiceFitStd: std(voiceFits), compositeMean: mean(composites) };
  }
  const aGpt5 = condStats('A', gpt5);
  const bGpt5 = condStats('B', gpt5);
  const aSonnet = condStats('A', sonnet);
  const bSonnet = condStats('B', sonnet);

  const driftGpt5 = bGpt5.voiceFitMean - aGpt5.voiceFitMean;
  const driftSonnet = bSonnet.voiceFitMean - aSonnet.voiceFitMean;

  // Build report
  const lines: string[] = [];
  lines.push('# F-VAL Drift-Meting — LLM Aggregate Rapport');
  lines.push('');
  lines.push(`> Datum: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`> Status: **parallel signaal** — niet de basis voor Route A/B-beslissing`);
  lines.push(`> Definitief oordeel wacht op menselijke ratings`);
  lines.push('');
  lines.push('## Agreement-meting tussen judges');
  lines.push('');
  lines.push(`Threshold voor "high agreement": mean delta ≤ ${AGREEMENT_DELTA_THRESHOLD}, agreement score ≥ ${MIN_AGREEMENT_SCORE}/10.`);
  lines.push('');
  lines.push('| Output key | Mean delta | Agreement score | High agreement? | vF | bR | Nat | Flu |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const a of agreements.sort((x, y) => x.key.localeCompare(y.key))) {
    lines.push(
      `| ${a.key} | ${a.meanDelta.toFixed(2)} | ${a.agreementScore.toFixed(1)}/10 | ${a.isHighAgreement ? '✓' : '✗'} | ${a.perDimension.voiceFit} | ${a.perDimension.brandRecognition} | ${a.perDimension.naturalness} | ${a.perDimension.fluency} |`,
    );
  }
  const lowAgreement = agreements.filter((a) => !a.isHighAgreement);
  lines.push('');
  lines.push(`Outputs flagged for low agreement (excluded from LLM aggregate): **${lowAgreement.length}** of ${agreements.length}`);
  if (lowAgreement.length > 0) {
    for (const a of lowAgreement) lines.push(`- ${a.key} (mean delta ${a.meanDelta.toFixed(2)})`);
  }
  lines.push('');

  lines.push('## Per-conditie composite voice-fit (high-agreement only)');
  lines.push('');
  lines.push('| Conditie | n | GPT-5 voice-fit (mean ± std) | Sonnet voice-fit (mean ± std) |');
  lines.push('|---|---|---|---|');
  lines.push(`| A (baseline — huidige BVD) | ${aGpt5.n} | ${aGpt5.voiceFitMean.toFixed(2)} ± ${aGpt5.voiceFitStd.toFixed(2)} | ${aSonnet.voiceFitMean.toFixed(2)} ± ${aSonnet.voiceFitStd.toFixed(2)} |`);
  lines.push(`| B (gestructureerde BVD) | ${bGpt5.n} | ${bGpt5.voiceFitMean.toFixed(2)} ± ${bGpt5.voiceFitStd.toFixed(2)} | ${bSonnet.voiceFitMean.toFixed(2)} ± ${bSonnet.voiceFitStd.toFixed(2)} |`);
  lines.push('');

  lines.push('## Drift B vs A');
  lines.push('');
  lines.push(`- **GPT-5**: B − A = **${driftGpt5 >= 0 ? '+' : ''}${driftGpt5.toFixed(2)}** points`);
  lines.push(`- **Sonnet 4.6**: B − A = **${driftSonnet >= 0 ? '+' : ''}${driftSonnet.toFixed(2)}** points`);
  lines.push('');

  lines.push('## Voorlopige LLM-indicatie');
  lines.push('');
  const avgDrift = (driftGpt5 + driftSonnet) / 2;
  if (avgDrift >= 1.5) lines.push(`Conditie B haalt **substantieel** betere voice-fit dan A (avg drift +${avgDrift.toFixed(2)}). Voorlopig signaal richting **Route B**.`);
  else if (avgDrift >= 0.5) lines.push(`Conditie B haalt **meetbaar** betere voice-fit dan A (avg drift +${avgDrift.toFixed(2)}). Voorlopig signaal richting **Route B**.`);
  else if (avgDrift <= -0.5) lines.push(`Conditie A haalt **meetbaar** betere voice-fit dan B (avg drift ${avgDrift.toFixed(2)}). Voorlopig signaal richting **Route A**.`);
  else lines.push(`Conditie A en B scoren binnen ${Math.abs(avgDrift).toFixed(2)} punt van elkaar. Voorlopig signaal: **geen meetbaar verschil → Route A**.`);
  lines.push('');
  lines.push('**Definitieve Route A/B-beslissing wacht op menselijke ratings.** Zie `final-findings.md` na human-eval ronde.');
  lines.push('');

  // Per-merk per-type detail tabel
  lines.push('## Per-output detail (alle outputs, beide judges)');
  lines.push('');
  lines.push('| Key | GPT-5 vF | GPT-5 comp | Sonnet vF | Sonnet comp |');
  lines.push('|---|---|---|---|---|');
  const allKeys = new Set([...gpt5.keys(), ...sonnet.keys()]);
  for (const key of Array.from(allKeys).sort()) {
    const g = gpt5.get(key);
    const s = sonnet.get(key);
    lines.push(`| ${key} | ${g?.scores.voiceFit.score ?? '—'} | ${g?.compositeScore.toFixed(1) ?? '—'} | ${s?.scores.voiceFit.score ?? '—'} | ${s?.compositeScore.toFixed(1) ?? '—'} |`);
  }

  mkdirSync(PATHS.reports, { recursive: true });
  const reportPath = join(PATHS.reports, 'llm-aggregate.md');
  writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(`✓ Rapport geschreven: ${reportPath}`);
  console.log('');
  console.log(`Drift B − A: GPT-5 ${driftGpt5 >= 0 ? '+' : ''}${driftGpt5.toFixed(2)}, Sonnet ${driftSonnet >= 0 ? '+' : ''}${driftSonnet.toFixed(2)}`);
  console.log(`Low-agreement outputs: ${lowAgreement.length} / ${agreements.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
