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
import type { MasterMessage } from '@/types/studio';

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

// ─── Cascading Component Context ─────────────────────────────

interface ComponentData {
  id: string;
  componentType: string;
  status: string;
  generatedContent: string | null;
  imageUrl: string | null;
}

interface CascadingContextData {
  headline: string | null;
  keyMessage: string | null;
  bodyConclusion: string | null;
  textContext: string | null;
  masterMessageStr: string | null;
  approvedComponentTypes: string[];
}

/**
 * Builds cascading context from approved sibling components.
 * Injected into AI prompts when generating a new component to ensure consistency.
 */
export function buildCascadingComponentContext(
  currentComponentId: string,
  allComponents: ComponentData[],
  masterMessage: MasterMessage | null,
): string {
  const approved = allComponents.filter(
    (c) => c.status === 'APPROVED' && c.id !== currentComponentId,
  );

  if (approved.length === 0 && !masterMessage) {
    return '';
  }

  const ctx: CascadingContextData = {
    headline:
      approved.find((c) => c.componentType === 'headline')?.generatedContent ?? null,
    keyMessage:
      approved.find((c) => c.componentType === 'subheadline')?.generatedContent ?? null,
    bodyConclusion:
      approved.find((c) => c.componentType === 'body_text')?.generatedContent?.slice(-500) ?? null,
    textContext:
      approved
        .filter((c) => ['headline', 'body_text', 'caption', 'subject_line'].includes(c.componentType))
        .map((c) => c.generatedContent?.slice(0, 200))
        .filter(Boolean)
        .join('\n') || null,
    masterMessageStr: masterMessage
      ? `Core: ${masterMessage.coreClaim} | Proof: ${masterMessage.proofPoint} | CTA: ${masterMessage.primaryCta}`
      : null,
    approvedComponentTypes: approved.map((c) => c.componentType),
  };

  return formatCascadingContext(ctx);
}

function formatCascadingContext(ctx: CascadingContextData): string {
  const sections: string[] = [];

  if (ctx.masterMessageStr) {
    sections.push(`## Campaign Master Message\n${ctx.masterMessageStr}`);
  }
  if (ctx.headline) {
    sections.push(`## Approved Headline\n${ctx.headline}`);
  }
  if (ctx.keyMessage) {
    sections.push(`## Approved Key Message\n${ctx.keyMessage}`);
  }
  if (ctx.textContext) {
    sections.push(`## Approved Text Context (for consistency)\n${ctx.textContext}`);
  }
  if (ctx.bodyConclusion) {
    sections.push(`## Body Conclusion (last 500 chars)\n${ctx.bodyConclusion}`);
  }
  if (ctx.approvedComponentTypes.length > 0) {
    sections.push(`## Already Approved Components\n${ctx.approvedComponentTypes.join(', ')}`);
  }

  if (sections.length === 0) return '';

  return '--- CASCADING CONTEXT (from approved siblings) ---\n\n' + sections.join('\n\n');
}

/**
 * Compiles component-level feedback for regeneration.
 * Combines user feedback, cascading context, master message, and persona reactions.
 */
export function compileComponentFeedback(
  component: ComponentData & {
    rating: number | null;
    feedbackText: string | null;
    personaReactions: string | null;
  },
  allComponents: ComponentData[],
  masterMessage: MasterMessage | null,
): string {
  const sections: string[] = [];

  if (component.rating != null || component.feedbackText) {
    const ratingStr = component.rating != null
      ? component.rating > 0 ? 'POSITIVE' : 'NEGATIVE'
      : 'NOT RATED';
    sections.push(
      `## User Feedback\nRating: ${ratingStr}${component.feedbackText ? `\nFeedback: ${component.feedbackText}` : ''}`,
    );
  }

  const cascading = buildCascadingComponentContext(component.id, allComponents, masterMessage);
  if (cascading) {
    sections.push(cascading);
  }

  if (component.personaReactions) {
    try {
      const reactions = JSON.parse(component.personaReactions) as Array<{
        personaName: string;
        reaction: string;
        relevanceScore: number;
      }>;
      if (reactions.length > 0) {
        const reactionLines = reactions.map(
          (r) => `- ${r.personaName} (relevance: ${r.relevanceScore}%): "${r.reaction}"`,
        );
        sections.push(`## Persona Reactions\n${reactionLines.join('\n')}`);
      }
    } catch {
      // Invalid JSON — skip
    }
  }

  if (sections.length === 0) return '';

  return '--- COMPONENT FEEDBACK ---\n\n' + sections.join('\n\n');
}
