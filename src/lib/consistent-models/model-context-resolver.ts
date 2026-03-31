// =============================================================
// Model Context Resolver
//
// Resolves relevant brand context for a ConsistentModel based
// on its type. Called at model creation time to snapshot brand
// knowledge into the model's brandContext JSON field.
// =============================================================

import { prisma } from '@/lib/prisma';
import type { ConsistentModelType } from '@prisma/client';
import type { ModelBrandContext } from '@/features/consistent-models/types/consistent-model.types';

// ─── Per-type context mapping ────────────────────────────────

interface ContextNeeds {
  brandColors: boolean;
  brandFonts: boolean;
  brandPersonality: boolean;
  toneOfVoice: boolean;
  brandImageryStyle: boolean;
  brandDesignLanguage: boolean;
  personas: boolean;
  products: boolean;
  competitors: boolean;
  trends: boolean;
  moodKeywords: boolean;
}

const CONTEXT_MAP: Record<ConsistentModelType, ContextNeeds> = {
  PERSON: {
    brandColors: true, brandFonts: true, brandPersonality: true,
    toneOfVoice: false, brandImageryStyle: false, brandDesignLanguage: false,
    personas: true, products: false, competitors: false, trends: false, moodKeywords: false,
  },
  PRODUCT: {
    brandColors: true, brandFonts: false, brandPersonality: false,
    toneOfVoice: false, brandImageryStyle: false, brandDesignLanguage: false,
    personas: false, products: true, competitors: true, trends: false, moodKeywords: false,
  },
  STYLE: {
    brandColors: true, brandFonts: true, brandPersonality: true,
    toneOfVoice: true, brandImageryStyle: true, brandDesignLanguage: true,
    personas: false, products: false, competitors: false, trends: true, moodKeywords: true,
  },
  OBJECT: {
    brandColors: true, brandFonts: false, brandPersonality: false,
    toneOfVoice: false, brandImageryStyle: false, brandDesignLanguage: false,
    personas: false, products: true, competitors: false, trends: false, moodKeywords: false,
  },
  BRAND_STYLE: {
    brandColors: true, brandFonts: true, brandPersonality: true,
    toneOfVoice: true, brandImageryStyle: true, brandDesignLanguage: true,
    personas: false, products: false, competitors: true, trends: true, moodKeywords: true,
  },
  PHOTOGRAPHY: {
    brandColors: true, brandFonts: false, brandPersonality: false,
    toneOfVoice: false, brandImageryStyle: true, brandDesignLanguage: false,
    personas: true, products: false, competitors: false, trends: false, moodKeywords: true,
  },
  ILLUSTRATION: {
    brandColors: true, brandFonts: false, brandPersonality: false,
    toneOfVoice: false, brandImageryStyle: true, brandDesignLanguage: true,
    personas: false, products: false, competitors: false, trends: true, moodKeywords: true,
  },
  VOICE: {
    brandColors: false, brandFonts: false, brandPersonality: true,
    toneOfVoice: true, brandImageryStyle: false, brandDesignLanguage: false,
    personas: true, products: false, competitors: false, trends: false, moodKeywords: false,
  },
  SOUND_EFFECT: {
    brandColors: false, brandFonts: false, brandPersonality: true,
    toneOfVoice: false, brandImageryStyle: false, brandDesignLanguage: false,
    personas: false, products: false, competitors: false, trends: false, moodKeywords: true,
  },
};

// ─── Resolver ────────────────────────────────────────────────

