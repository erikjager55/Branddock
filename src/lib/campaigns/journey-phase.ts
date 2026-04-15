// =============================================================
// Journey Phase Auto-Detection
//
// Maps deliverable settings.phase + campaign blueprint data into
// a typed JourneyPhaseContext with guidance for AI prompts.
// =============================================================

export type JourneyPhase = 'awareness' | 'consideration' | 'decision' | 'retention' | 'advocacy';

export interface JourneyPhaseContext {
  phase: JourneyPhase;
  weekInCampaign: number;
  phaseObjectives: string[];
  messageGuidance: string;
  toneAdjustment: string;
  ctaDirection: string;
}

// ─── Phase Guidance (hardcoded per phase) ────────────────────

const PHASE_GUIDANCE: Record<JourneyPhase, Omit<JourneyPhaseContext, 'phase' | 'weekInCampaign' | 'phaseObjectives'>> = {
  awareness: {
    messageGuidance: 'Focus on problem recognition and brand introduction. Lead with the pain point or aspiration, not the solution.',
    toneAdjustment: 'Approachable, curiosity-driven, empathetic. Avoid hard sells or feature lists.',
    ctaDirection: 'Soft engagement: learn more, explore, discover, watch, read.',
  },
  consideration: {
    messageGuidance: 'Provide proof and differentiation. Show how your approach is unique. Use social proof, case studies, and comparisons.',
    toneAdjustment: 'Confident, educational, transparent. Build trust through specifics.',
    ctaDirection: 'Value exchange: download guide, join webinar, get demo, compare plans.',
  },
  decision: {
    messageGuidance: 'Remove friction and objections. Address final hesitations directly. Emphasize guarantees, ROI, and urgency.',
    toneAdjustment: 'Direct, reassuring, action-oriented. Create momentum without pressure.',
    ctaDirection: 'Conversion: start free trial, book a call, buy now, get started today.',
  },
  retention: {
    messageGuidance: 'Deepen the relationship. Deliver unexpected value and make them feel seen. Focus on results they are achieving.',
    toneAdjustment: 'Warm, celebratory, insider-feeling. Reward loyalty.',
    ctaDirection: 'Engagement: share your story, join community, unlock feature, refer a friend.',
  },
  advocacy: {
    messageGuidance: 'Empower customers to become ambassadors. Make sharing effortless and rewarding. Celebrate their success publicly.',
    toneAdjustment: 'Collaborative, grateful, empowering. Position them as the hero.',
    ctaDirection: 'Amplification: leave a review, share with your network, become a partner, co-create.',
  },
};

// ─── Normalization ──────────────────────────────────────────

const PHASE_ALIASES: Record<string, JourneyPhase> = {
  // Standard
  awareness: 'awareness',
  consideration: 'consideration',
  decision: 'decision',
  retention: 'retention',
  advocacy: 'advocacy',
  // Legacy / alternate casing
  Awareness: 'awareness',
  Consideration: 'consideration',
  Decision: 'decision',
  Retention: 'retention',
  Advocacy: 'advocacy',
  // Common alternates
  attract: 'awareness',
  engage: 'consideration',
  convert: 'decision',
  delight: 'retention',
  amplify: 'advocacy',
  // Funnel stage mappings from deliverable-types.ts
  conversion: 'decision',
};

function normalizePhase(raw: string | undefined | null): JourneyPhase | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return PHASE_ALIASES[trimmed] ?? PHASE_ALIASES[trimmed.toLowerCase()] ?? null;
}

// ─── Blueprint Phase Objective Extraction ────────────────────

interface BlueprintJourneyPhase {
  name?: string;
  phase?: string;
  goal?: string;
  objectives?: string[];
}

