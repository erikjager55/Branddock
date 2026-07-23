// =============================================================
// rewrite_on_brand — ephemeral on-brand herschrijf/antwoord-primitief
// (P3.2 Fase C, ADR 2026-07-17-public-brand-api; ook de motor onder de
// latere browser-extensie P3.7).
//
// Bewust GEEN Deliverable: een herschreven mail of alinea hoort niet in de
// content-library. Wel credits (vlakke 1 credit per rewrite — kalibratie-
// punt) en metadata-usage-logging bij de callers. Prompt-opbouw hergebruikt
// de bestaande brand-context-serialisatie; model per-workspace via de
// feature-registry ('rewrite-on-brand').
// =============================================================

import { prisma } from '@/lib/prisma';
import { getBrandContext } from '@/lib/ai/brand-context';
import { formatBrandContext } from '@/lib/ai/prompt-templates';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import { createStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';

export interface RewriteOnBrandInput {
  workspaceId: string;
  /** De tekst om te herschrijven, of (bij intent 'reply') het bericht om te beantwoorden. */
  content: string;
  /** 'rewrite' (default): herschrijf on-brand · 'reply': schrijf een on-brand antwoord. */
  intent?: 'rewrite' | 'reply';
  /** Vrije sturing ("korter", "formeler", "benadruk duurzaamheid"). */
  instruction?: string;
  /** Doelgroep-scoping — zelfde semantiek als de kennis-toggles. */
  personaIds?: string[];
  productIds?: string[];
}

export type RewriteOnBrandResult =
  | { ok: true; text: string; model: string }
  | { ok: false; code: 'CONTENT_TOO_SHORT' | 'CONTEXT_IDS_INVALID' | 'GENERATION_FAILED'; error: string };

const MIN_CONTENT_CHARS = 20;
const MAX_CONTENT_CHARS = 20_000;

async function buildAudienceSection(
  workspaceId: string,
  personaIds: string[],
  productIds: string[],
): Promise<string> {
  const [personas, products] = await Promise.all([
    personaIds.length
      ? prisma.persona.findMany({
          where: { id: { in: personaIds }, workspaceId },
          select: { id: true, name: true, tagline: true, occupation: true },
        })
      : [],
    productIds.length
      ? prisma.product.findMany({
          where: { id: { in: productIds }, workspaceId },
          select: { id: true, name: true, description: true },
        })
      : [],
  ]);
  const missing = [
    ...personaIds.filter((id) => !personas.some((p) => p.id === id)),
    ...productIds.filter((id) => !products.some((p) => p.id === id)),
  ];
  if (missing.length > 0) {
    throw Object.assign(new Error(`Unknown context ids for this workspace: ${missing.join(', ')}`), {
      code: 'CONTEXT_IDS_INVALID' as const,
    });
  }
  const parts: string[] = [];
  if (personas.length > 0) {
    parts.push(
      `TARGET AUDIENCE:\n${personas
        .map((p) => `- ${p.name}${p.tagline ? ` — ${p.tagline}` : ''}${p.occupation ? ` (${p.occupation})` : ''}`)
        .join('\n')}`,
    );
  }
  if (products.length > 0) {
    parts.push(`RELEVANT PRODUCTS:\n${products.map((p) => `- ${p.name}: ${p.description ?? ''}`).join('\n')}`);
  }
  return parts.join('\n\n');
}

/**
 * Herschrijft of beantwoordt tekst in de merkstem, zonder iets te persisteren.
 * Vlakke 1-credit-afboeking bij succes (post-hoc, fail-soft).
 */
export async function rewriteOnBrand(input: RewriteOnBrandInput): Promise<RewriteOnBrandResult> {
  const content = input.content.trim();
  if (content.length < MIN_CONTENT_CHARS) {
    return { ok: false, code: 'CONTENT_TOO_SHORT', error: `content needs at least ${MIN_CONTENT_CHARS} characters` };
  }
  const capped = content.slice(0, MAX_CONTENT_CHARS);
  const intent = input.intent ?? 'rewrite';

  try {
    const [brandCtx, model, audience] = await Promise.all([
      getBrandContext(input.workspaceId),
      resolveFeatureModel(input.workspaceId, 'rewrite-on-brand'),
      buildAudienceSection(input.workspaceId, input.personaIds ?? [], input.productIds ?? []),
    ]);

    const task =
      intent === 'reply'
        ? 'Write an on-brand REPLY to the message below. Match the language of the input message.'
        : 'Rewrite the text below fully on-brand. Keep the meaning and language of the input; change tone, wording and structure where needed.';
    const systemPrompt = [
      'You are the brand voice engine of this workspace. Output ONLY the rewritten/reply text — no preamble, no explanations, no markdown fences.',
      formatBrandContext(brandCtx),
      audience,
    ]
      .filter(Boolean)
      .join('\n\n---\n\n');
    const userPrompt = [
      task,
      input.instruction ? `Extra instruction from the user: ${input.instruction}` : null,
      `INPUT:\n"""\n${capped}\n"""`,
      'Return JSON: { "text": "<the result>" }',
    ]
      .filter(Boolean)
      .join('\n\n');

    const result = await createStructuredCompletion<{ text: string }>(
      model.provider,
      model.model,
      systemPrompt,
      userPrompt,
      { timeoutMs: 120_000, maxTokens: 4000 },
      {
        workspaceId: input.workspaceId,
        // Ephemeral — geen eigen entiteit; workspace is het dichtstbijzijnde anker.
        parentEntityType: 'Workspace',
        parentEntityId: input.workspaceId,
        sourceIdentifier: 'src/lib/content/rewrite-on-brand.ts:rewriteOnBrand',
      },
    );
    const text = typeof result === 'object' && result !== null && typeof (result as { text?: unknown }).text === 'string'
      ? (result as { text: string }).text.trim()
      : '';
    if (!text) {
      return { ok: false, code: 'GENERATION_FAILED', error: 'Model returned no usable text' };
    }

    // Vlakke 1 credit per rewrite (± top-up-prijs van één actie) — kalibratie-
    // punt zodra echte volumes er zijn. Ephemeral → geen idempotency-anker.
    await chargeAfter(
      { workspaceId: input.workspaceId, action: 'short', feature: 'rewrite-on-brand' },
      { actualCredits: 1 },
    ).catch(() => {});

    return { ok: true, text, model: `${model.provider}/${model.model}` };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'CONTEXT_IDS_INVALID') {
      return { ok: false, code: 'CONTEXT_IDS_INVALID', error: 'One or more context IDs are invalid' };
    }
    console.warn('[rewrite-on-brand] failed', {
      workspaceId: input.workspaceId,
      message: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, code: 'GENERATION_FAILED', error: 'Rewrite failed' };
  }
}
