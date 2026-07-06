import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { deepSet } from '@/lib/utils/deep-set';
import { dispatchJob } from '@/lib/agents/jobs/dispatch';
import {
  collectEditableTextFields,
  readPath,
} from '@/lib/landing-pages/puck-text-fields';
import { preserveHeroOnSettings } from '@/features/campaigns/components/canvas/medium/hero-visual-preserve';
import { isPuckRenderable } from '@/lib/landing-pages/webpage-types';
import type { ClawToolDefinition, MutationProposal } from '../claw.types';

// Helper: invalidate dashboard cache (always safe to call)
function invalidateDashboard(workspaceId: string) {
  invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
}

/** Render a value for the MutationConfirmCard preview — strings stay raw, other types go through JSON. */
function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

/** Human-readable wizard field labels for MutationConfirmCard previews. */
const WIZARD_FIELD_LABELS: Record<string, string> = {
  name: 'Campaign name',
  description: 'Description',
  campaignGoalType: 'Campaign goal',
  campaignType: 'Campaign type',
  selectedContentType: 'Content type',
  startDate: 'Start date',
  endDate: 'End date',
  briefingOccasion: 'Briefing — occasion',
  briefingAudienceObjective: 'Briefing — audience & objective',
  briefingCoreMessage: 'Briefing — core message',
  briefingTonePreference: 'Briefing — tone preference',
  briefingConstraints: 'Briefing — constraints',
};

