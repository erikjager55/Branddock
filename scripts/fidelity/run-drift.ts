/**
 * scripts/fidelity/run-drift.ts
 *
 * Dispatcht Claude Opus 4.7 generaties voor alle drift-meting condities.
 * Leest research/fidelity-week1/conditions/{key}.md, genereert output,
 * schrijft naar research/fidelity-week1/outputs/{key}.md.
 *
 * VEILIGHEIDSREGEL: --dry-run is default true. Echte generatie vereist
 * --execute flag EN pre-registratie commit. Dit voorkomt onbedoelde
 * API-kosten of niet-pre-geregistreerde drift-tests.
 *
 * Run dry (default — leest condities, telt tokens, doet géén API calls):
 *   npx tsx scripts/fidelity/run-drift.ts
 *
 * Run echt (alleen na pre-registratie commit):
 *   npx tsx scripts/fidelity/run-drift.ts --execute
 *
 * Filter:
 *   npx tsx scripts/fidelity/run-drift.ts --execute --brand wra-juristen --type case-study
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { resolve, join, basename } from 'path';

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

const GENERATOR_MODEL = 'claude-opus-4-7';
const MAX_TOKENS = 8000;
const THINKING_BUDGET = 12000;

// ─── CLI parsing ────────────────────────────────────────────

interface Args {
  execute: boolean;
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
    else if (args[i] === '--brand' && args[i + 1]) out.brand = args[++i];
    else if (args[i] === '--type' && args[i + 1]) out.type = args[++i];
    else if (args[i] === '--condition' && args[i + 1]) out.condition = args[++i] as 'A' | 'B';
  }
  return out;
}

// ─── Filename parsing ───────────────────────────────────────

interface ConditionFile {
  filepath: string;
  filename: string;
  brand: string;
  type: string;
  condition: 'A' | 'B';
}

function parseConditionFilename(filename: string): { brand: string; type: string; condition: 'A' | 'B' } | null {
  // Format: {brand}-{type}-{A|B}.md
  // We need to handle multi-word types like "case-study" and "thought-leadership"
  const match = filename.match(/^(.+?)-(case-study|thought-leadership)-([AB])\.md$/);
  if (!match) return null;
  return { brand: match[1], type: match[2], condition: match[3] as 'A' | 'B' };
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const { PATHS } = await import('./config');

  const conditionDir = PATHS.conditions;
  const outputDir = PATHS.outputs;
  mkdirSync(outputDir, { recursive: true });

  const allFiles = readdirSync(conditionDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const parsed = parseConditionFilename(f);
      if (!parsed) return null;
      return {
        filepath: join(conditionDir, f),
        filename: f,
        ...parsed,
      } as ConditionFile;
    })
    .filter((x): x is ConditionFile => x !== null);

  // Apply filters
  const filtered = allFiles.filter((f) => {
    if (args.brand && f.brand !== args.brand) return false;
    if (args.type && f.type !== args.type) return false;
    if (args.condition && f.condition !== args.condition) return false;
    return true;
  });

  if (filtered.length === 0) {
    console.error(`No condition files match filters. Run scripts/fidelity/build-conditions.ts first.`);
    process.exit(1);
  }

  console.log(`→ Mode: ${args.execute ? 'EXECUTE (real API calls)' : 'DRY-RUN (no API calls)'}`);
  console.log(`→ Generator model: ${GENERATOR_MODEL}`);
  console.log(`→ Files to process: ${filtered.length}`);
  console.log('');

  if (!args.execute) {
    let totalInputTokens = 0;
    for (const f of filtered) {
      const content = readFileSync(f.filepath, 'utf8');
      const tokens = Math.round(content.length / 4);
      totalInputTokens += tokens;
      console.log(`  ${f.filename} — ${content.length} chars (~${tokens} input tokens)`);
    }
    console.log('');
    console.log(`Total input tokens: ~${totalInputTokens}`);
    console.log(`Estimated output tokens: ~${filtered.length * 4500} (3000 words × 1.5 tok/word)`);
    console.log(`Estimated cost (Opus 4.7 $15/1M in + $75/1M out): ~$${((totalInputTokens * 15 + filtered.length * 4500 * 75) / 1_000_000).toFixed(2)}`);
    console.log('');
    console.log(`Run with --execute to dispatch real API calls.`);
    return;
  }

  // SAFETY: require ANTHROPIC_API_KEY
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set. Refusing to execute.');
    process.exit(1);
  }

  // Load Anthropic SDK dynamically
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(`⚠ EXECUTING ${filtered.length} REAL API CALLS to ${GENERATOR_MODEL}`);
  console.log(`⚠ Confirm pre-registratie commit is in place. Press Ctrl-C within 5 seconds to abort.`);
  await new Promise((res) => setTimeout(res, 5000));

  let success = 0;
  let failed = 0;

  for (const f of filtered) {
    const systemPrompt = readFileSync(f.filepath, 'utf8');
    const key = `${f.brand}-${f.type}-${f.condition}`;
    const outputPath = join(outputDir, `${key}.md`);
    const metaPath = join(outputDir, `${key}.json`);

    console.log(`\n→ Generating ${key}...`);
    const startedAt = Date.now();

    try {
      // Streaming required for long operations (Opus 4.7 + thinking + 8K output)
      const requestParams = {
        model: GENERATOR_MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: 'adaptive' as const },
        output_config: { effort: 'high' as const },
        system: systemPrompt,
        messages: [
          {
            role: 'user' as const,
            content: 'Write the piece now, in full, following the briefing and brand voice directive above.',
          },
        ],
      };
      const stream = client.messages.stream(
        requestParams as Parameters<typeof client.messages.stream>[0],
        { signal: AbortSignal.timeout(600_000) }, // 10 min per call
      );
      const response = await stream.finalMessage();

      const textBlock = response.content.find((b) => b.type === 'text');
      const content = textBlock && 'text' in textBlock ? textBlock.text : '';
      const wordCount = content.split(/\s+/).length;
      const elapsedMs = Date.now() - startedAt;

      writeFileSync(outputPath, content, 'utf8');
      writeFileSync(
        metaPath,
        JSON.stringify(
          {
            run: { brand: f.brand, type: f.type, condition: f.condition, key },
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

      console.log(`  ✓ ${wordCount} words in ${(elapsedMs / 1000).toFixed(1)}s`);
      console.log(`    Tokens: in=${response.usage.input_tokens}, out=${response.usage.output_tokens}`);
      success++;
    } catch (err) {
      console.error(`  ✗ FAILED: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Success: ${success}, Failed: ${failed}, Total: ${filtered.length}`);
  console.log(`Outputs: ${outputDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