/** Resolve brand context for a model type. Returns null if workspace has no data. */
export async function resolveModelBrandContext(
  workspaceId: string,
  modelType: ConsistentModelType
): Promise<ModelBrandContext | null> {
  const needs = CONTEXT_MAP[modelType];

  // Determine which queries to run based on needs
  const [workspace, styleguide, personas, products, competitors, trends, personalityAsset] =
    await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      }),

      // Styleguide — colors, fonts, imagery, design language
      (needs.brandColors || needs.brandFonts || needs.brandImageryStyle || needs.brandDesignLanguage || needs.toneOfVoice)
        ? prisma.brandStyleguide.findFirst({
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
          })
        : null,

      // Personas
      needs.personas
        ? prisma.persona.findMany({
            where: { workspaceId },
            select: { name: true, occupation: true, tagline: true },
            orderBy: { updatedAt: 'desc' },
            take: 5,
          })
        : [],

      // Products
      needs.products
        ? prisma.product.findMany({
            where: { workspaceId },
            select: { name: true, category: true, description: true },
            orderBy: { updatedAt: 'desc' },
            take: 10,
          })
        : [],

      // Competitors
      needs.competitors
        ? prisma.competitor.findMany({
            where: { workspaceId, status: 'ANALYZED' },
            select: { name: true, valueProposition: true },
            orderBy: { updatedAt: 'desc' },
            take: 5,
          })
        : [],

      // Trends
      needs.trends
        ? prisma.detectedTrend.findMany({
            where: { workspaceId, isActivated: true },
            select: { title: true, description: true },
            orderBy: { relevanceScore: 'desc' },
            take: 5,
          })
        : [],

      // Brand Personality asset (for brandPersonality + mood)
      (needs.brandPersonality || needs.moodKeywords)
        ? prisma.brandAsset.findFirst({
            where: { workspaceId, slug: 'brand-personality' },
            select: { frameworkData: true },
          })
        : null,
    ]);

  if (!workspace) return null;

  // ─── Build context object ──────────────────────────────────

  const ctx: ModelBrandContext = {
    type: modelType,
    resolvedAt: new Date().toISOString(),
    contextSummary: '', // built at the end
    brandName: workspace.name ?? undefined,
  };

  // Colors
  if (needs.brandColors && styleguide?.colors?.length) {
    ctx.brandColors = styleguide.colors.map((c) => ({ name: c.name, hex: c.hex }));
  }

  // Fonts
  if (needs.brandFonts && styleguide?.primaryFontName) {
    ctx.brandFonts = [styleguide.primaryFontName];
  }

  // Imagery style
  if (needs.brandImageryStyle && styleguide) {
    const parts: string[] = [];
    if (styleguide.photographyStyle) parts.push(typeof styleguide.photographyStyle === 'string' ? styleguide.photographyStyle : JSON.stringify(styleguide.photographyStyle));
    if (styleguide.photographyGuidelines?.length) parts.push(styleguide.photographyGuidelines.join('. '));
    if (parts.length) ctx.brandImageryStyle = parts.join('. ');
  }

  // Design language (savedForAi is a boolean flag — no content string available at this level)
  if (needs.brandDesignLanguage && styleguide?.designLanguageSavedForAi) {
    ctx.brandDesignLanguage = 'Design language saved for AI context';
  }

  // Tone of voice (savedForAi is a boolean flag — no content string available at this level)
  if (needs.toneOfVoice && styleguide?.toneSavedForAi) {
    ctx.toneOfVoice = 'Tone of voice saved for AI context';
  }

  // Brand personality (from brand-personality asset frameworkData)
  if (needs.brandPersonality && personalityAsset?.frameworkData) {
    const fw = personalityAsset.frameworkData as Record<string, unknown>;
    const parts: string[] = [];
    if (fw.primaryDimension && typeof fw.primaryDimension === 'string') {
      parts.push(`Primary: ${fw.primaryDimension}`);
    }
    if (fw.secondaryDimension && typeof fw.secondaryDimension === 'string') {
      parts.push(`Secondary: ${fw.secondaryDimension}`);
    }
    if (fw.brandVoiceDescription && typeof fw.brandVoiceDescription === 'string') {
      parts.push(fw.brandVoiceDescription);
    }
    if (parts.length) ctx.brandPersonality = parts.join('. ');
  }

  // Mood keywords (from personality traits)
  if (needs.moodKeywords && personalityAsset?.frameworkData) {
    const fw = personalityAsset.frameworkData as Record<string, unknown>;
    if (Array.isArray(fw.personalityTraits)) {
      const traits = (fw.personalityTraits as Array<{ trait?: string }>)
        .map((t) => t?.trait)
        .filter((t): t is string => typeof t === 'string');
      if (traits.length) ctx.moodKeywords = traits;
    }
  }

  // Personas
  if (needs.personas && personas.length > 0) {
    ctx.targetPersonas = personas.map((p) => ({
      name: p.name,
      description: [p.occupation, p.tagline].filter(Boolean).join(' — '),
    }));
  }

  // Products
  if (needs.products && products.length > 0) {
    ctx.productInfo = products.map((p) => ({
      name: p.name,
      description: p.description ?? p.category ?? '',
    }));
  }

  // Competitors
  if (needs.competitors && competitors.length > 0) {
    ctx.competitors = competitors.map((c) => ({
      name: c.name,
      notes: c.valueProposition ?? '',
    }));
  }

  // Trends
  if (needs.trends && trends.length > 0) {
    ctx.trendInsights = trends.map((t) => ({
      title: t.title,
      summary: t.description ?? '',
    }));
  }

  // ─── Build contextSummary ──────────────────────────────────

  ctx.contextSummary = buildContextSummary(ctx);

  return ctx;
}

// ─── Summary builder ─────────────────────────────────────────

function buildContextSummary(ctx: ModelBrandContext): string {
  const parts: string[] = [];

  if (ctx.brandName) {
    parts.push(`Brand: ${ctx.brandName}.`);
  }

  if (ctx.brandColors?.length) {
    const colorNames = ctx.brandColors.map((c) => `${c.name} (${c.hex})`).join(', ');
    parts.push(`Brand colors: ${colorNames}.`);
  }

  if (ctx.brandFonts?.length) {
    parts.push(`Fonts: ${ctx.brandFonts.join(', ')}.`);
  }

  if (ctx.brandPersonality) {
    parts.push(`Personality: ${ctx.brandPersonality}`);
  }

  if (ctx.toneOfVoice) {
    parts.push(`Tone: ${ctx.toneOfVoice}`);
  }

  if (ctx.brandImageryStyle) {
    parts.push(`Imagery: ${ctx.brandImageryStyle}`);
  }

  if (ctx.brandDesignLanguage) {
    parts.push(`Design language: ${ctx.brandDesignLanguage}`);
  }

  if (ctx.targetPersonas?.length) {
    const names = ctx.targetPersonas.map((p) => p.name).join(', ');
    parts.push(`Target personas: ${names}.`);
  }

  if (ctx.productInfo?.length) {
    const names = ctx.productInfo.map((p) => p.name).join(', ');
    parts.push(`Products: ${names}.`);
  }

  if (ctx.competitors?.length) {
    const names = ctx.competitors.map((c) => c.name).join(', ');
    parts.push(`Competitors: ${names}.`);
  }

  if (ctx.trendInsights?.length) {
    const titles = ctx.trendInsights.map((t) => t.title).join(', ');
    parts.push(`Trends: ${titles}.`);
  }

  if (ctx.moodKeywords?.length) {
    parts.push(`Mood: ${ctx.moodKeywords.join(', ')}.`);
  }

  return parts.join(' ');
}
