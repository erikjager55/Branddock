// =============================================================
// Illustration models comparison — 2026-05-14
//
// Vergelijkt SOTA image-models elk in hun eigen optimale config voor
// brand-illustration use-case (Napking restaurant-manager scene).
// Niet alleen generic prompt — elk model krijgt zijn native best-
// practice params (Recraft style-flag, Nano Banana fusion, etc).
//
// Judge: Sonnet Vision evalueert 4 dimensies:
//  - styleMatch: matches 'illustration' chip intent
//  - brandFit: kleur/stijl past bij Napking brand-context
//  - noTextCompliance: geen tekst in image
//  - subjectAccuracy: depicts what brief asked
// =============================================================

import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
loadEnv({ path: resolve(process.cwd(), '.env.local') });

import { fal } from '@fal-ai/client';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

// ─── Fixture: Napking brand-context ──────────────────────
const BRAND_NAME = 'Napking';
const VOICE_DESCRIPTION =
  'Napking is a Dutch B2B horeca textile service. Practical, no-nonsense, service-oriented. Imagery should feel warm, professional, authentic — not luxury or premium.';
const BRAND_COLORS = 'Teal (#0D9488), warm off-white (#FAFAF7), charcoal (#1F2937)';
const BRIEFING =
  'Een ontspannen restaurantmanager in horeca-omgeving. Op de achtergrond keukenpersoneel in vlekkeloos witte kokskleding bezig met hun werk. Sfeer: warm, professioneel, geen stress. Geen tekst, geen logos, geen signage.';

// Compact prompt within all models' caps
const COMMON_PROMPT_SHORT =
  `Illustration of a relaxed restaurant manager in a warm horeca setting. Kitchen staff in white uniforms working in background. Mood: warm, professional, no-stress. Brand colors: teal, warm off-white, charcoal. NO TEXT, no captions, no signage anywhere in the image.`;

// ─── Models to test ──────────────────────────────────────
interface ModelConfig {
  id: string;
  label: string;
  provider: 'fal' | 'gemini';
  endpoint?: string; // fal-only
  input?: Record<string, unknown>; // extra fal input params
  geminiModel?: string;
  cost: string;
}

const MODELS: ModelConfig[] = [
  {
    id: 'recraft-v3-digital',
    label: 'Recraft V3 (digital_illustration)',
    provider: 'fal',
    endpoint: 'fal-ai/recraft/v3/text-to-image',
    input: { style: 'digital_illustration', image_size: 'square_hd' },
    cost: '$0.04',
  },
  {
    id: 'recraft-v3-vector',
    label: 'Recraft V3 (vector_illustration)',
    provider: 'fal',
    endpoint: 'fal-ai/recraft/v3/text-to-image',
    input: { style: 'vector_illustration', image_size: 'square_hd' },
    cost: '$0.04',
  },
  {
    id: 'nano-banana-pro',
    label: 'Nano Banana Pro (Gemini 3 Pro Image via fal)',
    provider: 'fal',
    endpoint: 'fal-ai/nano-banana-pro',
    input: { aspect_ratio: '1:1', resolution: '1K' },
    cost: '$0.02',
  },
  {
    id: 'gemini-flash-image',
    label: 'Gemini 2.5 Flash Image (native API)',
    provider: 'gemini',
    geminiModel: 'gemini-2.5-flash-image',
    cost: '$0.04',
  },
  {
    id: 'flux-2-pro',
    label: 'FLUX 2 Pro',
    provider: 'fal',
    endpoint: 'fal-ai/flux-2-pro',
    input: { image_size: 'square_hd' },
    cost: '$0.03',
  },
  {
    id: 'ideogram-v3',
    label: 'Ideogram V3',
    provider: 'fal',
    endpoint: 'fal-ai/ideogram/v3',
    input: { image_size: 'square_hd' },
    cost: '$0.04',
  },
];

