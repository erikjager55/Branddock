import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import type { ClawToolDefinition, MutationProposal } from '../claw.types';

// Helper: invalidate dashboard cache (always safe to call)
function invalidateDashboard(workspaceId: string) {
  invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
}

/**
 * WRITE tools — mutate data in the workspace.
 * All require user confirmation before execution.
 */
export const writeTools: ClawToolDefinition[] = [
  // ─── Brand Asset Content ─────────────────────────────────
  {
    name: 'update_asset_content',
    description:
      'Update the text content of a brand asset. Use this when the user asks to change, improve, or rewrite an asset description or content field.',
    inputSchema: z.object({
      assetId: z.string().describe('The brand asset ID'),
      content: z.string().describe('The new content text'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as { assetId: string; content: string };
      const asset = await prisma.brandAsset.findFirst({
        where: { id: p.assetId, workspaceId: ctx.workspaceId },
        select: { name: true, content: true },
      });
      return {
        toolCallId: '',
        toolName: 'update_asset_content',
        params,
        description: `Update content of "${asset?.name ?? 'Unknown asset'}"`,
        entityType: 'BrandAsset',
        entityId: p.assetId,
        entityName: asset?.name ?? undefined,
        changes: [{
          field: 'content',
          label: 'Content',
          currentValue: asset?.content ? String(asset.content) : null,
          proposedValue: p.content,
        }],
      };
    },
    execute: async (params, ctx) => {
      const p = params as { assetId: string; content: string };
      await prisma.brandAsset.update({
        where: { id: p.assetId },
        data: { content: p.content },
      });
      invalidateDashboard(ctx.workspaceId);
      return { success: true, message: 'Brand asset content updated' };
    },
  },

  // ─── Brand Asset Framework ───────────────────────────────
  {
    name: 'update_asset_framework',
    description:
      'Update specific framework fields of a brand asset (e.g. Brand Promise fields, Brand Personality dimensions, Golden Circle rings). Pass only the fields you want to change — they will be merged with existing data.',
    inputSchema: z.object({
      assetId: z.string().describe('The brand asset ID'),
      frameworkData: z.record(z.string(), z.unknown()).describe('Framework fields to update (merged with existing)'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as { assetId: string; frameworkData: Record<string, unknown> };
      const asset = await prisma.brandAsset.findFirst({
        where: { id: p.assetId, workspaceId: ctx.workspaceId },
        select: { name: true, frameworkData: true },
      });
      const current = (asset?.frameworkData ?? {}) as Record<string, unknown>;
      const changes = Object.entries(p.frameworkData).map(([field, value]) => ({
        field,
        label: field,
        currentValue: current[field] != null ? JSON.stringify(current[field]) : null,
        proposedValue: JSON.stringify(value),
      }));
      return {
        toolCallId: '',
        toolName: 'update_asset_framework',
        params,
        description: `Update framework data of "${asset?.name ?? 'Unknown'}"`,
        entityType: 'BrandAsset',
        entityId: p.assetId,
        entityName: asset?.name ?? undefined,
        changes,
      };
    },
    execute: async (params, ctx) => {
      const p = params as { assetId: string; frameworkData: Record<string, unknown> };
      const asset = await prisma.brandAsset.findFirst({
        where: { id: p.assetId, workspaceId: ctx.workspaceId },
        select: { frameworkData: true },
      });
      const existing = (asset?.frameworkData ?? {}) as Record<string, unknown>;
      const merged = { ...existing, ...p.frameworkData };
      await prisma.brandAsset.update({
        where: { id: p.assetId },
        data: { frameworkData: JSON.parse(JSON.stringify(merged)) },
      });
      invalidateDashboard(ctx.workspaceId);
      return { success: true, message: 'Framework data updated' };
    },
  },

  // ─── Persona Fields ──────────────────────────────────────
  {
    name: 'update_persona',
    description:
      'Update fields on a persona. Can modify name, age, location, occupation, goals, frustrations, motivations, behaviors, quote, bio, personality type, interests, preferred channels, buying triggers, decision criteria, tech stack.',
    inputSchema: z.object({
      personaId: z.string().describe('The persona ID'),
      updates: z.record(z.string(), z.unknown()).describe('Fields to update'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as { personaId: string; updates: Record<string, unknown> };
      const persona = await prisma.persona.findFirst({
        where: { id: p.personaId, workspaceId: ctx.workspaceId },
        select: { name: true },
      });
      const changes = Object.entries(p.updates).map(([field, value]) => ({
        field,
        label: field,
        currentValue: null,
        proposedValue: typeof value === 'string' ? value : JSON.stringify(value),
      }));
      return {
        toolCallId: '',
        toolName: 'update_persona',
        params,
        description: `Update ${changes.length} field(s) on persona "${persona?.name ?? 'Unknown'}"`,
        entityType: 'Persona',
        entityId: p.personaId,
        entityName: persona?.name ?? undefined,
        changes,
      };
    },
    execute: async (params, ctx) => {
      const p = params as { personaId: string; updates: Record<string, unknown> };
      await prisma.persona.update({
        where: { id: p.personaId },
        data: p.updates,
      });
      invalidateDashboard(ctx.workspaceId);
      return { success: true, message: 'Persona updated' };
    },
  },

  // ─── Product Fields ──────────────────────────────────────
  {
    name: 'update_product',
    description:
      'Update fields on a product or service. Can modify name, description, category, pricing details, features, benefits, use cases.',
    inputSchema: z.object({
      productId: z.string().describe('The product ID'),
      updates: z.record(z.string(), z.unknown()).describe('Fields to update'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as { productId: string; updates: Record<string, unknown> };
      const product = await prisma.product.findFirst({
        where: { id: p.productId, workspaceId: ctx.workspaceId },
        select: { name: true },
      });
      return {
        toolCallId: '',
        toolName: 'update_product',
        params,
        description: `Update product "${product?.name ?? 'Unknown'}"`,
        entityType: 'Product',
        entityId: p.productId,
        entityName: product?.name ?? undefined,
        changes: Object.entries(p.updates).map(([field, value]) => ({
          field, label: field, currentValue: null,
          proposedValue: typeof value === 'string' ? value : JSON.stringify(value),
        })),
      };
    },
    execute: async (params, ctx) => {
      const p = params as { productId: string; updates: Record<string, unknown> };
      await prisma.product.update({ where: { id: p.productId }, data: p.updates });
      invalidateCache(cacheKeys.prefixes.products(ctx.workspaceId));
      return { success: true, message: 'Product updated' };
    },
  },

  // ─── Competitor Fields ───────────────────────────────────
  {
    name: 'update_competitor',
    description:
      'Update fields on a competitor. Can modify name, description, positioning, tier, value proposition, differentiators, strengths, weaknesses.',
    inputSchema: z.object({
      competitorId: z.string().describe('The competitor ID'),
      updates: z.record(z.string(), z.unknown()).describe('Fields to update'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as { competitorId: string; updates: Record<string, unknown> };
      const comp = await prisma.competitor.findFirst({
        where: { id: p.competitorId, workspaceId: ctx.workspaceId },
        select: { name: true },
      });
      return {
        toolCallId: '',
        toolName: 'update_competitor',
        params,
        description: `Update competitor "${comp?.name ?? 'Unknown'}"`,
        entityType: 'Competitor',
        entityId: p.competitorId,
        entityName: comp?.name ?? undefined,
        changes: Object.entries(p.updates).map(([field, value]) => ({
          field, label: field, currentValue: null,
          proposedValue: typeof value === 'string' ? value : JSON.stringify(value),
        })),
      };
    },
    execute: async (params, ctx) => {
      const p = params as { competitorId: string; updates: Record<string, unknown> };
      await prisma.competitor.update({ where: { id: p.competitorId }, data: p.updates });
      invalidateCache(cacheKeys.prefixes.competitors(ctx.workspaceId));
      return { success: true, message: 'Competitor updated' };
    },
  },

  // ─── Strategy Context ────────────────────────────────────
  {
    name: 'update_strategy_context',
    description:
      'Update the strategic context of a business strategy: vision, rationale, or key assumptions.',
    inputSchema: z.object({
      strategyId: z.string().describe('The strategy ID'),
      vision: z.string().optional().describe('Updated vision statement'),
      rationale: z.string().optional().describe('Updated strategic rationale'),
      keyAssumptions: z.array(z.string()).optional().describe('Updated key assumptions list'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as { strategyId: string; vision?: string; rationale?: string; keyAssumptions?: string[] };
      const strategy = await prisma.businessStrategy.findFirst({
        where: { id: p.strategyId, workspaceId: ctx.workspaceId },
        select: { name: true, vision: true, rationale: true },
      });
      const changes = [];
      if (p.vision) changes.push({ field: 'vision', label: 'Vision', currentValue: strategy?.vision ?? null, proposedValue: p.vision });
      if (p.rationale) changes.push({ field: 'rationale', label: 'Rationale', currentValue: strategy?.rationale ?? null, proposedValue: p.rationale });
      if (p.keyAssumptions) changes.push({ field: 'keyAssumptions', label: 'Key Assumptions', currentValue: null, proposedValue: p.keyAssumptions.join('; ') });
      return {
        toolCallId: '', toolName: 'update_strategy_context', params,
        description: `Update strategy context for "${strategy?.name ?? 'Unknown'}"`,
        entityType: 'BusinessStrategy', entityId: p.strategyId, entityName: strategy?.name ?? undefined, changes,
      };
    },
    execute: async (params, ctx) => {
      const p = params as { strategyId: string; vision?: string; rationale?: string; keyAssumptions?: string[] };
      const data: Record<string, unknown> = {};
      if (p.vision !== undefined) data.vision = p.vision;
      if (p.rationale !== undefined) data.rationale = p.rationale;
      if (p.keyAssumptions !== undefined) data.keyAssumptions = p.keyAssumptions;
      await prisma.businessStrategy.update({ where: { id: p.strategyId }, data });
      invalidateDashboard(ctx.workspaceId);
      return { success: true, message: 'Strategy context updated' };
    },
  },

  // ─── Create Persona ──────────────────────────────────────
  {
    name: 'create_persona',
    description:
      'Create a new persona from a description. Provide name and any known demographics, psychographics, goals, and frustrations.',
    inputSchema: z.object({
      name: z.string().describe('Persona name'),
      age: z.number().optional(),
      location: z.string().optional(),
      occupation: z.string().optional(),
      goals: z.array(z.string()).optional(),
      frustrations: z.array(z.string()).optional(),
      quote: z.string().optional(),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params) => {
      const p = params as { name: string };
      return {
        toolCallId: '', toolName: 'create_persona', params,
        description: `Create new persona "${p.name}"`,
        entityType: 'Persona', changes: [],
      };
    },
    execute: async (params, ctx) => {
      const p = params as Record<string, unknown>;
      const persona = await prisma.persona.create({
        data: {
          ...p,
          workspaceId: ctx.workspaceId,
          createdById: ctx.userId,
        } as never,
      });
      invalidateDashboard(ctx.workspaceId);
      return { success: true, personaId: persona.id, message: `Persona "${persona.name}" created` };
    },
  },

  // ─── Start Alignment Scan ────────────────────────────────
  {
    name: 'start_alignment_scan',
    description: 'Start a brand alignment scan to check consistency across all brand elements.',
    inputSchema: z.object({}),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async () => ({
      toolCallId: '', toolName: 'start_alignment_scan', params: {},
      description: 'Start a brand alignment scan (analyzes consistency across 6 modules)',
      entityType: 'AlignmentScan', changes: [],
    }),
    execute: async (_params, ctx) => {
      const scan = await prisma.alignmentScan.create({
        data: {
          workspaceId: ctx.workspaceId,
          score: 0,
          totalItems: 0,
          alignedCount: 0,
          reviewCount: 0,
          misalignedCount: 0,
          status: 'RUNNING',
        },
      });
      return { success: true, scanId: scan.id, message: 'Alignment scan started' };
    },
  },

  // ─── Start Trend Scan ────────────────────────────────────
  {
    name: 'start_trend_scan',
    description: 'Start a trend radar scan to detect new market trends from configured sources.',
    inputSchema: z.object({}),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async () => ({
      toolCallId: '', toolName: 'start_trend_scan', params: {},
      description: 'Start a trend radar scan across all configured sources',
      entityType: 'TrendScanJob', changes: [],
    }),
    execute: async (_params, ctx) => {
      // Delegate to existing scan endpoint logic
      const job = await prisma.trendResearchJob.create({
        data: {
          workspaceId: ctx.workspaceId,
          status: 'PENDING',
          query: 'Claw-initiated trend scan',
        },
      });
      return { success: true, jobId: job.id, message: 'Trend scan queued' };
    },
  },

  // ─── Lock/Unlock Entity ──────────────────────────────────
  {
    name: 'lock_entity',
    description: 'Lock or unlock a brand asset, persona, or product to prevent/allow editing.',
    inputSchema: z.object({
      entityType: z.enum(['brand_asset', 'persona', 'product']).describe('Type of entity'),
      entityId: z.string().describe('The entity ID'),
      locked: z.boolean().describe('True to lock, false to unlock'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params) => {
      const p = params as { entityType: string; entityId: string; locked: boolean };
      return {
        toolCallId: '', toolName: 'lock_entity', params,
        description: `${p.locked ? 'Lock' : 'Unlock'} ${p.entityType.replace('_', ' ')}`,
        entityType: p.entityType, entityId: p.entityId, changes: [],
      };
    },
    execute: async (params, ctx) => {
      const p = params as { entityType: string; entityId: string; locked: boolean };
      const data = {
        isLocked: p.locked,
        lockedById: p.locked ? ctx.userId : null,
        lockedAt: p.locked ? new Date() : null,
      };

      switch (p.entityType) {
        case 'brand_asset':
          await prisma.brandAsset.update({ where: { id: p.entityId }, data });
          invalidateDashboard(ctx.workspaceId);
          break;
        case 'persona':
          await prisma.persona.update({ where: { id: p.entityId }, data });
          invalidateDashboard(ctx.workspaceId);
          break;
        case 'product':
          await prisma.product.update({ where: { id: p.entityId }, data });
          invalidateCache(cacheKeys.prefixes.products(ctx.workspaceId));
          break;
      }
      return { success: true, message: `Entity ${p.locked ? 'locked' : 'unlocked'}` };
    },
  },

  // ─── Create Manual Trend ─────────────────────────────────
  {
    name: 'create_trend',
    description: 'Add a manual trend to the trend radar.',
    inputSchema: z.object({
      title: z.string().describe('Trend title'),
      description: z.string().describe('Trend description'),
      category: z.string().optional().describe('Category (e.g. TECHNOLOGY, CONSUMER_BEHAVIOR)'),
      impactLevel: z.string().optional().describe('Impact level (CRITICAL, HIGH, MEDIUM, LOW)'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params) => {
      const p = params as { title: string };
      return {
        toolCallId: '', toolName: 'create_trend', params,
        description: `Add trend "${p.title}" to radar`,
        entityType: 'DetectedTrend', changes: [],
      };
    },
    execute: async (params, ctx) => {
      const p = params as { title: string; description: string; category?: string; impactLevel?: string };
      const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
        + '-' + Date.now().toString(36);
      const trend = await prisma.detectedTrend.create({
        data: {
          workspaceId: ctx.workspaceId,
          slug,
          title: p.title,
          description: p.description,
          category: (p.category ?? 'TECHNOLOGY') as never,
          impactLevel: (p.impactLevel ?? 'MEDIUM') as never,
          relevanceScore: 50,
          detectionSource: 'MANUAL' as never,
          sourceUrl: '',
        },
      });
      invalidateCache(cacheKeys.prefixes.trendRadar(ctx.workspaceId));
      return { success: true, trendId: trend.id, message: `Trend "${trend.title}" created` };
    },
  },
];
