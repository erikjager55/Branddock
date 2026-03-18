import type { CampaignBlueprint } from '@/lib/campaigns/strategy-blueprint.types';

interface DerivedBrief {
  keyMessage: string;
  toneDirection: string;
  callToAction: string;
  contentOutline: string[];
}

const EMPTY_BRIEF: Readonly<DerivedBrief> = Object.freeze({
  keyMessage: '',
  toneDirection: '',
  callToAction: '',
  contentOutline: Object.freeze([]) as readonly string[] as string[],
});

/**
 * Derives brief fields (keyMessage, toneDirection, callToAction) from the
 * campaign blueprint based on the selected context (contentType, phase, channel).
 *
 * Priority:
 * 1. Exact match in assetPlan.deliverables (contentType + phase)
 * 2. Fallback to strategy layer derivation
 */
export function deriveBriefFromBlueprint(
  blueprint: CampaignBlueprint | null,
  contentType: string | null,
  phase: string | null,
  channel: string | null,
): DerivedBrief {
  if (!blueprint) return EMPTY_BRIEF;

  // 1. Exact match in assetPlan.deliverables (contentType + phase, optionally channel)
  if (contentType && phase) {
    const deliverables = blueprint.assetPlan?.deliverables ?? [];
    const match =
      // Try contentType + phase + channel first (most specific)
      (channel
        ? deliverables.find(
            (d) =>
              d.contentType.toLowerCase() === contentType.toLowerCase() &&
              d.phase.toLowerCase() === phase.toLowerCase() &&
              d.channel.toLowerCase() === channel.toLowerCase(),
          )
        : undefined) ??
      // Fallback to contentType + phase only
      deliverables.find(
        (d) =>
          d.contentType.toLowerCase() === contentType.toLowerCase() &&
          d.phase.toLowerCase() === phase.toLowerCase(),
      );
    if (match?.brief) {
      return {
        keyMessage: match.brief.keyMessage || '',
        toneDirection: match.brief.toneDirection || '',
        callToAction: match.brief.callToAction || '',
        contentOutline: match.brief.contentOutline || [],
      };
    }
  }

  // 2. Fallback: derive from strategy layers
  const keyMessage = deriveKeyMessage(blueprint, phase, channel, contentType);
  const toneDirection = deriveToneDirection(blueprint);
  const callToAction = deriveCallToAction(blueprint, phase);

  if (!keyMessage && !toneDirection && !callToAction) return EMPTY_BRIEF;

  return { keyMessage, toneDirection, callToAction, contentOutline: [] };
}

function deriveKeyMessage(
  blueprint: CampaignBlueprint,
  phase: string | null,
  channel: string | null,
  contentType: string | null,
): string {
  const campaignMessage =
    blueprint.strategy?.messagingHierarchy?.campaignMessage || '';

  // Try to find a touchpoint message in the selected phase for more specificity
  if (phase) {
    const matchedPhase = blueprint.architecture?.journeyPhases?.find(
      (p) => p.name.toLowerCase() === phase.toLowerCase(),
    );
    if (matchedPhase?.touchpoints) {
      const tp = matchedPhase.touchpoints.find((t) => {
        if (channel && contentType) {
          return (
            t.channel.toLowerCase() === channel.toLowerCase() &&
            t.contentType.toLowerCase() === contentType.toLowerCase()
          );
        }
        if (channel) return t.channel.toLowerCase() === channel.toLowerCase();
        if (contentType)
          return t.contentType.toLowerCase() === contentType.toLowerCase();
        return false;
      });
      if (tp?.message) {
        return tp.message;
      }
    }
  }

  return campaignMessage;
}

function deriveToneDirection(blueprint: CampaignBlueprint): string {
  const intent = blueprint.strategy?.strategicIntent;
  const positioning = blueprint.strategy?.positioningStatement;

  let tone = '';
  switch (intent) {
    case 'brand_building':
      tone = 'Inspirational and thought-provoking';
      break;
    case 'sales_activation':
      tone = 'Direct and action-oriented';
      break;
    case 'hybrid':
      tone = 'Balanced — informative yet compelling';
      break;
    default:
      tone = 'Professional and brand-aligned';
      break;
  }

  if (positioning) {
    tone += `. Aligned with: "${positioning}"`;
  }

  return tone;
}

function deriveCallToAction(
  blueprint: CampaignBlueprint,
  phase: string | null,
): string {
  if (!phase) return '';

  const matchedPhase = blueprint.architecture?.journeyPhases?.find(
    (p) => p.name.toLowerCase() === phase.toLowerCase(),
  );

  return matchedPhase?.goal || '';
}
