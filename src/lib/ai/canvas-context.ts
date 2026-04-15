// =============================================================
// Canvas Context Stack Assembly
//
// Assembles a 5-layer context stack for a given deliverable:
//   Layer 1 — Brand context (reuses getBrandContext())
//   Layer 2 — Campaign concept (from campaign.strategy JSON)
//   Layer 3 — Journey phase (auto-derived from settings + blueprint)
//   Layer 4 — Medium enrichment (from MediumEnrichment table)
//   Layer 5 — The deliverable itself (components) — not in this stack
//
// This module is server-only (imports Prisma).
// =============================================================

import { prisma } from '@/lib/prisma';
import { getBrandContext } from './brand-context';
import type { BrandContextBlock } from './prompt-templates';
import { detectJourneyPhase, type JourneyPhaseContext } from '@/lib/campaigns/journey-phase';
import { serializePersona } from './context/persona-serializer';

// ─── Types ───────────────────────────────────────────────────

export interface ConceptContext {
  campaignTheme: string | null;
  positioningStatement: string | null;
  strategicApproach: string | null;
  keyMessages: string[];
  targetAudienceInsights: string | null;
  humanInsight: string | null;
  creativePlatform: string | null;
}

export interface MediumContext {
  platform: string;
  format: string;
  specs: Record<string, unknown>;
  componentTemplate: unknown[];
  bestPractices: string[];
  phaseGuidance: Record<string, unknown> | null;
  optimalPublishTimes: Record<string, unknown> | null;
}

export interface PersonaContext {
  id: string;
  name: string;
  serialized: string;
}

export interface BriefContext {
  objective: string | null;
  keyMessage: string | null;
  toneDirection: string | null;
  callToAction: string | null;
  contentOutline: string[];
}

export interface ProductContext {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  pricingModel: string | null;
  pricingDetails: string | null;
  features: string[];
  benefits: string[];
  useCases: string[];
}

export interface CanvasContextStack {
  brand: BrandContextBlock;
  concept: ConceptContext | null;
  journeyPhase: JourneyPhaseContext | null;
  medium: MediumContext | null;
  deliverableTypeId: string | null;
  personas: PersonaContext[];
  brief: BriefContext | null;
  products: ProductContext[];
  /** Type-specific inputs (SEO keywords, landing page URL, event details, etc.) */
  contentTypeInputs?: Record<string, string | string[] | number | boolean>;
}

// ─── Content Type → Platform/Format Mapping ──────────────────
// Maps deliverable.contentType IDs to MediumEnrichment platform+format.

const CONTENT_TYPE_TO_MEDIUM: Record<string, { platform: string; format: string }> = {
  // Social
  'linkedin-post': { platform: 'linkedin', format: 'organic-post' },
  'linkedin-article': { platform: 'linkedin', format: 'organic-post' },
  'linkedin-carousel': { platform: 'linkedin', format: 'carousel' },
  'linkedin-ad': { platform: 'linkedin', format: 'ad' },
  'linkedin-newsletter': { platform: 'linkedin', format: 'organic-post' },
  'linkedin-video': { platform: 'linkedin', format: 'organic-post' },
  'linkedin-event': { platform: 'linkedin', format: 'organic-post' },
  'linkedin-poll': { platform: 'linkedin', format: 'organic-post' },
  'instagram-post': { platform: 'instagram', format: 'feed-post' },
  'social-carousel': { platform: 'instagram', format: 'carousel' },
  'tiktok-script': { platform: 'tiktok', format: 'video' },
  'facebook-post': { platform: 'facebook', format: 'organic-post' },
  // Ads
  'social-ad': { platform: 'linkedin', format: 'ad' },
  // Email
  'newsletter': { platform: 'email', format: 'newsletter' },
  'welcome-sequence': { platform: 'email', format: 'newsletter' },
  'promotional-email': { platform: 'email', format: 'newsletter' },
  'nurture-sequence': { platform: 'email', format: 'newsletter' },
  're-engagement-email': { platform: 'email', format: 'newsletter' },
  // Web
  'landing-page': { platform: 'web', format: 'landing-page' },
  'product-page': { platform: 'web', format: 'landing-page' },
  'blog-post': { platform: 'web', format: 'blog-article' },
  'pillar-page': { platform: 'web', format: 'blog-article' },
  'article': { platform: 'web', format: 'blog-article' },
  'thought-leadership': { platform: 'web', format: 'blog-article' },
  // Video
  'video-ad': { platform: 'tiktok', format: 'video' },
};

