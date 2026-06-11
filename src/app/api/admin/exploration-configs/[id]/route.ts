import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';
import { emitLearningEvent, hashContent } from '@/lib/learning-loop';
import { EXPLORATION_AI_MODELS } from '@/lib/ai/exploration/config.types';

// ─── Request validation ──────────────────────────────────────
// NOTE: schema building blocks are mirrored in ../route.ts — Next.js
// restricts route-module exports to HTTP handlers, so they cannot be shared.

// Largest seeded prompt is ~4.2k chars; 20k blocks accidental mega-blobs
// (which would degrade every exploration call) without constraining
// legitimate prompt growth.
const PROMPT_MAX_CHARS = 20_000;

const VALID_MODEL_IDS = EXPLORATION_AI_MODELS.map((m) => m.id);

const dimensionSchema = z.object({
  key: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  icon: z.string().max(100),
  question: z.string().min(1).max(2000),
  followUpHint: z.string().max(2000).optional(),
});

const fieldSuggestionSchema = z.object({
  field: z.string().min(1).max(200),
  label: z.string().min(1).max(200),
  type: z.enum(['text', 'select', 'array']),
  options: z.array(z.string().max(200)).max(50).optional(),
  extractionHint: z.string().max(2000),
});

// All fields optional: PUT has always behaved as a partial update
// (absent fields keep their stored value).
const updateConfigSchema = z.object({
  itemType: z.enum(['persona', 'brand_asset', 'product']).optional(),
  itemSubType: z.string().max(100).nullish(),
  label: z.string().max(200).nullish(),
  provider: z.enum(['anthropic', 'openai', 'google']).optional(),
  // No whitelist refine here: the admin UI re-sends the stored object
  // wholesale on every save, so a strict schema would lock configs whose
  // model id has since left EXPLORATION_AI_MODELS (model deprecation).
  // The whitelist is enforced route-level, only when the value CHANGES.
  model: z.string().min(1).max(200).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(1).max(32_000).optional(),
  systemPrompt: z.string().min(1).max(PROMPT_MAX_CHARS).optional(),
  dimensions: z.array(dimensionSchema).max(50).optional(),
  feedbackPrompt: z.string().min(1).max(PROMPT_MAX_CHARS).optional(),
  reportPrompt: z.string().min(1).max(PROMPT_MAX_CHARS).optional(),
  fieldSuggestionsConfig: z.array(fieldSuggestionSchema).max(100).nullish(),
  contextSources: z.array(z.string().min(1).max(100)).max(20).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Returns a field error when the model belongs to a different provider —
 * such a mismatch would otherwise only surface as an AI-call failure at
 * exploration time. Lenient for model values outside the known list.
 */
function providerModelMismatch(provider: string, model: string): string | null {
  const entry = EXPLORATION_AI_MODELS.find((m) => m.id === model);
  if (entry && entry.provider !== provider) {
    return `Model '${model}' belongs to provider '${entry.provider}', not '${provider}'`;
  }
  return null;
}

// GET single config
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await requireDeveloper())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const { id } = await params;
    const config = await prisma.explorationConfig.findFirst({
      where: { id, workspaceId },
    });

    if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ config });
  } catch (error) {
    console.error('[GET /api/admin/exploration-configs/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update config
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await requireDeveloper())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const { id } = await params;
    const rawBody: unknown = await request.json().catch(() => null);

    // Verify ownership
    const existing = await prisma.explorationConfig.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const parsed = updateConfigSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const input = parsed.data;

    // Whitelist only on actual model CHANGE — an unchanged legacy value
    // must keep saving (see updateConfigSchema comment).
    if (input.model !== undefined && input.model !== existing.model && !VALID_MODEL_IDS.includes(input.model)) {
      return NextResponse.json(
        { error: 'Validation failed', details: { fieldErrors: { model: [`Unknown model. Valid models: ${VALID_MODEL_IDS.join(', ')}`] } } },
        { status: 400 },
      );
    }

    // Validate the provider/model pairing that will be stored after merge
    const mismatch = providerModelMismatch(
      input.provider ?? existing.provider,
      input.model ?? existing.model,
    );
    if (mismatch) {
      return NextResponse.json(
        { error: 'Validation failed', details: { fieldErrors: { model: [mismatch] } } },
        { status: 400 },
      );
    }

    const config = await prisma.explorationConfig.update({
      where: { id },
      data: {
        itemType: input.itemType ?? existing.itemType,
        itemSubType: input.itemSubType !== undefined ? (input.itemSubType || null) : existing.itemSubType,
        label: input.label,
        provider: input.provider,
        model: input.model,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        systemPrompt: input.systemPrompt,
        dimensions: input.dimensions,
        feedbackPrompt: input.feedbackPrompt,
        reportPrompt: input.reportPrompt,
        // Plain `null` is invalid for Prisma Json columns — use JsonNull;
        // undefined keeps the stored value (partial update).
        fieldSuggestionsConfig: input.fieldSuggestionsConfig === null
          ? Prisma.JsonNull
          : input.fieldSuggestionsConfig,
        contextSources: input.contextSources,
        isActive: input.isActive,
      },
    });

    // Learning Loop event emission (cat 9) — track prompt-content changes via hash
    const previousContentHash = hashContent({
      systemPrompt: existing.systemPrompt,
      feedbackPrompt: existing.feedbackPrompt,
      reportPrompt: existing.reportPrompt,
      dimensions: existing.dimensions,
    });
    const newContentHash = hashContent({
      systemPrompt: config.systemPrompt,
      feedbackPrompt: config.feedbackPrompt,
      reportPrompt: config.reportPrompt,
      dimensions: config.dimensions,
    });
    if (previousContentHash !== newContentHash) {
      const session = await getServerSession();
      void emitLearningEvent({
        workspaceId,
        userId: session?.user?.id ?? null,
        payload: {
          type: 'config.exploration_updated',
          data: {
            configId: config.id,
            itemType: config.itemType,
            itemSubType: config.itemSubType ?? undefined,
            previousContentHash,
            newContentHash,
          },
        },
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A configuration already exists for this item type and sub type combination' },
        { status: 409 },
      );
    }
    console.error('[PUT /api/admin/exploration-configs/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE config
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await requireDeveloper())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.explorationConfig.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.explorationConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/exploration-configs/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