function prettyWizardLabel(key: string): string {
  return WIZARD_FIELD_LABELS[key] ?? key;
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
      // Workspace-scoped write (defence in depth): execute draait los van
      // buildProposal via de confirm-route, dus de tenant-check MOET hier ook.
      const res = await prisma.brandAsset.updateMany({
        where: { id: p.assetId, workspaceId: ctx.workspaceId },
        data: { content: p.content },
      });
      if (res.count === 0) throw new Error('Brand asset not found in this workspace');
      invalidateDashboard(ctx.workspaceId);
      return { success: true, message: 'Brand asset content updated' };
    },
  },

  // ─── Brand Asset Framework ───────────────────────────────
  {
    name: 'update_asset_framework',
    description:
      'Update framework fields of a brand asset. Two modes:\n' +
      '(1) Bulk merge: pass `frameworkData` with one or more top-level fields. Existing framework data is shallow-merged with the new object.\n' +
      '(2) Single-field path: pass `fieldPath` + `value` to set one nested field without touching others. Use bracket notation for array indices, e.g. `goals[0].title`. Prefer this mode when updating just one field — it avoids accidentally overwriting nested objects.',
    inputSchema: z.object({
      assetId: z.string().describe('The brand asset ID'),
      frameworkData: z.record(z.string(), z.unknown()).optional().describe('Framework fields to update (shallow-merged with existing). Use this for multi-field updates.'),
      fieldPath: z.string().optional().describe('Dot-path with bracket notation for arrays, e.g. "goals[0].title" or "channelTones.socialMedia". Use this for single-field updates.'),
      value: z.unknown().optional().describe('New value for the field at fieldPath. Required when fieldPath is set.'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as {
        assetId: string;
        frameworkData?: Record<string, unknown>;
        fieldPath?: string;
        value?: unknown;
      };
      const asset = await prisma.brandAsset.findFirst({
        where: { id: p.assetId, workspaceId: ctx.workspaceId },
        select: { name: true, frameworkData: true },
      });
      const current = (asset?.frameworkData ?? {}) as Record<string, unknown>;

      let changes: MutationProposal['changes'];
      if (p.fieldPath) {
        const existingValue = readPath(current, p.fieldPath);
        changes = [{
          field: p.fieldPath,
          label: p.fieldPath,
          currentValue: existingValue != null ? stringifyValue(existingValue) : null,
          proposedValue: stringifyValue(p.value),
        }];
      } else if (p.frameworkData) {
        changes = Object.entries(p.frameworkData).map(([field, value]) => ({
          field,
          label: field,
          currentValue: current[field] != null ? stringifyValue(current[field]) : null,
          proposedValue: stringifyValue(value),
        }));
      } else {
        changes = [];
      }

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
      const p = params as {
        assetId: string;
        frameworkData?: Record<string, unknown>;
        fieldPath?: string;
        value?: unknown;
      };
      const asset = await prisma.brandAsset.findFirst({
        where: { id: p.assetId, workspaceId: ctx.workspaceId },
        select: { frameworkData: true },
      });
      // Tenant-guard: zonder deze check zou een asset uit een andere workspace
      // (asset === null) alsnog via `update({ where: { id } })` worden geschreven.
      if (!asset) throw new Error('Brand asset not found in this workspace');
      const existing = (asset.frameworkData ?? {}) as Record<string, unknown>;

      let updated: Record<string, unknown>;
      if (p.fieldPath) {
        // Deep-clone to avoid mutating the Prisma result reference
        updated = JSON.parse(JSON.stringify(existing));
        deepSet(updated, p.fieldPath, p.value);
      } else if (p.frameworkData) {
        updated = { ...existing, ...p.frameworkData };
      } else {
        return { success: false, message: 'Either frameworkData or fieldPath+value is required' };
      }

      await prisma.brandAsset.update({
        where: { id: p.assetId },
        data: { frameworkData: JSON.parse(JSON.stringify(updated)) },
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

      // Whitelist Prisma columns and coerce `age` to string (the DB column is
      // String? but Claude sometimes sends a number).
      const STRING_FIELDS = [
        'name', 'tagline', 'age', 'gender', 'location', 'occupation',
        'education', 'income', 'familyStatus', 'personalityType',
        'quote', 'bio', 'strategicImplications',
      ] as const;
      const ARRAY_FIELDS = [
        'coreValues', 'interests', 'goals', 'motivations', 'frustrations', 'behaviors',
      ] as const;
      const JSON_FIELDS = [
        'preferredChannels', 'techStack', 'buyingTriggers', 'decisionCriteria',
      ] as const;

      const data: Record<string, unknown> = {};
      for (const f of STRING_FIELDS) {
        const v = p.updates[f];
        if (v == null) continue;
        data[f] = String(v);
      }
      for (const f of ARRAY_FIELDS) {
        const v = p.updates[f];
        if (!Array.isArray(v)) continue;
        data[f] = v.filter((x) => typeof x === 'string');
      }
      for (const f of JSON_FIELDS) {
        const v = p.updates[f];
        if (v == null) continue;
        data[f] = v;
      }

      const res = await prisma.persona.updateMany({
        where: { id: p.personaId, workspaceId: ctx.workspaceId },
        data,
      });
      if (res.count === 0) throw new Error('Persona not found in this workspace');
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
      const res = await prisma.product.updateMany({
        where: { id: p.productId, workspaceId: ctx.workspaceId },
        data: p.updates,
      });
      if (res.count === 0) throw new Error('Product not found in this workspace');
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
      const res = await prisma.competitor.updateMany({
        where: { id: p.competitorId, workspaceId: ctx.workspaceId },
        data: p.updates,
      });
      if (res.count === 0) throw new Error('Competitor not found in this workspace');
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
      const res = await prisma.businessStrategy.updateMany({
        where: { id: p.strategyId, workspaceId: ctx.workspaceId },
        data,
      });
      if (res.count === 0) throw new Error('Strategy not found in this workspace');
      invalidateDashboard(ctx.workspaceId);
      return { success: true, message: 'Strategy context updated' };
    },
  },

  // ─── Create Persona ──────────────────────────────────────
  {
    name: 'create_persona',
    description:
      'Create a new persona from a description. Provide name and any known demographics, psychographics, goals, and frustrations. Pass age as a string (e.g. "35" or "30-40") — in this database age is a free-text field, not a number.',
    inputSchema: z.object({
      name: z.string().describe('Persona name'),
      age: z.string().optional().describe('Age as a string, e.g. "35" or "30-40"'),
      gender: z.string().optional(),
      location: z.string().optional(),
      occupation: z.string().optional(),
      goals: z.array(z.string()).optional(),
      frustrations: z.array(z.string()).optional(),
      motivations: z.array(z.string()).optional(),
      quote: z.string().optional(),
      bio: z.string().optional(),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params) => {
      const p = params as {
        name: string;
        age?: number;
        location?: string;
        occupation?: string;
        goals?: string[];
        frustrations?: string[];
        quote?: string;
      };
      const changes: MutationProposal['changes'] = [
        { field: 'name', label: 'Name', currentValue: null, proposedValue: p.name },
      ];
      if (p.age != null) changes.push({ field: 'age', label: 'Age', currentValue: null, proposedValue: String(p.age) });
      if (p.occupation) changes.push({ field: 'occupation', label: 'Occupation', currentValue: null, proposedValue: p.occupation });
      if (p.location) changes.push({ field: 'location', label: 'Location', currentValue: null, proposedValue: p.location });
      if (p.goals?.length) changes.push({ field: 'goals', label: 'Goals', currentValue: null, proposedValue: p.goals.join(' • ') });
      if (p.frustrations?.length) changes.push({ field: 'frustrations', label: 'Frustrations', currentValue: null, proposedValue: p.frustrations.join(' • ') });
      if (p.quote) changes.push({ field: 'quote', label: 'Quote', currentValue: null, proposedValue: p.quote });
      return {
        toolCallId: '', toolName: 'create_persona', params,
        description: `Create new persona "${p.name}"`,
        entityType: 'Persona', entityName: p.name, changes,
      };
    },
    execute: async (params, ctx) => {
      const p = params as Record<string, unknown>;

      // Whitelist + coerce: keep only valid Prisma columns and force `age`
      // to string (schema column type is String?). Claude sometimes sends a
      // number despite the schema saying string.
      const data: Record<string, unknown> = {
        name: String(p.name ?? ''),
        workspaceId: ctx.workspaceId,
        createdById: ctx.userId,
      };
      if (p.age != null) data.age = String(p.age);
      if (typeof p.gender === 'string') data.gender = p.gender;
      if (typeof p.location === 'string') data.location = p.location;
      if (typeof p.occupation === 'string') data.occupation = p.occupation;
      if (typeof p.quote === 'string') data.quote = p.quote;
      if (typeof p.bio === 'string') data.bio = p.bio;
      if (Array.isArray(p.goals)) data.goals = p.goals.filter((g) => typeof g === 'string');
      if (Array.isArray(p.frustrations)) data.frustrations = p.frustrations.filter((g) => typeof g === 'string');
      if (Array.isArray(p.motivations)) data.motivations = p.motivations.filter((g) => typeof g === 'string');

      const persona = await prisma.persona.create({ data: data as never });
      invalidateDashboard(ctx.workspaceId);
      return {
        success: true,
        personaId: persona.id,
        personaName: persona.name,
        message: `Persona "${persona.name}" created`,
      };
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
      // Zonder job-dispatch blijft de scan eeuwig RUNNING — spiegel van
      // /api/alignment/scan (de engine zet zelf COMPLETED/FAILED).
      await dispatchJob({
        type: 'ALIGNMENT_SCAN',
        payload: { scanId: scan.id, workspaceId: ctx.workspaceId },
        workspaceId: ctx.workspaceId,
        maxAttempts: 1,
        idempotencyKey: `alignment-scan:${scan.id}`,
        triggeredBy: 'user',
      });
      invalidateCache(cacheKeys.prefixes.alignment(ctx.workspaceId));
      invalidateCache(cacheKeys.prefixes.dashboard(ctx.workspaceId));
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
      // Zonder job-dispatch blijft de research-job eeuwig PENDING — spiegel
      // van /api/trend-radar/research (de engine zet COMPLETED/FAILED).
      await dispatchJob({
        type: 'TREND_RESEARCH',
        payload: { jobId: job.id, workspaceId: ctx.workspaceId, query: job.query, useBrandContext: true },
        workspaceId: ctx.workspaceId,
        maxAttempts: 1,
        idempotencyKey: `trend-research:${job.id}`,
        triggeredBy: 'user',
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

      // Workspace-scoped: lock_entity heeft geen workspace-check in buildProposal,
      // dus de tenant-guard leeft volledig hier — een (un)lock op een id uit een
      // andere workspace mag niet doorgaan.
      let count = 0;
      switch (p.entityType) {
        case 'brand_asset': {
          const res = await prisma.brandAsset.updateMany({ where: { id: p.entityId, workspaceId: ctx.workspaceId }, data });
          count = res.count;
          invalidateDashboard(ctx.workspaceId);
          break;
        }
        case 'persona': {
          const res = await prisma.persona.updateMany({ where: { id: p.entityId, workspaceId: ctx.workspaceId }, data });
          count = res.count;
          invalidateDashboard(ctx.workspaceId);
          break;
        }
        case 'product': {
          const res = await prisma.product.updateMany({ where: { id: p.entityId, workspaceId: ctx.workspaceId }, data });
          count = res.count;
          invalidateCache(cacheKeys.prefixes.products(ctx.workspaceId));
          break;
        }
      }
      if (count === 0) throw new Error('Entity not found in this workspace');
      return { success: true, message: `Entity ${p.locked ? 'locked' : 'unlocked'}` };
    },
  },

  // ─── Update Campaign Wizard (client-only, no DB) ─────────
  {
    name: 'update_campaign_wizard',
    description:
      'Fill in one or more fields of the Campaign Wizard on behalf of the user. ONLY use this when the Current Page context shows an active Campaign Wizard or Content Wizard snapshot. The wizard lives in the browser (no DB row yet), so this tool does not write to the database — instead it hands a set of field values back to the client, which applies them to the wizard state after the user confirms. ' +
      'Field keys match the snapshot keys exactly (name, description, campaignGoalType, campaignType, selectedContentType, startDate, endDate, briefingOccasion, briefingAudienceObjective, briefingCoreMessage, briefingTonePreference, briefingConstraints). Dates must be ISO "YYYY-MM-DD".',
    inputSchema: z.object({
      updates: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        campaignGoalType: z.string().optional(),
        campaignType: z.string().optional(),
        selectedContentType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        briefingOccasion: z.string().optional(),
        briefingAudienceObjective: z.string().optional(),
        briefingCoreMessage: z.string().optional(),
        briefingTonePreference: z.string().optional(),
        briefingConstraints: z.string().optional(),
      }).describe('Object with one or more wizard field values to fill in'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params) => {
      const p = params as { updates: Record<string, string | undefined> };
      const entries = Object.entries(p.updates ?? {}).filter(([, v]) => v !== undefined && v !== '');
      const changes: MutationProposal['changes'] = entries.map(([field, value]) => ({
        field,
        label: prettyWizardLabel(field),
        currentValue: null,
        proposedValue: String(value),
      }));
      return {
        toolCallId: '',
        toolName: 'update_campaign_wizard',
        params,
        description: `Fill in ${changes.length} wizard field${changes.length === 1 ? '' : 's'}`,
        entityType: 'CampaignWizard',
        changes,
      };
    },
    execute: async (params) => {
      const p = params as { updates: Record<string, string | undefined> };
      const updates: Record<string, string> = {};
      for (const [k, v] of Object.entries(p.updates ?? {})) {
        if (typeof v === 'string' && v.length > 0) updates[k] = v;
      }
      // Hand the updates back to the client — MutationConfirmCard applies them
      // to useCampaignWizardStore after the user confirms.
      return {
        success: true,
        clientAction: 'wizard_update' as const,
        updates,
        message: `Ready to fill ${Object.keys(updates).length} wizard field(s)`,
      };
    },
  },

  // ─── Generic Form-Fill (client-only, no DB) ──────────────
  {
    name: 'fill_form_fields',
    description:
      'Fill one or more editable fields on the page the user is currently viewing. Use ONLY when the Current Page context lists `formFillFields` and you want to propose values for them. Field `key` must match an entry from that list exactly — never invent keys. Values can be strings, string arrays, numbers, or booleans depending on the registered field. Bracket notation is supported for nested fields (e.g. `goals[0].title`) when the registered key uses it. ' +
      'This tool does NOT write to the database; the page applies values to its in-memory form state after the user confirms — they then save manually via the page\'s existing Save button. Prefer dedicated tools (e.g. `update_persona`, `update_deliverable_brief`) when they exist; use `fill_form_fields` only as the generic fallback for pages without one.',
    inputSchema: z.object({
      assignments: z.array(z.object({
        key: z.string().describe('Field key from formFillFields — must match exactly.'),
        value: z.union([
          z.string(),
          z.array(z.string()),
          z.number(),
          z.boolean(),
          z.null(),
        ]).describe('Proposed value. Strings for textareas, arrays for lists, etc.'),
      })).min(1).describe('One entry per field to fill — non-empty.'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params) => {
      const p = params as { assignments: Array<{ key: string; value: unknown }> };
      const changes: MutationProposal['changes'] = p.assignments.map(({ key, value }) => ({
        field: key,
        label: key, // Client overlays the registered label when rendering.
        currentValue: null,
        proposedValue: Array.isArray(value)
          ? value.join(', ')
          : value === null
            ? ''
            : String(value),
      }));
      return {
        toolCallId: '',
        toolName: 'fill_form_fields',
        params,
        description: `Fill ${changes.length} field${changes.length === 1 ? '' : 's'} on this page`,
        entityType: 'FormFill',
        changes,
      };
    },
    execute: async (params) => {
      const p = params as { assignments: Array<{ key: string; value: unknown }> };
      // Client-only tool — server execute is a pass-through that hands the
      // assignments back via clientAction. MutationConfirmCard routes them to
      // useFormFillStore.applyFill after the user confirms.
      return {
        success: true,
        clientAction: 'form_fill' as const,
        assignments: p.assignments,
        message: `Ready to fill ${p.assignments.length} field(s)`,
      };
    },
  },

  // ─── Create Deliverable ──────────────────────────────────
  // Path 2 fix (2026-04-25): when the user asks Claw "make a LinkedIn post"
  // it must NOT generate the body in chat — it must create the deliverable
  // row and navigate to its Canvas where the dedicated generation pipeline
  // (with brand context, medium config, variant grid, etc.) takes over.
  // The system prompt (claw/system-prompt.ts) is paired with this tool to
  // enforce the contract.
  {
    name: 'create_deliverable',
    description:
      'Create a NEW content deliverable (e.g. linkedin-post, blog-post, email-campaign) inside an existing campaign. Use ONLY when the user explicitly asks to make a new content piece ("maak een LinkedIn-post", "create a blog about X", "schrijf een email-campagne"). NEVER use when pageContext.entityType === "deliverable" — that means the user is already in the Canvas of an existing deliverable; use `update_deliverable_brief` / `update_deliverable_content_inputs` / `update_deliverable_visual_brief` to fill THAT deliverable instead. Phrases like "vul de velden", "geef suggesties voor de brief", "fill the form" on an existing canvas mean EDIT THE CURRENT deliverable, not create new ones. After creation the user is auto-navigated to the Content Canvas. Pass `contentType` as a kebab-case slug from the deliverable-types catalog. Include briefing details in `brief` so Canvas opens with context pre-filled.',
    inputSchema: z.object({
      campaignId: z.string().describe('Campaign ID this deliverable belongs to. Required — create_campaign first if no campaign exists.'),
      contentType: z.string().describe('Content type slug, kebab-case (e.g. "linkedin-post", "blog-post", "email-campaign", "video-script")'),
      title: z.string().optional().describe('Optional title — defaults to the content type label'),
      brief: z.object({
        objective: z.string().optional().describe('What this content should achieve'),
        keyMessage: z.string().optional().describe('Core message to land'),
        toneDirection: z.string().optional().describe('Tone hint (e.g. "punchy and direct")'),
        callToAction: z.string().optional().describe('Desired CTA'),
      }).optional().describe('Briefing fields to pre-fill in the Canvas Step 1'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as {
        campaignId: string;
        contentType: string;
        title?: string;
        brief?: Record<string, string | undefined>;
      };
      // Workspace-gescoped: buildProposal is via de agents-tool-bridge ook
      // met model-gecontroleerde ids bereikbaar — geen cross-tenant titels.
      const campaign = await prisma.campaign.findFirst({
        where: { id: p.campaignId, workspaceId: ctx.workspaceId },
        select: { title: true },
      });
      const title = p.title ?? p.contentType;
      const changes: MutationProposal['changes'] = [
        { field: 'contentType', label: 'Type', currentValue: null, proposedValue: p.contentType },
        { field: 'title', label: 'Title', currentValue: null, proposedValue: title },
      ];
      if (campaign?.title) {
        changes.push({ field: 'campaign', label: 'Campaign', currentValue: null, proposedValue: campaign.title });
      }
      if (p.brief?.objective) changes.push({ field: 'objective', label: 'Objective', currentValue: null, proposedValue: p.brief.objective });
      if (p.brief?.keyMessage) changes.push({ field: 'keyMessage', label: 'Key message', currentValue: null, proposedValue: p.brief.keyMessage });
      if (p.brief?.toneDirection) changes.push({ field: 'toneDirection', label: 'Tone', currentValue: null, proposedValue: p.brief.toneDirection });
      if (p.brief?.callToAction) changes.push({ field: 'callToAction', label: 'Call to action', currentValue: null, proposedValue: p.brief.callToAction });
      return {
        toolCallId: '', toolName: 'create_deliverable', params,
        description: `Create ${p.contentType} in "${campaign?.title ?? 'campaign'}" — opens the Content Canvas`,
        entityType: 'Deliverable', entityName: title, changes,
      };
    },
    execute: async (params, ctx) => {
      const p = params as {
        campaignId: string;
        contentType: string;
        title?: string;
        brief?: { objective?: string; keyMessage?: string; toneDirection?: string; callToAction?: string };
      };

      // Verify campaign ownership — Claw operates per-workspace so cross-
      // workspace deliverable creation would be a privilege escalation.
      const campaign = await prisma.campaign.findFirst({
        where: { id: p.campaignId, workspaceId: ctx.workspaceId },
        select: { id: true, title: true, isLocked: true },
      });
      if (!campaign) {
        throw new Error('Campaign not found in this workspace');
      }
      if (campaign.isLocked) {
        throw new Error(`Campaign "${campaign.title}" is locked. Unlock it first.`);
      }

      const title = (p.title ?? p.contentType).trim() || p.contentType;
      const briefSettings: Record<string, string> = {};
      if (p.brief?.objective) briefSettings.objective = p.brief.objective;
      if (p.brief?.keyMessage) briefSettings.keyMessage = p.brief.keyMessage;
      if (p.brief?.toneDirection) briefSettings.toneDirection = p.brief.toneDirection;
      if (p.brief?.callToAction) briefSettings.callToAction = p.brief.callToAction;

      const settings: Record<string, unknown> = {};
      if (Object.keys(briefSettings).length > 0) {
        settings.brief = briefSettings;
      }

      const deliverable = await prisma.deliverable.create({
        data: {
          title,
          contentType: p.contentType,
          campaignId: p.campaignId,
          status: 'NOT_STARTED',
          progress: 0,
          approvalStatus: 'DRAFT',
          ...(Object.keys(settings).length > 0 ? { settings } : {}),
        },
        select: { id: true, title: true, contentType: true },
      });

      invalidateCache(cacheKeys.prefixes.campaigns(ctx.workspaceId));
      invalidateDashboard(ctx.workspaceId);
      return {
        success: true,
        deliverableId: deliverable.id,
        deliverableTitle: deliverable.title,
        campaignId: p.campaignId,
        // clientAction tells MutationConfirmCard to auto-navigate after the
        // user confirms — no "View →" toast click needed for content creation.
        clientAction: 'navigate_to_canvas',
        message: `Created ${deliverable.contentType} "${deliverable.title}" — opening Canvas`,
      };
    },
  },

  // ─── Update Deliverable Brief ────────────────────────────
  // Step 1 Content Brief in the Canvas writes its four briefing fields
  // (objective / keyMessage / toneDirection / callToAction) into
  // Deliverable.settings.brief. This tool lets Claw fill those fields when
  // the user is on a Canvas page — pairs with `inspect_current_entity`
  // entityType=deliverable for empty-field detection.
  {
    name: 'update_deliverable_brief',
    description:
      'Fill or update the four Content Brief fields for a deliverable: objective, keyMessage, toneDirection, callToAction. Use when the user is on the Canvas Step 1 (Review Context) and asks to fill in the brief OR asks generic things like "vul de velden", "vul de brief", "vul de content brief", "fill the brief", "fill the content brief", "fill the form", "geef suggesties voor deze brief", "complete the brief". The phrase "content brief" specifically refers to THIS tool (objective/keyMessage/toneDirection/callToAction) — NEVER route "content brief" to update_deliverable_visual_brief. Always inspect_current_entity first (entityType=deliverable) to see what is already filled. IMPORTANT: when the user asks to fill the brief, propose values for ALL FOUR fields (objective + keyMessage + toneDirection + callToAction) in a single call unless one of them is already non-empty AND the user did not explicitly ask to overwrite. Partial proposals frustrate users — they expect a complete brief from one request. Ground proposed values in brand context and persona psychographics. On any "vul de brief" / "vul de content brief" / "geef suggesties" request: ALSO call update_deliverable_content_inputs in parallel for the type-specific fields (SEO keyword, hook strategy, etc.). Two calls in one turn.',
    inputSchema: z.object({
      deliverableId: z.string().describe('The deliverable ID from the Current Page context'),
      objective: z.string().max(2000).optional().describe('What this content should achieve. Concrete and outcome-focused.'),
      keyMessage: z.string().max(2000).optional().describe('The single thing the audience should take away.'),
      toneDirection: z.string().max(2000).optional().describe('Voice / tone steer — e.g. "authoritative, journalistic" or "warm, conversational".'),
      callToAction: z.string().max(2000).optional().describe('What the audience should do next. Concrete + verb-first.'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as {
        deliverableId: string;
        objective?: string; keyMessage?: string;
        toneDirection?: string; callToAction?: string;
      };
      const deliverable = await prisma.deliverable.findFirst({
        where: { id: p.deliverableId },
        include: { campaign: { select: { workspaceId: true, title: true } } },
      });
      if (!deliverable || deliverable.campaign.workspaceId !== ctx.workspaceId) {
        throw new Error('Deliverable not found in this workspace');
      }
      const existing = (deliverable.settings as { brief?: Record<string, string> } | null)?.brief ?? {};
      const fields: Array<{ key: 'objective' | 'keyMessage' | 'toneDirection' | 'callToAction'; label: string }> = [
        { key: 'objective', label: 'Objective' },
        { key: 'keyMessage', label: 'Key message' },
        { key: 'toneDirection', label: 'Tone direction' },
        { key: 'callToAction', label: 'Call to action' },
      ];
      const changes = fields
        .filter((f) => p[f.key] !== undefined && p[f.key] !== '')
        .map((f) => ({
          field: f.key,
          label: f.label,
          currentValue: existing[f.key] ?? null,
          proposedValue: p[f.key]!,
        }));
      return {
        toolCallId: '',
        toolName: 'update_deliverable_brief',
        params,
        description: `Fill ${changes.length} brief field${changes.length === 1 ? '' : 's'} on "${deliverable.title}"`,
        entityType: 'Deliverable',
        entityId: p.deliverableId,
        entityName: deliverable.title,
        changes,
      };
    },
    execute: async (params, ctx) => {
      const p = params as {
        deliverableId: string;
        objective?: string; keyMessage?: string;
        toneDirection?: string; callToAction?: string;
      };

      const deliverable = await prisma.deliverable.findFirst({
        where: { id: p.deliverableId },
        include: { campaign: { select: { workspaceId: true } } },
      });
      if (!deliverable || deliverable.campaign.workspaceId !== ctx.workspaceId) {
        throw new Error('Deliverable not found in this workspace');
      }

      const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
      const brief = { ...((settings.brief ?? {}) as Record<string, string>) };
      let touched = 0;
      for (const k of ['objective', 'keyMessage', 'toneDirection', 'callToAction'] as const) {
        const v = p[k];
        if (typeof v === 'string' && v.trim()) {
          brief[k] = v;
          touched++;
        }
      }
      if (touched === 0) return { success: false, message: 'No briefing fields provided' };

      await prisma.deliverable.update({
        where: { id: p.deliverableId },
        data: { settings: { ...settings, brief } },
      });
      invalidateDashboard(ctx.workspaceId);
      return {
        success: true,
        message: `Updated ${touched} brief field${touched === 1 ? '' : 's'}`,
        deliverableId: p.deliverableId,
      };
    },
  },

  // ─── Update Deliverable Visual Brief ─────────────────────
  // Canvas Step 1 Visual Brief lives in Deliverable.settings.visualBrief.
  // Source picks the image-pipeline route at generate-time; styleDirection
  // (one of 8 canonical chips) drives both text-prompt mediumConfig AND
  // image-prompt composition rules via canvas-orchestrator's rich mapping.
  // styleDirectionFreeText is a fallback when no chip fits — both can be
  // set together (chip + extra direction).
  {
    name: 'update_deliverable_visual_brief',
    description:
      'Fill or update the Visual Brief for a deliverable on Canvas Step 1: source (which image pipeline runs) + styleDirection (one canonical chip from 8) + optional free-text. RESERVED for EXPLICIT user requests like "vul de visual brief", "stel de visual brief in", "kies een chip", "set the photo brief", "pick the visual style", "fill the visual brief". The trigger phrase MUST contain the word "visual" — phrases like "vul de brief", "vul de content brief", "fill the brief", "fill the content brief", "vul de velden", "geef suggesties" do NOT trigger this tool (they route to update_deliverable_brief + update_deliverable_content_inputs instead). The Visual Brief has its own user-driven button ("Suggest setup from content") and should stay untouched on non-visual fill commands. Always inspect_current_entity first to see `visualBriefValidStyles` and `visualBriefValidSources` — only send valid values. Set styleDirection to null to clear an existing chip; pass styleDirectionFreeText for additional mood notes that complement the chip.',
    inputSchema: z.object({
      deliverableId: z.string().describe('The deliverable ID from the Current Page context'),
      source: z
        .enum(['generate', 'library', 'compose', 'trained-style', 'none'])
        .optional()
        .describe('Visual pipeline source. Phase 1 supports `generate` and `none`; the others are placeholders.'),
      styleDirection: z
        .enum(['lifestyle', 'product-shot', 'quote-text', 'behind-the-scenes', 'ugc', 'infographic', 'illustration', 'data-driven'])
        .nullable()
        .optional()
        .describe('Canonical style chip — null clears any existing chip.'),
      styleDirectionFreeText: z
        .string()
        .max(1000)
        .nullable()
        .optional()
        .describe('Free-text mood / composition notes that complement (or replace) the chip.'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as {
        deliverableId: string;
        source?: string;
        styleDirection?: string | null;
        styleDirectionFreeText?: string | null;
      };
      const deliverable = await prisma.deliverable.findFirst({
        where: { id: p.deliverableId },
        include: { campaign: { select: { workspaceId: true, title: true } } },
      });
      if (!deliverable || deliverable.campaign.workspaceId !== ctx.workspaceId) {
        throw new Error('Deliverable not found in this workspace');
      }
      const existing = ((deliverable.settings as { visualBrief?: Record<string, unknown> } | null)?.visualBrief) ?? {};
      const changes: Array<{ field: string; label: string; currentValue: string | null; proposedValue: string }> = [];
      if (p.source !== undefined) {
        changes.push({
          field: 'source',
          label: 'Visual source',
          currentValue: (existing.source as string | undefined) ?? 'generate',
          proposedValue: p.source,
        });
      }
      if (p.styleDirection !== undefined) {
        changes.push({
          field: 'styleDirection',
          label: 'Style direction',
          currentValue: (existing.styleDirection as string | null | undefined) ?? null,
          proposedValue: p.styleDirection ?? '(cleared)',
        });
      }
      if (p.styleDirectionFreeText !== undefined) {
        changes.push({
          field: 'styleDirectionFreeText',
          label: 'Free-text direction',
          currentValue: (existing.styleDirectionFreeText as string | null | undefined) ?? null,
          proposedValue: p.styleDirectionFreeText ?? '(cleared)',
        });
      }
      return {
        toolCallId: '',
        toolName: 'update_deliverable_visual_brief',
        params,
        description: `Update Visual Brief on "${deliverable.title}"`,
        entityType: 'Deliverable',
        entityId: p.deliverableId,
        entityName: deliverable.title,
        changes,
      };
    },
    execute: async (params, ctx) => {
      const p = params as {
        deliverableId: string;
        source?: string;
        styleDirection?: string | null;
        styleDirectionFreeText?: string | null;
      };

      const deliverable = await prisma.deliverable.findFirst({
        where: { id: p.deliverableId },
        include: { campaign: { select: { workspaceId: true } } },
      });
      if (!deliverable || deliverable.campaign.workspaceId !== ctx.workspaceId) {
        throw new Error('Deliverable not found in this workspace');
      }

      const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
      const existing = (settings.visualBrief ?? {}) as Record<string, unknown>;
      const visualBrief: Record<string, unknown> = {
        source: existing.source ?? 'generate',
        styleDirection: existing.styleDirection ?? null,
        styleDirectionFreeText: existing.styleDirectionFreeText ?? null,
        ...(existing.generate ? { generate: existing.generate } : {}),
        ...(existing.library ? { library: existing.library } : {}),
        ...(existing.compose ? { compose: existing.compose } : {}),
        ...(existing.trained ? { trained: existing.trained } : {}),
      };

      let touched = 0;
      if (p.source !== undefined) { visualBrief.source = p.source; touched++; }
      if (p.styleDirection !== undefined) { visualBrief.styleDirection = p.styleDirection; touched++; }
      if (p.styleDirectionFreeText !== undefined) { visualBrief.styleDirectionFreeText = p.styleDirectionFreeText; touched++; }

      if (touched === 0) return { success: false, message: 'No visual brief fields provided' };

      await prisma.deliverable.update({
        where: { id: p.deliverableId },
        data: { settings: { ...settings, visualBrief } },
      });
      invalidateDashboard(ctx.workspaceId);
      return {
        success: true,
        message: `Updated ${touched} visual brief field${touched === 1 ? '' : 's'}`,
        deliverableId: p.deliverableId,
      };
    },
  },

  // ─── Update Deliverable Content-Type Inputs ──────────────
  // Type-specific input fields (SEO keyword, hashtag strategy, structure,
  // etc.) live in Deliverable.settings.contentTypeInputs as a flat
  // key/value map. This tool sets one or more of those keys. Field keys
  // are defined per content type in
  // src/features/campaigns/lib/content-type-inputs.ts — the AI sees the
  // available keys via inspect_current_entity (deliverable).
  //
  // IMPORTANT: tone, callToAction (the CTA copy itself), visualStyle,
  // visualDirection and contentStyle are NOT in this registry — they
  // moved to update_deliverable_brief and update_deliverable_visual_brief.
  // Stale keys are rejected at write-time with a list of valid keys
  // returned in the result so the AI corrects course.
  {
    name: 'update_deliverable_content_inputs',
    description:
      'Fill or update type-specific Content Brief inputs on a deliverable. Keys depend on content type. **Always call `inspect_current_entity` first** — its `availableContentTypeFields` array gives you each empty key with `label`, `type`, `aiHint` (concrete derivation guidance — read it carefully), `options` (allowed values for select-type fields), `category`, and `helpText`. Use ONLY keys from `availableContentTypeKeys` (or already in `contentTypeInputs`). **Categories you MUST fill on a broad "vul de velden" request** (skipping any without good reason): `conversion-hook`, `authority-frame`, `narrative-anchor`, `structure-skeleton`, `seo`, **`content-style`** (footageType, textOverlay, colorGrade, captionStyle, hookStrategy, etc. — these are PART of the Content Brief, not the Visual Brief), `engagement`, `campaign-details`, `format-specs`, `audience`, `creative-direction`. The Visual Brief tool (`update_deliverable_visual_brief`) handles ONLY the Step 1 chip selection (lifestyle / quote-text / infographic / etc.). For tone / CTA wording use `update_deliverable_brief`. **Select-type fields MUST receive one of the `options` strings verbatim** — never a paraphrase. Boolean fields use true/false; arrays use string lists; everything else is a string. If a field has an `aiHint`, ground your value in it.',
    inputSchema: z.object({
      deliverableId: z.string().describe('The deliverable ID from the Current Page context'),
      updates: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
        .describe('Map of contentTypeInput key → value. Keys must come from inspect_current_entity output.'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as {
        deliverableId: string;
        updates: Record<string, unknown>;
      };
      const deliverable = await prisma.deliverable.findFirst({
        where: { id: p.deliverableId },
        include: { campaign: { select: { workspaceId: true, title: true } } },
      });
      if (!deliverable || deliverable.campaign.workspaceId !== ctx.workspaceId) {
        throw new Error('Deliverable not found in this workspace');
      }
      const existing = ((deliverable.settings as { contentTypeInputs?: Record<string, unknown> } | null)?.contentTypeInputs) ?? {};
      const changes = Object.entries(p.updates).map(([field, value]) => ({
        field,
        label: field,
        currentValue: existing[field] != null ? String(existing[field]) : null,
        proposedValue: Array.isArray(value) ? value.join(', ') : String(value),
      }));
      return {
        toolCallId: '',
        toolName: 'update_deliverable_content_inputs',
        params,
        description: `Fill ${changes.length} type-specific input${changes.length === 1 ? '' : 's'} on "${deliverable.title}"`,
        entityType: 'Deliverable',
        entityId: p.deliverableId,
        entityName: deliverable.title,
        changes,
      };
    },
    execute: async (params, ctx) => {
      const p = params as {
        deliverableId: string;
        updates: Record<string, unknown>;
      };

      const deliverable = await prisma.deliverable.findFirst({
        where: { id: p.deliverableId },
        include: { campaign: { select: { workspaceId: true } } },
      });
      if (!deliverable || deliverable.campaign.workspaceId !== ctx.workspaceId) {
        throw new Error('Deliverable not found in this workspace');
      }

      // Whitelist incoming keys against the active registry. Stale keys
      // (left over from old prompts: tone / ctaStyle / visualStyle /
      // contentStyle / visualDirection / etc.) get rejected and reported
      // back so the AI corrects course on the next turn.
      const { getContentTypeInputs } = await import('@/features/campaigns/lib/content-type-inputs');
      const validKeys = new Set(
        getContentTypeInputs(deliverable.contentType).map((f) => f.key),
      );

      const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
      const contentTypeInputs = {
        ...((settings.contentTypeInputs ?? {}) as Record<string, unknown>),
      };
      let touched = 0;
      const rejectedKeys: string[] = [];
      for (const [k, v] of Object.entries(p.updates)) {
        if (v == null) continue;
        if (!validKeys.has(k)) {
          rejectedKeys.push(k);
          continue;
        }
        // Coerce to one of the four allowed shapes per ContentTypeInputValue
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          contentTypeInputs[k] = v;
          touched++;
        } else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
          contentTypeInputs[k] = v;
          touched++;
        }
      }

      if (touched === 0) {
        return {
          success: false,
          message: rejectedKeys.length > 0
            ? `No valid keys for content type "${deliverable.contentType}". Rejected: ${rejectedKeys.join(', ')}. Valid keys: ${Array.from(validKeys).join(', ') || '(none — this type has no contentTypeInputs)'}.`
            : 'No valid inputs provided',
          rejectedKeys,
          validKeys: Array.from(validKeys),
        };
      }

      await prisma.deliverable.update({
        where: { id: p.deliverableId },
        data: { settings: { ...settings, contentTypeInputs } },
      });
      invalidateDashboard(ctx.workspaceId);
      return {
        success: true,
        message: rejectedKeys.length > 0
          ? `Updated ${touched} content input${touched === 1 ? '' : 's'}; rejected ${rejectedKeys.length} unknown key${rejectedKeys.length === 1 ? '' : 's'}: ${rejectedKeys.join(', ')}. Use update_deliverable_brief for tone/CTA, update_deliverable_visual_brief for visual style.`
          : `Updated ${touched} content input${touched === 1 ? '' : 's'}`,
        deliverableId: p.deliverableId,
        rejectedKeys: rejectedKeys.length > 0 ? rejectedKeys : undefined,
      };
    },
  },

  // ─── Create Campaign ─────────────────────────────────────
  // Path 2 fix (2026-04-25): paired with create_deliverable so the user can
  // start fresh from chat — "begin a campaign for our Q2 launch" creates
  // a STRATEGIC shell that the user then drops content into via subsequent
  // create_deliverable calls (or via the campaign wizard if they want the
  // full strategy pipeline). Kept deliberately minimal — title + a few
  // optional steering fields. The deeper strategy content gets filled in
  // the wizard, not via this tool.
  {
    name: 'create_campaign',
    description:
      'Create a new STRATEGIC campaign shell in this workspace. Use when the user asks to start a campaign and no fitting one exists yet (check `list_campaigns` first). Returns the campaign ID so you can immediately call `create_deliverable` for it. Keep title focused — descriptive name that fits the user\'s intent (e.g. "Q2 Product Launch", "Spring Brand Refresh").',
    inputSchema: z.object({
      title: z.string().describe('Campaign title — short and descriptive'),
      description: z.string().optional().describe('One-sentence summary of what the campaign is for'),
      campaignGoalType: z.string().optional().describe('Goal type slug if you can infer it (BRAND_AWARENESS, PRODUCT_LAUNCH, THOUGHT_LEADERSHIP, etc.). Leave empty if unclear — the user can pick later.'),
      startDate: z.string().optional().describe('ISO date string (YYYY-MM-DD) for campaign start, if the user mentioned timing'),
      endDate: z.string().optional().describe('ISO date string (YYYY-MM-DD) for campaign end'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params) => {
      const p = params as {
        title: string;
        description?: string;
        campaignGoalType?: string;
        startDate?: string;
        endDate?: string;
      };
      const changes: MutationProposal['changes'] = [
        { field: 'title', label: 'Title', currentValue: null, proposedValue: p.title },
        { field: 'type', label: 'Type', currentValue: null, proposedValue: 'STRATEGIC' },
      ];
      if (p.description) changes.push({ field: 'description', label: 'Description', currentValue: null, proposedValue: p.description });
      if (p.campaignGoalType) changes.push({ field: 'campaignGoalType', label: 'Goal', currentValue: null, proposedValue: p.campaignGoalType });
      if (p.startDate) changes.push({ field: 'startDate', label: 'Start date', currentValue: null, proposedValue: p.startDate });
      if (p.endDate) changes.push({ field: 'endDate', label: 'End date', currentValue: null, proposedValue: p.endDate });
      return {
        toolCallId: '', toolName: 'create_campaign', params,
        description: `Create campaign "${p.title}" — opens it after creation`,
        entityType: 'Campaign', entityName: p.title, changes,
      };
    },
    execute: async (params, ctx) => {
      const p = params as {
        title: string;
        description?: string;
        campaignGoalType?: string;
        startDate?: string;
        endDate?: string;
      };
      const title = p.title.trim();
      if (!title) throw new Error('Campaign title is required');

      // Slug pattern matches POST /api/campaigns — kebab-case + timestamp
      // suffix to avoid collisions. The user-visible name is `title`.
      const slugBase = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60);
      const slug = `${slugBase || 'campaign'}-${Date.now().toString(36)}`;

      const campaign = await prisma.campaign.create({
        data: {
          title,
          slug,
          type: 'STRATEGIC',
          status: 'ACTIVE',
          description: p.description ?? null,
          campaignGoalType: p.campaignGoalType ?? null,
          startDate: p.startDate ? new Date(p.startDate) : null,
          endDate: p.endDate ? new Date(p.endDate) : null,
          workspaceId: ctx.workspaceId,
        },
        select: { id: true, title: true },
      });

      invalidateCache(cacheKeys.prefixes.campaigns(ctx.workspaceId));
      invalidateDashboard(ctx.workspaceId);
      return {
        success: true,
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        // Same auto-navigate hook as create_deliverable, but lands on the
        // campaign-mode content library instead of the Canvas.
        clientAction: 'navigate_to_campaign',
        message: `Campaign "${campaign.title}" created — opening it`,
      };
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
      const p = params as { title: string; description: string; category?: string; impactLevel?: string };
      const changes: MutationProposal['changes'] = [
        { field: 'title', label: 'Title', currentValue: null, proposedValue: p.title },
        { field: 'description', label: 'Description', currentValue: null, proposedValue: p.description },
      ];
      if (p.category) changes.push({ field: 'category', label: 'Category', currentValue: null, proposedValue: p.category });
      if (p.impactLevel) changes.push({ field: 'impactLevel', label: 'Impact', currentValue: null, proposedValue: p.impactLevel });
      return {
        toolCallId: '', toolName: 'create_trend', params,
        description: `Add trend "${p.title}" to radar`,
        entityType: 'DetectedTrend', entityName: p.title, changes,
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
      return {
        success: true,
        trendId: trend.id,
        trendTitle: trend.title,
        message: `Trend "${trend.title}" created`,
      };
    },
  },

  // ─── Create Product ──────────────────────────────────────
  {
    name: 'create_product',
    description:
      'Create a new product or service in this workspace. Provide name plus any known description, category, pricing, features, benefits, and use cases. All but name are optional — the user can enrich later on the product detail page.',
    inputSchema: z.object({
      name: z.string().describe('Product or service name'),
      description: z.string().optional().describe('Short description of what the product does'),
      category: z.string().optional().describe('Category (e.g. Digital Platform, Consulting Service, Mobile App)'),
      pricingModel: z.string().optional().describe('Pricing model (e.g. Subscription, One-time, Tiered)'),
      pricingDetails: z.string().optional().describe('Pricing specifics in plain text'),
      features: z.array(z.string()).optional().describe('List of product features'),
      benefits: z.array(z.string()).optional().describe('List of customer benefits'),
      useCases: z.array(z.string()).optional().describe('List of typical use cases'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params) => {
      const p = params as {
        name: string;
        description?: string;
        category?: string;
        pricingModel?: string;
        pricingDetails?: string;
        features?: string[];
        benefits?: string[];
        useCases?: string[];
      };
      const changes: MutationProposal['changes'] = [
        { field: 'name', label: 'Name', currentValue: null, proposedValue: p.name },
      ];
      if (p.description) changes.push({ field: 'description', label: 'Description', currentValue: null, proposedValue: p.description });
      if (p.category) changes.push({ field: 'category', label: 'Category', currentValue: null, proposedValue: p.category });
      if (p.pricingModel) changes.push({ field: 'pricingModel', label: 'Pricing model', currentValue: null, proposedValue: p.pricingModel });
      if (p.pricingDetails) changes.push({ field: 'pricingDetails', label: 'Pricing details', currentValue: null, proposedValue: p.pricingDetails });
      if (p.features?.length) changes.push({ field: 'features', label: 'Features', currentValue: null, proposedValue: p.features.join(' • ') });
      if (p.benefits?.length) changes.push({ field: 'benefits', label: 'Benefits', currentValue: null, proposedValue: p.benefits.join(' • ') });
      if (p.useCases?.length) changes.push({ field: 'useCases', label: 'Use cases', currentValue: null, proposedValue: p.useCases.join(' • ') });
      return {
        toolCallId: '', toolName: 'create_product', params,
        description: `Create new product "${p.name}"`,
        entityType: 'Product', entityName: p.name, changes,
      };
    },
    execute: async (params, ctx) => {
      const p = params as {
        name: string;
        description?: string;
        category?: string;
        pricingModel?: string;
        pricingDetails?: string;
        features?: string[];
        benefits?: string[];
        useCases?: string[];
      };

      let slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!slug) slug = `product-${Date.now()}`;
      const existing = await prisma.product.findUnique({ where: { slug } });
      if (existing) slug = `${slug}-${Date.now().toString(36)}`;

      const product = await prisma.product.create({
        data: {
          name: p.name,
          slug,
          description: p.description ?? null,
          category: p.category ?? null,
          pricingModel: p.pricingModel ?? null,
          pricingDetails: p.pricingDetails ?? null,
          features: p.features ?? [],
          benefits: p.benefits ?? [],
          useCases: p.useCases ?? [],
          workspaceId: ctx.workspaceId,
        },
      });
      invalidateCache(cacheKeys.prefixes.products(ctx.workspaceId));
      invalidateDashboard(ctx.workspaceId);
      return {
        success: true,
        productId: product.id,
        productName: product.name,
        message: `Product "${product.name}" created`,
      };
    },
  },

  // ─── Create Competitor ───────────────────────────────────
  {
    name: 'create_competitor',
    description:
      'Create a new competitor entry. Provide name plus any known website, tier (DIRECT, INDIRECT, ASPIRATIONAL), value proposition, differentiators, strengths, weaknesses, and target audience.',
    inputSchema: z.object({
      name: z.string().describe('Competitor name'),
      websiteUrl: z.string().optional().describe('Full URL with scheme'),
      tagline: z.string().optional(),
      description: z.string().optional(),
      tier: z.enum(['DIRECT', 'INDIRECT', 'ASPIRATIONAL']).optional().describe('Competitor tier'),
      valueProposition: z.string().optional(),
      targetAudience: z.string().optional(),
      differentiators: z.array(z.string()).optional(),
      strengths: z.array(z.string()).optional(),
      weaknesses: z.array(z.string()).optional(),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params) => {
      const p = params as {
        name: string;
        websiteUrl?: string;
        tagline?: string;
        description?: string;
        tier?: 'DIRECT' | 'INDIRECT' | 'ASPIRATIONAL';
        valueProposition?: string;
        targetAudience?: string;
        differentiators?: string[];
        strengths?: string[];
        weaknesses?: string[];
      };
      const changes: MutationProposal['changes'] = [
        { field: 'name', label: 'Name', currentValue: null, proposedValue: p.name },
      ];
      if (p.websiteUrl) changes.push({ field: 'websiteUrl', label: 'Website', currentValue: null, proposedValue: p.websiteUrl });
      if (p.tier) changes.push({ field: 'tier', label: 'Tier', currentValue: null, proposedValue: p.tier });
      if (p.tagline) changes.push({ field: 'tagline', label: 'Tagline', currentValue: null, proposedValue: p.tagline });
      if (p.description) changes.push({ field: 'description', label: 'Description', currentValue: null, proposedValue: p.description });
      if (p.valueProposition) changes.push({ field: 'valueProposition', label: 'Value proposition', currentValue: null, proposedValue: p.valueProposition });
      if (p.targetAudience) changes.push({ field: 'targetAudience', label: 'Target audience', currentValue: null, proposedValue: p.targetAudience });
      if (p.differentiators?.length) changes.push({ field: 'differentiators', label: 'Differentiators', currentValue: null, proposedValue: p.differentiators.join(' • ') });
      if (p.strengths?.length) changes.push({ field: 'strengths', label: 'Strengths', currentValue: null, proposedValue: p.strengths.join(' • ') });
      if (p.weaknesses?.length) changes.push({ field: 'weaknesses', label: 'Weaknesses', currentValue: null, proposedValue: p.weaknesses.join(' • ') });
      return {
        toolCallId: '', toolName: 'create_competitor', params,
        description: `Create new competitor "${p.name}"`,
        entityType: 'Competitor', entityName: p.name, changes,
      };
    },
    execute: async (params, ctx) => {
      const p = params as {
        name: string;
        websiteUrl?: string;
        tagline?: string;
        description?: string;
        tier?: 'DIRECT' | 'INDIRECT' | 'ASPIRATIONAL';
        valueProposition?: string;
        targetAudience?: string;
        differentiators?: string[];
        strengths?: string[];
        weaknesses?: string[];
      };

      let slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!slug) slug = `competitor-${Date.now()}`;
      const existing = await prisma.competitor.findUnique({
        where: { workspaceId_slug: { workspaceId: ctx.workspaceId, slug } },
      });
      if (existing) slug = `${slug}-${Date.now().toString(36)}`;

      const competitor = await prisma.competitor.create({
        data: {
          name: p.name,
          slug,
          tier: (p.tier ?? 'DIRECT') as never,
          websiteUrl: p.websiteUrl ?? null,
          tagline: p.tagline ?? null,
          description: p.description ?? null,
          valueProposition: p.valueProposition ?? null,
          targetAudience: p.targetAudience ?? null,
          differentiators: p.differentiators ?? [],
          strengths: p.strengths ?? [],
          weaknesses: p.weaknesses ?? [],
          workspaceId: ctx.workspaceId,
        },
      });
      invalidateCache(cacheKeys.prefixes.competitors(ctx.workspaceId));
      invalidateDashboard(ctx.workspaceId);
      return {
        success: true,
        competitorId: competitor.id,
        competitorName: competitor.name,
        message: `Competitor "${competitor.name}" created`,
      };
    },
  },

  // ─── Update Interview ─────────────────────────────────────
  {
    name: 'update_interview',
    description:
      'Update fields of an interview in progress. Use this when the Current Page shows an Interview Wizard snapshot — the snapshot notes contain the interviewId and assetId to pass here. Fields mirror the wizard snapshot keys: intervieweeName, intervieweePosition, intervieweeEmail, intervieweePhone, intervieweeCompany, scheduledDate (YYYY-MM-DD), scheduledTime (HH:MM), durationMinutes (number 15–180), generalNotes, title.',
    inputSchema: z.object({
      interviewId: z.string().describe('The interview ID (from wizard snapshot notes)'),
      assetId: z.string().describe('The brand asset ID this interview belongs to (from wizard snapshot notes)'),
      updates: z.object({
        title: z.string().optional(),
        intervieweeName: z.string().optional(),
        intervieweePosition: z.string().optional(),
        intervieweeEmail: z.string().optional(),
        intervieweePhone: z.string().optional(),
        intervieweeCompany: z.string().optional(),
        scheduledDate: z.string().optional(),
        scheduledTime: z.string().optional(),
        durationMinutes: z.number().optional(),
        generalNotes: z.string().optional(),
      }).describe('Fields to update'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as {
        interviewId: string;
        assetId: string;
        updates: Record<string, string | number | undefined>;
      };
      const interview = await prisma.interview.findFirst({
        where: { id: p.interviewId, workspaceId: ctx.workspaceId },
        select: {
          title: true,
          intervieweeName: true,
          intervieweePosition: true,
          intervieweeEmail: true,
          intervieweePhone: true,
          intervieweeCompany: true,
          scheduledDate: true,
          scheduledTime: true,
          durationMinutes: true,
          generalNotes: true,
        },
      });

      const labelFor: Record<string, string> = {
        title: 'Title',
        intervieweeName: 'Interviewee name',
        intervieweePosition: 'Interviewee position',
        intervieweeEmail: 'Interviewee email',
        intervieweePhone: 'Interviewee phone',
        intervieweeCompany: 'Interviewee company',
        scheduledDate: 'Scheduled date',
        scheduledTime: 'Scheduled time',
        durationMinutes: 'Duration (minutes)',
        generalNotes: 'General notes',
      };

      const changes: MutationProposal['changes'] = [];
      for (const [field, proposed] of Object.entries(p.updates ?? {})) {
        if (proposed === undefined || proposed === '') continue;
        const current = interview?.[field as keyof typeof interview];
        changes.push({
          field,
          label: labelFor[field] ?? field,
          currentValue: current != null && current !== '' ? String(current) : null,
          proposedValue: String(proposed),
        });
      }

      const displayName = interview?.intervieweeName || interview?.title || 'Interview';
      return {
        toolCallId: '',
        toolName: 'update_interview',
        params,
        description: `Update ${changes.length} field${changes.length === 1 ? '' : 's'} on "${displayName}"`,
        entityType: 'Interview',
        entityId: p.interviewId,
        entityName: displayName,
        changes,
      };
    },
    execute: async (params, ctx) => {
      const p = params as {
        interviewId: string;
        assetId: string;
        updates: Record<string, string | number | undefined>;
      };

      // Ownership + asset check
      const existing = await prisma.interview.findFirst({
        where: { id: p.interviewId, brandAssetId: p.assetId, workspaceId: ctx.workspaceId },
        select: { id: true },
      });
      if (!existing) {
        return { success: false, message: 'Interview not found in this workspace' };
      }

      const STRING_FIELDS = [
        'title', 'intervieweeName', 'intervieweePosition', 'intervieweeEmail',
        'intervieweePhone', 'intervieweeCompany', 'scheduledDate', 'scheduledTime',
        'generalNotes',
      ] as const;

      const data: Record<string, unknown> = {};
      for (const f of STRING_FIELDS) {
        const v = p.updates[f];
        if (v === undefined) continue;
        data[f] = v === '' ? null : String(v);
      }
      const dur = p.updates.durationMinutes;
      if (typeof dur === 'number' && dur >= 15 && dur <= 180) {
        data.durationMinutes = Math.round(dur);
      }

      await prisma.interview.update({ where: { id: p.interviewId }, data });
      invalidateDashboard(ctx.workspaceId);
      return { success: true, interviewId: p.interviewId, message: 'Interview updated' };
    },
  },

  // ─── Link Persona to Product ─────────────────────────────
  {
    name: 'link_persona_to_product',
    description:
      'Link an existing persona to an existing product — i.e. declare that this persona is a target audience for this product. Call read_personas and read_products first if you need IDs.',
    inputSchema: z.object({
      personaId: z.string().describe('Persona ID'),
      productId: z.string().describe('Product ID'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as { personaId: string; productId: string };
      const [persona, product] = await Promise.all([
        prisma.persona.findFirst({ where: { id: p.personaId, workspaceId: ctx.workspaceId }, select: { name: true } }),
        prisma.product.findFirst({ where: { id: p.productId, workspaceId: ctx.workspaceId }, select: { name: true } }),
      ]);
      const personaLabel = persona?.name ?? 'Unknown persona';
      const productLabel = product?.name ?? 'Unknown product';
      return {
        toolCallId: '', toolName: 'link_persona_to_product', params,
        description: `Link persona "${personaLabel}" to product "${productLabel}"`,
        entityType: 'ProductPersona',
        entityName: `${personaLabel} → ${productLabel}`,
        changes: [
          { field: 'persona', label: 'Persona', currentValue: null, proposedValue: personaLabel },
          { field: 'product', label: 'Product', currentValue: null, proposedValue: productLabel },
        ],
      };
    },
    execute: async (params, ctx) => {
      const p = params as { personaId: string; productId: string };
      // Validate both belong to the workspace before linking
      const [persona, product] = await Promise.all([
        prisma.persona.findFirst({ where: { id: p.personaId, workspaceId: ctx.workspaceId }, select: { id: true, name: true } }),
        prisma.product.findFirst({ where: { id: p.productId, workspaceId: ctx.workspaceId }, select: { id: true, name: true } }),
      ]);
      if (!persona || !product) {
        return { success: false, message: 'Persona or product not found in this workspace' };
      }

      // Upsert so calling twice is idempotent
      await prisma.productPersona.upsert({
        where: { productId_personaId: { productId: product.id, personaId: persona.id } },
        create: { productId: product.id, personaId: persona.id },
        update: {},
      });
      invalidateCache(cacheKeys.prefixes.products(ctx.workspaceId));
      return {
        success: true,
        productId: product.id,
        personaId: persona.id,
        message: `Linked "${persona.name}" to "${product.name}"`,
      };
    },
  },

  // ─── Update Landing Page Content (Puck web-page builder) ──
  // Canvas Step 3 Medium renders web-page types via Puck; the page tree lives
  // in Deliverable.settings.puckData. This tool lets Claw apply TARGETED TEXT
  // edits (headlines, body, CTA labels) to existing fields. Always pairs with
  // `read_landing_page_content` for path discovery. Persists via the same
  // hero-preserve chokepoint as the studio autosave so a text edit can never
  // clobber a generated hero image (audit 2026-06-08/09).
  {
    name: 'update_landing_page_content',
    description:
      'Apply targeted TEXT edits to a landing-page / web-page deliverable (Canvas Step 3 Medium, Puck builder). Use when the user asks to rewrite, shorten, sharpen, or fix copy on THE CURRENT page ("maak de hero-kop korter", "punchier CTA", "herschrijf de intro"). ALWAYS call `read_landing_page_content` first to get the exact paths + current values — only edit paths it returned; never invent paths or components. Text only: you cannot add/remove/reorder components, change layout, images, links, or colors. Provide the full new text per field (not a diff). Ground every rewrite in the brand voice + tone from context.',
    inputSchema: z.object({
      deliverableId: z.string().describe('The deliverable ID from the Current Page context.'),
      edits: z.array(z.object({
        path: z.string().describe('Exact field path from read_landing_page_content, e.g. `content[0].props.headline`.'),
        value: z.string().describe('The full new text for this field.'),
      })).min(1).describe('One entry per field to change — non-empty.'),
    }),
    requiresConfirmation: true,
    category: 'write',
    buildProposal: async (params, ctx) => {
      const p = params as { deliverableId: string; edits: Array<{ path: string; value: string }> };
      const deliverable = await prisma.deliverable.findFirst({
        where: { id: p.deliverableId },
        include: { campaign: { select: { workspaceId: true, title: true } } },
      });
      if (!deliverable || deliverable.campaign.workspaceId !== ctx.workspaceId) {
        throw new Error('Deliverable not found in this workspace');
      }
      const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
      // GEO Fase 3: isPuckRenderable laat long-form GEO (geo-doel aan) toe.
      const contentTypeInputs = (settings.contentTypeInputs ?? null) as Record<string, unknown> | null;
      if (!isPuckRenderable(deliverable.contentType, contentTypeInputs)) {
        throw new Error(`"${deliverable.title}" is a ${deliverable.contentType}, not a Puck-renderable page — text edits are not supported here.`);
      }
      const puckData = settings.puckData;
      if (!puckData || typeof puckData !== 'object') {
        throw new Error('This landing page has no generated layout yet — run Step 2 first.');
      }

      // Validate every path against the editable-text-field set so the model
      // can't target an invented path or a non-text prop (image/href/token).
      const allowed = new Set(collectEditableTextFields(puckData).map((f) => f.path));
      const invalid = p.edits.filter((e) => !allowed.has(e.path)).map((e) => e.path);
      if (invalid.length > 0) {
        throw new Error(`Unknown or non-editable path(s): ${invalid.join(', ')}. Call read_landing_page_content and use only the paths it returns.`);
      }

      const changes: MutationProposal['changes'] = p.edits.map((e) => {
        const current = readPath(puckData, e.path);
        return {
          field: e.path,
          label: e.path.replace(/^content\[\d+\]\.props\./, ''),
          currentValue: typeof current === 'string' ? current : null,
          proposedValue: e.value,
        };
      });

      return {
        toolCallId: '',
        toolName: 'update_landing_page_content',
        params,
        description: `Edit ${changes.length} text field${changes.length === 1 ? '' : 's'} on "${deliverable.title}"`,
        entityType: 'Deliverable',
        entityId: p.deliverableId,
        entityName: deliverable.title,
        changes,
      };
    },
    execute: async (params, ctx) => {
      const p = params as { deliverableId: string; edits: Array<{ path: string; value: string }> };
      const deliverable = await prisma.deliverable.findFirst({
        where: { id: p.deliverableId },
        include: { campaign: { select: { workspaceId: true } } },
      });
      if (!deliverable || deliverable.campaign.workspaceId !== ctx.workspaceId) {
        throw new Error('Deliverable not found in this workspace');
      }
      const existingSettings = (deliverable.settings ?? {}) as Record<string, unknown>;
      // GEO Fase 3: isPuckRenderable laat long-form GEO (geo-doel aan) toe.
      const contentTypeInputs = (existingSettings.contentTypeInputs ?? null) as Record<string, unknown> | null;
      if (!isPuckRenderable(deliverable.contentType, contentTypeInputs)) {
        throw new Error('Not a Puck-renderable page deliverable');
      }
      const puckData = existingSettings.puckData;
      if (!puckData || typeof puckData !== 'object') {
        throw new Error('This landing page has no generated layout yet');
      }

      // Re-validate paths server-side (defence in depth — execute may run on a
      // newer tree than buildProposal saw). De allowlist wordt bewust uit de
      // PRE-clone `puckData` afgeleid (identieke structuur als `updated` vóór de
      // edits); deepSet schrijft op de clone zodat het Prisma-resultaat ongemoeid blijft.
      const updated = structuredClone(puckData) as Record<string, unknown>;
      const allowed = new Set(collectEditableTextFields(puckData).map((f) => f.path));
      let touched = 0;
      for (const edit of p.edits) {
        if (!allowed.has(edit.path)) continue;
        deepSet(updated, edit.path, edit.value);
        touched++;
      }
      if (touched === 0) {
        return { success: false, message: 'No valid editable paths to update' };
      }

      // Hero-preserve chokepoint (audit 2026-06-08/09): write the new puckData
      // through the same guard the studio autosave uses so a text edit can
      // never clear an already-wired hero image.
      const incoming = { ...existingSettings, puckData: updated };
      const preserved = preserveHeroOnSettings(existingSettings, incoming);
      const mergedSettings = JSON.parse(JSON.stringify({ ...existingSettings, ...preserved }));

      await prisma.deliverable.update({
        where: { id: p.deliverableId },
        data: { settings: mergedSettings },
      });
      invalidateCache(cacheKeys.prefixes.campaigns(ctx.workspaceId));
      invalidateDashboard(ctx.workspaceId);
      return {
        success: true,
        deliverableId: p.deliverableId,
        message: `Updated ${touched} text field${touched === 1 ? '' : 's'} on the landing page`,
      };
    },
  },
];