// ─── Layer Builders ──────────────────────────────────────────

function extractConceptContext(strategyJson: unknown): ConceptContext | null {
  if (!strategyJson || typeof strategyJson !== 'object') return null;
  const s = strategyJson as Record<string, unknown>;

  // Try blueprint structure first
  const strategy = (s.strategy ?? s.strategyLayer ?? s) as Record<string, unknown>;

  const campaignTheme = (strategy.campaignTheme ?? strategy.theme ?? null) as string | null;
  const positioningStatement = (strategy.positioningStatement ?? null) as string | null;
  const strategicApproach = (strategy.strategicApproach ?? strategy.approach ?? null) as string | null;
  const keyMessages = Array.isArray(strategy.keyMessages) ? strategy.keyMessages.filter((m): m is string => typeof m === 'string') : [];
  const targetAudienceInsights = (strategy.targetAudienceInsights ?? null) as string | null;
  const humanInsight = (strategy.humanInsight ?? null) as string | null;
  const creativePlatform = (strategy.creativePlatform ?? null) as string | null;

  // Return null if nothing useful
  if (!campaignTheme && !positioningStatement && !strategicApproach && keyMessages.length === 0) {
    return null;
  }

  return {
    campaignTheme,
    positioningStatement,
    strategicApproach,
    keyMessages,
    targetAudienceInsights,
    humanInsight,
    creativePlatform,
  };
}

