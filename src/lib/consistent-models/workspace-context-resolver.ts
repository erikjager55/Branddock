// =============================================================
// Workspace Brand Context Resolver
//
// Resolves a superset of brand context for the current workspace,
// independent of any specific ConsistentModel. Used by the AI
// Studio image generator to pre-fill brand tags and inject brand
// context into generation prompts.
// =============================================================

import { prisma } from '@/lib/prisma';
import type { ModelBrandContext } from '@/features/consistent-models/types/consistent-model.types';
import { extractBrandTags } from '@/lib/consistent-models/reference-prompt-builder';

/**
 * Resolve the full brand context for a workspace.
 * Fetches colors, fonts, personality, tone, imagery, design language,
 * personas, products, competitors, and active trends in parallel.
 * Returns null when the workspace is unknown.
 */
export async function resolveWorkspaceBrandContext(
  workspaceId: string,
): Promise<ModelBrandContext | null> {
  const [workspace, styleguide, personas, products, competitors, trends, personalityAsset] =
    await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      }),
      prisma.brandStyleguide.findFirst({
        where: { workspaceId },
        select: {
          colors: { select: { name: true, hex: true } },
          primaryFontName: true,
          photographyStyle: true,
          photographyGuidelines: true,
          designLanguageSavedForAi: true,
          toneSavedForAi: true,
          imagerySavedForAi: true,
        },
      }),
      prisma.persona.findMany({
        where: { workspaceId },
        select: { name: true, occupation: true, tagline: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.product.findMany({
        where: { workspaceId },
        select: { name: true, category: true, description: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      prisma.competitor.findMany({
        where: { workspaceId, status: 'ANALYZED' },
        select: { name: true, valueProposition: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.detectedTrend.findMany({
        where: { workspaceId, isActivated: true },
        select: { title: true, description: true },
        orderBy: { relevanceScore: 'desc' },
        take: 5,
      }),
      prisma.brandAsset.findFirst({
        where: { workspaceId, slug: 'brand-personality' },
        select: { frameworkData: true },
      }),
    ]);

  if (!workspace) return null;

  const ctx: ModelBrandContext = {
    type: 'BRAND_STYLE', // workspace-level context uses the richest type marker
    resolvedAt: new Date().toISOString(),
    contextSummary: '',
    brandName: workspace.name ?? undefined,
  };

  if (styleguide?.colors?.length) {
    ctx.brandColors = styleguide.colors.map((c) => ({ name: c.name, hex: c.hex }));
  }
  if (styleguide?.primaryFontName) {
    ctx.brandFonts = [styleguide.primaryFontName];
  }
  if (styleguide) {
    const parts: string[] = [];
    if (styleguide.photographyStyle) {
      parts.push(
        typeof styleguide.photographyStyle === 'string'
          ? styleguide.photographyStyle
          : JSON.stringify(styleguide.photographyStyle),
      );
    }
    if (styleguide.photographyGuidelines?.length) {
      parts.push(styleguide.photographyGuidelines.join('. '));
    }
    if (parts.length) ctx.brandImageryStyle = parts.join('. ');
  }
  if (styleguide?.designLanguageSavedForAi) {
    ctx.brandDesignLanguage = 'Design language saved for AI context';
  }
  if (styleguide?.toneSavedForAi) {
    ctx.toneOfVoice = 'Tone of voice saved for AI context';
  }

  if (personalityAsset?.frameworkData) {
    const fw = personalityAsset.frameworkData as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof fw.primaryDimension === 'string') parts.push(`Primary: ${fw.primaryDimension}`);
    if (typeof fw.secondaryDimension === 'string') parts.push(`Secondary: ${fw.secondaryDimension}`);
    if (typeof fw.brandVoiceDescription === 'string') parts.push(fw.brandVoiceDescription);
    if (parts.length) ctx.brandPersonality = parts.join('. ');

    if (Array.isArray(fw.personalityTraits)) {
      const traits = (fw.personalityTraits as Array<{ trait?: string }>)
        .map((t) => t?.trait)
        .filter((t): t is string => typeof t === 'string');
      if (traits.length) ctx.moodKeywords = traits;
    }
  }

  if (personas.length > 0) {
    ctx.targetPersonas = personas.map((p) => ({
      name: p.name,
      description: [p.occupation, p.tagline].filter(Boolean).join(' — '),
    }));
  }
  if (products.length > 0) {
    ctx.productInfo = products.map((p) => ({
      name: p.name,
      description: p.description ?? p.category ?? '',
    }));
  }
  if (competitors.length > 0) {
    ctx.competitors = competitors.map((c) => ({
      name: c.name,
      notes: c.valueProposition ?? '',
    }));
  }
  if (trends.length > 0) {
    ctx.trendInsights = trends.map((t) => ({
      title: t.title,
      summary: t.description ?? '',
    }));
  }

  // Short summary line — used as a suffix in generation prompts.
  const summaryParts: string[] = [];
  if (ctx.brandName) summaryParts.push(`Brand: ${ctx.brandName}.`);
  if (ctx.brandColors?.length) {
    summaryParts.push(
      `Brand colors: ${ctx.brandColors.map((c) => `${c.name} (${c.hex})`).join(', ')}.`,
    );
  }
  if (ctx.brandPersonality) summaryParts.push(`Personality: ${ctx.brandPersonality}`);
  if (ctx.brandImageryStyle) summaryParts.push(`Imagery: ${ctx.brandImageryStyle}`);
  ctx.contextSummary = summaryParts.join(' ');

  return ctx;
}

/** Response shape for the workspace brand context API. */
export interface WorkspaceBrandContextResponse {
  tags: string[];
  summary: string;
  brandName: string | null;
}

/** Build the public API response from a resolved context. */
export function toBrandContextResponse(
  ctx: ModelBrandContext | null,
): WorkspaceBrandContextResponse {
  if (!ctx) return { tags: [], summary: '', brandName: null };
  return {
    tags: extractBrandTags(ctx),
    summary: ctx.contextSummary ?? '',
    brandName: ctx.brandName ?? null,
  };
}
