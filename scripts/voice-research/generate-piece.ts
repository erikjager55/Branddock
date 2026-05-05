/**
 * WS2 Generation Runner — generate one long-form piece for one (workspace, content-type, condition, topic).
 *
 * Generates output for either condition A (current production BVD) or condition B
 * (BVD + A.1-A.4 propagation-fixes). Same prompt, same model, same generation parameters
 * — only voice-injection differs. Side-by-side outputs are the basis for the WS2 drift-meting.
 *
 * Usage:
 *   tsx scripts/voice-research/generate-piece.ts \
 *     --workspace=linfi \
 *     --content-type=blog-post \
 *     --condition=A \
 *     --topic="The hidden cost of vague brand strategy"
 *
 * Optional flags:
 *   --dry-run            Print system+user prompt to stdout, do NOT call Anthropic.
 *                        Use this to verify A.1-A.4 wiring before running with API budget.
 *   --output-dir=PATH    Override default output dir (scripts/voice-research/output/{slug}/{condition}/).
 *   --max-tokens=N       Override max_tokens (default 8192 for 3K-word target with safety margin).
 *
 * Output: a markdown file with frontmatter capturing all generation parameters,
 * followed by the generated content. Frontmatter is the audit trail for blind scoring later.
 *
 * NOTE: This runner does not modify any production code path. It reads brand context
 * via existing utilities and constructs prompts independently.
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

import { prisma } from '@/lib/prisma';
import { getBrandContext } from '@/lib/ai/brand-context';
import { buildBrandVoiceDirectiveFromContext } from '@/lib/studio/brand-voice-directive';
import { getPromptTemplate } from '@/lib/studio/prompt-templates';

import {
  buildConditionBVoiceSection,
  wrapWithVoiceReinforcement,
  extractPersonalityFields,
} from './condition-b';

// ─── Constants ────────────────────────────────────────────

const MODEL = 'claude-opus-4-7';
const DEFAULT_MAX_TOKENS = 8192; // 3K-word target ≈ 4K tokens; 8K provides safety margin
const TARGET_WORDS = 3000;

// ─── Types ────────────────────────────────────────────────

interface CliArgs {
  workspace: string;
  contentType: string;
  condition: 'A' | 'B';
  topic: string;
  outputDir?: string;
  dryRun: boolean;
  maxTokens: number;
}

// ─── CLI parsing ──────────────────────────────────────────

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string | boolean> = {};
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    const eqIdx = arg.indexOf('=');
    if (arg.startsWith('--') && eqIdx > 0) {
      const key = arg.slice(2, eqIdx);
      args[key] = arg.slice(eqIdx + 1);
    }
  }

  const required = ['workspace', 'content-type', 'condition', 'topic'] as const;
  for (const k of required) {
    if (!args[k] || typeof args[k] !== 'string') {
      console.error(`Missing required arg: --${k}=...`);
      console.error(
        'Usage: tsx scripts/voice-research/generate-piece.ts --workspace=slug --content-type=blog-post --condition=A|B --topic="..." [--dry-run]',
      );
      process.exit(1);
    }
  }

  const condition = args.condition as string;
  if (condition !== 'A' && condition !== 'B') {
    console.error(`Condition must be A or B (got: ${condition})`);
    process.exit(1);
  }

  const maxTokensRaw = args['max-tokens'];
  const maxTokens =
    typeof maxTokensRaw === 'string' ? parseInt(maxTokensRaw, 10) : DEFAULT_MAX_TOKENS;
  if (isNaN(maxTokens) || maxTokens < 1024 || maxTokens > 16384) {
    console.error(`Invalid --max-tokens=${maxTokensRaw}. Must be 1024-16384.`);
    process.exit(1);
  }

  return {
    workspace: args.workspace as string,
    contentType: args['content-type'] as string,
    condition: condition as 'A' | 'B',
    topic: args.topic as string,
    outputDir: typeof args['output-dir'] === 'string' ? (args['output-dir'] as string) : undefined,
    dryRun: args.dryRun === true,
    maxTokens,
  };
}

// ─── Main ─────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  // Resolve workspace by slug
  const workspace = await prisma.workspace.findFirst({
    where: { slug: args.workspace },
    select: { id: true, name: true, slug: true },
  });
  if (!workspace) {
    console.error(`Workspace not found: slug="${args.workspace}"`);
    console.error(
      'Hint: query available workspaces via psql to confirm the exact slug.',
    );
    process.exit(1);
  }

  // Validate content type early (fail fast)
  const template = getPromptTemplate(args.contentType);
  // getPromptTemplate falls back to a generic template — we want to know if we got the fallback
  // since for WS2 we should only use registered long-form types. Detect via fallback marker.
  const isFallbackTemplate = template.systemPrompt.includes(
    'expert content writer and brand strategist',
  );
  if (isFallbackTemplate) {
    console.warn(
      `⚠ No registered template for content-type "${args.contentType}" — using generic fallback. WS2 should use registered long-form types: blog-post, whitepaper, case-study, ebook, pillar-page, research-paper, resource-guide.`,
    );
  }

  // Load brand context (= same path production uses)
  const ctx = await getBrandContext(workspace.id);

  // Build system prompt per condition
  let systemPrompt: string;
  let voiceMeta: Record<string, unknown> = {};

  if (args.condition === 'A') {
    // Condition A: production BVD baseline, unchanged
    const voiceSection = buildBrandVoiceDirectiveFromContext(ctx, {
      deliverableTypeId: args.contentType,
    });
    systemPrompt = voiceSection
      ? `${voiceSection}\n\n${template.systemPrompt}`
      : template.systemPrompt;
    voiceMeta = { condition: 'A', voice_section_chars: voiceSection.length };
  } else {
    // Condition B: BVD + A.1-A.4 propagation-fixes
    // Load raw BrandPersonalityFrameworkData for A.3/A.4 reinforcement
    const personalityAsset = await prisma.brandAsset.findFirst({
      where: { workspaceId: workspace.id, frameworkType: 'BRAND_PERSONALITY' },
      select: { frameworkData: true },
    });
    const { primaryTrait, wordsUse, wordsAvoid } = extractPersonalityFields(
      personalityAsset?.frameworkData,
    );

    const voiceSection = buildConditionBVoiceSection(ctx, {
      deliverableTypeId: args.contentType,
      primaryTrait,
      brandWordsUse: wordsUse,
      brandWordsAvoid: wordsAvoid,
    });
    systemPrompt = wrapWithVoiceReinforcement(voiceSection, template.systemPrompt, {
      deliverableTypeId: args.contentType,
      primaryTrait,
      brandWordsUse: wordsUse,
      brandWordsAvoid: wordsAvoid,
    });
    voiceMeta = {
      condition: 'B',
      voice_section_chars: voiceSection.length,
      primary_trait: primaryTrait ?? null,
      words_use_count: wordsUse.length,
      words_avoid_count: wordsAvoid.length,
    };
  }

  // Build user prompt — minimal, identical between conditions
  const userPrompt = [
    `Brand: ${workspace.name}`,
    '',
    `Write a ${args.contentType} of approximately ${TARGET_WORDS} words about the following topic:`,
    '',
    args.topic,
    '',
    'Follow the methodology and structure described in the system prompt. Apply the brand voice directive throughout — voice consistency is the primary success criterion for this piece.',
  ].join('\n');

  // Token estimates (rough: ~4 chars per token for English/Dutch mix)
  const sysTokens = Math.round(systemPrompt.length / 4);
  const userTokens = Math.round(userPrompt.length / 4);

  console.log('━'.repeat(72));
  console.log(`Workspace:    ${workspace.name} (${workspace.slug})`);
  console.log(`Content type: ${args.contentType}`);
  console.log(`Condition:    ${args.condition} (${args.condition === 'A' ? 'baseline BVD' : 'BVD + A.1-A.4 propagation-fixes'})`);
  console.log(`Topic:        ${args.topic}`);
  console.log(`Model:        ${MODEL}`);
  console.log(`Max tokens:   ${args.maxTokens}`);
  console.log(`System tokens (est): ${sysTokens}`);
  console.log(`User tokens (est):   ${userTokens}`);
  console.log(`Voice meta:   ${JSON.stringify(voiceMeta)}`);
  console.log('━'.repeat(72));

  if (args.dryRun) {
    console.log('\n=== SYSTEM PROMPT ===\n');
    console.log(systemPrompt);
    console.log('\n=== USER PROMPT ===\n');
    console.log(userPrompt);
    console.log('\n=== END (dry-run, no API call) ===\n');
    await prisma.$disconnect();
    return;
  }

  // Anthropic generation
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set — cannot run live generation.');
    console.error('Set the env var or use --dry-run to preview prompts.');
    process.exit(1);
  }

  const anthropic = new Anthropic();
  console.log(`Generating... (this may take 60-120s for ${TARGET_WORDS} words)`);

  const startTime = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: args.maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const elapsedMs = Date.now() - startTime;

  const generatedText = response.content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  const wordCount = generatedText.split(/\s+/).filter(Boolean).length;
  const stopReason = response.stop_reason ?? 'unknown';

  // Save output with full audit-trail frontmatter for blind scoring later
  const outputDir =
    args.outputDir ??
    path.resolve(process.cwd(), 'scripts/voice-research/output', workspace.slug, args.condition);
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  // Filename intentionally does NOT include condition or brand name in body — those are in
  // frontmatter only. This makes it easy to copy filename to a sealed CSV for blind scoring.
  const filename = `${args.contentType}_${timestamp}.md`;
  const outputPath = path.join(outputDir, filename);

  const frontmatter = [
    '---',
    `workspace_name: ${workspace.name}`,
    `workspace_slug: ${workspace.slug}`,
    `workspace_id: ${workspace.id}`,
    `content_type: ${args.contentType}`,
    `condition: ${args.condition}`,
    `topic: ${args.topic.replace(/"/g, '\\"')}`,
    `model: ${MODEL}`,
    `max_tokens: ${args.maxTokens}`,
    `generated_at: ${new Date().toISOString()}`,
    `elapsed_ms: ${elapsedMs}`,
    `word_count: ${wordCount}`,
    `target_words: ${TARGET_WORDS}`,
    `system_prompt_chars: ${systemPrompt.length}`,
    `system_prompt_tokens_est: ${sysTokens}`,
    `stop_reason: ${stopReason}`,
    `voice_meta: ${JSON.stringify(voiceMeta)}`,
    `usage_input_tokens: ${response.usage?.input_tokens ?? 'unknown'}`,
    `usage_output_tokens: ${response.usage?.output_tokens ?? 'unknown'}`,
    `protocol_version: v0.2`,
    `protocol_commit: 446f92b`,
    '---',
    '',
    generatedText,
  ].join('\n');

  await writeFile(outputPath, frontmatter, 'utf-8');

  console.log(`✓ Saved: ${outputPath}`);
  console.log(`  ${wordCount} words / ${TARGET_WORDS} target`);
  console.log(`  ${(elapsedMs / 1000).toFixed(1)}s elapsed`);
  console.log(`  stop_reason: ${stopReason}`);
  if (stopReason === 'max_tokens') {
    console.warn(
      `  ⚠ Output truncated at max_tokens (${args.maxTokens}). Consider --max-tokens=N higher.`,
    );
  }
  if (Math.abs(wordCount - TARGET_WORDS) > TARGET_WORDS * 0.3) {
    console.warn(
      `  ⚠ Word count ${wordCount} deviates >30% from target ${TARGET_WORDS}. May affect WS2 comparability.`,
    );
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Generation failed:', err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
