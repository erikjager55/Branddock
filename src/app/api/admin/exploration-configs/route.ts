import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { CANONICAL_BRAND_ASSETS } from '@/lib/constants/canonical-brand-assets';
import { FRAMEWORK_TO_SUBTYPE } from '@/lib/ai/exploration/constants';
import { getSystemDefault } from '@/lib/ai/exploration/config-resolver';

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
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const body = await request.json();

    const config = await prisma.explorationConfig.create({
      data: {
        workspaceId,
        itemType: body.itemType,
        itemSubType: body.itemSubType || null,
        label: body.label || null,
        provider: body.provider || 'anthropic',
        model: body.model || 'claude-sonnet-4-20250514',
        temperature: body.temperature ?? 0.4,
        maxTokens: body.maxTokens ?? 2048,
        systemPrompt: body.systemPrompt,
        dimensions: body.dimensions,
        feedbackPrompt: body.feedbackPrompt,
        reportPrompt: body.reportPrompt,
        fieldSuggestionsConfig: body.fieldSuggestionsConfig || null,
        contextSources: body.contextSources || [],
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/exploration-configs]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
