/**
 * scripts/fidelity/test-human-voice-validation.ts
 *
 * Validatie-test voor Human Voice Directive:
 * Regenereer BB case-study A met HVD actief naast bestaande BVD.
 * Score met tell-detector + vergelijk met origineel.
 *
 * Run:
 *   npx tsx scripts/fidelity/test-human-voice-validation.ts
 *
 * Output:
 *   research/fidelity-week1/outputs/better-brands-case-study-A-with-HVD.md
 *   research/fidelity-week1/scores/tells/better-brands-case-study-A-with-HVD.md
 *   Console: side-by-side vergelijking
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

// ─── Env loading ──────────────────

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

const GENERATOR_MODEL = 'claude-opus-4-7';
const MAX_TOKENS = 8000;
const BRAND_SLUG = 'better-brands';
const CONTENT_TYPE = 'case-study';

async function main() {
  const { prisma } = await import('../../src/lib/prisma');
  const { buildBrandVoiceDirective } = await import('../../src/lib/studio/brand-voice-directive');
  const { buildHumanVoiceDirective } = await import('../../src/lib/studio/human-voice-directive');
  const { detectAiTells, formatTellReport } = await import('../../src/lib/brand-fidelity/ai-tell-detector');
  const { PATHS } = await import('./config');

  // 1. Workspace + BVD
  const workspace = await prisma.workspace.findFirst({
    where: { slug: BRAND_SLUG },
    select: { id: true, name: true, contentLanguage: true },
  });
  if (!workspace) {
    console.error(`Workspace ${BRAND_SLUG} not found`);
    process.exit(1);
  }
  const bvd = await buildBrandVoiceDirective(workspace.id, { channel: 'website' });
  const hvd = buildHumanVoiceDirective({ language: workspace.contentLanguage ?? 'nl' });

  // 2. Briefing
  const briefingPath = join(PATHS.briefings, `${BRAND_SLUG}-${CONTENT_TYPE}.md`);
  const briefing = readFileSync(briefingPath, 'utf8');

  // 3. Bouw system prompt: BVD + HVD + briefing
  const systemPrompt = `You are an expert content writer producing long-form business content for ${workspace.name}.

${bvd}

${hvd}

---

## CONTENT TYPE

You are writing a ${CONTENT_TYPE.replace('-', ' ')}.

## BRIEFING

${briefing}

---

Write the full piece now. Use markdown headings (##, ###) for structure. Aim for 2700-3300 words. Output the content directly without preamble or commentary.`;

  console.log(`→ Workspace: ${workspace.name}`);
  console.log(`→ BVD tokens: ~${Math.round(bvd.length / 4)}`);
  console.log(`→ HVD tokens: ~${Math.round(hvd.length / 4)}`);
  console.log(`→ Briefing tokens: ~${Math.round(briefing.length / 4)}`);
  console.log(`→ Total system prompt: ~${Math.round(systemPrompt.length / 4)} tokens`);
  console.log('');

  // 4. Generate via Opus 4.7
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(`→ Generating via ${GENERATOR_MODEL} (this takes ~2-3 minutes)...`);
  const startedAt = Date.now();

  const stream = client.messages.stream(
    {
      model: GENERATOR_MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'adaptive' as const },
      output_config: { effort: 'high' as const },
      system: systemPrompt,
      messages: [
        {
          role: 'user' as const,
          content: 'Write the piece now, in full, following the briefing and all directives above.',
        },
      ],
    } as Parameters<typeof client.messages.stream>[0],
    { signal: AbortSignal.timeout(600_000) },
  );
  const response = await stream.finalMessage();
  const elapsedMs = Date.now() - startedAt;

  const textBlock = response.content.find((b) => b.type === 'text');
  const content = textBlock && 'text' in textBlock ? textBlock.text : '';
  const wordCount = content.split(/\s+/).length;

  console.log(`  ✓ ${wordCount} words in ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`    Tokens: in=${response.usage.input_tokens}, out=${response.usage.output_tokens}`);
  console.log('');

  // 5. Save output
  const outputKey = `${BRAND_SLUG}-${CONTENT_TYPE}-A-with-HVD`;
  const outputPath = join(PATHS.outputs, `${outputKey}.md`);
  const metaPath = join(PATHS.outputs, `${outputKey}.json`);
  writeFileSync(outputPath, content, 'utf8');
  writeFileSync(
    metaPath,
    JSON.stringify(
      {
        run: { brand: BRAND_SLUG, type: CONTENT_TYPE, condition: 'A_with_HVD', key: outputKey },
        generatorModel: GENERATOR_MODEL,
        wordCount,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        elapsedMs,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`  ✓ Saved: ${outputPath}`);

  // 6. Run tell-detector
  console.log('');
  console.log('→ Running tell-detector...');
  const result = detectAiTells(content);

  const tellReportDir = join(PATHS.outputRoot, 'scores', 'tells');
  mkdirSync(tellReportDir, { recursive: true });
  writeFileSync(join(tellReportDir, `${outputKey}.md`), formatTellReport(result, outputKey), 'utf8');

  // 7. Compare with original BB-A
  const originalScorePath = join(tellReportDir, `${BRAND_SLUG}-${CONTENT_TYPE}-A.md`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('VERGELIJKING: BB case-study A — origineel vs met HVD');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Re-read original tell-detector result (parse from previous run)
  // For now, hardcode the original's known stats — they're already saved
  const originalStats = { score: 176, scorePer1000: 60.1, uniqueTells: 5, totalMatches: 66, verdict: 'HEAVY' };

  console.log('');
  console.log('Original (BVD only):');
  console.log(`  Verdict: ${originalStats.verdict}`);
  console.log(`  Score: ${originalStats.score} (${originalStats.scorePer1000}/1k)`);
  console.log(`  Unique tells: ${originalStats.uniqueTells}`);
  console.log(`  Total matches: ${originalStats.totalMatches}`);
  console.log('');
  console.log('With Human Voice Directive:');
  console.log(`  Verdict: ${result.verdict}`);
  console.log(`  Score: ${result.score} (${result.scorePer1000Words.toFixed(1)}/1k)`);
  console.log(`  Unique tells: ${result.uniqueTellCount}`);
  console.log(`  Total matches: ${result.totalMatches}`);
  console.log('');
  const scoreDelta = result.scorePer1000Words - originalStats.scorePer1000;
  const tellDelta = result.uniqueTellCount - originalStats.uniqueTells;
  const matchDelta = result.totalMatches - originalStats.totalMatches;
  console.log(`Δ score/1k: ${scoreDelta >= 0 ? '+' : ''}${scoreDelta.toFixed(1)}`);
  console.log(`Δ unique tells: ${tellDelta >= 0 ? '+' : ''}${tellDelta}`);
  console.log(`Δ total matches: ${matchDelta >= 0 ? '+' : ''}${matchDelta}`);
  console.log('');

  if (result.scorePer1000Words < 20 && result.uniqueTellCount <= 3) {
    console.log('✅ HVD WORKS: tell-density gedaald naar CLEAN/TRACES range. Ga door met week 2.');
  } else if (result.scorePer1000Words < originalStats.scorePer1000 * 0.5) {
    console.log('⚠ HVD WERKT GEDEELTELIJK: tell-density gehalveerd maar nog niet CLEAN. Tune HVD voor week 2.');
  } else {
    console.log('❌ HVD WERKT NIET: tell-density vrijwel gelijk. Herzie HVD strategie.');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
