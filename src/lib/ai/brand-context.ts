// =============================================================
// Brand Context Aggregator (R0.8)
//
// Collects brand data from 5 Prisma models into a single context
// block for AI prompts. Uses a 5-minute in-memory cache to avoid
// repeated DB reads within the same session.
//
// Models aggregated:
//  - BrandAsset (all 12 canonical assets with content + framework data)
//  - Persona (primary target audience description)
//  - Product (products overview)
//  - DetectedTrend (competitive landscape summary, activated trends only)
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

// ─── Framework Data Formatters ─────────────────────────────

interface GoldenCircleData {
  why?: { statement?: string; details?: string };
  how?: { statement?: string; details?: string };
  what?: { statement?: string; details?: string };
}

interface PurposeWheelData {
  impactType?: string;
  mechanism?: string;
  mechanismCategory?: string;
  pressureTest?: string;
}

/** Format Golden Circle frameworkData into a readable string */
function formatGoldenCircle(data: GoldenCircleData): string {
  const parts: string[] = [];
  if (data.why?.statement) parts.push(`  - WHY: ${data.why.statement}`);
  if (data.how?.statement) parts.push(`  - HOW: ${data.how.statement}`);
  if (data.what?.statement) parts.push(`  - WHAT: ${data.what.statement}`);
  return parts.join('\n');
}

/** Format Purpose Wheel frameworkData into a readable string */
function formatPurposeWheel(data: PurposeWheelData): string {
  const parts: string[] = [];
  if (data.impactType) parts.push(`Impact Type: ${data.impactType}`);
  if (data.mechanismCategory) parts.push(`Mechanism: ${data.mechanismCategory}`);
  if (data.mechanism) parts.push(`How: ${data.mechanism}`);
  if (data.pressureTest) parts.push(`Pressure Test: ${data.pressureTest}`);
  return parts.join('. ');
}

/** Extract a text summary from content JSON (typically has a "text" or "body" field) */
function extractContentText(content: unknown): string | null {
  if (!content) return null;
  if (typeof content === 'string') return content;
  if (typeof content === 'object') {
    const obj = content as Record<string, unknown>;
    // Common content shapes: { text: "..." }, { body: "..." }, { summary: "..." }
    if (typeof obj.text === 'string' && obj.text) return obj.text;
    if (typeof obj.body === 'string' && obj.body) return obj.body;
    if (typeof obj.summary === 'string' && obj.summary) return obj.summary;
  }
  return null;
}

/** Extract Core Values from frameworkData (BRANDHOUSE_VALUES) */
function extractCoreValues(data: unknown): string[] | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  // Shape: { values: [{ name: "...", description: "..." }] } or { values: ["..."] }
  if (Array.isArray(obj.values) && obj.values.length > 0) {
    return obj.values.map((v: unknown) => {
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v !== null) {
        const val = v as Record<string, unknown>;
        return typeof val.name === 'string' ? val.name : String(v);
      }
      return String(v);
    });
  }
  return null;
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
  const [workspace, brandAssets, personas, products, activatedTrends] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    }),

    prisma.brandAsset.findMany({
      where: { workspaceId },
      select: {
        name: true,
        slug: true,
        category: true,
        description: true,
        content: true,
        frameworkType: true,
        frameworkData: true,
      },
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

    prisma.detectedTrend.findMany({
      where: { workspaceId, isActivated: true },
      select: { title: true, category: true, impactLevel: true },
      orderBy: { relevanceScore: 'desc' },
      take: 5,
    }),
  ]);

  // Build asset lookup by slug for reliable mapping
  const assetBySlug = new Map<string, typeof brandAssets[0]>();
  for (const asset of brandAssets) {
    if (asset.slug) assetBySlug.set(asset.slug, asset);
  }

  // Build context block
  const ctx: BrandContextBlock = {
    brandName: workspace?.name,
  };

  // ─── Map brand assets by slug to context fields ──────────

  // Purpose Statement (PURPOSE_WHEEL)
  const purpose = assetBySlug.get('purpose-statement');
  if (purpose) {
    const contentText = extractContentText(purpose.content);
    const fwData = purpose.frameworkData as PurposeWheelData | null;
    const parts: string[] = [];
    if (contentText) parts.push(contentText);
    if (fwData) {
      const formatted = formatPurposeWheel(fwData);
      if (formatted) parts.push(formatted);
    }
    if (parts.length) ctx.brandPurpose = parts.join('. ');
  }

  // Golden Circle (WHY/HOW/WHAT)
  const goldenCircle = assetBySlug.get('golden-circle');
  if (goldenCircle?.frameworkData) {
    const formatted = formatGoldenCircle(goldenCircle.frameworkData as GoldenCircleData);
    if (formatted) ctx.goldenCircle = formatted;
  }

  // Brand Essence
  const essence = assetBySlug.get('brand-essence');
  if (essence) {
    ctx.brandEssence = extractContentText(essence.content) || essence.description || undefined;
  }

  // Brand Promise
  const promise = assetBySlug.get('brand-promise');
  if (promise) {
    ctx.brandPromise = extractContentText(promise.content) || promise.description || undefined;
  }

  // Mission Statement
  const mission = assetBySlug.get('mission-statement');
  if (mission) {
    ctx.brandMission = extractContentText(mission.content) || mission.description || undefined;
  }

  // Vision Statement
  const vision = assetBySlug.get('vision-statement');
  if (vision) {
    ctx.brandVision = extractContentText(vision.content) || vision.description || undefined;
  }

  // Brand Archetype
  const archetype = assetBySlug.get('brand-archetype');
  if (archetype) {
    ctx.brandArchetype = extractContentText(archetype.content) || archetype.description || undefined;
  }

  // Brand Personality
  const personality = assetBySlug.get('brand-personality');
  if (personality) {
    ctx.brandPersonality = extractContentText(personality.content) || personality.description || undefined;
  }

  // Brand Story
  const story = assetBySlug.get('brand-story');
  if (story) {
    ctx.brandStory = extractContentText(story.content) || story.description || undefined;
  }

  // Core Values (BRANDHOUSE_VALUES)
  const values = assetBySlug.get('core-values');
  if (values) {
    const extracted = extractCoreValues(values.frameworkData);
    if (extracted?.length) {
      ctx.brandValues = extracted;
    } else {
      const contentText = extractContentText(values.content);
      if (contentText) ctx.brandValues = [contentText];
    }
  }

  // Transformative Goals
  const goals = assetBySlug.get('transformative-goals');
  if (goals) {
    ctx.transformativeGoals = extractContentText(goals.content) || goals.description || undefined;
  }

  // Social Relevancy (ESG)
  const social = assetBySlug.get('social-relevancy');
  if (social) {
    ctx.socialRelevancy = extractContentText(social.content) || social.description || undefined;
  }

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

  // Competitive landscape from activated trends
  if (activatedTrends.length > 0) {
    const highImpact = activatedTrends.filter((t) => t.impactLevel === 'HIGH');
    const relevant = highImpact.length > 0 ? highImpact : activatedTrends.slice(0, 3);
    ctx.competitiveLandscape = relevant.map((t) => `${t.title} (${t.category})`).join('; ');
  }

  // Cache and return
  setCache(workspaceId, ctx);
  return ctx;
}
