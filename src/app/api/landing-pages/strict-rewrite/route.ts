import { NextRequest, NextResponse } from 'next/server';
import { anthropicClient } from '@/lib/ai/anthropic-client';
import { buildAiErrorResponseInit } from '@/lib/ai/error-handler';
import { withAi } from '@/lib/ai/middleware';
import { evaluatePageQuality } from '@/lib/landing-pages/page-quality';
import type { PuckLikeData } from '@/lib/landing-pages/puck-data-flatten';

/**
 * POST /api/landing-pages/strict-rewrite
 *
 * User-driven page-level rewrite (Phase 6). Same shape as auto-iterate
 * but with a user-supplied instruction in plain text — auto-iterate uses
 * a fixed "improve quality" prompt; strict-rewrite passes the user's
 * exact ask through ("Make it more formal" / "Shorten by 50%" / etc.).
 *
 * Body: { puckData, instruction, brandVoiceTone?, brandName? }
 *
 * Returns: { status: 'proposal' | 'error', proposedPuckData, score-before, score-projected }
 *
 * Unlike auto-iterate this never skips — the user explicitly asked for
 * a rewrite, so we always call the AI even if the page is currently
 * passing the quality threshold.
 */

interface RequestBody {
  puckData: PuckLikeData;
  instruction: string;
  brandVoiceTone?: string | null;
  brandName?: string | null;
}

const SYSTEM_PROMPT = `You are a brand-aware copywriter executing a user-supplied rewrite instruction on a published landing-page (JSON Puck data-tree).

Apply the user's instruction to every text field in the tree. Keep the underlying meaning intact unless the instruction explicitly asks otherwise (e.g. "rewrite for a different audience"). Never invent new components. Never change component types or ids.

CRITICAL OUTPUT RULES:
- Respond with ONLY valid JSON, no prose, no markdown fences.
- Top-level shape: { "content": [...] } with the same length + ordering.
- Preserve every component's id, type, and non-text fields.`;

export async function POST(request: NextRequest) {
  // H6: was fully unauthenticated → ongeauth. billable LLM-abuse/DoS. Gate behind
  // auth + per-workspace rate-limit (security-audit 2026-06-26).
  const auth = await withAi(request, { skipBrandContext: true });
  if (auth instanceof Response) return auth;

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.puckData || !Array.isArray(body.puckData.content)) {
    return NextResponse.json({ error: 'puckData required' }, { status: 400 });
  }
  if (!body.instruction || body.instruction.trim().length < 3) {
    return NextResponse.json({ error: 'instruction must be at least 3 characters' }, { status: 400 });
  }

  const minimal = JSON.stringify({ content: body.puckData.content });
  const userPrompt = [
    body.brandName ? `Brand: ${body.brandName}` : '',
    body.brandVoiceTone ? `Tone of voice: ${body.brandVoiceTone}` : '',
    '',
    `User instruction: ${body.instruction}`,
    '',
    'Current page (JSON Puck tree):',
    minimal,
    '',
    'Return the rewritten tree as { "content": [...] }.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const result = await anthropicClient.createChatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { useCase: 'CHAT', temperature: 0.5, maxTokens: 2400 },
    );
    const parsed = parseJsonContent(result.content);
    if (!parsed || !Array.isArray((parsed as { content?: unknown }).content)) {
      return NextResponse.json(
        { error: 'AI response not parseable', raw: result.content.slice(0, 300) },
        { status: 502 },
      );
    }

    const proposedTree: PuckLikeData = {
      root: body.puckData.root,
      content: (parsed as { content: PuckLikeData['content'] }).content,
    };
    const projected = evaluatePageQuality(proposedTree);
    const before = evaluatePageQuality(body.puckData);

    return NextResponse.json({
      status: 'proposal',
      score: before.score,
      scoreProjected: projected.score,
      threshold: before.threshold,
      proposedPuckData: proposedTree,
      tokens: { input: result.inputTokens, output: result.outputTokens },
    });
  } catch (err) {
    const { body, status } = buildAiErrorResponseInit(err);
    return NextResponse.json({ status: 'error', ...body }, { status });
  }
}

function parseJsonContent(content: string): unknown {
  const stripped = content.trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}