function extractPhaseObjectives(
  phase: JourneyPhase,
  blueprintData: unknown,
): string[] {
  if (!blueprintData || typeof blueprintData !== 'object') return [];

  const blueprint = blueprintData as Record<string, unknown>;
  const journeyPhases = blueprint.journeyPhases as BlueprintJourneyPhase[] | undefined;
  if (!Array.isArray(journeyPhases)) return [];

  for (const jp of journeyPhases) {
    const jpPhase = normalizePhase(jp.phase ?? jp.name);
    if (jpPhase === phase) {
      if (jp.objectives && Array.isArray(jp.objectives)) {
        return jp.objectives.filter((o): o is string => typeof o === 'string');
      }
      if (jp.goal && typeof jp.goal === 'string') {
        return [jp.goal];
      }
    }
  }

  return [];
}

// ─── Blueprint Phase Derivation ─────────────────────────────

/**
 * Try to derive the journey phase from the blueprint's assetPlan deliverables
 * by matching on title or contentType, or fall back to the first journey phase.
 */
function derivePhaseFromBlueprint(
  blueprintData: unknown,
  deliverableTitle?: string,
  deliverableContentType?: string,
): JourneyPhase | null {
  if (!blueprintData || typeof blueprintData !== 'object') return null;
  const blueprint = blueprintData as Record<string, unknown>;

  // Try to match from assetPlan deliverables
  const assetPlan = blueprint.assetPlan as Record<string, unknown> | undefined;
  if (assetPlan) {
    const deliverables = assetPlan.deliverables as Array<{ title?: string; contentType?: string; phase?: string }> | undefined;
    if (Array.isArray(deliverables)) {
      for (const d of deliverables) {
        const match =
          (deliverableTitle && d.title && d.title.toLowerCase().trim() === deliverableTitle.toLowerCase().trim()) ||
          (deliverableContentType && d.contentType && d.contentType === deliverableContentType);
        if (match && d.phase) {
          const phase = normalizePhase(d.phase);
          if (phase) return phase;
        }
      }
    }
  }

  // Fall back to the first journey phase from the architecture
  const architecture = blueprint.architecture as Record<string, unknown> | undefined;
  const journeyPhases = (architecture?.journeyPhases ?? blueprint.journeyPhases) as BlueprintJourneyPhase[] | undefined;
  if (Array.isArray(journeyPhases) && journeyPhases.length > 0) {
    const first = journeyPhases[0];
    const phase = normalizePhase(first.phase ?? first.name);
    if (phase) return phase;
  }

  return null;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Auto-detect journey phase from deliverable settings + campaign blueprint.
 * Phase is already known at "bring to life" — stored in settings.phase.
 * If no explicit phase is set, tries to derive from the blueprint's asset plan
 * by matching deliverable title/contentType, or falls back to the first journey phase.
 *
 * @param settingsPhase - The phase string from deliverable.settings.phase
 * @param campaignBlueprint - The campaign.strategy JSON (blueprint)
 * @param weekInCampaign - Optional week number within the campaign
 * @param deliverableTitle - Optional deliverable title for blueprint matching
 * @param deliverableContentType - Optional content type for blueprint matching
 * @returns JourneyPhaseContext or null if no phase data available
 */
export function detectJourneyPhase(
  settingsPhase: string | undefined,
  campaignBlueprint: unknown,
  weekInCampaign?: number,
  deliverableTitle?: string,
  deliverableContentType?: string,
): JourneyPhaseContext | null {
  let phase = normalizePhase(settingsPhase);

  // If no explicit phase, try to derive from blueprint
  if (!phase) {
    phase = derivePhaseFromBlueprint(campaignBlueprint, deliverableTitle, deliverableContentType);
  }

  if (!phase) return null;

  const guidance = PHASE_GUIDANCE[phase];
  const objectives = extractPhaseObjectives(phase, campaignBlueprint);

  return {
    phase,
    weekInCampaign: weekInCampaign ?? 0,
    phaseObjectives: objectives,
    messageGuidance: guidance.messageGuidance,
    toneAdjustment: guidance.toneAdjustment,
    ctaDirection: guidance.ctaDirection,
  };
}
