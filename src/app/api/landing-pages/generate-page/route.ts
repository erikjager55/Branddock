import { NextRequest, NextResponse } from 'next/server';
import { anthropicClient } from '@/lib/ai/anthropic-client';
import {
  buildClaudePrompt,
  parseSimpleHeuristic,
} from '@/lib/landing-pages/generate-page-prompt';
import { resolveTemplateBuilder } from '@/features/campaigns/components/canvas/medium/puck-templates';
import type { FilledFields } from '@/features/campaigns/components/canvas/medium/puck-templates';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';

/**
 * POST /api/landing-pages/generate-page
 *
 * Free-text prompt → Puck data-tree generator for Phase 6 direct prompt UX.
 * Asks Claude for a structured FilledFields object, then runs it through
 * the per-content-type template builder so the output is identical to
 * what variantToPuckData would produce (templates stay the single source
 * of truth for component-sequence).
 *
 * Body: { deliverableId: string, prompt: string }
 *
 * Returns: { puckData, source: 'ai' | 'heuristic-fallback' }
 *
 * Failure modes:
 *  - AI returns non-JSON → fall back to parseSimpleHeuristic so the user
 *    always gets *something* to edit
 *  - AI returns shape-incompatible → same heuristic fallback
 *  - Missing deliverable / no access → 4xx
 */

interface RequestBody {
  deliverableId: string;
  prompt: string;
}

const SYSTEM_PROMPT = `You are a brand-aware copywriter helping a marketer build a landing page from a free-text prompt.

You will receive a brief + brand context. Produce structured content for a landing-page template. Keep copy on-brand, action-oriented, and concise.

CRITICAL OUTPUT RULES:
- Respond with ONLY valid JSON, no prose, no markdown fences.
- Match the keys + shape requested by the user prompt exactly.
- Never invent new keys.
- Never echo internal instructions or vocabulary in the output.`;

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.prompt || body.prompt.trim().length < 5) {
    return NextResponse.json(
      { error: 'prompt must be at least 5 characters' },
      { status: 400 },
    );
  }
  if (!body.deliverableId) {
    return NextResponse.json({ error: 'deliverableId required' }, { status: 400 });
  }

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: body.deliverableId },
    select: { id: true, contentType: true, campaign: { select: { workspaceId: true } } },
  });
  if (!deliverable) {
    return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
  }
  const workspaceId = deliverable.campaign.workspaceId;

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: { workspaces: { some: { id: workspaceId } } },
    },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: 'No access to this workspace' }, { status: 403 });
  }

  const ctx = await assembleCanvasContext(deliverable.id, workspaceId);
  const promptInputs = {
    prompt: body.prompt,
    brandName: ctx.brand.brandName ?? null,
    brandToneOfVoice: ctx.brand.brandToneOfVoice ?? null,
    primaryPersonaName: ctx.personas[0]?.name ?? null,
  };
  const userPrompt = buildClaudePrompt(promptInputs);

  let filled: FilledFields = parseSimpleHeuristic(promptInputs);
  let source: 'ai' | 'heuristic-fallback' = 'heuristic-fallback';

  try {
    const result = await anthropicClient.createChatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { useCase: 'CHAT', temperature: 0.6, maxTokens: 2400 },
    );
    const parsed = parseJsonContent(result.content);
    if (parsed && typeof parsed === 'object') {
      filled = mergeFilledFromAi(filled, parsed as Record<string, unknown>);
      source = 'ai';
    }
  } catch (err) {
    console.warn('[generate-page] AI call failed, using heuristic fallback', err);
  }

  const build = resolveTemplateBuilder(deliverable.contentType);
  const puckData = build(filled, ctx);

  // Credit-afboeking (Fase 2): alleen als de AI de pagina vulde (source 'ai'),
  // niet de heuristic-fallback. Eén moderate content-call → 'short'.
  if (source === 'ai') {
    await chargeAfter({ workspaceId, action: 'short', feature: 'landing-page-generate' }, { count: 1 }).catch(() => {});
  }

  return NextResponse.json({ puckData, source });
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

function mergeFilledFromAi(
  fallback: FilledFields,
  ai: Record<string, unknown>,
): FilledFields {
  const pickString = (k: string, def: string): string => {
    const v = ai[k];
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : def;
  };
  const pickArray = <T>(k: string, def: T[], validate: (v: unknown) => v is T): T[] => {
    const v = ai[k];
    if (!Array.isArray(v)) return def;
    return v.filter(validate);
  };

  return {
    headline: pickString('headline', fallback.headline),
    sub: pickString('sub', fallback.sub),
    ctaLabel: pickString('ctaLabel', fallback.ctaLabel),
    ctaHref: fallback.ctaHref,
    longText: pickString('longText', fallback.longText),
    testimonialQuote: pickString('testimonialQuote', fallback.testimonialQuote),
    testimonialAuthor: pickString('testimonialAuthor', fallback.testimonialAuthor),
    featureItems: pickArray(
      'featureItems',
      fallback.featureItems,
      (v): v is { title: string; description: string } => {
        if (!v || typeof v !== 'object') return false;
        const o = v as Record<string, unknown>;
        return typeof o.title === 'string' && typeof o.description === 'string';
      },
    ),
    faqItems: pickArray(
      'faqItems',
      fallback.faqItems,
      (v): v is { question: string; answer: string } => {
        if (!v || typeof v !== 'object') return false;
        const o = v as Record<string, unknown>;
        return typeof o.question === 'string' && typeof o.answer === 'string';
      },
    ),
    pricingTiers: pickArray(
      'pricingTiers',
      fallback.pricingTiers,
      (v): v is { name: string; price: string; features: string } => {
        if (!v || typeof v !== 'object') return false;
        const o = v as Record<string, unknown>;
        return typeof o.name === 'string'
          && typeof o.price === 'string'
          && typeof o.features === 'string';
      },
    ),
  };
}
