// =============================================================
// All-chips model comparison — 2026-05-14
//
// 4 use-case groepen (representant per chip-cluster) × 4-5 SOTA modellen
// per groep = ~18 generaties + 4 judge calls. Doel: per chip-cluster
// het optimale model identificeren.
//
// Groep A — photoreal scene with people (chips: lifestyle, behind-the-scenes, ugc)
// Groep B — product-shot (chips: product-shot)
// Groep C — quote-text / typography (chips: quote-text)
// Groep D — data-viz / infographic (chips: infographic, data-driven)
// =============================================================

import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
loadEnv({ path: resolve(process.cwd(), '.env.local') });

import { fal } from '@fal-ai/client';
import Anthropic from '@anthropic-ai/sdk';

if (!process.env.FAL_KEY) {
  console.error('FAL_KEY missing');
  process.exit(1);
}
fal.config({ credentials: process.env.FAL_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BRAND_NAME = 'Napking';
const BRAND_CONTEXT =
  'Napking is a Dutch B2B horeca textile service. Practical, no-nonsense, warm, professional, NOT luxury. Brand colors: teal #0D9488, warm off-white #FAFAF7, charcoal #1F2937.';

// ─── Brief per use-case ──────────────────────────────────
interface UseCaseBrief {
  groupId: 'A' | 'B' | 'C' | 'D';
  groupName: string;
  chips: string[]; // chips deze groep dekt
  prompt: string;
  judgeCriteria: string; // wat de judge moet evalueren per groep
  models: Array<{
    id: string;
    label: string;
    endpoint: string;
    extraInput?: Record<string, unknown>;
    cost: string;
  }>;
}

const USE_CASES: UseCaseBrief[] = [
  {
    groupId: 'A',
    groupName: 'Photoreal scene with people',
    chips: ['lifestyle', 'behind-the-scenes', 'ugc'],
    prompt:
      'Authentic candid photo of restaurant staff in white uniforms working together in a warm professional kitchen. Natural lighting, real moments, not posed. Warm color palette with teal accents. No text, no captions, no signage.',
    judgeCriteria:
      '1. authenticity (candid, real, not posed) 2. warmth (warm light, professional) 3. brandFit (teal accents, NOT luxury) 4. noTextCompliance',
    models: [
      { id: 'flux-2-pro', label: 'FLUX 2 Pro', endpoint: 'fal-ai/flux-2-pro', extraInput: { image_size: 'square_hd' }, cost: '$0.03' },
      { id: 'nano-banana-pro', label: 'Nano Banana Pro', endpoint: 'fal-ai/nano-banana-pro', extraInput: { aspect_ratio: '1:1', resolution: '1K' }, cost: '$0.02' },
      { id: 'phota', label: 'Phota (photoreal specialist)', endpoint: 'fal-ai/phota', extraInput: { aspect_ratio: '1:1', resolution: '1K' }, cost: '$0.03' },
      { id: 'gpt-image-2', label: 'GPT Image 2', endpoint: 'openai/gpt-image-2', extraInput: { image_size: 'square_hd' }, cost: '$0.21' },
      { id: 'seedream-v4', label: 'Seedream V4', endpoint: 'fal-ai/bytedance/seedream/v4/text-to-image', extraInput: { image_size: 'square_hd' }, cost: '$0.04' },
    ],
  },
  {
    groupId: 'B',
    groupName: 'Product-shot (textile close-up)',
    chips: ['product-shot'],
    prompt:
      'Clean product photography: a stack of pristine white folded napkins with a small "Napking" textile label visible on the corner. Studio lighting, neutral background, sharp detail on fabric texture. Brand colors teal and warm off-white. Highly detailed.',
    judgeCriteria:
      '1. materialAccuracy (visible fabric/texture detail) 2. labelLegibility (Napking label readable, no garbled text) 3. composition (clean product-shot conventions) 4. brandFit (teal/warm-off-white tones)',
    models: [
      { id: 'seedream-v4', label: 'Seedream V4 (text-in-product specialist)', endpoint: 'fal-ai/bytedance/seedream/v4/text-to-image', extraInput: { image_size: 'square_hd' }, cost: '$0.04' },
      { id: 'gpt-image-2', label: 'GPT Image 2', endpoint: 'openai/gpt-image-2', extraInput: { image_size: 'square_hd' }, cost: '$0.21' },
      { id: 'nano-banana-pro', label: 'Nano Banana Pro', endpoint: 'fal-ai/nano-banana-pro', extraInput: { aspect_ratio: '1:1', resolution: '1K' }, cost: '$0.02' },
      { id: 'flux-2-pro', label: 'FLUX 2 Pro', endpoint: 'fal-ai/flux-2-pro', extraInput: { image_size: 'square_hd' }, cost: '$0.03' },
      { id: 'ideogram-v3', label: 'Ideogram V3', endpoint: 'fal-ai/ideogram/v3', extraInput: { image_size: 'square_hd' }, cost: '$0.04' },
    ],
  },
  {
    groupId: 'C',
    groupName: 'Quote-text / typography poster',
    chips: ['quote-text'],
    prompt:
      'Typography-led design: large clear text "Vlekkeloos textiel, zorgeloos werken" as focal point. Geometric solid background in teal #0D9488. Off-white text. Modern sans-serif font. Minimal decoration. No other elements.',
    judgeCriteria:
      '1. textLegibility (text crisp, correctly spelled "Vlekkeloos textiel, zorgeloos werken") 2. typography (clean modern sans-serif, well-spaced) 3. brandFit (teal background, off-white text) 4. minimalism (no extra decoration)',
    models: [
      { id: 'ideogram-v3', label: 'Ideogram V3 (typography specialist)', endpoint: 'fal-ai/ideogram/v3', extraInput: { image_size: 'square_hd' }, cost: '$0.04' },
      { id: 'recraft-v3-typo', label: 'Recraft V3 (style: digital_illustration for typo)', endpoint: 'fal-ai/recraft/v3/text-to-image', extraInput: { image_size: 'square_hd', style: 'digital_illustration' }, cost: '$0.04' },
      { id: 'nano-banana-pro', label: 'Nano Banana Pro', endpoint: 'fal-ai/nano-banana-pro', extraInput: { aspect_ratio: '1:1', resolution: '1K' }, cost: '$0.02' },
      { id: 'seedream-v4', label: 'Seedream V4', endpoint: 'fal-ai/bytedance/seedream/v4/text-to-image', extraInput: { image_size: 'square_hd' }, cost: '$0.04' },
      { id: 'gpt-image-2', label: 'GPT Image 2', endpoint: 'openai/gpt-image-2', extraInput: { image_size: 'square_hd' }, cost: '$0.21' },
    ],
  },
  {
    groupId: 'D',
    groupName: 'Infographic / data-viz',
    chips: ['infographic', 'data-driven'],
    prompt:
      'Information graphic: prominent stat "280+ restaurants" as hero number. Small icon of a folded napkin. Sub-text "geserveerd in de Randstad". Clean structured layout with teal #0D9488 accent on the number. Light grey background. Minimal decoration. Modern editorial style.',
    judgeCriteria:
      '1. dataLegibility (number "280+" prominent and correct, sub-text readable) 2. structure (clean editorial hierarchy) 3. brandFit (teal accent on hero number) 4. iconAccuracy (folded napkin icon present and recognizable)',
    models: [
      { id: 'nano-banana-pro', label: 'Nano Banana Pro (world-knowledge + text)', endpoint: 'fal-ai/nano-banana-pro', extraInput: { aspect_ratio: '1:1', resolution: '1K' }, cost: '$0.02' },
      { id: 'ideogram-v3', label: 'Ideogram V3', endpoint: 'fal-ai/ideogram/v3', extraInput: { image_size: 'square_hd' }, cost: '$0.04' },
      { id: 'recraft-v3-vector', label: 'Recraft V3 (vector_illustration)', endpoint: 'fal-ai/recraft/v3/text-to-image', extraInput: { image_size: 'square_hd', style: 'vector_illustration' }, cost: '$0.04' },
      { id: 'seedream-v4', label: 'Seedream V4', endpoint: 'fal-ai/bytedance/seedream/v4/text-to-image', extraInput: { image_size: 'square_hd' }, cost: '$0.04' },
      { id: 'gpt-image-2', label: 'GPT Image 2', endpoint: 'openai/gpt-image-2', extraInput: { image_size: 'square_hd' }, cost: '$0.21' },
    ],
  },
];

// ─── Generation ──────────────────────────────────────────
interface GenResult {
  groupId: string;
  modelId: string;
  label: string;
  imageUrl: string | null;
  latencyMs: number;
  cost: string;
  error?: string;
  skipJudge?: boolean;
}

async function runFalGen(
  groupId: string,
  model: UseCaseBrief['models'][number],
  prompt: string,
): Promise<GenResult> {
  const t0 = Date.now();
  try {
    const result = await fal.subscribe(model.endpoint, {
      input: {
        prompt,
        num_images: 1,
        output_format: 'png',
        ...(model.extraInput ?? {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      timeout: 120_000,
    });
    const data = result.data as Record<string, unknown>;
    const images = data?.images as Array<{ url: string }> | undefined;
    const url = images?.[0]?.url ?? null;
    return {
      groupId,
      modelId: model.id,
      label: model.label,
      imageUrl: url,
      latencyMs: Date.now() - t0,
      cost: model.cost,
      // skip judge wanneer SVG output (Claude Vision niet supportet)
      skipJudge: url?.endsWith('.svg') ?? false,
    };
  } catch (err) {
    return {
      groupId,
      modelId: model.id,
      label: model.label,
      imageUrl: null,
      latencyMs: Date.now() - t0,
      cost: model.cost,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

interface JudgeScore {
  modelId: string;
  scores: Record<string, number>;
  composite: number;
  reasoning: string;
}

async function judgeGroup(group: UseCaseBrief, results: GenResult[]): Promise<JudgeScore[]> {
  const judgeable = results.filter((r) => r.imageUrl && !r.skipJudge);
  if (judgeable.length === 0) return [];

  const judgeSystem = `Je bent een brand-image judge voor ${BRAND_NAME}.

# Brand context
${BRAND_CONTEXT}

# Use-case
${group.groupName}

# Brief (gegeven aan elk model)
${group.prompt}

# Score 4 dimensies per image (0-100):
${group.judgeCriteria}

Composite = gemiddelde van de 4 dimensies.

Return JSON: { "scores": [ { "modelId": "...", "scores": {"dim1": N, "dim2": N, "dim3": N, "dim4": N}, "reasoning": "1-2 zinnen" }, ... ] }
Gebruik exact dezelfde dim-key namen als in de criteria (eerste woord van elk genummerd item).`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userContent: any[] = [];
  for (const r of judgeable) {
    userContent.push({ type: 'text', text: `\n## Image ID="${r.modelId}" — ${r.label}\n` });
    const ext = r.imageUrl!.split('.').pop()?.toLowerCase() ?? '';
    if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      console.warn(`[judge ${group.groupId}] skip ${r.modelId}: ext '${ext}'`);
      continue;
    }
    userContent.push({ type: 'image', source: { type: 'url', url: r.imageUrl! } });
  }
  userContent.push({ type: 'text', text: '\nReturn ONE JSON object met scores array.' });

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    temperature: 0.2,
    system: judgeSystem,
    messages: [{ role: 'user', content: userContent }],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textBlock = (res.content as any[]).find((b) => b.type === 'text');
  const text = textBlock?.text ?? '';
  const match = text.match(/\{[\s\S]+\}/);
  if (!match) {
    console.error(`[judge ${group.groupId}] non-JSON:`, text.slice(0, 300));
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed: any = JSON.parse(match[0]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (parsed.scores ?? []).map((s: any) => {
    const dimValues = Object.values(s.scores ?? {}).filter((v): v is number => typeof v === 'number');
    const composite = dimValues.length > 0
      ? Math.round(dimValues.reduce((sum, v) => sum + v, 0) / dimValues.length)
      : 0;
    return {
      modelId: s.modelId,
      scores: s.scores ?? {},
      composite,
      reasoning: s.reasoning ?? '',
    };
  });
}

async function main() {
  console.log('=== All-chips model comparison — 2026-05-14 ===\n');

  const allResults: GenResult[] = [];
   
  const allScores: Record<string, JudgeScore[]> = {};

  for (const group of USE_CASES) {
    console.log(`\n--- Group ${group.groupId}: ${group.groupName} ---`);
    console.log(`Chips: ${group.chips.join(', ')}`);
    const groupResults: GenResult[] = [];
    for (const m of group.models) {
      process.stdout.write(`  [${m.id}] running... `);
      const r = await runFalGen(group.groupId, m, group.prompt);
      groupResults.push(r);
      allResults.push(r);
      if (r.error) console.log(`ERROR: ${r.error.slice(0, 60)}`);
      else if (r.skipJudge) console.log(`OK (${(r.latencyMs / 1000).toFixed(1)}s) — SKIP-JUDGE (SVG)`);
      else console.log(`OK (${(r.latencyMs / 1000).toFixed(1)}s)`);
    }
    console.log(`  [judge group ${group.groupId}]`);
    const scores = await judgeGroup(group, groupResults);
    allScores[group.groupId] = scores;
    for (const s of scores) {
      const r = groupResults.find((x) => x.modelId === s.modelId);
      console.log(
        `    ${(r?.label ?? s.modelId).padEnd(50)} composite=${s.composite}  (${Object.entries(s.scores).map(([k, v]) => `${k}:${v}`).join(' / ')})`,
      );
    }
  }

  // Build report
  const outDir = resolve(process.cwd(), 'docs/experiments');
  mkdirSync(outDir, { recursive: true });
  const lines: string[] = [];
  lines.push('# All-chips model comparison — 2026-05-14');
  lines.push('');
  lines.push('Per use-case groep getest welk SOTA model het beste presteert. 4 groepen die alle chips dekken (siblings delen winnaar).');
  lines.push('');

  for (const group of USE_CASES) {
    lines.push(`## Group ${group.groupId}: ${group.groupName}`);
    lines.push(`Chips: ${group.chips.map((c) => `\`${c}\``).join(', ')}`);
    lines.push('');
    lines.push(`**Brief**: ${group.prompt}`);
    lines.push('');
    lines.push('| Rank | Model | Composite | Dimensions | Latency | Cost | URL |');
    lines.push('|------|-------|----------:|-----------|--------:|------|-----|');
    const scores = allScores[group.groupId] ?? [];
    const scoreMap = new Map(scores.map((s) => [s.modelId, s]));
    const groupResults = allResults.filter((r) => r.groupId === group.groupId);
    const sorted = [...groupResults].sort(
      (a, b) => (scoreMap.get(b.modelId)?.composite ?? 0) - (scoreMap.get(a.modelId)?.composite ?? 0),
    );
    let rank = 1;
    for (const r of sorted) {
      const s = scoreMap.get(r.modelId);
      if (!s) {
        lines.push(
          `| ${rank++} | ${r.label} | — | — | ${(r.latencyMs / 1000).toFixed(1)}s | ${r.cost} | ${r.skipJudge ? 'SVG (skipped)' : r.error ? `ERR: ${r.error.slice(0, 50)}` : 'no judge'} |`,
        );
        continue;
      }
      const dimsStr = Object.entries(s.scores).map(([k, v]) => `${k}:${v}`).join(' / ');
      const urlCell = r.imageUrl ? `[link](${r.imageUrl})` : '—';
      lines.push(
        `| ${rank++} | ${r.label} | **${s.composite}** | ${dimsStr} | ${(r.latencyMs / 1000).toFixed(1)}s | ${r.cost} | ${urlCell} |`,
      );
    }
    lines.push('');
    lines.push('### Judge motivatie per model');
    lines.push('');
    for (const r of sorted) {
      const s = scoreMap.get(r.modelId);
      if (!s) {
        lines.push(`- **${r.label}** — ${r.skipJudge ? 'SVG (judge skipped)' : r.error ? `ERROR: ${r.error.slice(0, 80)}` : 'no score'}`);
        continue;
      }
      lines.push(`- **${r.label}** (composite ${s.composite}): ${s.reasoning}`);
    }
    lines.push('');

    // Winner-recommendation line per group
    const winner = sorted.find((r) => scoreMap.get(r.modelId));
    const winnerScore = winner ? scoreMap.get(winner.modelId) : null;
    if (winner && winnerScore) {
      lines.push(`**Aanbevolen voor chips ${group.chips.map((c) => `\`${c}\``).join(', ')}: ${winner.label}** (composite ${winnerScore.composite}, ${winner.cost})`);
      lines.push('');
    }
  }

  writeFileSync(resolve(outDir, '2026-05-14-all-chips-models-report.md'), lines.join('\n'));
  writeFileSync(
    resolve(outDir, '2026-05-14-all-chips-models-raw.json'),
    JSON.stringify({ results: allResults, scores: allScores }, null, 2),
  );
  console.log('\nReport: docs/experiments/2026-05-14-all-chips-models-report.md');
}

main().catch(console.error);
