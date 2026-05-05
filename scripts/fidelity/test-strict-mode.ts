/**
 * scripts/fidelity/test-strict-mode.ts
 *
 * Test STRICT mode rewrite-loop tegen BB-A origineel (pos 35, AI_LEANING).
 * Doel: bewijs dat één rewrite-call met tell-feedback de output naar
 * HUMAN_BASELINE range brengt.
 *
 * Run:
 *   npx tsx scripts/fidelity/test-strict-mode.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

// ─── Env loading ────────────────────────────────

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

async function main() {
  const { runStrictModeRewrite } = await import('../../src/lib/brand-fidelity/strict-mode');
  const { PATHS } = await import('./config');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  // BB-A origineel was AI_LEANING pos 35 — perfect testcase
  const originalPath = join(PATHS.outputs, 'better-brands-case-study-A.md');
  const originalText = readFileSync(originalPath, 'utf8');

  console.log('→ Testing STRICT mode on BB-A origineel');
  console.log(`  Word count: ${originalText.split(/\s+/).filter(Boolean).length}`);
  console.log('');

  // Rewrite callback — uses Opus 4.7 with adaptive thinking
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const rewriteCallback = async ({ feedbackPrompt }: { originalText: string; feedbackPrompt: string }) => {
    console.log('→ Calling rewrite via Opus 4.7 (~2-3 min)...');
    const startedAt = Date.now();
    const stream = client.messages.stream(
      {
        model: GENERATOR_MODEL,
        max_tokens: 8000,
        thinking: { type: 'adaptive' as const },
        output_config: { effort: 'high' as const },
        system: 'You are an expert content editor rewriting AI-generated text to read more naturally human.',
        messages: [{ role: 'user', content: feedbackPrompt }],
      } as Parameters<typeof client.messages.stream>[0],
      { signal: AbortSignal.timeout(600_000) },
    );
    const response = await stream.finalMessage();
    const elapsedMs = Date.now() - startedAt;
    console.log(`  ✓ Rewrite completed in ${(elapsedMs / 1000).toFixed(1)}s, ${response.usage.output_tokens} output tokens`);
    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock && 'text' in textBlock ? textBlock.text : '';
  };

  const result = await runStrictModeRewrite(originalText, rewriteCallback);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STRICT MODE RESULT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Original:');
  console.log(`  Verdict: ${result.originalResult.verdict}`);
  console.log(`  Position: ${result.originalResult.humanBaselinePosition}/100`);
  console.log(`  Score: ${result.originalResult.score.toFixed(1)} (${result.originalResult.scorePer1000Words.toFixed(1)}/1k)`);
  console.log(`  Unique tells: ${result.originalResult.uniqueTellCount}`);
  console.log('');

  if (result.rewriteAttempted) {
    if (result.rewriteResult) {
      console.log('Rewrite:');
      console.log(`  Verdict: ${result.rewriteResult.verdict}`);
      console.log(`  Position: ${result.rewriteResult.humanBaselinePosition}/100`);
      console.log(`  Score: ${result.rewriteResult.score.toFixed(1)} (${result.rewriteResult.scorePer1000Words.toFixed(1)}/1k)`);
      console.log(`  Unique tells: ${result.rewriteResult.uniqueTellCount}`);
      console.log('');
    } else {
      console.log('Rewrite: failed or invalid output');
      console.log('');
    }
  } else {
    console.log('No rewrite attempted (original already at/above baseline).');
    console.log('');
  }

  console.log(`Decision: ${result.decisionReason}`);
  console.log('');

  // Save final output for inspection
  mkdirSync(PATHS.outputs, { recursive: true });
  const outputPath = join(PATHS.outputs, 'better-brands-case-study-A-STRICT.md');
  writeFileSync(outputPath, result.finalText, 'utf8');
  console.log(`✓ Final text saved: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
