/**
 * WS2 — Batch generation runner.
 *
 * Reads the sealed A/B assignment CSV produced by generate-ab-assignment.ts
 * and runs all 12 long-form generations (3 merken × 2 content_types × 2 conditions).
 *
 * For each (merk, content_type, topic) row:
 *   1. Generate the v1 output by calling generate-piece.ts with the v1_condition
 *      mapped to its --condition flag (BASELINE → A, PROPAGATION → B).
 *   2. Generate the v2 output similarly.
 *   3. Save SEALED outputs (full frontmatter incl. condition) under output/sealed/.
 *   4. Save BLIND outputs (frontmatter stripped of condition-revealing fields)
 *      under output/blind/. Raters see only the blind output.
 *
 * SEALED outputs are the audit trail — full provenance retained.
 * BLIND outputs are what raters score — condition labels removed.
 *
 * Usage:
 *   tsx scripts/voice-research/ws2/run-batch.ts \
 *     --sealed-csv=scripts/voice-research/ws2/output/sealed/ab-assignment.csv
 *
 * Optional flags:
 *   --dry-run             Print plan, don't execute (useful for validation)
 *   --skip-existing       Skip rows where the sealed output file already exists
 *   --max-concurrent=1    Concurrency (default: 1 — sequential to avoid API rate limits)
 *
 * Output structure:
 *   scripts/voice-research/ws2/output/
 *     sealed/{merk}/{content_type}__{BASELINE|PROPAGATION}.md   (full frontmatter)
 *     blind/{merk}/{content_type}__{v1|v2}.md                   (stripped frontmatter)
 *
 * Cost estimate: 12 generations × ~$0.05 = ~$0.60 total at Opus 4.7 pricing.
 * Time estimate: ~1-3 min per generation, sequential = 12-36 min total.
 */

import { readFile, writeFile, mkdir, unlink, rmdir } from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';

// ─── Constants ────────────────────────────────────────────

const PROJECT_ROOT = process.cwd();
const SCRIPT_DIR = path.resolve(PROJECT_ROOT, 'scripts/voice-research/ws2');
const GENERATE_PIECE_SCRIPT = 'scripts/voice-research/generate-piece.ts';
const DEFAULT_SEALED_CSV = path.join(SCRIPT_DIR, 'output/sealed/ab-assignment.csv');
const SEALED_OUTPUT_DIR = path.join(SCRIPT_DIR, 'output/sealed');
const BLIND_OUTPUT_DIR = path.join(SCRIPT_DIR, 'output/blind');

/**
 * Mapping from protocol condition naming to generate-piece.ts --condition flag.
 *   BASELINE     = production BVD             → existing condition A in generate-piece.ts
 *   PROPAGATION  = BVD + A.1-A.4              → existing condition B in generate-piece.ts
 */
const CONDITION_TO_CLI_FLAG: Record<'BASELINE' | 'PROPAGATION', 'A' | 'B'> = {
  BASELINE: 'A',
  PROPAGATION: 'B',
};

// Frontmatter fields that reveal the protocol condition — strip from blind outputs.
const CONDITION_REVEALING_FIELDS = new Set([
  'condition',
  'voice_meta',
  'max_tokens',
  'elapsed_ms',
  'system_prompt_chars',
  'system_prompt_tokens_est',
  'stop_reason',
  'usage_input_tokens',
  'usage_output_tokens',
]);

// ─── Types ────────────────────────────────────────────────

interface SealedRow {
  merk: string;
  content_type: string;
  topic: string;
  v1_condition: 'BASELINE' | 'PROPAGATION';
  v2_condition: 'BASELINE' | 'PROPAGATION';
  seed: string;
}

interface CliArgs {
  sealedCsvPath: string;
  dryRun: boolean;
  skipExisting: boolean;
}

interface GenerationResult {
  success: boolean;
  outputPath?: string;
  errorMessage?: string;
  elapsedMs: number;
}

// ─── CSV parsing ─────────────────────────────────────────

function parseSealedCsv(text: string): SealedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length < 2) {
    throw new Error('Sealed CSV must have at least header + one row');
  }

  const header = parseCsvLine(lines[0]);
  const cols = ['merk', 'content_type', 'topic', 'v1_condition', 'v2_condition', 'seed'];
  for (const c of cols) {
    if (!header.includes(c)) {
      throw new Error(`Missing column "${c}" in sealed CSV header: ${header.join(', ')}`);
    }
  }

  const idx: Record<string, number> = Object.fromEntries(cols.map((c) => [c, header.indexOf(c)]));

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const v1 = cells[idx.v1_condition] as 'BASELINE' | 'PROPAGATION';
    const v2 = cells[idx.v2_condition] as 'BASELINE' | 'PROPAGATION';
    if (!['BASELINE', 'PROPAGATION'].includes(v1) || !['BASELINE', 'PROPAGATION'].includes(v2)) {
      throw new Error(`Invalid condition values: v1=${v1}, v2=${v2}`);
    }
    return {
      merk: cells[idx.merk],
      content_type: cells[idx.content_type],
      topic: cells[idx.topic],
      v1_condition: v1,
      v2_condition: v2,
      seed: cells[idx.seed],
    };
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuote = !inQuote;
    else if (ch === ',' && !inQuote) {
      result.push(current);
      current = '';
    } else current += ch;
  }
  result.push(current);
  return result;
}

