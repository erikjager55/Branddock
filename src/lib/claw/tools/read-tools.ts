import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { ClawToolDefinition, ToolExecutionContext } from '../claw.types';

/**
 * READ tools — fetch data from the workspace.
 * No confirmation needed. Results are returned to Claude as context.
 */
export const readTools: ClawToolDefinition[] = [
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
      const styleguide = await prisma.brandStyleguide.findFirst({
        where: { workspaceId: ctx.workspaceId },
        include: {
          colors: {
            select: { id: true, name: true, hex: true, category: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (!styleguide) return { error: 'No styleguide found' };

      return {
        id: styleguide.id,
        logoVariations: styleguide.logoVariations,
        logoGuidelines: styleguide.logoGuidelines,
        colors: styleguide.colors,
        primaryFontName: styleguide.primaryFontName,
        additionalFonts: styleguide.additionalFonts,
        contentGuidelines: styleguide.contentGuidelines,
        writingGuidelines: styleguide.writingGuidelines,
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
