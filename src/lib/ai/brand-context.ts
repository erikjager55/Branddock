// =============================================================
// Brand Context Aggregator (R0.8)
//
// Collects brand data from 5 Prisma models into a single context
// block for AI prompts. Uses a 5-minute in-memory cache to avoid
// repeated DB reads within the same session.
//
// Models aggregated:
//  - BrandAsset (mission, vision, values, positioning)
//  - Persona (primary target audience description)
//  - Product (products overview)
//  - MarketInsight (competitive landscape summary)
//  - Workspace (brand name, industry)
// =============================================================

import { prisma } from '@/lib/prisma';
import type { BrandContextBlock } from './prompt-templates';

// ─── Cache ─────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: BrandContextBlock;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(workspaceId: string): BrandContextBlock | null {
  const entry = cache.get(workspaceId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(workspaceId);
    return null;
  }
  return entry.data;
}

function setCache(workspaceId: string, data: BrandContextBlock): void {
  cache.set(workspaceId, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Invalidate cached brand context for a workspace.
 * Call this when brand data is updated.
 */
export function invalidateBrandContext(workspaceId: string): void {
  cache.delete(workspaceId);
}

// ─── Aggregator ────────────────────────────────────────────

/**
 * Fetch and aggregate brand context from the database.
 * Returns a BrandContextBlock suitable for prompt injection.
 *
 * Cached for 5 minutes per workspace.
 */
export async function getBrandContext(workspaceId: string): Promise<BrandContextBlock> {
  // Check cache first
  const cached = getCached(workspaceId);
  if (cached) return cached;

  // Fetch all sources in parallel
  const [workspace, brandAssets, personas, products, insights] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    }),

    prisma.brandAsset.findMany({
      where: { workspaceId },
      select: { name: true, category: true, description: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
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

    prisma.marketInsight.findMany({
      where: { workspaceId },
      select: { title: true, category: true, impactLevel: true },
      orderBy: { relevanceScore: 'desc' },
      take: 5,
    }),
  ]);

  // Extract values from brand assets by category
  const assetsByCategory = new Map<string, string[]>();
  for (const asset of brandAssets) {
    const key = asset.category;
    const existing = assetsByCategory.get(key) ?? [];
    existing.push(asset.description || asset.name);
    assetsByCategory.set(key, existing);
  }

  // Build context block
  const ctx: BrandContextBlock = {
    brandName: workspace?.name,
  };

  // Mission & Vision from brand assets
  const missionAssets = assetsByCategory.get('MISSION') ?? assetsByCategory.get('PURPOSE');
  if (missionAssets?.length) ctx.brandMission = missionAssets[0];

  const visionAssets = assetsByCategory.get('VISION');
  if (visionAssets?.length) ctx.brandVision = visionAssets[0];

  // Values
  const valueAssets = assetsByCategory.get('VALUES') ?? assetsByCategory.get('CORE_VALUES');
  if (valueAssets?.length) ctx.brandValues = valueAssets;

  // Target audience from personas
  if (personas.length > 0) {
    const descriptions = personas.map((p) => {
      const parts = [p.name];
      if (p.occupation) parts.push(`(${p.occupation})`);
      return parts.join(' ');
    });
    ctx.targetAudience = descriptions.join('; ');
  }

  // Products overview
  if (products.length > 0) {
    const summaries = products.map((p) => {
      const parts = [p.name];
      if (p.category) parts.push(`[${p.category}]`);
      return parts.join(' ');
    });
    ctx.productsOverview = summaries.join(', ');
  }

  // Competitive landscape from market insights
  if (insights.length > 0) {
    const highImpact = insights.filter((i) => i.impactLevel === 'HIGH');
    const relevant = highImpact.length > 0 ? highImpact : insights.slice(0, 3);
    ctx.competitiveLandscape = relevant.map((i) => `${i.title} (${i.category})`).join('; ');
  }

  // Cache and return
  setCache(workspaceId, ctx);
  return ctx;
}
