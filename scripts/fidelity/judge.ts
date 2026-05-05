/**
 * scripts/fidelity/judge.ts
 *
 * LLM-judge dispatcher voor de drift-meting.
 * Cross-family rotatie: GPT-5 (primary) + Claude Sonnet 4.6 (parallel signaal).
 *
 * Leest research/fidelity-week1/outputs/{key}.md (gegenereerde content) en
 * conditions/{key}.md (om de brand voice declaration te isoleren),
 * roept beide judges aan, schrijft scores naar scores/{judge}/{key}.json.
 *
 * VEILIGHEIDSREGEL: --dry-run default. --execute vereist voor echte API calls.
 *
 * Run dry:
 *   npx tsx scripts/fidelity/judge.ts
 *
 * Run echt:
 *   npx tsx scripts/fidelity/judge.ts --execute
 *
 * Filter:
 *   npx tsx scripts/fidelity/judge.ts --execute --judge gpt5
 *   npx tsx scripts/fidelity/judge.ts --execute --brand wra-juristen
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// ─── Env loading ────────────────────────────────────────────

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

// ─── Constants ──────────────────────────────────────────────

const PRIMARY_JUDGE_MODEL = 'gpt-5'; // Cross-family with Opus 4.7 generator
const PARALLEL_JUDGE_MODEL = 'claude-sonnet-4-6';
const JUDGE_MAX_TOKENS = 8000; // GPT-5 thinking tokens count toward max_completion_tokens

// ─── CLI parsing ────────────────────────────────────────────

interface Args {
  execute: boolean;
  judge?: 'gpt5' | 'sonnet';
  brand?: string;
  type?: string;
  condition?: 'A' | 'B';
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Args = { execute: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--execute') out.execute = true;
    else if (args[i] === '--dry-run') out.execute = false;
    else if (args[i] === '--judge' && args[i + 1]) out.judge = args[++i] as 'gpt5' | 'sonnet';
    else if (args[i] === '--brand' && args[i + 1]) out.brand = args[++i];
    else if (args[i] === '--type' && args[i + 1]) out.type = args[++i];
    else if (args[i] === '--condition' && args[i + 1]) out.condition = args[++i] as 'A' | 'B';
  }
  return out;
}

// ─── Filename parsing ───────────────────────────────────────

interface OutputFile {
  key: string;
  brand: string;
  type: string;
  condition: 'A' | 'B';
  contentPath: string;
  metaPath: string;
  conditionPath: string;
}

function parseKey(filename: string): { brand: string; type: string; condition: 'A' | 'B' } | null {
  const match = filename.match(/^(.+?)-(case-study|thought-leadership)-([AB])\.md$/);
  if (!match) return null;
  return { brand: match[1], type: match[2], condition: match[3] as 'A' | 'B' };
}

// ─── Brand voice declaration extractor ──────────────────────

/** Extracts the BVD (Conditie A) or structured directive (Conditie B) from the conditions file */
function extractBrandVoiceDeclaration(conditionsFile: string): string {
  const content = readFileSync(conditionsFile, 'utf8');
  // BVD lives between the opening line and the "## CONTENT TYPE" marker
  const marker = '## CONTENT TYPE';
  const idx = content.indexOf(marker);
  if (idx === -1) return content;
  return content.slice(0, idx).trim();
}

// ─── Score parsing & validation ─────────────────────────────

interface DimensionScore {
  score: number;
  reasoning: string;
  exampleStrong: string;
  exampleWeak: string;
}

interface JudgeResponse {
  scores: {
    voiceFit: DimensionScore;
    brandRecognition: DimensionScore;
    naturalness: DimensionScore;
    fluency: DimensionScore;
  };
}

function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 5;
  return Math.max(1, Math.min(10, Math.round(v)));
}

function normalizeJudgeResponse(raw: unknown): JudgeResponse {
  const obj = raw as { scores?: Record<string, Partial<DimensionScore>> };
  const s = obj?.scores ?? {};
  function dim(key: keyof JudgeResponse['scores']): DimensionScore {
    const d = s[key] ?? {};
    return {
      score: clampScore(d.score),
      reasoning: typeof d.reasoning === 'string' ? d.reasoning : '',
      exampleStrong: typeof d.exampleStrong === 'string' ? d.exampleStrong : '',
      exampleWeak: typeof d.exampleWeak === 'string' ? d.exampleWeak : '',
    };
  }
  return {
    scores: {
      voiceFit: dim('voiceFit'),
      brandRecognition: dim('brandRecognition'),
      naturalness: dim('naturalness'),
      fluency: dim('fluency'),
    },
  };
}

// ─── Judge dispatchers ──────────────────────────────────────

async function callGpt5Judge(systemPrompt: string, userPrompt: string): Promise<JudgeResponse> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: PRIMARY_JUDGE_MODEL,
    max_completion_tokens: JUDGE_MAX_TOKENS,
    reasoning_effort: 'low' as never, // judge is not complex reasoning; minimize thinking budget
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  const text = response.choices[0]?.message?.content;
  if (!text || text.trim() === '') {
    const finishReason = response.choices[0]?.finish_reason;
    throw new Error(`GPT-5 returned empty content (finish_reason=${finishReason}, usage=${JSON.stringify(response.usage)})`);
  }
  return normalizeJudgeResponse(JSON.parse(text));
}