async function fetchMediumContext(
  platform: string,
  format: string,
  workspaceId: string,
  phase: string | null,
): Promise<MediumContext | null> {
  // Try workspace-specific override first, then system default.
  // PostgreSQL DESC puts NULLs first by default, so we explicitly use nulls: 'last'
  // to ensure workspace-specific records (non-null) come before system defaults (null).
  const enrichment = await prisma.mediumEnrichment.findFirst({
    where: {
      platform,
      format,
      OR: [
        { workspaceId },
        { workspaceId: null },
      ],
    },
    orderBy: { workspaceId: { sort: 'desc', nulls: 'last' } },
  });

  if (!enrichment) return null;

  const phaseGuidance = enrichment.phaseGuidance as Record<string, Record<string, unknown>> | null;
  const currentPhaseGuidance = phase && phaseGuidance ? (phaseGuidance[phase] ?? null) : null;

  return {
    platform: enrichment.platform,
    format: enrichment.format,
    specs: enrichment.specs as Record<string, unknown>,
    componentTemplate: enrichment.componentTemplate as unknown[],
    bestPractices: Array.isArray(enrichment.bestPractices) ? enrichment.bestPractices as string[] : [],
    phaseGuidance: currentPhaseGuidance as Record<string, unknown> | null,
    optimalPublishTimes: enrichment.optimalPublishTimes as Record<string, unknown> | null,
  };
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Assemble the 5-layer context stack for a given deliverable.
 * Layers 1-4 are returned; Layer 5 (the deliverable itself) is handled by the caller.
 */
export async function assembleCanvasContext(
  deliverableId: string,
  workspaceId: string,
): Promise<CanvasContextStack> {
  // Fetch deliverable with campaign
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    include: {
      campaign: {
        select: {
          strategy: true,
        },
      },
    },
  });

  if (!deliverable) {
    throw new Error(`Deliverable ${deliverableId} not found`);
  }

  const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
  const settingsBrief = (settings.brief ?? {}) as Record<string, unknown>;
  const settingsPhase = (deliverable.journeyPhase ?? settings.phase ?? null) as string | null;

  // Layer 1: Brand context (cached, 5-min TTL)
  const brand = await getBrandContext(workspaceId);

  // Layer 2: Campaign concept from strategy JSON
  const concept = extractConceptContext(deliverable.campaign.strategy);

  // Layer 3: Journey phase (explicit from settings, or derived from blueprint)
  const journeyPhase = detectJourneyPhase(
    settingsPhase ?? undefined,
    deliverable.campaign.strategy,
    deliverable.weekInCampaign ?? undefined,
    deliverable.title ?? undefined,
    deliverable.contentType ?? undefined,
  );

  // Layer 4: Medium enrichment
  let medium: MediumContext | null = null;
  const mediumMapping = CONTENT_TYPE_TO_MEDIUM[deliverable.contentType];
  if (mediumMapping) {
    medium = await fetchMediumContext(
      mediumMapping.platform,
      mediumMapping.format,
      workspaceId,
      journeyPhase?.phase ?? null,
    );
  }

  // Layer 5: Target personas
  let targetPersonaIds: string[] = [];
  if (Array.isArray(settings.targetPersonas)) {
    targetPersonaIds = (settings.targetPersonas as unknown[]).filter((id): id is string => typeof id === 'string');
  }

  // Fallback: fetch persona IDs from campaign knowledge assets
  if (targetPersonaIds.length === 0) {
    const knowledgeAssets = await prisma.campaignKnowledgeAsset.findMany({
      where: { campaignId: deliverable.campaignId, assetType: 'persona', personaId: { not: null } },
      select: { personaId: true },
    });
    targetPersonaIds = knowledgeAssets
      .map((ka) => ka.personaId)
      .filter((id): id is string => id !== null);
  }

  const personas: PersonaContext[] = [];
  if (targetPersonaIds.length > 0) {
    const personaRecords = await prisma.persona.findMany({
      where: { id: { in: targetPersonaIds }, workspaceId },
    });
    for (const p of personaRecords) {
      const record = p as unknown as Record<string, unknown>;
      personas.push({
        id: p.id,
        name: p.name,
        serialized: serializePersona(record),
      });
    }
  }

  // Layer 6: Brief context from deliverable settings
  const brief: BriefContext | null = (() => {
    const objective = (settingsBrief.objective ?? null) as string | null;
    const keyMessage = (settingsBrief.keyMessage ?? null) as string | null;
    const toneDirection = (settingsBrief.toneDirection ?? null) as string | null;
    const callToAction = (settingsBrief.callToAction ?? null) as string | null;
    const contentOutline = Array.isArray(settingsBrief.contentOutline)
      ? (settingsBrief.contentOutline as unknown[]).filter((s): s is string => typeof s === 'string')
      : [];
    if (!objective && !keyMessage && !toneDirection && !callToAction && contentOutline.length === 0) {
      return null;
    }
    return { objective, keyMessage, toneDirection, callToAction, contentOutline };
  })();

  // Layer 7: Product context from campaign knowledge assets
  let productIds: string[] = [];
  const productAssets = await prisma.campaignKnowledgeAsset.findMany({
    where: { campaignId: deliverable.campaignId, assetType: 'Product', productId: { not: null } },
    select: { productId: true },
  });
  productIds = productAssets.map((a) => a.productId).filter((id): id is string => id !== null);

  const products: ProductContext[] = [];
  if (productIds.length > 0) {
    const productRecords = await prisma.product.findMany({
      where: { id: { in: productIds }, workspaceId },
      select: {
        id: true, name: true, description: true, category: true,
        pricingModel: true, pricingDetails: true, features: true,
        benefits: true, useCases: true,
      },
    });
    for (const p of productRecords) {
      products.push({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        pricingModel: p.pricingModel,
        pricingDetails: p.pricingDetails,
        features: p.features,
        benefits: p.benefits,
        useCases: p.useCases,
      });
    }
  }

  // Content-type-specific inputs from deliverable settings
  const contentTypeInputs = (settings.contentTypeInputs ?? undefined) as
    Record<string, string | string[] | number | boolean> | undefined;

  return {
    brand, concept, journeyPhase, medium,
    deliverableTypeId: deliverable.contentType ?? null,
    personas, brief, products, contentTypeInputs,
  };
}