// ─── Generate-piece.ts spawn ─────────────────────────────

/**
 * Spawn generate-piece.ts as a child process, capture stdout + the resulting file path.
 *
 * generate-piece.ts logs "✓ Saved: <path>" on success — we parse that to find the file.
 */
async function runGeneratePiece(opts: {
  workspace: string;
  contentType: string;
  condition: 'A' | 'B';
  topic: string;
  outputDir: string;
}): Promise<GenerationResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const env = { ...process.env };
    if (!env.DATABASE_URL) {
      env.DATABASE_URL = 'postgresql://erikjager:@localhost:5432/branddock';
    }

    const child = spawn(
      'npx',
      [
        'tsx',
        GENERATE_PIECE_SCRIPT,
        `--workspace=${opts.workspace}`,
        `--content-type=${opts.contentType}`,
        `--condition=${opts.condition}`,
        `--topic=${opts.topic}`,
        `--output-dir=${opts.outputDir}`,
      ],
      { cwd: PROJECT_ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      process.stdout.write(chunk); // mirror to console for live progress
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });

    child.on('close', (code) => {
      const elapsedMs = Date.now() - startTime;
      if (code !== 0) {
        resolve({
          success: false,
          errorMessage: `generate-piece exited with code ${code}: ${stderr.slice(0, 500)}`,
          elapsedMs,
        });
        return;
      }
      // Parse "✓ Saved: <path>" from stdout
      const savedMatch = stdout.match(/✓\s+Saved:\s+(.+\.md)/);
      if (!savedMatch) {
        resolve({
          success: false,
          errorMessage: 'Could not parse output path from generate-piece stdout',
          elapsedMs,
        });
        return;
      }
      resolve({ success: true, outputPath: savedMatch[1].trim(), elapsedMs });
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        errorMessage: `Failed to spawn generate-piece: ${err.message}`,
        elapsedMs: Date.now() - startTime,
      });
    });
  });
}

// ─── Frontmatter handling ────────────────────────────────

interface ParsedDoc {
  frontmatter: Record<string, string>;
  body: string;
}

function parseFrontmatter(text: string): ParsedDoc {
  const lines = text.split('\n');
  if (lines[0] !== '---') {
    return { frontmatter: {}, body: text };
  }
  const endIdx = lines.indexOf('---', 1);
  if (endIdx === -1) return { frontmatter: {}, body: text };

  const frontmatter: Record<string, string> = {};
  for (let i = 1; i < endIdx; i++) {
    const colonIdx = lines[i].indexOf(':');
    if (colonIdx === -1) continue;
    const key = lines[i].slice(0, colonIdx).trim();
    const value = lines[i].slice(colonIdx + 1).trim();
    frontmatter[key] = value;
  }
  const body = lines.slice(endIdx + 1).join('\n').replace(/^\n+/, '');
  return { frontmatter, body };
}

function buildBlindFrontmatter(
  original: Record<string, string>,
  blindLabel: 'v1' | 'v2',
  topic: string,
): string {
  const blindFields: Array<[string, string]> = [];

  // Whitelist non-condition-revealing fields
  for (const [key, value] of Object.entries(original)) {
    if (CONDITION_REVEALING_FIELDS.has(key)) continue;
    blindFields.push([key, value]);
  }

  // Replace any condition-revealing fields with blind label
  blindFields.push(['blind_label', blindLabel]);

  // Surface topic in blind frontmatter for rater context (in case original didn't include)
  if (!original.topic) {
    blindFields.push(['topic', `"${topic.replace(/"/g, '\\"')}"`]);
  }

  return `---\n${blindFields.map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\n`;
}

