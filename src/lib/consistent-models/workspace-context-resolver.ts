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
          logoVariations: true,
          logoGuidelines: true,
          logoDonts: true,
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

  // Build logo context — only injected when the user explicitly asks for logo/brand name
  if (styleguide) {
    const logoParts: string[] = [];
    if (ctx.brandName) logoParts.push(`Brand name: "${ctx.brandName}".`);
    if (styleguide.logoVariations) {
      const variations = styleguide.logoVariations as Record<string, unknown>;
      const desc = variations.description ?? variations.primary ?? variations.summary;
      if (typeof desc === 'string') logoParts.push(`Logo: ${desc}.`);
    }
    if (styleguide.logoGuidelines?.length) {
      logoParts.push(`Logo guidelines: ${styleguide.logoGuidelines.join('. ')}.`);
    }
    if (styleguide.logoDonts?.length) {
      logoParts.push(`Logo don'ts: ${styleguide.logoDonts.join('. ')}.`);
    }
    if (ctx.brandColors?.length) {
      const primary = ctx.brandColors[0];
      logoParts.push(`Primary brand color: ${primary.name} (${primary.hex}).`);
    }
    if (logoParts.length > 0) {
      ctx.logoContext = logoParts.join(' ');
    }
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

  // Short summary line — used as a suffix in image generation prompts.
  // IMPORTANT: Only include VISUAL style directions. Do NOT include brand
  // name, product names, personas, or competitor names — image models
  // interpret all text as visual instructions and will render them as
  // text-on-clothing, signage, etc.
  const summaryParts: string[] = [];
  summaryParts.push('Style direction (do NOT render any text, logos, or brand names in the image):');
  if (ctx.brandColors?.length) {
    const colorHints = ctx.brandColors.map((c) => `${c.name} (${c.hex})`).join(', ');
    summaryParts.push(`Color palette: ${colorHints}.`);
  }
  if (ctx.moodKeywords?.length) {
    summaryParts.push(`Mood: ${ctx.moodKeywords.join(', ')}.`);
  }
  if (ctx.brandImageryStyle) summaryParts.push(`Photography: ${ctx.brandImageryStyle}`);
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
