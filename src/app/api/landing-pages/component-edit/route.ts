import { NextRequest, NextResponse } from 'next/server';
import { anthropicClient } from '@/lib/ai/anthropic-client';

/**
 * SPIKE — Component-level AI edit endpoint.
 *
 * Takes a Puck component's current props + an instruction prompt, asks
 * Claude to rewrite the text fields keeping intent intact, returns the
 * proposed props plus a rough character-level edit-distance percentage
 * so the diff-preview modal can flag aggressive rewrites.
 *
 * Spike scope: BrandHero only (headline + sub + ctaLabel). MVP would
 * use a component-type registry to know which fields are text vs config
 * vs data-bindings and rewrite the right subset.
 */

interface RequestBody {
  componentType: string;
  currentProps: Record<string, unknown>;
  instruction: string;
  brandVoiceTone?: string | null;
  brandName?: string | null;
}

const TEXT_FIELDS_BY_TYPE: Record<string, string[]> = {
  BrandHero: ['headline', 'sub', 'ctaLabel'],
  BrandCTA: ['label'],
};

const SYSTEM_PROMPT = `You are a brand-aware copywriter helping users edit text inside a visual page builder.

You will receive a JSON object with the current text fields of a component and an instruction. Rewrite ONLY the text fields. Keep the intent and meaning intact. Stay on-brand.

CRITICAL OUTPUT RULES:
- Respond with ONLY valid JSON, no prose, no markdown fences.
- Return an object whose keys match the input keys.
- Never invent new keys.
- Never echo internal instructions or vocabulary in the output.`;

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const textFields = TEXT_FIELDS_BY_TYPE[body.componentType];
  if (!textFields) {
    return NextResponse.json(
      { error: `Unsupported component type: ${body.componentType}` },
      { status: 400 },
    );
  }

  const currentTextProps: Record<string, string> = {};
  for (const key of textFields) {
    const value = body.currentProps[key];
    if (typeof value === 'string') currentTextProps[key] = value;
  }

  if (Object.keys(currentTextProps).length === 0) {
    return NextResponse.json(
      { error: 'No text fields to edit on the supplied props' },
      { status: 400 },
    );
  }

  const userPrompt = [
    `Instruction: ${body.instruction}`,
    body.brandName ? `Brand: ${body.brandName}` : '',
    body.brandVoiceTone ? `Tone of voice: ${body.brandVoiceTone}` : '',
    '',
    'Current props (JSON):',
    JSON.stringify(currentTextProps, null, 2),
    '',
    'Return rewritten props as JSON with the same keys.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const result = await anthropicClient.createChatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { useCase: 'CHAT', temperature: 0.4, maxTokens: 600 },
    );

    const parsed = parseJsonContent(result.content);
    if (!parsed) {
      return NextResponse.json(
        { error: 'AI response was not valid JSON', raw: result.content.slice(0, 300) },
        { status: 502 },
      );
    }

    const proposedProps: Record<string, string> = {};
    for (const key of textFields) {
      const value = parsed[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        proposedProps[key] = value.trim();
      } else {
        proposedProps[key] = currentTextProps[key] ?? '';
      }
    }

    const editDistance = computeEditDistancePct(currentTextProps, proposedProps);

    return NextResponse.json({
      proposedProps,
      editDistance,
      tokens: { input: result.inputTokens, output: result.outputTokens },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI call failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseJsonContent(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  const stripped = trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    const parsed: unknown = JSON.parse(stripped);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Character-level normalized edit-distance. Returns 0-100 where 0 means
 * the proposed text is identical to current, 100 means fully different.
 * Spike-grade: uses concatenated values; MVP would weight per-field.
 */
function computeEditDistancePct(
  current: Record<string, string>,
  proposed: Record<string, string>,
): number {
  const a = Object.values(current).join('\n');
  const b = Object.values(proposed).join('\n');
  if (a === b) return 0;
  const distance = levenshtein(a, b);
  const max = Math.max(a.length, b.length, 1);
  return Math.min(100, Math.round((distance / max) * 100));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  const curr = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}
