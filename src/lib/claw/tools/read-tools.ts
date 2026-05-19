import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { ClawToolDefinition, ToolExecutionContext } from '../claw.types';
import {
  getAssetCompletenessFields,
  getAssetCompletenessPercentage,
} from '@/lib/brand-asset-completeness';

// ─── Helpers for inspect_current_entity ──────────────────────

const PREVIEW_MAX_CHARS = 200;

type FieldPreview = {
  label: string;
  key: string;
  value: string | null;
  isEmpty: boolean;
};

function preview(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    if (!val.trim()) return null;
    return val.length > PREVIEW_MAX_CHARS ? val.slice(0, PREVIEW_MAX_CHARS) + '…' : val;
  }
  if (Array.isArray(val)) {
    const filtered = val.filter((v) => v !== null && v !== undefined && v !== '');
    if (filtered.length === 0) return null;
    const joined = filtered.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ');
    return joined.length > PREVIEW_MAX_CHARS ? joined.slice(0, PREVIEW_MAX_CHARS) + '…' : joined;
  }
  if (typeof val === 'object') {
    const json = JSON.stringify(val);
    if (json === '{}' || json === '[]') return null;
    return json.length > PREVIEW_MAX_CHARS ? json.slice(0, PREVIEW_MAX_CHARS) + '…' : json;
  }
  const str = String(val);
  return str || null;
}

function field(label: string, key: string, val: unknown): FieldPreview {
  const p = preview(val);
  return { label, key, value: p, isEmpty: p === null };
}

function completenessFromFields(fields: FieldPreview[]): number {
  if (fields.length === 0) return 0;
  const filled = fields.filter((f) => !f.isEmpty).length;
  return Math.round((filled / fields.length) * 100);
}

/**
 * READ tools — fetch data from the workspace.
 * No confirmation needed. Results are returned to Claude as context.
 */
