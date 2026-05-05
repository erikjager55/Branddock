/**
 * scripts/fidelity/test-composition-engine.ts
 *
 * End-to-end smoke test van de composition engine: combineert pijlers
 * 1 + 2 + 3 tot één FidelityCompositeResult. Draait dezelfde 3 outputs
 * als test-g-eval.ts:
 *
 *  - BB-A origineel (Opus + BVD)              — verwacht AI_LEANING
 *  - BB-A + STRICT  (Opus + BVD + rewrite)    — verwacht TOP_TIER
 *  - ChatGPT-4o BB (vanille)                   — verwacht PURE_AI / lager
 *
 * Demo-claim verificatie: Branddock+STRICT composite > Branddock baseline
 * > ChatGPT, met substantieel verschil (≥15 punten target).
 *
 * Run:
 *   npx tsx scripts/fidelity/test-composition-engine.ts
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
  const { computeFidelityScore } = await import('../../src/lib/brand-fidelity/composition-engine');
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

  // Branddock demo workspace (zelfde als andere fidelity tests).
  // Composition engine gebruikt deze ID alleen voor BrandRule lookup;
  // voor BB heeft het workspace momenteel geen rules → ruleScore = 100.
  const workspaceId = process.env.FIDELITY_TEST_WORKSPACE_ID ?? 'cm3branddock-demo-workspace';

  // Brand Personality declared signals — minimum subset voor pijler 1.
  // Volledige BB-data zit in DB, maar voor smoke-test duwen we hier de
  // gedeclareerde wordsWeUse + personalityTraits in.
  const personality = {
    wordsWeUse: [
      'strategisch',
      'menselijk',
      'confident',
      'visionair',
      'praktisch',
      'duurzaam',
      'operationeel bewijs',
      'data',
      'cases',
    ],
    personalityTraits: [
      { name: 'Strategisch maar menselijk', description: 'Strategie met empathie' },
      { name: 'Confident zonder arrogant', description: 'Zelfverzekerd, niet arrogant' },
      { name: 'Visionair maar niet onpraktisch', description: 'Toekomstgericht en concreet' },
      { name: 'Anti-greenwashing', description: 'Purpose moet operationeel bewijs hebben' },
    ],
  };

  const brandName = 'Better Brands';
  const brandVoiceSummary =
    'Strategisch maar menselijk. Confident zonder arrogant. Visionair maar niet onpraktisch. ' +
    'Anti-greenwashing — purpose moet operationeel bewijs hebben. Vermijdt buzzwords als ' +
    '"disruptive", "synergy", "next-level". Schrijft over duurzame business met data en concrete cases.';
  const personaSummary =
    'Mark Jansen — Brand Manager bij mid-sized organisatie, frustraties: inconsistente messaging, gebrek aan internal alignment.';
  const strategySummary =
    'Differentiate from purpose-washers via operational proof; build credibility with brand managers.';

  console.log('→ Composition engine smoke test (pijlers 1 + 2 + 3)\n');

  const results: Array<{
    label: string;
    composite: number;
    style: number;
    judge: number | null;
    rules: number;
    detectorPos: number;
    verdict: string;
    elapsed: number;
    thresholdMet: boolean;
  }> = [];

  for (const sample of samples) {
    const text = readFileSync(sample.path, 'utf8');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    console.log(`\n━━━ ${sample.label} (${wordCount} words) ━━━`);

    try {
      const result = await computeFidelityScore({
        contentText: text,
        workspaceId,
        brandName,
        brandVoiceSummary,
        personaSummary,
        strategySummary,
        personality,
        generatorProvider: sample.generator,
        targetWordCount: 3000,
      });

      console.log(`  Compute time:           ${(result.elapsedMs / 1000).toFixed(1)}s`);
      console.log(`  Detector verdict:       ${result.detectorVerdict} (pos ${result.humanBaselinePosition}/100)`);
      console.log(`  Pillar 1 (style):       ${result.pillars.style.score}/100  (weight ${result.pillars.style.weight.toFixed(2)})`);
      if (result.pillars.judge) {
        console.log(
          `  Pillar 2 (judge):       ${result.pillars.judge.score}/100  (weight ${result.pillars.judge.weight.toFixed(2)}, ${result.pillars.judge.result.judgeProvider}/${result.pillars.judge.result.judgeModel})`,
        );
      } else {
        console.log(`  Pillar 2 (judge):       SKIPPED`);
      }
      const p3 = result.pillars.rules.result;
      console.log(
        `  Pillar 3 (anti-tell):   ${result.pillars.rules.score}/100  (weight ${result.pillars.rules.weight.toFixed(2)}; detector ${p3.detectorScore}, rules ${p3.rules.ruleScore})`,
      );
      console.log(`  ───────────────────────────────────`);
      console.log(`  COMPOSITE:              ${result.compositeScore}/100  ${result.thresholdMet ? '✓ ABOVE THRESHOLD' : '✗ BELOW THRESHOLD'} (${result.compositeThreshold})`);

      results.push({
        label: sample.label,
        composite: result.compositeScore,
        style: result.pillars.style.score,
        judge: result.pillars.judge?.score ?? null,
        rules: result.pillars.rules.score,
        detectorPos: result.humanBaselinePosition,
        verdict: result.detectorVerdict,
        elapsed: result.elapsedMs,
        thresholdMet: result.thresholdMet,
      });
    } catch (err) {
      console.error(`  ✗ FAILED: ${(err as Error).message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY (composition engine)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(
    'Output'.padEnd(40),
    'Composite'.padStart(10),
    'Style'.padStart(7),
    'Judge'.padStart(7),
    'Rules'.padStart(7),
    'DetPos'.padStart(7),
    'Verdict'.padStart(15),
  );
  for (const r of results) {
    console.log(
      r.label.padEnd(40),
      String(r.composite).padStart(10),
      String(r.style).padStart(7),
      String(r.judge ?? '-').padStart(7),
      String(r.rules).padStart(7),
      String(r.detectorPos).padStart(7),
      r.verdict.padStart(15),
    );
  }

  // Demo claim check: STRICT > baseline > ChatGPT
  if (results.length === 3) {
    const [original, strict, chatgpt] = results;
    console.log('\n━━━ Demo claim verificatie ━━━');
    console.log(`  Branddock+STRICT  — ChatGPT vanille  = ${strict.composite - chatgpt.composite} punten`);
    console.log(`  Branddock baseline — ChatGPT vanille = ${original.composite - chatgpt.composite} punten`);
    console.log(`  STRICT — baseline                    = ${strict.composite - original.composite} punten`);
    if (strict.composite > original.composite && original.composite > chatgpt.composite) {
      console.log(`  ✓ Demo curve correct: STRICT > baseline > ChatGPT`);
    } else {
      console.log(`  ✗ Demo curve onverwacht — onderzoek output volgorde`);
    }
  }

  // Save report
  mkdirSync(PATHS.reports, { recursive: true });
  const reportPath = join(PATHS.reports, 'composition-engine-validation.md');
  writeFileSync(
    reportPath,
    `# Composition Engine Validation\n\nDatum: ${new Date().toISOString().slice(0, 10)}\n\n` +
      results
        .map(
          (r) =>
            `## ${r.label}\n` +
            `- Composite: **${r.composite}/100** ${r.thresholdMet ? '(above threshold)' : '(below threshold)'}\n` +
            `- Pillar 1 (style): ${r.style}/100\n` +
            `- Pillar 2 (judge): ${r.judge ?? 'skipped'}/100\n` +
            `- Pillar 3 (anti-tell): ${r.rules}/100\n` +
            `- Detector position: ${r.detectorPos}/100 (${r.verdict})\n` +
            `- Compute time: ${(r.elapsed / 1000).toFixed(1)}s\n`,
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