// ─── Clients ─────────────────────────────────────────────
if (!process.env.FAL_KEY) {
  console.error('FAL_KEY missing');
  process.exit(1);
}
fal.config({ credentials: process.env.FAL_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface RunResult {
  modelId: string;
  label: string;
  imageUrl: string | null;
  latencyMs: number;
  costEstimate: string;
  error?: string;
}

async function runFal(cfg: ModelConfig): Promise<RunResult> {
  const t0 = Date.now();
  try {
    const result = await fal.subscribe(cfg.endpoint!, {
      input: {
        prompt: COMMON_PROMPT_SHORT,
        num_images: 1,
        output_format: 'png',
        ...(cfg.input ?? {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      timeout: 120_000,
    });
    const data = result.data as Record<string, unknown>;
    const images = data?.images as Array<{ url: string }> | undefined;
    return {
      modelId: cfg.id,
      label: cfg.label,
      imageUrl: images?.[0]?.url ?? null,
      latencyMs: Date.now() - t0,
      costEstimate: cfg.cost,
    };
  } catch (err) {
    return {
      modelId: cfg.id,
      label: cfg.label,
      imageUrl: null,
      latencyMs: Date.now() - t0,
      costEstimate: cfg.cost,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runGemini(cfg: ModelConfig): Promise<RunResult> {
  const t0 = Date.now();
  try {
    const result = await gemini.models.generateContent({
      model: cfg.geminiModel!,
      contents: [{ role: 'user', parts: [{ text: COMMON_PROMPT_SHORT }] }],
    });
    // Extract inline image data from candidates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cand = (result as any).candidates?.[0];
    const parts = cand?.content?.parts ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imgPart = parts.find((p: any) => p.inlineData?.data || p.inline_data?.data);
    const dataB64 = imgPart?.inlineData?.data ?? imgPart?.inline_data?.data;
    if (!dataB64) {
      return {
        modelId: cfg.id,
        label: cfg.label,
        imageUrl: null,
        latencyMs: Date.now() - t0,
        costEstimate: cfg.cost,
        error: 'No image in response',
      };
    }
    // Save to local file zodat judge het kan lezen
    const outDir = resolve(process.cwd(), 'docs/experiments/images-2026-05-14');
    mkdirSync(outDir, { recursive: true });
    const filePath = resolve(outDir, `${cfg.id}.png`);
    writeFileSync(filePath, Buffer.from(dataB64, 'base64'));
    return {
      modelId: cfg.id,
      label: cfg.label,
      imageUrl: `file://${filePath}`,
      latencyMs: Date.now() - t0,
      costEstimate: cfg.cost,
    };
  } catch (err) {
    return {
      modelId: cfg.id,
      label: cfg.label,
      imageUrl: null,
      latencyMs: Date.now() - t0,
      costEstimate: cfg.cost,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

interface JudgeScore {
  modelId: string;
  styleMatch: number;
  brandFit: number;
  noTextCompliance: number;
  subjectAccuracy: number;
  composite: number;
  reasoning: string;
}

async function judgeImages(results: RunResult[]): Promise<JudgeScore[]> {
  const judgeSystem = `Je bent een brand-image judge. Evalueer N gegenereerde images voor de brand ${BRAND_NAME}.

# Brand context
${VOICE_DESCRIPTION}
Brand colors: ${BRAND_COLORS}

# Brief
${BRIEFING}

# Per image, score 4 dimensies (0-100):
1. **styleMatch** — Is dit illustration-stijl (drawn / vector / illustrated)? 0=foto-realistisch, 100=duidelijk illustratie.
2. **brandFit** — Past kleur/sfeer bij Napking (warm, professional, NIET luxury)? Brand-colors zichtbaar? 0=mismatch, 100=perfect.
3. **noTextCompliance** — Hoeveel embedded tekst/captions/signage? 100=geen tekst, 50=enkele letters/woorden, 0=veel tekst.
4. **subjectAccuracy** — Toont het de gevraagde scene (restaurant-manager + keukenpersoneel)? 0=irrelevant, 100=exact.

Return ONE JSON: { "scores": [ { "modelId": "...", "styleMatch": N, "brandFit": N, "noTextCompliance": N, "subjectAccuracy": N, "reasoning": "1-2 zinnen waarom" }, ... ] }`;

  // Build user content with images
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userContent: any[] = [];
  for (const r of results.filter((r) => r.imageUrl)) {
    userContent.push({ type: 'text', text: `\n## Image ID="${r.modelId}" — ${r.label}\n` });
    if (r.imageUrl!.startsWith('file://')) {
      // Local file — read + send als base64
      const fs = await import('node:fs');
      const buf = fs.readFileSync(r.imageUrl!.replace('file://', ''));
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: buf.toString('base64') },
      });
    } else {
      userContent.push({ type: 'image', source: { type: 'url', url: r.imageUrl! } });
    }
  }
  userContent.push({
    type: 'text',
    text: '\nReturn ONE JSON object met scores array, één entry per modelID.',
  });

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
    console.error('Judge returned non-JSON:', text.slice(0, 500));
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed: any = JSON.parse(match[0]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (parsed.scores ?? []).map((s: any) => ({
    modelId: s.modelId,
    styleMatch: s.styleMatch ?? 0,
    brandFit: s.brandFit ?? 0,
    noTextCompliance: s.noTextCompliance ?? 0,
    subjectAccuracy: s.subjectAccuracy ?? 0,
    composite: Math.round(
      (s.styleMatch ?? 0) * 0.3 +
        (s.brandFit ?? 0) * 0.3 +
        (s.noTextCompliance ?? 0) * 0.2 +
        (s.subjectAccuracy ?? 0) * 0.2,
    ),
    reasoning: s.reasoning ?? '',
  }));
}

async function main() {
  console.log('=== Illustration models comparison — 2026-05-14 ===');
  console.log(`Brief: ${BRIEFING.slice(0, 100)}...\n`);

  const results: RunResult[] = [];
  for (const cfg of MODELS) {
    process.stdout.write(`[${cfg.id}] running... `);
    const r = cfg.provider === 'fal' ? await runFal(cfg) : await runGemini(cfg);
    results.push(r);
    if (r.error) {
      console.log(`ERROR: ${r.error.slice(0, 80)}`);
    } else {
      console.log(`OK (${(r.latencyMs / 1000).toFixed(1)}s) ${r.imageUrl}`);
    }
  }

  console.log('\n[judge] evaluating images...');
  const scores = await judgeImages(results);
  const scoreMap = new Map(scores.map((s) => [s.modelId, s]));

  console.log('\n=== Scores (composite = 30% style + 30% brandFit + 20% noText + 20% subject) ===');
  const sorted = [...results].sort(
    (a, b) => (scoreMap.get(b.modelId)?.composite ?? 0) - (scoreMap.get(a.modelId)?.composite ?? 0),
  );
  for (const r of sorted) {
    const s = scoreMap.get(r.modelId);
    if (!s) {
      console.log(`  ${r.label.padEnd(45)} no-score ${r.error ? '(' + r.error.slice(0, 40) + ')' : ''}`);
      continue;
    }
    console.log(
      `  ${r.label.padEnd(45)} composite=${s.composite}  (style ${s.styleMatch} / brand ${s.brandFit} / noText ${s.noTextCompliance} / subject ${s.subjectAccuracy})`,
    );
  }

  // Write report markdown
  const outDir = resolve(process.cwd(), 'docs/experiments');
  mkdirSync(outDir, { recursive: true });
  const lines: string[] = [];
  lines.push('# Illustration models comparison — 2026-05-14');
  lines.push('');
  lines.push('Vergelijk van 6 SOTA image-models op één illustration-brief (Napking restaurant-manager). Elk model gebruikt zijn eigen optimale config — niet generic.');
  lines.push('');
  lines.push('## Brief');
  lines.push(`${BRIEFING}`);
  lines.push('');
  lines.push('## Score-weging');
  lines.push('- styleMatch (30%) — illustration-stijl bereikt?');
  lines.push('- brandFit (30%) — Napking-look (warm/professional, brand-colors)');
  lines.push('- noTextCompliance (20%) — geen tekst in image');
  lines.push('- subjectAccuracy (20%) — depicts requested scene');
  lines.push('');
  lines.push('## Resultaat');
  lines.push('');
  lines.push('| Rank | Model | Composite | Style | Brand | NoText | Subject | Latency | Cost | URL |');
  lines.push('|------|-------|----------:|------:|------:|-------:|--------:|--------:|------|-----|');
  let rank = 1;
  for (const r of sorted) {
    const s = scoreMap.get(r.modelId);
    if (!s) {
      lines.push(`| ${rank++} | ${r.label} | — | — | — | — | — | ${(r.latencyMs / 1000).toFixed(1)}s | ${r.costEstimate} | ${r.error ? `ERROR: ${r.error.slice(0, 80)}` : 'no score'} |`);
      continue;
    }
    const urlCell = r.imageUrl ? `[link](${r.imageUrl})` : '—';
    lines.push(
      `| ${rank++} | ${r.label} | **${s.composite}** | ${s.styleMatch} | ${s.brandFit} | ${s.noTextCompliance} | ${s.subjectAccuracy} | ${(r.latencyMs / 1000).toFixed(1)}s | ${r.costEstimate} | ${urlCell} |`,
    );
  }
  lines.push('');
  lines.push('## Per-model judge-motivatie');
  lines.push('');
  for (const r of sorted) {
    const s = scoreMap.get(r.modelId);
    if (!s) continue;
    lines.push(`### ${r.label} (composite ${s.composite})`);
    lines.push(`- ${s.reasoning}`);
    lines.push('');
  }
  writeFileSync(resolve(outDir, '2026-05-14-illustration-models-report.md'), lines.join('\n'));
  writeFileSync(
    resolve(outDir, '2026-05-14-illustration-models-raw.json'),
    JSON.stringify({ results, scores }, null, 2),
  );
  console.log('\nReport: docs/experiments/2026-05-14-illustration-models-report.md');
}

main().catch(console.error);