export const readTools: ClawToolDefinition[] = [
  // ─── Current Page Inspection ─────────────────────────────
  {
    name: 'inspect_current_entity',
    description:
      'Inspect the entity the user is currently viewing on the page. Returns the current value of each field (truncated preview) with an isEmpty marker, plus an overall completenessPercentage. ' +
      'Use this BEFORE proposing field updates, so you know which fields are empty and what the existing content looks like. ' +
      'Works for the entity types shown in the Current Page context: brand_asset, persona, product, competitor, deliverable.',
    inputSchema: z.object({
      entityType: z.enum(['brand_asset', 'persona', 'product', 'competitor', 'deliverable'])
        .describe('The entity type from the Current Page context.'),
      entityId: z.string().describe('The entity ID from the Current Page context.'),
    }),
    requiresConfirmation: false,
    category: 'read',
    execute: async (params, ctx: ToolExecutionContext) => {
      const p = params as {
        entityType: 'brand_asset' | 'persona' | 'product' | 'competitor' | 'deliverable';
        entityId: string;
      };

      switch (p.entityType) {
        case 'brand_asset': {
          const asset = await prisma.brandAsset.findFirst({
            where: { id: p.entityId, workspaceId: ctx.workspaceId },
            select: {
              id: true, name: true, slug: true, description: true,
              frameworkType: true, frameworkData: true, content: true,
              status: true, isLocked: true,
            },
          });
          if (!asset) return { error: 'Brand asset not found in this workspace' };

          // Reuse the canonical completeness helper so the AI sees the same
          // fields + labels as the UI's Completeness card.
          const completenessFields = getAssetCompletenessFields({
            description: asset.description ?? '',
            frameworkType: asset.frameworkType,
            frameworkData: asset.frameworkData,
          });
          const completenessPercentage = getAssetCompletenessPercentage({
            description: asset.description ?? '',
            frameworkType: asset.frameworkType,
            frameworkData: asset.frameworkData,
          });

          // Extract per-field previews from framework data
          let fd: Record<string, unknown> = {};
          if (asset.frameworkData) {
            try {
              fd = typeof asset.frameworkData === 'string'
                ? JSON.parse(asset.frameworkData)
                : asset.frameworkData as Record<string, unknown>;
            } catch { /* malformed — treat as empty */ }
          }

          const descriptionPreview = preview(asset.description);
          const contentPreview = preview(asset.content);
          return {
            entityType: 'brand_asset',
            id: asset.id,
            name: asset.name,
            slug: asset.slug,
            frameworkType: asset.frameworkType,
            status: asset.status,
            isLocked: asset.isLocked,
            completenessPercentage,
            description: { value: descriptionPreview, isEmpty: descriptionPreview === null },
            content: { value: contentPreview, isEmpty: contentPreview === null },
            // Flat list with label + filled status (matches UI)
            completenessFields,
            // Raw framework data preview per top-level key (truncated)
            frameworkDataPreview: Object.fromEntries(
              Object.entries(fd).map(([k, v]) => [k, preview(v)])
            ),
            tip: 'Use update_asset_content for the content field, update_asset_framework for framework fields. Reference fields by key from completenessFields or frameworkDataPreview.',
          };
        }

        case 'persona': {
          const persona = await prisma.persona.findFirst({
            where: { id: p.entityId, workspaceId: ctx.workspaceId },
          });
          if (!persona) return { error: 'Persona not found in this workspace' };

          const fields: FieldPreview[] = [
            field('Age', 'age', persona.age),
            field('Gender', 'gender', persona.gender),
            field('Location', 'location', persona.location),
            field('Occupation', 'occupation', persona.occupation),
            field('Education', 'education', persona.education),
            field('Income', 'income', persona.income),
            field('Family Status', 'familyStatus', persona.familyStatus),
            field('Personality Type', 'personalityType', persona.personalityType),
            field('Core Values', 'coreValues', persona.coreValues),
            field('Interests', 'interests', persona.interests),
            field('Goals', 'goals', persona.goals),
            field('Motivations', 'motivations', persona.motivations),
            field('Frustrations', 'frustrations', persona.frustrations),
            field('Behaviors', 'behaviors', persona.behaviors),
            field('Strategic Implications', 'strategicImplications', persona.strategicImplications),
            field('Preferred Channels', 'preferredChannels', persona.preferredChannels),
            field('Tech Stack', 'techStack', persona.techStack),
            field('Quote', 'quote', persona.quote),
            field('Bio', 'bio', persona.bio),
            field('Buying Triggers', 'buyingTriggers', persona.buyingTriggers),
            field('Decision Criteria', 'decisionCriteria', persona.decisionCriteria),
          ];

          return {
            entityType: 'persona',
            id: persona.id,
            name: persona.name,
            tagline: persona.tagline,
            isLocked: persona.isLocked,
            completenessPercentage: completenessFromFields(fields),
            fields,
            tip: 'Use update_persona to fill empty fields. Pass only the field keys you want to change.',
          };
        }

        case 'product': {
          const product = await prisma.product.findFirst({
            where: { id: p.entityId, workspaceId: ctx.workspaceId },
          });
          if (!product) return { error: 'Product not found in this workspace' };

          const fields: FieldPreview[] = [
            field('Description', 'description', product.description),
            field('Category', 'category', product.category),
            field('Pricing Model', 'pricingModel', product.pricingModel),
            field('Pricing Details', 'pricingDetails', product.pricingDetails),
            field('Features', 'features', product.features),
            field('Benefits', 'benefits', product.benefits),
            field('Use Cases', 'useCases', product.useCases),
          ];

          return {
            entityType: 'product',
            id: product.id,
            name: product.name,
            slug: product.slug,
            status: product.status,
            source: product.source,
            isLocked: product.isLocked,
            completenessPercentage: completenessFromFields(fields),
            fields,
            tip: 'Use update_product to fill empty fields.',
          };
        }

        case 'competitor': {
          const comp = await prisma.competitor.findFirst({
            where: { id: p.entityId, workspaceId: ctx.workspaceId },
          });
          if (!comp) return { error: 'Competitor not found in this workspace' };

          const fields: FieldPreview[] = [
            field('Description', 'description', comp.description),
            field('Tagline', 'tagline', comp.tagline),
            field('Headquarters', 'headquarters', comp.headquarters),
            field('Employee Range', 'employeeRange', comp.employeeRange),
            field('Value Proposition', 'valueProposition', comp.valueProposition),
            field('Target Audience', 'targetAudience', comp.targetAudience),
            field('Differentiators', 'differentiators', comp.differentiators),
            field('Main Offerings', 'mainOfferings', comp.mainOfferings),
            field('Pricing Model', 'pricingModel', comp.pricingModel),
            field('Pricing Details', 'pricingDetails', comp.pricingDetails),
            field('Tone of Voice', 'toneOfVoice', comp.toneOfVoice),
            field('Messaging Themes', 'messagingThemes', comp.messagingThemes),
            field('Visual Style Notes', 'visualStyleNotes', comp.visualStyleNotes),
            field('Strengths', 'strengths', comp.strengths),
            field('Weaknesses', 'weaknesses', comp.weaknesses),
          ];

          return {
            entityType: 'competitor',
            id: comp.id,
            name: comp.name,
            tier: comp.tier,
            competitiveScore: comp.competitiveScore,
            isLocked: comp.isLocked,
            completenessPercentage: completenessFromFields(fields),
            fields,
            tip: 'Use update_competitor to fill empty fields.',
          };
        }

        case 'deliverable': {
          // Surfaces Step 1 Content Brief fields (settings.brief.*) plus
          // type-specific contentTypeInputs so Claw can fill them via
          // update_deliverable_brief / update_deliverable_content_inputs.
          const deliverable = await prisma.deliverable.findFirst({
            where: { id: p.entityId },
            include: { campaign: { select: { workspaceId: true, title: true } } },
          });
          if (!deliverable || deliverable.campaign.workspaceId !== ctx.workspaceId) {
            return { error: 'Deliverable not found in this workspace' };
          }

          const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
          const brief = (settings.brief ?? {}) as Record<string, unknown>;
          const contentTypeInputs = (settings.contentTypeInputs ?? {}) as Record<string, unknown>;
          const visualBrief = (settings.visualBrief ?? null) as Record<string, unknown> | null;

          // Brief fields are the four canonical Step 1 textareas.
          const briefFields: FieldPreview[] = [
            field('Objective', 'objective', brief.objective as string | null | undefined),
            field('Key message', 'keyMessage', brief.keyMessage as string | null | undefined),
            field('Tone direction', 'toneDirection', brief.toneDirection as string | null | undefined),
            field('Call to action', 'callToAction', brief.callToAction as string | null | undefined),
          ];

          // Content-type inputs are dynamic per content type — surface what
          // the user has filled in so far so Claw can spot gaps. Filter to
          // keys that actually exist in the current registry so Claw doesn't
          // see (and try to update) stale keys from previous schemas.
          const { getContentTypeInputs } = await import('@/features/campaigns/lib/content-type-inputs');
          const validKeys = new Set(
            getContentTypeInputs(deliverable.contentType).map((f) => f.key),
          );
          const contentTypeInputPreviews: Record<string, ReturnType<typeof preview>> = {};
          for (const [k, v] of Object.entries(contentTypeInputs)) {
            if (validKeys.has(k)) contentTypeInputPreviews[k] = preview(v);
          }
          // List the still-empty registry keys so Claw can see what to fill.
          const availableContentTypeKeys: string[] = [];
          for (const k of validKeys) {
            if (!(k in contentTypeInputPreviews)) availableContentTypeKeys.push(k);
          }

          // Visual Brief — strategic visual direction (source + style chip).
          // Lives in settings.visualBrief; updated via update_deliverable_visual_brief.
          const visualBriefPreview = visualBrief
            ? {
                source: (visualBrief.source ?? 'generate') as string,
                styleDirection: (visualBrief.styleDirection ?? null) as string | null,
                styleDirectionFreeText: (visualBrief.styleDirectionFreeText ?? null) as string | null,
              }
            : { source: 'generate', styleDirection: null, styleDirectionFreeText: null };

          return {
            entityType: 'deliverable',
            id: deliverable.id,
            title: deliverable.title,
            contentType: deliverable.contentType,
            campaignTitle: deliverable.campaign.title,
            approvalStatus: deliverable.approvalStatus,
            completenessPercentage: completenessFromFields(briefFields),
            briefFields,
            contentTypeInputs: contentTypeInputPreviews,
            availableContentTypeKeys,
            visualBrief: visualBriefPreview,
            visualBriefValidStyles: [
              'lifestyle', 'product-shot', 'quote-text', 'behind-the-scenes',
              'ugc', 'infographic', 'illustration', 'data-driven',
            ],
            visualBriefValidSources: ['generate', 'library', 'compose', 'trained-style', 'none'],
            tip: 'Three write-tools fill the Step 1 Content Brief: (1) update_deliverable_brief for the four strategic textareas (objective, keyMessage, toneDirection, callToAction). (2) update_deliverable_content_inputs for type-specific keys — ONLY keys listed in `availableContentTypeKeys` or already in `contentTypeInputs` are valid. (3) update_deliverable_visual_brief for the Visual Brief subsection (source from `visualBriefValidSources`, styleDirection from `visualBriefValidStyles`, plus optional free text). All three apply via the user confirmation card.',
          };
        }
      }
    },
  },

  // ─── Brand Assets ────────────────────────────────────────
  {
    name: 'read_brand_assets',
    description:
      'Get all brand assets in the workspace with their completeness percentage and status. Use this to understand the brand foundation.',
    inputSchema: z.object({}),
    requiresConfirmation: false,
    category: 'read',
    execute: async (_params, ctx: ToolExecutionContext) => {
      const assets = await prisma.brandAsset.findMany({
        where: { workspaceId: ctx.workspaceId },
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          status: true,
          frameworkType: true,
          content: true,
          isLocked: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      });
      return { assets, count: assets.length };
    },
  },

  {
    name: 'read_brand_asset',
    description:
      'Get a specific brand asset by ID or slug, including its full framework data (e.g. Brand Promise fields, Brand Personality dimensions, etc.).',
    inputSchema: z.object({
      assetId: z.string().optional().describe('The asset ID'),
      slug: z.string().optional().describe('The asset slug (e.g. "brand-promise", "brand-personality")'),
    }),
    requiresConfirmation: false,
    category: 'read',
    execute: async (params, ctx: ToolExecutionContext) => {
      const p = params as { assetId?: string; slug?: string };
      const where = p.assetId
        ? { id: p.assetId, workspaceId: ctx.workspaceId }
        : { slug: p.slug ?? '', workspaceId: ctx.workspaceId };

      const asset = await prisma.brandAsset.findFirst({
        where,
        include: {
          researchMethods: { select: { method: true, status: true, progress: true } },
        },
      });

      if (!asset) return { error: 'Asset not found' };

      return {
        id: asset.id,
        name: asset.name,
        slug: asset.slug,
        category: asset.category,
        status: asset.status,
        frameworkType: asset.frameworkType,
        content: asset.content,
        frameworkData: asset.frameworkData,
        isLocked: asset.isLocked,
        researchMethods: asset.researchMethods,
      };
    },
  },

  // ─── Personas ────────────────────────────────────────────
  {
    name: 'read_personas',
    description:
      'Get all personas in the workspace with demographics, goals, and frustrations summary.',
    inputSchema: z.object({}),
    requiresConfirmation: false,
    category: 'read',
    execute: async (_params, ctx: ToolExecutionContext) => {
      const personas = await prisma.persona.findMany({
        where: { workspaceId: ctx.workspaceId },
        select: {
          id: true,
          name: true,
          age: true,
          location: true,
          occupation: true,
          gender: true,
          goals: true,
          frustrations: true,
          quote: true,
          isLocked: true,
        },
        orderBy: { name: 'asc' },
      });
      return { personas, count: personas.length };
    },
  },

  {
    name: 'read_persona',
    description:
      'Get a specific persona with all fields: demographics, psychographics, goals, motivations, frustrations, behaviors, channels, buying triggers.',
    inputSchema: z.object({
      personaId: z.string().describe('The persona ID'),
    }),
    requiresConfirmation: false,
    category: 'read',
    execute: async (params, ctx: ToolExecutionContext) => {
      const p = params as { personaId: string };
      const persona = await prisma.persona.findFirst({
        where: { id: p.personaId, workspaceId: ctx.workspaceId },
      });
      if (!persona) return { error: 'Persona not found' };
      return persona;
    },
  },

  // ─── Products ────────────────────────────────────────────
  {
    name: 'read_products',
    description:
      'Get all products and services in the workspace with category, pricing, and feature summary.',
    inputSchema: z.object({}),
    requiresConfirmation: false,
    category: 'read',
    execute: async (_params, ctx: ToolExecutionContext) => {
      const products = await prisma.product.findMany({
        where: { workspaceId: ctx.workspaceId },
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          description: true,
          pricingDetails: true,
          features: true,
          status: true,
          isLocked: true,
        },
        orderBy: { name: 'asc' },
      });
      return { products, count: products.length };
    },
  },

  // ─── Competitors ─────────────────────────────────────────
  {
    name: 'read_competitors',
    description:
      'Get all competitors with tier, competitive score, positioning, and key differentiators.',
    inputSchema: z.object({}),
    requiresConfirmation: false,
    category: 'read',
    execute: async (_params, ctx: ToolExecutionContext) => {
      const competitors = await prisma.competitor.findMany({
        where: { workspaceId: ctx.workspaceId },
        select: {
          id: true,
          name: true,
          slug: true,
          websiteUrl: true,
          tier: true,
          competitiveScore: true,
          valueProposition: true,
          differentiators: true,
          strengths: true,
          weaknesses: true,
          status: true,
        },
        orderBy: { name: 'asc' },
      });
      return { competitors, count: competitors.length };
    },
  },

  // ─── Campaigns ───────────────────────────────────────────
  {
    name: 'read_campaigns',
    description:
      'Get all campaigns with type, status, goal, confidence score, and deliverable counts.',
    inputSchema: z.object({
      status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional().describe('Filter by status'),
    }),
    requiresConfirmation: false,
    category: 'read',
    execute: async (params, ctx: ToolExecutionContext) => {
      const p = params as { status?: string };
      const campaigns = await prisma.campaign.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          ...(p.status ? { status: p.status as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' } : {}),
          type: { not: 'CONTENT' },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          status: true,
          campaignGoalType: true,
          confidence: true,
          startDate: true,
          endDate: true,
          _count: { select: { deliverables: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
      return { campaigns, count: campaigns.length };
    },
  },

  // ─── Trends ──────────────────────────────────────────────
  {
    name: 'read_trends',
    description:
      'Get detected trends from the Trend Radar with relevance scores, categories, and activation status.',
    inputSchema: z.object({
      activatedOnly: z.boolean().optional().describe('Only show activated trends'),
    }),
    requiresConfirmation: false,
    category: 'read',
    execute: async (params, ctx: ToolExecutionContext) => {
      const p = params as { activatedOnly?: boolean };
      const trends = await prisma.detectedTrend.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          isDismissed: false,
          ...(p.activatedOnly ? { isActivated: true } : {}),
        },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          impactLevel: true,
          relevanceScore: true,
          isActivated: true,
          whyNow: true,
          direction: true,
        },
        orderBy: { relevanceScore: 'desc' },
        take: 20,
      });
      return { trends, count: trends.length };
    },
  },

  // ─── Strategies ──────────────────────────────────────────
  {
    name: 'read_strategies',
    description:
      'Get business strategies with objectives, key results, progress percentage, and focus areas.',
    inputSchema: z.object({}),
    requiresConfirmation: false,
    category: 'read',
    execute: async (_params, ctx: ToolExecutionContext) => {
      const strategies = await prisma.businessStrategy.findMany({
        where: { workspaceId: ctx.workspaceId },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          progressPercentage: true,
          vision: true,
          startDate: true,
          endDate: true,
          _count: { select: { objectives: true, focusAreas: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
      return { strategies, count: strategies.length };
    },
  },

  // ─── Alignment Issues ────────────────────────────────────
  {
    name: 'read_alignment_issues',
    description:
      'Get open brand alignment issues — inconsistencies between brand assets, personas, products, etc.',
    inputSchema: z.object({}),
    requiresConfirmation: false,
    category: 'read',
    execute: async (_params, ctx: ToolExecutionContext) => {
      const latestScan = await prisma.alignmentScan.findFirst({
        where: { workspaceId: ctx.workspaceId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { id: true, score: true },
      });

      if (!latestScan) return { issues: [], overallScore: null, message: 'No completed scan found' };

      const issues = await prisma.alignmentIssue.findMany({
        where: { scanId: latestScan.id, status: 'OPEN' },
        select: {
          id: true,
          title: true,
          description: true,
          severity: true,
          modulePath: true,
          sourceItemType: true,
          targetItemType: true,
        },
        orderBy: { severity: 'asc' },
      });

      return { issues, count: issues.length, overallScore: latestScan.score };
    },
  },

  // ─── Brandstyle ──────────────────────────────────────────
  {
    name: 'read_brandstyle',
    description:
      'Get the brand styleguide: colors with hex codes, typography, tone of voice, imagery guidelines, and visual language.',
    inputSchema: z.object({}),
    requiresConfirmation: false,
    category: 'read',
    execute: async (_params, ctx: ToolExecutionContext) => {
      const [styleguide, voiceguide, personalityAsset] = await Promise.all([
        prisma.brandStyleguide.findFirst({
        where: { workspaceId: ctx.workspaceId },
        include: {
          colors: {
            select: { id: true, name: true, hex: true, category: true },
            orderBy: { sortOrder: 'asc' },
          },
          logos: {
            select: { variant: true, fileUrl: true, description: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
        // 2026-05-19: voiceguide is primaire bron; legacy fallback voor
        // unmigrated workspaces (BrandPersonality.frameworkData.contentGuidelines
        // bestaat als shape "guidelines" in oude data).
        prisma.brandVoiceguide.findUnique({
          where: { workspaceId: ctx.workspaceId },
          select: { contentGuidelines: true, writingGuidelines: true },
        }),
        prisma.brandAsset.findFirst({
          where: { workspaceId: ctx.workspaceId, frameworkType: 'BRAND_PERSONALITY' },
          select: { frameworkData: true },
        }),
      ]);

      if (!styleguide) return { error: 'No styleguide found' };

      // Legacy fallback voor unmigrated workspaces: BrandPersonality.frameworkData
      // bevat soms contentGuidelines / writingGuidelines als legacy shape.
      const personalityData = (personalityAsset?.frameworkData ?? null) as
        | Record<string, unknown>
        | null;
      const legacyContentGuidelines = Array.isArray(personalityData?.contentGuidelines)
        ? (personalityData.contentGuidelines as unknown[]).filter((v): v is string => typeof v === 'string')
        : [];
      const legacyWritingGuidelines = Array.isArray(personalityData?.writingGuidelines)
        ? (personalityData.writingGuidelines as unknown[]).filter((v): v is string => typeof v === 'string')
        : [];

      return {
        id: styleguide.id,
        logoVariations: styleguide.logos.map((l) => ({
          variant: l.variant,
          url: l.fileUrl,
          description: l.description,
        })),
        logoGuidelines: styleguide.logoGuidelines,
        colors: styleguide.colors,
        primaryFontName: styleguide.primaryFontName,
        additionalFonts: styleguide.additionalFonts,
        contentGuidelines:
          (voiceguide?.contentGuidelines?.length ?? 0) > 0
            ? voiceguide!.contentGuidelines
            : legacyContentGuidelines,
        writingGuidelines:
          (voiceguide?.writingGuidelines?.length ?? 0) > 0
            ? voiceguide!.writingGuidelines
            : legacyWritingGuidelines,
        photographyStyle: styleguide.photographyStyle,
        visualLanguage: styleguide.visualLanguage,
      };
    },
  },

  // ─── Dashboard ───────────────────────────────────────────
  {
    name: 'read_dashboard',
    description:
      'Get workspace health overview: readiness percentage, module stats (assets/personas/strategies/campaigns count), and items needing attention.',
    inputSchema: z.object({}),
    requiresConfirmation: false,
    category: 'read',
    execute: async (_params, ctx: ToolExecutionContext) => {
      const [assetCount, personaCount, strategyCount, campaignCount, trendCount, competitorCount] =
        await Promise.all([
          prisma.brandAsset.count({ where: { workspaceId: ctx.workspaceId } }),
          prisma.persona.count({ where: { workspaceId: ctx.workspaceId } }),
          prisma.businessStrategy.count({ where: { workspaceId: ctx.workspaceId, status: 'ACTIVE' } }),
          prisma.campaign.count({ where: { workspaceId: ctx.workspaceId, status: 'ACTIVE', type: { not: 'CONTENT' } } }),
          prisma.detectedTrend.count({ where: { workspaceId: ctx.workspaceId, isActivated: true } }),
          prisma.competitor.count({ where: { workspaceId: ctx.workspaceId } }),
        ]);

      return {
        stats: {
          brandAssets: assetCount,
          personas: personaCount,
          activeStrategies: strategyCount,
          activeCampaigns: campaignCount,
          activeTrends: trendCount,
          competitors: competitorCount,
        },
      };
    },
  },

  // ─── Knowledge Library ───────────────────────────────────
  {
    name: 'read_knowledge',
    description:
      'Get knowledge library resources: articles, case studies, reports, videos, etc.',
    inputSchema: z.object({
      limit: z.number().optional().describe('Max number of resources to return (default 10)'),
    }),
    requiresConfirmation: false,
    category: 'read',
    execute: async (params, ctx: ToolExecutionContext) => {
      const p = params as { limit?: number };
      const resources = await prisma.knowledgeResource.findMany({
        where: { workspaceId: ctx.workspaceId, isArchived: false },
        select: {
          id: true,
          title: true,
          type: true,
          category: true,
          description: true,
          url: true,
          rating: true,
          isFeatured: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: p.limit ?? 10,
      });
      return { resources, count: resources.length };
    },
  },

  // ─── Deliverables ────────────────────────────────────────
  {
    name: 'read_deliverables',
    description:
      'Get deliverables for a specific campaign — content items with type, status, channel, and priority.',
    inputSchema: z.object({
      campaignId: z.string().describe('The campaign ID'),
    }),
    requiresConfirmation: false,
    category: 'read',
    execute: async (params, ctx: ToolExecutionContext) => {
      const p = params as { campaignId: string };
      const campaign = await prisma.campaign.findFirst({
        where: { id: p.campaignId, workspaceId: ctx.workspaceId },
        select: { id: true },
      });
      if (!campaign) return { error: 'Campaign not found' };

      const deliverables = await prisma.deliverable.findMany({
        where: { campaignId: p.campaignId },
        select: {
          id: true,
          title: true,
          contentType: true,
          status: true,
          settings: true,
          generatedText: true,
          approvalStatus: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      return { deliverables, count: deliverables.length };
    },
  },
];
