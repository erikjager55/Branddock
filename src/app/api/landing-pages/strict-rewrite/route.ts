import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { anthropicClient } from '@/lib/ai/anthropic-client';
import { buildAiErrorResponseInit } from '@/lib/ai/error-handler';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { withAi } from '@/lib/ai/middleware';
import { evaluatePageQualityForType } from '@/lib/landing-pages/page-quality';
import type { PuckLikeData } from '@/lib/landing-pages/puck-data-flatten';

/**
 * POST /api/landing-pages/strict-rewrite
 *
 * User-driven page-level rewrite (Phase 6). Same shape as auto-iterate
 * but with a user-supplied instruction in plain text — auto-iterate uses
 * a fixed "improve quality" prompt; strict-rewrite passes the user's
 * exact ask through ("Make it more formal" / "Shorten by 50%" / etc.).
 *
 * Body: { puckData, instruction, brandVoiceTone?, brandName?, contentType? }
 *
 * Returns: { status: 'proposal' | 'error', proposedPuckData, score-before, score-projected }
 * Proposal draagt additief `dimensions`/`dimensionsProjected` (B5) wanneer
 * het LP-dimensie-pad scoort — zodat de diff-modal later kan tonen WAAROM.
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
  /**
   * B5 — optioneel + backward-compatible: bij 'landing-page' scoren before/
   * projected op de 6 LP-dimensies i.p.v. de generieke heuristic. De enige
   * UI-caller (PuckPageBuilder.handlePromptRewrite) stuurt dit veld nog niet
   * mee; zonder veld valt de score op de generieke heuristic terug.
   */
  contentType?: string;
}

// L8 Zod-sweep (audit 2026-06-26, batch 4): puckData ging als vrije JSON de
// AI-rewrite in met alleen presence-checks; instruction-minimum (3 tekens na
// trim) blijft gelijk aan de oude handmatige guard.
const strictRewriteSchema = z.object({
  puckData: z
    .object({
      root: z.unknown().optional(),
      content: z.array(z.unknown()).max(500),
    })
    .passthrough(),
  instruction: z.string().trim().min(3).max(5000),
  brandVoiceTone: z.string().max(2000).nullish(),
  brandName: z.string().max(500).nullish(),
  // B5 additief — type-aware scoring-dispatch; onbekende waardes vallen in
  // evaluatePageQualityForType vanzelf op de generieke heuristic terug.
  contentType: z.string().max(100).optional(),
});

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

  const parsed = await parseJsonBody(request, strictRewriteSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as unknown as RequestBody;

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
    const projected = evaluatePageQualityForType(proposedTree, body.contentType ?? null);
    const before = evaluatePageQualityForType(body.puckData, body.contentType ?? null);

    return NextResponse.json({
      status: 'proposal',
      score: before.score,
      scoreProjected: projected.score,
      threshold: before.threshold,
      proposedPuckData: proposedTree,
      // B5 additief — alleen aanwezig op het LP-dimensie-pad (undefined valt
      // weg in JSON; bestaande consumers ongemoeid).
      dimensions: before.dimensions,
      dimensionsProjected: projected.dimensions,
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
