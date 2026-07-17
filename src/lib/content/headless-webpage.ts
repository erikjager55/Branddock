// =============================================================
// Headless web-page-generatie (P3.2 Fase D3, ADR 2026-07-17).
//
// De kern van /api/landing-pages/generate-page (free-text prompt → Claude
// FilledFields → per-type template-builder → Puck-tree) als herbruikbare
// service. Twee afnemers: de bestaande sessie-route (die de kern nu
// importeert i.p.v. dupliceert) en de publieke API/MCP. De headless variant
// persisteert de puckData zelf op deliverable.settings (de UI-route laat
// dat aan de client) — anders is het resultaat onvindbaar voor de
// library/publish-flow (gotcha 2026-06-24: twee ketens, één waarheid).
// =============================================================

import { prisma } from '@/lib/prisma';
import { anthropicClient } from '@/lib/ai/anthropic-client';
import { buildClaudePrompt, parseSimpleHeuristic } from '@/lib/landing-pages/generate-page-prompt';
import { resolveTemplateBuilder } from '@/features/campaigns/components/canvas/medium/puck-templates';
import type { FilledFields } from '@/features/campaigns/components/canvas/medium/puck-templates';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { isPuckWebpageType } from '@/lib/landing-pages/webpage-types';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import {
  createAndGenerateDeliverable,
  type ContextSelection,
} from '@/lib/content/headless-create';

export const WEBPAGE_SYSTEM_PROMPT = `You are a brand-aware copywriter helping a marketer build a landing page from a free-text prompt.

You will receive a brief + brand context. Produce structured content for a landing-page template. Keep copy on-brand, action-oriented, and concise.

CRITICAL OUTPUT RULES:
- Respond with ONLY valid JSON, no prose, no markdown fences.
- Match the keys + shape requested by the user prompt exactly.
- Never invent new keys.
- Never echo internal instructions or vocabulary in the output.`;

export interface PuckPageCoreResult {
  puckData: unknown;
  source: 'ai' | 'heuristic-fallback';
}

/**
 * De generatie-kern: context assembleren, Claude vragen om FilledFields,
 * fail-soft mergen over de heuristic-fallback, en door de per-type
 * template-builder halen. Persisteert en betaalt zélf niets — dat is aan
 * de aanroeper (UI-route vs headless service verschillen daar bewust).
 */
export async function generatePuckPageCore(
  deliverableId: string,
  workspaceId: string,
  contentType: string,
  prompt: string,
): Promise<PuckPageCoreResult> {
  const ctx = await assembleCanvasContext(deliverableId, workspaceId);
  const promptInputs = {
    prompt,
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
        { role: 'system', content: WEBPAGE_SYSTEM_PROMPT },
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
    console.warn('[headless-webpage] AI call failed, using heuristic fallback', err);
  }

  const build = resolveTemplateBuilder(contentType);
  return { puckData: build(filled, ctx), source };
}

export interface GenerateWebPageInput {
  workspaceId: string;
  /** Bestaande web-page-deliverable; zonder wordt er een aangemaakt. */
  deliverableId?: string;
  /** PUCK-web-page-type (landing-page/product-page/faq-page/comparison-page/microsite). Default landing-page. */
  contentType?: string;
  title?: string;
  campaignId?: string;
  contextSelection?: ContextSelection;
  /** Free-text prompt/brief voor de pagina (min 5 tekens). */
  prompt: string;
}

export type GenerateWebPageResult =
  | { ok: true; deliverableId: string; campaignId: string; source: 'ai' | 'heuristic-fallback'; puckData: unknown }
  | { ok: false; code: 'PROMPT_TOO_SHORT' | 'TYPE_NOT_WEBPAGE' | 'DELIVERABLE_NOT_FOUND' | 'CREATE_FAILED'; error: string };

/**
 * Headless web-page: (optioneel) deliverable aanmaken, pagina genereren en
 * de puckData persisteren op settings — direct zichtbaar/publiceerbaar in
 * de UI. Vlakke 'short'-charge alleen bij een échte AI-vulling.
 */
export async function generateWebPage(input: GenerateWebPageInput): Promise<GenerateWebPageResult> {
  if (input.prompt.trim().length < 5) {
    return { ok: false, code: 'PROMPT_TOO_SHORT', error: 'prompt must be at least 5 characters' };
  }

  let deliverableId: string;
  let campaignId: string;
  let contentType: string;
  if (input.deliverableId) {
    const row = await prisma.deliverable.findFirst({
      where: { id: input.deliverableId, campaign: { workspaceId: input.workspaceId } },
      select: { id: true, contentType: true, campaignId: true },
    });
    if (!row) return { ok: false, code: 'DELIVERABLE_NOT_FOUND', error: 'Deliverable not found in this workspace' };
    if (!isPuckWebpageType(row.contentType)) {
      return { ok: false, code: 'TYPE_NOT_WEBPAGE', error: `"${row.contentType}" is geen web-page-type` };
    }
    deliverableId = row.id;
    campaignId = row.campaignId;
    contentType = row.contentType;
  } else {
    contentType = input.contentType ?? 'landing-page';
    if (!isPuckWebpageType(contentType)) {
      return { ok: false, code: 'TYPE_NOT_WEBPAGE', error: `"${contentType}" is geen web-page-type` };
    }
    const created = await createAndGenerateDeliverable({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      contentType,
      title: input.title ?? input.prompt.slice(0, 60),
      brief: { objective: input.prompt.slice(0, 300) },
      contextSelection: input.contextSelection,
      generate: false,
    });
    if (!created.ok) return { ok: false, code: 'CREATE_FAILED', error: `${created.code}: ${created.error}` };
    deliverableId = created.deliverableId;
    campaignId = created.campaignId;
  }

  const { puckData, source } = await generatePuckPageCore(
    deliverableId,
    input.workspaceId,
    contentType,
    input.prompt,
  );

  // Persist — spread over bestaande settings (patroon regenerate-puck-data).
  const existing = await prisma.deliverable.findUnique({ where: { id: deliverableId }, select: { settings: true } });
  const settings = (existing?.settings ?? {}) as Record<string, unknown>;
  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: { settings: { ...settings, puckData, puckRegeneratedAt: new Date().toISOString() } },
  });
  invalidateCache(cacheKeys.prefixes.studio(input.workspaceId));
  invalidateCache(cacheKeys.prefixes.campaigns(input.workspaceId));

  if (source === 'ai') {
    await chargeAfter(
      { workspaceId: input.workspaceId, action: 'short', feature: 'webpage-generate', idempotencyKey: `webpage:${deliverableId}:${Date.now()}` },
      { count: 1 },
    ).catch(() => {});
  }

  return { ok: true, deliverableId, campaignId, source, puckData };
}

function parseJsonContent(content: string): unknown {
  const stripped = content
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

function mergeFilledFromAi(fallback: FilledFields, ai: Record<string, unknown>): FilledFields {
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
        return typeof o.name === 'string' && typeof o.price === 'string' && typeof o.features === 'string';
      },
    ),
  };
}
