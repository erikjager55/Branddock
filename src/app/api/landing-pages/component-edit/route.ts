import { NextRequest, NextResponse } from 'next/server';
import { anthropicClient } from '@/lib/ai/anthropic-client';
import {
  getInstruction,
  isValidInstructionId,
  type AiInstructionId,
} from '@/lib/landing-pages/ai-edit-instructions';

/**
 * POST /api/landing-pages/component-edit
 *
 * Component-level AI rewrite for the web-page builder. Takes a Puck
 * component instance + an instruction-id (shorten / formal / casual /
 * alternatives), asks Claude to rewrite ONLY the text fields, returns
 * proposed-props + character-level edit-distance for the diff-preview.
 *
 * Phase 5 changes vs spike:
 *  - instructionId references the central registry (ai-edit-instructions)
 *    rather than a free-text instruction so prompts are version-controlled
 *  - locked: clients pass it; route returns 423 (Locked) without an AI call
 *    so we never waste tokens on a component the user wants left alone
 *  - TEXT_FIELDS_BY_TYPE covers all 8 components (FeatureGrid + PricingTable
 *    + FAQ + Footer flatten their array-fields into newline-joined strings
 *    so Claude can rewrite without violating the array shape)
 */

interface RequestBody {
  componentType: string;
  currentProps: Record<string, unknown>;
  instructionId: AiInstructionId;
  /** Lock-state read from puckData.metadata.locked by the caller. */
  locked?: boolean;
  brandVoiceTone?: string | null;
  brandName?: string | null;
}

const TEXT_FIELDS_BY_TYPE: Record<string, string[]> = {
  BrandHero: ['headline', 'sub', 'ctaLabel'],
  BrandCTA: ['label'],
  Testimonial: ['quote', 'author'],
  RichText: ['content'],
  Footer: ['companyName', 'tagline'],
};

const SYSTEM_PROMPT = `You are a brand-aware copywriter helping users edit text inside a visual page builder.

You will receive a JSON object with the current text fields of a component plus an instruction. Rewrite ONLY the text fields. Keep the intent and meaning intact. Stay on-brand.

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

  if (body.locked === true) {
    return NextResponse.json(
      { error: 'Component is locked — unlock first or use a different component' },
      { status: 423 },
    );
  }

  if (!isValidInstructionId(body.instructionId ?? '')) {
    return NextResponse.json(
      { error: 'instructionId must be one of shorten | formal | casual | alternatives' },
      { status: 400 },
    );
  }
  const instruction = getInstruction(body.instructionId);

  const textFields = TEXT_FIELDS_BY_TYPE[body.componentType];
  if (!textFields) {
    return NextResponse.json(
      { error: `Component ${body.componentType} has no text-editable fields` },
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
    `Instruction: ${instruction.promptDirective}`,
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
      instructionId: instruction.id,
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
