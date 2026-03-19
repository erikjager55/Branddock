// =============================================================
// Studio Context Builder
//
// Aggregates all relevant context for content generation:
//  - Brand context (11 canonical assets + brandstyle + competitors)
//  - Persona context (selected personas)
//  - Campaign strategy context (theme, messaging, brief)
//  - Deliverable brief (from blueprint asset plan)
//
// Reuses existing brand-context.ts and persona-context.ts utilities.
// =============================================================

import { getBrandContext } from '@/lib/ai/brand-context';
import { formatBrandContext } from '@/lib/ai/prompt-templates';
import { buildSelectedPersonasContext } from '@/lib/ai/persona-context';

// ─── Types ─────────────────────────────────────────────────

export interface CampaignStrategyData {
  campaignTitle: string | null;
  campaignGoalType: string | null;
  strategy: Record<string, unknown> | null;
}

export interface DeliverableBriefData {
  title: string;
  objective?: string;
  keyMessage?: string;
  toneDirection?: string;
  callToAction?: string;
  contentOutline?: string[];
}

export interface GenerationContext {
  brandContext: string;
  personaContext: string;
  campaignContext: string;
  deliverableBrief: string;
}

// ─── Campaign Context Builder ──────────────────────────────

function buildCampaignContext(
  campaignData: CampaignStrategyData,
  deliverableTitle: string,
): string {
  const strategy = campaignData.strategy;
  if (!strategy || typeof strategy !== 'object') return '';

  const blueprint = strategy as {
    strategy?: {
      campaignTheme?: string;
      positioningStatement?: string;
      messagingHierarchy?: {
        brandMessage?: string;
        campaignMessage?: string;
        proofPoints?: string[];
      };
      jtbdFraming?: { jobStatement?: string };
    };
    assetPlan?: {
      deliverables?: Array<{
        title?: string;
        brief?: DeliverableBriefData;
      }>;
    };
  };

  const strat = blueprint.strategy;
  if (!strat) return '';

  const parts: string[] = [];
  parts.push('## Campaign Strategy');
  if (campaignData.campaignTitle) parts.push(`Campaign: ${campaignData.campaignTitle}`);
  if (strat.campaignTheme) parts.push(`Theme: ${strat.campaignTheme}`);
  if (strat.positioningStatement) parts.push(`Positioning: ${strat.positioningStatement}`);
  if (campaignData.campaignGoalType) parts.push(`Goal: ${campaignData.campaignGoalType}`);

  if (strat.messagingHierarchy) {
    parts.push('\n## Key Messages');
    if (strat.messagingHierarchy.brandMessage) {
      parts.push(`1. ${strat.messagingHierarchy.brandMessage}`);
    }
    if (strat.messagingHierarchy.campaignMessage) {
      parts.push(`2. ${strat.messagingHierarchy.campaignMessage}`);
    }
    strat.messagingHierarchy.proofPoints?.forEach((pp, i) => {
      parts.push(`${i + 3}. ${pp}`);
    });
  }

  if (strat.jtbdFraming?.jobStatement) {
    parts.push(`\nJTBD: ${strat.jtbdFraming.jobStatement}`);
  }

  return parts.join('\n');
}

function buildDeliverableBriefContext(
  campaignStrategy: Record<string, unknown> | null,
  deliverableTitle: string,
): string {
  if (!campaignStrategy) return '';

  const blueprint = campaignStrategy as {
    assetPlan?: {
      deliverables?: Array<{
        title?: string;
        brief?: DeliverableBriefData;
      }>;
    };
  };

  const matchedBrief = blueprint.assetPlan?.deliverables?.find(
    (d) => d.title?.toLowerCase().trim() === deliverableTitle.toLowerCase().trim(),
  )?.brief;

  if (!matchedBrief) return '';

  const parts: string[] = ['## Deliverable Brief'];
  if (matchedBrief.objective) parts.push(`Objective: ${matchedBrief.objective}`);
  if (matchedBrief.keyMessage) parts.push(`Key Message: ${matchedBrief.keyMessage}`);
  if (matchedBrief.toneDirection) parts.push(`Tone: ${matchedBrief.toneDirection}`);
  if (matchedBrief.callToAction) parts.push(`CTA: ${matchedBrief.callToAction}`);
  if (matchedBrief.contentOutline && matchedBrief.contentOutline.length > 0) {
    parts.push(`Outline:\n${matchedBrief.contentOutline.map((p) => `- ${p}`).join('\n')}`);
  }

  return parts.join('\n');
}

// ─── Public API ────────────────────────────────────────────

/**
 * Build all context needed for content generation.
 * Aggregates brand context, persona context, campaign strategy, and deliverable brief.
 */
export async function buildGenerationContext(
  workspaceId: string,
  personaIds: string[],
  campaignData: CampaignStrategyData,
  deliverableTitle: string,
): Promise<GenerationContext> {
  // Fetch brand context and persona context in parallel
  const [brandCtx, personaCtx] = await Promise.all([
    getBrandContext(workspaceId),
    personaIds.length > 0
      ? buildSelectedPersonasContext(personaIds, workspaceId)
      : Promise.resolve(''),
  ]);

  const brandContext = formatBrandContext(brandCtx);
  const campaignContext = buildCampaignContext(campaignData, deliverableTitle);
  const deliverableBrief = buildDeliverableBriefContext(
    campaignData.strategy,
    deliverableTitle,
  );

  return {
    brandContext,
    personaContext: personaCtx,
    campaignContext,
    deliverableBrief,
  };
}
