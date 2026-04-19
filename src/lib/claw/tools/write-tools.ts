import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { deepSet } from '@/lib/utils/deep-set';
import type { ClawToolDefinition, MutationProposal } from '../claw.types';

// Helper: invalidate dashboard cache (always safe to call)
function invalidateDashboard(workspaceId: string) {
  invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
}

/**
 * Read a nested value using bracket notation (same syntax as deepSet).
 * Returns undefined if any segment doesn't exist.
 */
function readPath(obj: unknown, path: string): unknown {
  const segments = path.split('.');
  let cur: unknown = obj;
  for (const seg of segments) {
    if (cur === null || typeof cur !== 'object') return undefined;
    const arrMatch = seg.match(/^(.+)\[(\d+)\]$/);
    if (arrMatch) {
      const arrName = arrMatch[1];
      const idx = parseInt(arrMatch[2]);
      const container = (cur as Record<string, unknown>)[arrName];
      cur = Array.isArray(container) ? container[idx] : undefined;
    } else {
      cur = (cur as Record<string, unknown>)[seg];
    }
  }
  return cur;
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
      const existing = (asset?.frameworkData ?? {}) as Record<string, unknown>;

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

      await prisma.persona.update({ where: { id: p.personaId }, data });
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
];
