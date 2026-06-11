import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';
import { CANONICAL_BRAND_ASSETS } from '@/lib/constants/canonical-brand-assets';
import { FRAMEWORK_TO_SUBTYPE } from '@/lib/ai/exploration/constants';
import { getSystemDefault } from '@/lib/ai/exploration/config-resolver';
import { EXPLORATION_AI_MODELS } from '@/lib/ai/exploration/config.types';

// ─── Request validation ──────────────────────────────────────
// NOTE: schema building blocks are mirrored in ./[id]/route.ts — Next.js
// restricts route-module exports to HTTP handlers, so they cannot be shared.

// Largest seeded prompt is ~4.2k chars; 20k blocks accidental mega-blobs
// (which would degrade every exploration call) without constraining
// legitimate prompt growth.
const PROMPT_MAX_CHARS = 20_000;

const VALID_MODEL_IDS = EXPLORATION_AI_MODELS.map((m) => m.id);

const modelSchema = z.string().refine((v) => VALID_MODEL_IDS.includes(v), {
  message: `Unknown model. Valid models: ${VALID_MODEL_IDS.join(', ')}`,
});

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

const createConfigSchema = z.object({
  itemType: z.enum(['persona', 'brand_asset', 'product']),
  itemSubType: z.string().max(100).nullish(),
  label: z.string().max(200).nullish(),
  provider: z.enum(['anthropic', 'openai', 'google']).default('anthropic'),
  model: modelSchema.default('claude-sonnet-4-20250514'),
  temperature: z.number().min(0).max(1).default(0.4),
  maxTokens: z.number().int().min(1).max(32_000).default(2048),
  systemPrompt: z.string().min(1).max(PROMPT_MAX_CHARS),
  dimensions: z.array(dimensionSchema).max(50),
  feedbackPrompt: z.string().min(1).max(PROMPT_MAX_CHARS),
  reportPrompt: z.string().min(1).max(PROMPT_MAX_CHARS),
  fieldSuggestionsConfig: z.array(fieldSuggestionSchema).max(100).nullish(),
  contextSources: z.array(z.string().min(1).max(100)).max(20).default([]),
  isActive: z.boolean().default(true),
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

// ─── Expected configs ────────────────────────────────────────
// All canonical brand assets + persona base + product base

interface ExpectedConfig {
  itemType: string;
  itemSubType: string | null;
  label: string;
}

function getExpectedConfigs(): ExpectedConfig[] {
  const configs: ExpectedConfig[] = [];

  // All canonical brand asset subtypes
  for (const asset of CANONICAL_BRAND_ASSETS) {
    const subType = FRAMEWORK_TO_SUBTYPE[asset.frameworkType] ?? asset.slug;
    configs.push({
      itemType: 'brand_asset',
      itemSubType: subType,
      label: asset.name,
    });
  }

  // Persona base config
  configs.push({ itemType: 'persona', itemSubType: null, label: 'Persona Exploration' });

  // Product base config
  configs.push({ itemType: 'product', itemSubType: null, label: 'Product Exploration' });

  return configs;
}

// ─── GET ─────────────────────────────────────────────────────

export async function GET() {
  try {
    if (!(await requireDeveloper())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    // Fetch existing configs
    let configs = await prisma.explorationConfig.findMany({
      where: { workspaceId },
      orderBy: [{ itemType: 'asc' }, { itemSubType: 'asc' }],
      include: {
        _count: { select: { knowledgeItems: true } },
      },
    });

    // Auto-provision missing configs (lazy initialization)
    const existingKeys = new Set(
      configs.map((c) => `${c.itemType}::${c.itemSubType ?? ''}`),
    );

    const expected = getExpectedConfigs();
    const missing = expected.filter(
      (e) => !existingKeys.has(`${e.itemType}::${e.itemSubType ?? ''}`),
    );

    if (missing.length > 0) {
      await prisma.explorationConfig.createMany({
        data: missing.map((m) => {
          const defaults = getSystemDefault(m.itemType, m.itemSubType);
          return {
            workspaceId,
            itemType: m.itemType,
            itemSubType: m.itemSubType,
            label: m.label,
            provider: defaults.provider,
            model: defaults.model,
            temperature: defaults.temperature,
            maxTokens: defaults.maxTokens,
            systemPrompt: defaults.systemPrompt,
            dimensions: JSON.parse(JSON.stringify(defaults.dimensions)),
            feedbackPrompt: defaults.feedbackPrompt,
            reportPrompt: defaults.reportPrompt,
            fieldSuggestionsConfig: defaults.fieldSuggestionsConfig
              ? JSON.parse(JSON.stringify(defaults.fieldSuggestionsConfig))
              : Prisma.JsonNull,
            contextSources: defaults.contextSources,
            isActive: true,
          };
        }),
        skipDuplicates: true,
      });

      // Re-fetch for consistent ordering + _count includes
      configs = await prisma.explorationConfig.findMany({
        where: { workspaceId },
        orderBy: [{ itemType: 'asc' }, { itemSubType: 'asc' }],
        include: {
          _count: { select: { knowledgeItems: true } },
        },
      });

      console.log(`[exploration-configs] Auto-provisioned ${missing.length} missing configs for workspace ${workspaceId}`);
    }

    return NextResponse.json({ configs });
  } catch (error) {
    console.error('[GET /api/admin/exploration-configs]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    if (!(await requireDeveloper())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = createConfigSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const input = parsed.data;

    const mismatch = providerModelMismatch(input.provider, input.model);
    if (mismatch) {
      return NextResponse.json(
        { error: 'Validation failed', details: { fieldErrors: { model: [mismatch] } } },
        { status: 400 },
      );
    }

    const config = await prisma.explorationConfig.create({
      data: {
        workspaceId,
        itemType: input.itemType,
        itemSubType: input.itemSubType || null,
        label: input.label || null,
        provider: input.provider,
        model: input.model,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        systemPrompt: input.systemPrompt,
        dimensions: input.dimensions,
        feedbackPrompt: input.feedbackPrompt,
        reportPrompt: input.reportPrompt,
        // Plain `null` is invalid for Prisma Json columns — use JsonNull
        // (same pattern as the auto-provision branch in GET above).
        fieldSuggestionsConfig: input.fieldSuggestionsConfig ?? Prisma.JsonNull,
        contextSources: input.contextSources,
        isActive: input.isActive,
      },
    });

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/exploration-configs]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
