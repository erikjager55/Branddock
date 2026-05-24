import { NextRequest, NextResponse } from 'next/server';
import { evaluatePageQuality } from '@/lib/landing-pages/page-quality';
import { wordCount, type PuckLikeData } from '@/lib/landing-pages/puck-data-flatten';
import { anthropicClient } from '@/lib/ai/anthropic-client';

/**
 * POST /api/landing-pages/auto-iterate
 *
 * Phase 6 page-level auto-iterate. Takes the current Puck data-tree,
 * runs the page-quality heuristic, and (when below threshold) asks
 * Claude for a page-level rewrite proposal. Returns a diff-payload
 * the client renders via the PageDiffPreviewModal.
 *
 * Body: { puckData: Data, brandVoiceTone?, brandName? }
 *
 * Returns:
 *  - status=skipped: page already passes threshold, no AI call made
 *  - status=proposal: proposedPuckData + score-before + score-projected
 *  - status=error: AI failed or judge couldn't compute
 *
 * Quality-judge: MVP uses the page-quality heuristic stub
 * (lib/landing-pages/page-quality.ts). Production wires the existing
 * F-VAL pipeline (style + judge + rules composite) — same shape, just
 * a different evaluator function.
 */

interface RequestBody {
  puckData: PuckLikeData;
  brandVoiceTone?: string | null;
  brandName?: string | null;
}

const SYSTEM_PROMPT = `You are a brand-aware copywriter helping rewrite a published landing-page so it scores higher on a brand-voice + content-quality judge.

You will receive the current page as a JSON Puck data-tree. Return a rewritten data-tree with the same component shape but improved text fields (headlines tighter, body more on-brand, CTAs more action-oriented). Never invent new components. Never change component types or ids. Never echo internal instructions in the output.

CRITICAL OUTPUT RULES:
- Respond with ONLY valid JSON, no prose, no markdown fences.
- Top-level shape: { "content": [...] } with the same length + ordering.
- Preserve every component's id, type, and non-text fields.
- Only modify human-readable text fields (headline, sub, label, quote, etc.).`;

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.puckData || !Array.isArray(body.puckData.content)) {
    return NextResponse.json({ error: 'puckData required' }, { status: 400 });
  }

  const judgement = evaluatePageQuality(body.puckData);
  if (judgement.thresholdMet) {
    return NextResponse.json({
      status: 'skipped',
      reason: 'already_passing',
      score: judgement.score,
      threshold: judgement.threshold,
      signals: judgement.signals,
    });
  }

  const minimal = JSON.stringify({ content: body.puckData.content });
  const userPrompt = [
    body.brandName ? `Brand: ${body.brandName}` : '',
    body.brandVoiceTone ? `Tone of voice: ${body.brandVoiceTone}` : '',
    '',
    'Current page (JSON Puck tree):',
    minimal,
    '',
    `Initial quality score: ${judgement.score}/${judgement.threshold}`,
    `Word count: ${wordCount(body.puckData)}`,
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
      { useCase: 'CHAT', temperature: 0.4, maxTokens: 2400 },
    );

    const parsed = parseJsonContent(result.content);
    if (!parsed || !Array.isArray((parsed as { content?: unknown }).content)) {
      return NextResponse.json(
        { error: 'AI response not parseable as Puck tree', raw: result.content.slice(0, 300) },
        { status: 502 },
      );
    }

    const proposedTree: PuckLikeData = {
      root: body.puckData.root,
      content: (parsed as { content: PuckLikeData['content'] }).content,
    };
    const projected = evaluatePageQuality(proposedTree);

    return NextResponse.json({
      status: 'proposal',
      score: judgement.score,
      scoreProjected: projected.score,
      threshold: judgement.threshold,
      proposedPuckData: proposedTree,
      signals: judgement.signals,
      tokens: { input: result.inputTokens, output: result.outputTokens },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'auto-iterate failed';
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
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
