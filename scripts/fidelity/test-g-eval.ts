/**
 * scripts/fidelity/test-g-eval.ts
 *
 * Test pijler 2 G-Eval rubric judge tegen 3 outputs:
 *  - BB-A origineel (AI_LEANING) — should score lower
 *  - BB-A + STRICT (TOP_TIER) — should score higher
 *  - ChatGPT-4o BB (AI_LEANING) — should score lower op brand-recognition
 *
 * Cross-family: Opus generator → GPT-5 judge.
 *
 * Run:
 *   npx tsx scripts/fidelity/test-g-eval.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

// ─── Env loading ────────────────────────────

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

async function main() {
  const { detectAiTells } = await import('../../src/lib/brand-fidelity/ai-tell-detector');
  const { runRubricJudge } = await import('../../src/lib/brand-fidelity/judge-dispatcher');
  const { DIMENSIONS } = await import('../../src/lib/brand-fidelity/g-eval-rubric');
  const { PATHS } = await import('./config');

  const samples: Array<{ label: string; path: string; generator: 'anthropic' | 'openai' }> = [
    {
      label: 'BB-A origineel (Opus + BVD)',
      path: join(PATHS.outputs, 'better-brands-case-study-A.md'),
      generator: 'anthropic',
    },
    {
      label: 'BB-A + STRICT (Opus + BVD + rewrite)',
      path: join(PATHS.outputs, 'better-brands-case-study-A-STRICT.md'),
      generator: 'anthropic',
    },
    {
      label: 'ChatGPT-4o BB (vanille)',
      path: join(PATHS.outputRoot, 'outputs-vanilla', 'vanilla-better-brands-gpt-4o.md'),
      generator: 'openai',
    },
  ];

  // Brand context — hardcoded for BB test (real scenario: from DB)
  const brandName = 'Better Brands';
  const brandVoiceSummary =
    'Strategisch maar menselijk. Confident zonder arrogant. Visionair maar niet onpraktisch. ' +
    'Anti-greenwashing — purpose moet operationeel bewijs hebben. Vermijdt buzzwords als ' +
    '"disruptive", "synergy", "next-level". Schrijft over duurzame business met data en concrete cases.';
  const personaSummary = 'Mark Jansen — Brand Manager bij mid-sized organisatie, frustraties: inconsistente messaging, gebrek aan internal alignment.';
  const strategySummary = 'Differentiate from purpose-washers via operational proof; build credibility with brand managers.';

  console.log('→ Cross-family judge test (Opus generator → GPT-5 judge)\n');

  const results: Array<{ label: string; weighted: number; final: number; perDim: Record<string, number> }> = [];

  for (const sample of samples) {
    const text = readFileSync(sample.path, 'utf8');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    console.log(`\n━━━ ${sample.label} (${wordCount} words) ━━━`);
    const detectorResult = detectAiTells(text);
    console.log(`  Detector: ${detectorResult.verdict} pos ${detectorResult.humanBaselinePosition}`);

    const startedAt = Date.now();
    try {
      const result = await runRubricJudge(
        {
          contentText: text,
          brandName,
          brandVoiceSummary,
          personaSummary,
          strategySummary,
          detectorResult,
        },
        {
          generatorProvider: sample.generator,
          targetWordCount: 3000,
        },
      );
      const elapsedMs = Date.now() - startedAt;

      console.log(`  Judge: ${result.judgeProvider}/${result.judgeModel} in ${(elapsedMs / 1000).toFixed(1)}s`);
      console.log(`  Weighted composite: ${result.weightedComposite}/100`);
      console.log(`  Length control: ${result.lengthControl.multiplier}× (${result.lengthControl.reason})`);
      console.log(`  Final composite: ${result.finalComposite}/100`);
      console.log(`  Per-dimension:`);
      for (const def of DIMENSIONS) {
        const s = result.scores[def.key];
        console.log(`    ${def.label.padEnd(30)} ${s.score}/10 — ${s.reasoning.slice(0, 80)}…`);
      }

      const perDim: Record<string, number> = {};
      for (const def of DIMENSIONS) perDim[def.key] = result.scores[def.key].score;
      results.push({ label: sample.label, weighted: result.weightedComposite, final: result.finalComposite, perDim });
    } catch (err) {
      console.error(`  ✗ FAILED: ${(err as Error).message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Output'.padEnd(40), 'Weighted'.padStart(9), 'Final'.padStart(7), 'StratAnchor'.padStart(11), 'AntiPattern'.padStart(11), 'BrandRec'.padStart(8));
  for (const r of results) {
    console.log(
      r.label.padEnd(40),
      String(r.weighted).padStart(9),
      String(r.final).padStart(7),
      String(r.perDim.strategicAnchoring ?? '-').padStart(11),
      String(r.perDim.antiPattern ?? '-').padStart(11),
      String(r.perDim.brandRecognition ?? '-').padStart(8),
    );
  }

  // Save
  mkdirSync(PATHS.reports, { recursive: true });
  const reportPath = join(PATHS.reports, 'g-eval-validation.md');
  writeFileSync(
    reportPath,
    `# Pijler 2 G-Eval Validation\n\nDatum: ${new Date().toISOString().slice(0, 10)}\n\n` +
      results
        .map(
          (r) =>
            `## ${r.label}\n- Weighted: ${r.weighted}/100\n- Final (after length-control): ${r.final}/100\n- Per-dimensie: ${JSON.stringify(r.perDim, null, 2)}\n`,
        )
        .join('\n'),
    'utf8',
  );
  console.log(`\n✓ Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