async function callSonnetJudge(systemPrompt: string, userPrompt: string): Promise<JudgeResponse> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: PARALLEL_JUDGE_MODEL,
    max_tokens: JUDGE_MAX_TOKENS,
    system: systemPrompt + '\n\nIMPORTANT: Return ONLY valid JSON, no markdown fence, no preamble.',
    messages: [{ role: 'user', content: userPrompt }],
  });
  const block = response.content.find((b) => b.type === 'text');
  const text = block && 'text' in block ? block.text : '{}';
  // Strip markdown code fence if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return normalizeJudgeResponse(JSON.parse(cleaned));
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const { PATHS } = await import('./config');
  const { JUDGE_SYSTEM_PROMPT, buildJudgeUserPrompt } = await import('./judge-prompts');

  mkdirSync(PATHS.scoresGpt5, { recursive: true });
  mkdirSync(PATHS.scoresSonnet, { recursive: true });

  // Discover all outputs
  if (!existsSync(PATHS.outputs)) {
    console.error(`No outputs directory at ${PATHS.outputs}. Run scripts/fidelity/run-drift.ts --execute first.`);
    process.exit(1);
  }
  const allOutputs: OutputFile[] = readdirSync(PATHS.outputs)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const parsed = parseKey(f);
      if (!parsed) return null;
      const key = f.replace('.md', '');
      return {
        key,
        ...parsed,
        contentPath: join(PATHS.outputs, f),
        metaPath: join(PATHS.outputs, `${key}.json`),
        conditionPath: join(PATHS.conditions, f),
      };
    })
    .filter((x): x is OutputFile => x !== null);

  const filtered = allOutputs.filter((o) => {
    if (args.brand && o.brand !== args.brand) return false;
    if (args.type && o.type !== args.type) return false;
    if (args.condition && o.condition !== args.condition) return false;
    return true;
  });

  if (filtered.length === 0) {
    console.error(`No outputs match filters. Run run-drift.ts --execute to generate outputs.`);
    process.exit(1);
  }

  const judges: Array<{ name: 'gpt5' | 'sonnet'; model: string; outDir: string; call: (s: string, u: string) => Promise<JudgeResponse> }> = [];
  if (!args.judge || args.judge === 'gpt5') judges.push({ name: 'gpt5', model: PRIMARY_JUDGE_MODEL, outDir: PATHS.scoresGpt5, call: callGpt5Judge });
  if (!args.judge || args.judge === 'sonnet') judges.push({ name: 'sonnet', model: PARALLEL_JUDGE_MODEL, outDir: PATHS.scoresSonnet, call: callSonnetJudge });

  console.log(`→ Mode: ${args.execute ? 'EXECUTE (real API calls)' : 'DRY-RUN'}`);
  console.log(`→ Outputs to score: ${filtered.length}`);
  console.log(`→ Judges: ${judges.map((j) => `${j.name} (${j.model})`).join(', ')}`);
  console.log(`→ Total calls: ${filtered.length * judges.length}`);
  console.log('');

  if (!args.execute) {
    let totalChars = 0;
    for (const o of filtered) {
      const content = readFileSync(o.contentPath, 'utf8');
      totalChars += content.length;
    }
    const avgInputTokens = Math.round(totalChars / 4 / filtered.length) + 1500; // BVD overhead
    console.log(`Avg input tokens per call: ~${avgInputTokens}`);
    console.log(`Estimated total cost (GPT-5 $5/1M in + $15/1M out, Sonnet $3/1M in + $15/1M out, 2000 out): ~$${((filtered.length * (avgInputTokens * 5 + 2000 * 15) + filtered.length * (avgInputTokens * 3 + 2000 * 15)) / 1_000_000).toFixed(2)}`);
    console.log('');
    console.log(`Run with --execute to dispatch real judge calls.`);
    return;
  }

  // SAFETY checks
  if (judges.find((j) => j.name === 'gpt5') && !process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set. Refusing to execute GPT-5 judge.');
    process.exit(1);
  }
  if (judges.find((j) => j.name === 'sonnet') && !process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set. Refusing to execute Sonnet judge.');
    process.exit(1);
  }

  let success = 0;
  let failed = 0;

  for (const o of filtered) {
    const content = readFileSync(o.contentPath, 'utf8');
    const meta = existsSync(o.metaPath) ? JSON.parse(readFileSync(o.metaPath, 'utf8')) : { wordCount: content.split(/\s+/).length };
    const declaration = extractBrandVoiceDeclaration(o.conditionPath);
    const userPrompt = buildJudgeUserPrompt({
      brandVoiceDeclaration: declaration,
      generatedContent: content,
      wordCount: meta.wordCount,
      contentType: o.type,
    });

    for (const judge of judges) {
      const outPath = join(judge.outDir, `${o.key}.json`);
      console.log(`\n→ ${judge.name} judging ${o.key}...`);
      const startedAt = Date.now();
      try {
        const response = await judge.call(JUDGE_SYSTEM_PROMPT, userPrompt);
        const composite = (response.scores.voiceFit.score + response.scores.brandRecognition.score + response.scores.naturalness.score + response.scores.fluency.score) / 4;
        const elapsedMs = Date.now() - startedAt;

        writeFileSync(
          outPath,
          JSON.stringify(
            {
              run: { brand: o.brand, type: o.type, condition: o.condition, key: o.key },
              judgeProvider: judge.name === 'gpt5' ? 'openai' : 'anthropic',
              judgeModel: judge.model,
              scores: response.scores,
              compositeScore: Math.round(composite * 10) / 10,
              elapsedMs,
              computedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
          'utf8',
        );
        console.log(`  ✓ Composite: ${composite.toFixed(1)}/10 (vF=${response.scores.voiceFit.score} bR=${response.scores.brandRecognition.score} nat=${response.scores.naturalness.score} flu=${response.scores.fluency.score}) in ${(elapsedMs / 1000).toFixed(1)}s`);
        success++;
      } catch (err) {
        console.error(`  ✗ FAILED: ${(err as Error).message}`);
        failed++;
      }
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Success: ${success}, Failed: ${failed}, Total: ${filtered.length * judges.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