// ─── Main ─────────────────────────────────────────────────

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    sealedCsvPath: DEFAULT_SEALED_CSV,
    dryRun: false,
    skipExisting: false,
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--skip-existing') args.skipExisting = true;
    else if (arg.startsWith('--sealed-csv=')) {
      args.sealedCsvPath = arg.slice('--sealed-csv='.length);
    }
  }
  return args;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await readFile(p);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  console.log('━'.repeat(72));
  console.log('WS2 — Batch generation runner');
  console.log(`Sealed CSV: ${args.sealedCsvPath}`);
  console.log(`Mode:       ${args.dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`Sealed dir: ${SEALED_OUTPUT_DIR}`);
  console.log(`Blind dir:  ${BLIND_OUTPUT_DIR}`);
  console.log('━'.repeat(72));

  let sealedText: string;
  try {
    sealedText = await readFile(args.sealedCsvPath, 'utf-8');
  } catch {
    console.error(
      `\nERROR: Sealed CSV not found at ${args.sealedCsvPath}\n` +
        `Run generate-ab-assignment.ts first.`,
    );
    process.exit(1);
  }

  const rows = parseSealedCsv(sealedText);
  console.log(`\nLoaded ${rows.length} sealed rows`);

  if (!args.dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error('\nANTHROPIC_API_KEY not set. Source .env.local or export the key.');
    process.exit(1);
  }

  // Plan: 2 generations per row × 12 rows = up to 12 (if 6 rows × 2 = 12, or 12 rows × 2 = 24…)
  // Protocol §2 = 6 rows (3 merken × 2 types). 6 rows × 2 conditions = 12 generations.
  type Job = {
    merk: string;
    content_type: string;
    topic: string;
    blind_label: 'v1' | 'v2';
    condition: 'BASELINE' | 'PROPAGATION';
    cli_flag: 'A' | 'B';
    sealed_filename: string;
    blind_filename: string;
  };

  const jobs: Job[] = [];
  for (const r of rows) {
    jobs.push({
      merk: r.merk,
      content_type: r.content_type,
      topic: r.topic,
      blind_label: 'v1',
      condition: r.v1_condition,
      cli_flag: CONDITION_TO_CLI_FLAG[r.v1_condition],
      sealed_filename: `${r.content_type}__${r.v1_condition}.md`,
      blind_filename: `${r.content_type}__v1.md`,
    });
    jobs.push({
      merk: r.merk,
      content_type: r.content_type,
      topic: r.topic,
      blind_label: 'v2',
      condition: r.v2_condition,
      cli_flag: CONDITION_TO_CLI_FLAG[r.v2_condition],
      sealed_filename: `${r.content_type}__${r.v2_condition}.md`,
      blind_filename: `${r.content_type}__v2.md`,
    });
  }

  console.log(`\nPlan: ${jobs.length} generations`);
  for (const job of jobs) {
    console.log(
      `  ${job.merk.padEnd(14)} ${job.content_type.padEnd(15)} blind=${job.blind_label}  cond=${job.condition.padEnd(11)}  → ${job.sealed_filename}`,
    );
  }

  if (args.dryRun) {
    console.log('\nDry-run complete. Re-run without --dry-run to execute.');
    return;
  }

  // Sequential execution
  let success = 0;
  let failed = 0;
  let skipped = 0;
  const overallStart = Date.now();

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const sealedDir = path.join(SEALED_OUTPUT_DIR, job.merk);
    const blindDir = path.join(BLIND_OUTPUT_DIR, job.merk);
    const sealedTargetPath = path.join(sealedDir, job.sealed_filename);
    const blindTargetPath = path.join(blindDir, job.blind_filename);

    const prefix = `[${i + 1}/${jobs.length}]`;
    console.log(
      `\n${'━'.repeat(72)}\n${prefix} ${job.merk}/${job.content_type} blind=${job.blind_label} cond=${job.condition}`,
    );

    if (args.skipExisting && (await fileExists(sealedTargetPath))) {
      console.log(`  → SKIP (sealed file exists)`);
      skipped += 1;
      continue;
    }

    await mkdir(sealedDir, { recursive: true });
    await mkdir(blindDir, { recursive: true });

    // Generate using a temporary staging dir (avoid name collisions)
    const stagingDir = path.join(sealedDir, `.staging_${Date.now()}_${i}`);
    await mkdir(stagingDir, { recursive: true });

    const result = await runGeneratePiece({
      workspace: job.merk,
      contentType: job.content_type,
      condition: job.cli_flag,
      topic: job.topic,
      outputDir: stagingDir,
    });

    if (!result.success || !result.outputPath) {
      console.error(`\n  ✗ FAILED: ${result.errorMessage}`);
      failed += 1;
      continue;
    }

    // Read staged file, write sealed + blind versions
    const stagedContent = await readFile(result.outputPath, 'utf-8');
    const parsed = parseFrontmatter(stagedContent);

    // Sealed: keep the file as generate-piece produced it (full frontmatter)
    await writeFile(sealedTargetPath, stagedContent, 'utf-8');

    // Blind: strip condition-revealing fields, add blind_label
    const blindFrontmatter = buildBlindFrontmatter(parsed.frontmatter, job.blind_label, job.topic);
    await writeFile(blindTargetPath, blindFrontmatter + parsed.body, 'utf-8');

    // Clean up staging (best-effort — failure does not block subsequent jobs)
    try {
      await unlink(result.outputPath);
      await rmdir(stagingDir);
    } catch {
      // staging cleanup is best-effort; leftover files in .staging_* are harmless
    }

    console.log(`  ✓ sealed: ${sealedTargetPath}`);
    console.log(`  ✓ blind:  ${blindTargetPath}`);
    success += 1;
  }

  const elapsedMin = ((Date.now() - overallStart) / 1000 / 60).toFixed(1);
  console.log(`\n${'━'.repeat(72)}`);
  console.log(`Batch complete: ${success}/${jobs.length} success, ${failed} failed, ${skipped} skipped`);
  console.log(`Total elapsed: ${elapsedMin} min`);
  console.log(`\nSealed outputs: ${SEALED_OUTPUT_DIR}/  (full frontmatter, audit trail)`);
  console.log(`Blind outputs:  ${BLIND_OUTPUT_DIR}/   (stripped frontmatter, send to raters)`);
}

main().catch((err) => {
  console.error('Batch run failed:', err);
  process.exit(1);
});
