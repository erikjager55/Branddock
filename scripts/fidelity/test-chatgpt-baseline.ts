/**
 * scripts/fidelity/test-chatgpt-baseline.ts
 *
 * Genereer ChatGPT-vanille baseline: 3 briefings × 2 modellen (GPT-4o + GPT-5)
 * zonder brand context, alleen system "You are a content writer" + briefing.
 *
 * Levert de "ceiling" positie op de mens↔AI schaal — wat een prospect
 * zonder Branddock zou krijgen.
 *
 * Run:
 *   npx tsx scripts/fidelity/test-chatgpt-baseline.ts
 *
 * Output:
 *   research/fidelity-week1/outputs-vanilla/{brand}-case-study-{model}.md
 *   research/fidelity-week1/scores/tells/vanilla-{brand}-{model}.md
 *   research/fidelity-week1/reports/chatgpt-baseline.md
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

// ─── Env loading ───────────────────────

const envPath = resolve(process.cwd(), '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const hashIdx = value.indexOf('#');
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    }
    if (value) process.env[key] = value;
  }
} catch (err) {
  console.warn(`(could not read ${envPath}: ${(err as Error).message})`);
}

const BRANDS: Array<{ slug: string; displayName: string; contentType: 'case-study' | 'thought-leadership' }> = [
  { slug: 'wra-juristen', displayName: 'WRA Juristen', contentType: 'case-study' },
  { slug: 'linfi', displayName: 'Linfi', contentType: 'case-study' },
  { slug: 'better-brands', displayName: 'Better Brands', contentType: 'case-study' },
];

const MODELS = [
  { id: 'gpt-4o', label: 'GPT-4o', maxTokens: 4096 },
  { id: 'gpt-5', label: 'GPT-5', maxTokens: 8000 },
];

const VANILLA_SYSTEM_PROMPT = `You are an experienced content writer producing long-form business content.

Write the piece as instructed in the user message. Use markdown headings (##, ###) for structure. Aim for 2700-3300 words. Output the content directly without preamble or commentary.`;

async function main() {
  const { detectAiTells, formatTellReport } = await import('../../src/lib/brand-fidelity/ai-tell-detector');
  const { PATHS } = await import('./config');
  const { default: OpenAI } = await import('openai');

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const vanillaDir = join(PATHS.outputRoot, 'outputs-vanilla');
  const tellDir = join(PATHS.outputRoot, 'scores', 'tells');
  mkdirSync(vanillaDir, { recursive: true });
  mkdirSync(tellDir, { recursive: true });

  interface Result {
    brand: string;
    model: string;
    wordCount: number;
    score: number;
    scorePer1000: number;
    position: number;
    uniqueTells: number;
    verdict: string;
    elapsedMs: number;
  }
  const results: Result[] = [];

  for (const brand of BRANDS) {
    const briefingPath = join(PATHS.briefings, `${brand.slug}-${brand.contentType}.md`);
    const briefing = readFileSync(briefingPath, 'utf8');

    // Strip brand-specific signals from briefing — keep only the assignment
    // (We use briefing as-is to give a fair "what would ChatGPT do" baseline)
    const userPrompt = `Write a ${brand.contentType} based on the following briefing. Use the briefing's audience and objective; do not invent additional context beyond what's specified.

${briefing}`;

    for (const model of MODELS) {
      const key = `vanilla-${brand.slug}-${model.id}`;
      console.log(`\n→ ${brand.displayName} via ${model.label}...`);
      const startedAt = Date.now();

      try {
        const response = await client.chat.completions.create({
          model: model.id,
          max_completion_tokens: model.maxTokens,
          messages: [
            { role: 'system', content: VANILLA_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        });
        const content = response.choices[0]?.message?.content ?? '';
        const elapsedMs = Date.now() - startedAt;
        const wordCount = content.split(/\s+/).filter(Boolean).length;

        if (wordCount < 100) {
          console.error(`  ✗ Output too short (${wordCount} words). Skipping.`);
          continue;
        }

        // Save output
        const outputPath = join(vanillaDir, `${key}.md`);
        writeFileSync(outputPath, content, 'utf8');

        // Detector
        const result = detectAiTells(content);
        const reportPath = join(tellDir, `${key}.md`);
        writeFileSync(reportPath, formatTellReport(result, key), 'utf8');

        results.push({
          brand: brand.displayName,
          model: model.label,
          wordCount,
          score: result.score,
          scorePer1000: result.scorePer1000Words,
          position: result.humanBaselinePosition,
          uniqueTells: result.uniqueTellCount,
          verdict: result.verdict,
          elapsedMs,
        });

        console.log(
          `  ✓ ${wordCount}w in ${(elapsedMs / 1000).toFixed(1)}s — pos=${result.humanBaselinePosition} verdict=${result.verdict} score=${result.scorePer1000Words.toFixed(1)}/1k tells=${result.uniqueTellCount}`,
        );
      } catch (err) {
        console.error(`  ✗ FAILED: ${(err as Error).message}`);
      }
    }
  }

  // Build comparison report
  const lines: string[] = [];
  lines.push('# F-VAL — ChatGPT-vanille Baseline');
  lines.push('');
  lines.push(`Datum: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push('## Vanille ChatGPT outputs');
  lines.push('');
  lines.push('Geen brand context, alleen briefing + generieke "you are an experienced content writer" system prompt.');
  lines.push('');
  lines.push('| Merk | Model | Words | Score/1k | Position | Verdict |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of results) {
    lines.push(`| ${r.brand} | ${r.model} | ${r.wordCount} | ${r.scorePer1000.toFixed(1)} | ${r.position} | ${r.verdict} |`);
  }
  lines.push('');

  // Aggregate per model
  const byModel: Record<string, { positions: number[]; verdicts: string[] }> = {};
  for (const r of results) {
    if (!byModel[r.model]) byModel[r.model] = { positions: [], verdicts: [] };
    byModel[r.model].positions.push(r.position);
    byModel[r.model].verdicts.push(r.verdict);
  }
  lines.push('## Per-model gemiddelde');
  lines.push('');
  lines.push('| Model | Avg position | Range | Most common verdict |');
  lines.push('|---|---|---|---|');
  for (const [model, data] of Object.entries(byModel)) {
    const avg = data.positions.reduce((a, b) => a + b, 0) / data.positions.length;
    const min = Math.min(...data.positions);
    const max = Math.max(...data.positions);
    const verdictCounts: Record<string, number> = {};
    for (const v of data.verdicts) verdictCounts[v] = (verdictCounts[v] ?? 0) + 1;
    const mostCommon = Object.entries(verdictCounts).sort(([, a], [, b]) => b - a)[0][0];
    lines.push(`| ${model} | ${avg.toFixed(1)} | ${min}–${max} | ${mostCommon} |`);
  }
  lines.push('');

  lines.push('## Demo-curve');
  lines.push('');
  lines.push('Volledige schaal met alle gemeten datapunten:');
  lines.push('');
  lines.push('```');
  lines.push('TOP_TIER     HUMAN_BASELINE     AI_LEANING     PURE_AI');
  lines.push('   |              |                  |              |');
  lines.push('   0─────12─────30─────────────────50───────────100');
  lines.push('   ↑ Erik 2021 (mens, top-tier) ~6');
  lines.push('              ↑ Erik 2020 (mens, gemiddeld) ~16');
  lines.push('              ↑ Branddock+HVD (BB-A) ~20');
  lines.push('                  ↑ Branddock vanille (gemiddeld 9 outputs) ~22-29');
  for (const r of results) {
    const arrow = '   '.repeat(Math.floor(r.position / 5)) + '↑';
    lines.push(`${arrow} ${r.brand} ${r.model} ~${r.position}`);
  }
  lines.push('```');
  lines.push('');

  lines.push('## Belangrijkste demo-cijfer');
  lines.push('');
  if (results.length > 0) {
    const branddockHvdAvg = 20; // BB-A met HVD positie
    const branddockAvg = 24; // gemiddelde van 9 HUMAN_BASELINE outputs
    const chatgptAvg = results.reduce((s, r) => s + r.position, 0) / results.length;
    lines.push(`- ChatGPT vanille (gemiddeld ${results.length} outputs): **pos ${chatgptAvg.toFixed(0)}**`);
    lines.push(`- Branddock vanille (BVD only): **pos ${branddockAvg}**`);
    lines.push(`- Branddock + HVD: **pos ${branddockHvdAvg}**`);
    lines.push(`- **Verschil ChatGPT → Branddock+HVD**: ${(chatgptAvg - branddockHvdAvg).toFixed(0)} positiepunten richting menselijke baseline`);
  }
  lines.push('');

  const reportPath = join(PATHS.reports, 'chatgpt-baseline.md');
  writeFileSync(reportPath, lines.join('\n'), 'utf8');

  console.log('');
  console.log(`✓ Rapport: ${reportPath}`);
  console.log(`✓ Outputs: ${vanillaDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
