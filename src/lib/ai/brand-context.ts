// =============================================================
// Brand Context Aggregator (R0.8)
//
// Collects brand data from 6 Prisma models into a single context
// block for AI prompts. Uses a 5-minute in-memory cache to avoid
// repeated DB reads within the same session.
//
// Models aggregated:
//  - BrandAsset (all 11 canonical assets with content + framework data)
//  - Persona (primary target audience description)
//  - Product (products overview)
//  - DetectedTrend (competitive landscape summary, activated trends only)
//  - BrandStyleguide (colors, typography, tone of voice, imagery)
//  - Workspace (brand name, industry)
// =============================================================

import { prisma } from '@/lib/prisma';
import type { BrandContextBlock } from './prompt-templates';
import {
  deriveVoiceBaseline1Pager,
  formatVoiceBaseline1Pager,
} from '../brand-fidelity/voice-baseline-1pager';
import {
  stripAnalyzerMarkers,
  stripAnalyzerMarkersFromList,
} from '../brandstyle/analyzer-markers';

// ─── Cache ─────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: BrandContextBlock;
  expiresAt: number;
}

// Cache-key = `${workspaceId}:${localeProfileId ?? 'default'}` — één entry per
// (workspace, locale-profiel). Het default-profiel-pad blijft byte-identiek.
const cache = new Map<string, CacheEntry>();

function getCached(cacheKey: string): BrandContextBlock | null {
  const entry = cache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

function setCache(cacheKey: string, data: BrandContextBlock): void {
  cache.set(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Invalidate cached brand context for a workspace — ALLE locale-profiel-varianten
 * (`${workspaceId}:*`). Call this when brand data is updated.
 */
export function invalidateBrandContext(workspaceId: string): void {
  const prefix = `${workspaceId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

// ─── Framework Data Formatters ─────────────────────────────

interface GoldenCircleData {
  why?: { statement?: string; details?: string };
  how?: { statement?: string; details?: string };
  what?: { statement?: string; details?: string };
}

interface PurposeWheelData {
  statement?: string;
  impactType?: string;
  impactDescription?: string;
  mechanism?: string;
  mechanismCategory?: string;
  pressureTest?: string;
}

interface BrandEssenceData {
  essenceStatement?: string;
  essenceNarrative?: string;
  functionalBenefit?: string;
  emotionalBenefit?: string;
  selfExpressiveBenefit?: string;
  discriminator?: string;
  audienceInsight?: string;
  proofPoints?: string[];
  attributes?: string[];
}

interface BrandPromiseData {
  promiseStatement?: string;
  promiseOneLiner?: string;
  functionalValue?: string;
  emotionalValue?: string;
  selfExpressiveValue?: string;
  targetAudience?: string;
  coreCustomerNeed?: string;
  differentiator?: string;
  onlynessStatement?: string;
  proofPoints?: string[];
  measurableOutcomes?: string[];
}

interface MissionVisionData {
  missionStatement?: string;
  missionOneLiner?: string;
  forWhom?: string;
  whatWeDo?: string;
  howWeDoIt?: string;
  visionStatement?: string;
  timeHorizon?: string;
  boldAspiration?: string;
  desiredFutureState?: string;
  successIndicators?: string | string[];
  stakeholderBenefit?: string;
  impactGoal?: string;
  valuesAlignment?: string;
  missionVisionTension?: string;
}

/** Format Mission & Vision frameworkData into a readable string for AI context */
function formatMissionVision(data: MissionVisionData): string {
  const parts: string[] = [];

  // Mission core
  if (data.missionOneLiner) parts.push(`Mission (one-liner): ${data.missionOneLiner}`);
  if (data.missionStatement) parts.push(`Mission: ${data.missionStatement}`);
  if (data.forWhom) parts.push(`For whom: ${data.forWhom}`);
  if (data.whatWeDo) parts.push(`What we do: ${data.whatWeDo}`);
  if (data.howWeDoIt) parts.push(`How we do it: ${data.howWeDoIt}`);
  if (data.impactGoal) parts.push(`Impact goal: ${data.impactGoal}`);

  // Vision
  if (data.visionStatement) parts.push(`Vision: ${data.visionStatement}`);
  if (data.timeHorizon) parts.push(`Time horizon: ${data.timeHorizon}`);
  if (data.boldAspiration) parts.push(`Bold aspiration (BHAG): ${data.boldAspiration}`);
  if (data.desiredFutureState) parts.push(`Desired future state: ${data.desiredFutureState}`);

  // Success indicators (handle both string and string[])
  const indicators = Array.isArray(data.successIndicators)
    ? data.successIndicators.filter(Boolean)
    : data.successIndicators ? [data.successIndicators] : [];
  if (indicators.length > 0) {
    parts.push(`Success indicators: ${indicators.join('; ')}`);
  }

  if (data.stakeholderBenefit) parts.push(`Stakeholder benefit: ${data.stakeholderBenefit}`);
  if (data.valuesAlignment) parts.push(`Values alignment: ${data.valuesAlignment}`);
  if (data.missionVisionTension) parts.push(`Mission-vision tension: ${data.missionVisionTension}`);

  return parts.join('. ');
}

interface TransformativeGoalData {
  title?: string;
  description?: string;
  impactDomain?: string;
  timeframe?: string;
  timeframeHorizon?: string;
  measurableCommitment?: string;
  theoryOfChange?: string;
  currentProgress?: number;
  milestones?: { year?: number; target?: string; achieved?: boolean }[];
  sdgAlignment?: number[];
}

interface TransformativeGoalsData {
  massiveTransformativePurpose?: string;
  mtpNarrative?: string;
  goals?: TransformativeGoalData[];
  authenticityScores?: Record<string, number>;
  stakeholderImpact?: { stakeholder?: string; role?: string; expectedImpact?: string }[];
  brandIntegration?: {
    positioningLink?: string;
    communicationThemes?: string[];
    campaignDirections?: string[];
    internalActivation?: string;
  };
}

/** Format Golden Circle frameworkData into a readable string */
function formatGoldenCircle(data: GoldenCircleData): string {
  const parts: string[] = [];
  if (data.why?.statement) {
    let line = `  - WHY: ${data.why.statement}`;
    if (data.why.details) line += ` — ${data.why.details}`;
    parts.push(line);
  }
  if (data.how?.statement) {
    let line = `  - HOW: ${data.how.statement}`;
    if (data.how.details) line += ` — ${data.how.details}`;
    parts.push(line);
  }
  if (data.what?.statement) {
    let line = `  - WHAT: ${data.what.statement}`;
    if (data.what.details) line += ` — ${data.what.details}`;
    parts.push(line);
  }
  return parts.join('\n');
}

/** Format Purpose Wheel frameworkData into a readable string */
function formatPurposeWheel(data: PurposeWheelData): string {
  const parts: string[] = [];
  if (data.statement) parts.push(`Purpose: ${data.statement}`);
  if (data.impactType) parts.push(`Impact Type: ${data.impactType}`);
  if (data.impactDescription) parts.push(`Impact: ${data.impactDescription}`);
  if (data.mechanismCategory) parts.push(`Mechanism: ${data.mechanismCategory}`);
  if (data.mechanism) parts.push(`How: ${data.mechanism}`);
  if (data.pressureTest) parts.push(`Pressure Test: ${data.pressureTest}`);
  return parts.join('. ');
}

/** Format Transformative Goals frameworkData into a readable string for AI context */
function formatTransformativeGoals(data: TransformativeGoalsData): string {
  const parts: string[] = [];
  if (data.massiveTransformativePurpose) parts.push(`MTP: ${data.massiveTransformativePurpose}`);
  if (data.mtpNarrative) parts.push(data.mtpNarrative);
  if (Array.isArray(data.goals) && data.goals.length > 0) {
    const goalSummaries = data.goals
      .filter((g) => g.title)
      .map((g) => {
        const gParts = [g.title];
        if (g.impactDomain) gParts.push(`[${g.impactDomain}]`);
        if (g.description) gParts.push(`— ${g.description}`);
        if (g.measurableCommitment) gParts.push(`Target: ${g.measurableCommitment}`);
        if (g.timeframe) {
          let tf = `by ${g.timeframe}`;
          if (g.timeframeHorizon) tf += ` (${g.timeframeHorizon})`;
          gParts.push(tf);
        }
        if (g.theoryOfChange) gParts.push(`Theory of change: ${g.theoryOfChange}`);
        if (typeof g.currentProgress === 'number' && g.currentProgress > 0) {
          gParts.push(`Progress: ${g.currentProgress}%`);
        }
        if (Array.isArray(g.milestones) && g.milestones.length > 0) {
          const msDetails = g.milestones
            .filter((m) => m.target || m.year)
            .map((m) => {
              const label = m.target || 'milestone';
              const year = m.year ? ` (${m.year})` : '';
              const status = m.achieved ? ' [achieved]' : '';
              return `${label}${year}${status}`;
            });
          if (msDetails.length > 0) {
            gParts.push(`Milestones: ${msDetails.join(', ')}`);
          }
        }
        if (Array.isArray(g.sdgAlignment) && g.sdgAlignment.length > 0) {
          gParts.push(`SDGs: ${g.sdgAlignment.join(', ')}`);
        }
        return gParts.join(' ');
      });
    if (goalSummaries.length > 0) parts.push(`Goals: ${goalSummaries.join('; ')}`);
  }
  if (data.authenticityScores) {
    const scoreLabels: Record<string, string> = {
      ambition: 'Ambition', authenticity: 'Authenticity', clarity: 'Clarity',
      measurability: 'Measurability', integration: 'Integration', longevity: 'Longevity',
    };
    const entries = Object.entries(data.authenticityScores)
      .filter(([, v]) => typeof v === 'number' && v > 0);
    if (entries.length > 0) {
      const details = entries.map(([k, v]) => `${scoreLabels[k] || k}: ${v}/5`).join(', ');
      const avg = Math.round((entries.reduce((a, [, v]) => a + v, 0) / entries.length) * 20);
      parts.push(`Authenticity (${avg}%): ${details}`);
    }
  }
  if (data.brandIntegration?.positioningLink) {
    parts.push(`Positioning: ${data.brandIntegration.positioningLink}`);
  }
  if (data.brandIntegration && Array.isArray(data.brandIntegration.communicationThemes) && data.brandIntegration.communicationThemes.length > 0) {
    parts.push(`Themes: ${data.brandIntegration.communicationThemes.filter(Boolean).join('; ')}`);
  }
  if (data.brandIntegration && Array.isArray(data.brandIntegration.campaignDirections) && data.brandIntegration.campaignDirections.length > 0) {
    parts.push(`Campaign directions: ${data.brandIntegration.campaignDirections.filter(Boolean).join('; ')}`);
  }
  if (data.brandIntegration?.internalActivation) {
    parts.push(`Internal activation: ${data.brandIntegration.internalActivation}`);
  }
  if (Array.isArray(data.stakeholderImpact) && data.stakeholderImpact.length > 0) {
    const stakeholders = data.stakeholderImpact
      .filter((s) => s.stakeholder && (s.role || s.expectedImpact))
      .map((s) => `${s.stakeholder} (${s.role || 'stakeholder'})${s.expectedImpact ? `: ${s.expectedImpact}` : ''}`)
      .join('; ');
    if (stakeholders) parts.push(`Stakeholders: ${stakeholders}`);
  }
  return parts.join('. ');
}

interface BrandArchetypeData {
  primaryArchetype?: string;
  subArchetype?: string;
  // Core psychology
  coreDesire?: string;
  coreFear?: string;
  brandGoal?: string;
  strategy?: string;
  giftTalent?: string;
  shadowWeakness?: string;
  // Archetype in action
  archetypeInAction?: string;
  marketingExpression?: string;
  customerExperience?: string;
  contentStrategy?: string;
  storytellingApproach?: string;
  // Reference & positioning
  brandExamples?: string[];
  positioningApproach?: string;
  competitiveLandscape?: string;
}

/** Format Brand Archetype frameworkData into a readable string for AI context */
function formatBrandArchetype(data: BrandArchetypeData): string {
  const parts: string[] = [];

  // Archetype identity
  if (data.primaryArchetype) {
    let identity = `Archetype: ${data.primaryArchetype}`;
    if (data.subArchetype) identity += ` — Sub-archetype: ${data.subArchetype}`;
    parts.push(identity);
  }

  // Core psychology
  if (data.coreDesire) parts.push(`Core Desire: ${data.coreDesire}`);
  if (data.coreFear) parts.push(`Core Fear: ${data.coreFear}`);
  if (data.brandGoal) parts.push(`Brand Goal: ${data.brandGoal}`);
  if (data.strategy) parts.push(`Strategy: ${data.strategy}`);
  if (data.giftTalent) parts.push(`Gift/Talent: ${data.giftTalent}`);
  if (data.shadowWeakness) parts.push(`Shadow/Weakness: ${data.shadowWeakness}`);

  // Archetype in action
  if (data.archetypeInAction) parts.push(`In action: ${data.archetypeInAction}`);
  if (data.marketingExpression) parts.push(`Marketing expression: ${data.marketingExpression}`);
  if (data.customerExperience) parts.push(`Customer experience: ${data.customerExperience}`);
  if (data.contentStrategy) parts.push(`Content strategy: ${data.contentStrategy}`);
  if (data.storytellingApproach) parts.push(`Storytelling: ${data.storytellingApproach}`);

  // Reference & positioning
  if (Array.isArray(data.brandExamples) && data.brandExamples.length > 0) {
    parts.push(`Reference brands: ${data.brandExamples.filter(Boolean).join(', ')}`);
  }
  if (data.positioningApproach) parts.push(`Positioning approach: ${data.positioningApproach}`);
  if (data.competitiveLandscape) parts.push(`Competitive landscape: ${data.competitiveLandscape}`);

  return parts.join('. ');
}

export interface BrandPersonalityData {
  dimensionScores?: Record<string, number>;
  primaryDimension?: string;
  secondaryDimension?: string;
  personalityTraits?: { name?: string; description?: string; weAreThis?: string; butNeverThat?: string }[];
  spectrumSliders?: Record<string, number>;
  toneDimensions?: Record<string, number>;
  brandVoiceDescription?: string;
  wordsWeUse?: string[];
  wordsWeAvoid?: string[];
  writingSample?: string;
  channelTones?: Record<string, string>;
  colorDirection?: string;
  typographyDirection?: string;
  imageryDirection?: string;
}

const DIMENSION_LABELS: Record<string, string> = {
  sincerity: 'Sincerity',
  excitement: 'Excitement',
  competence: 'Competence',
  sophistication: 'Sophistication',
  ruggedness: 'Ruggedness',
};

const SPECTRUM_LABELS: Record<string, [string, string]> = {
  friendlyFormal: ['Friendly', 'Formal'],
  energeticThoughtful: ['Energetic', 'Thoughtful'],
  modernTraditional: ['Modern', 'Traditional'],
  innovativeProven: ['Innovative', 'Proven'],
  playfulSerious: ['Playful', 'Serious'],
  inclusiveExclusive: ['Inclusive', 'Exclusive'],
  boldReserved: ['Bold', 'Reserved'],
};

const TONE_LABELS: Record<string, [string, string]> = {
  formalCasual: ['Formal', 'Casual'],
  seriousFunny: ['Serious', 'Funny'],
  respectfulIrreverent: ['Respectful', 'Irreverent'],
  matterOfFactEnthusiastic: ['Matter-of-fact', 'Enthusiastic'],
};

// ─── Brand Voiceguide ──────────────────────────────────────

interface BrandVoiceguideRow {
  voiceDescription?: string | null;
  toneDimensions?: unknown;
  wordsWeUse?: string[];
  wordsWeAvoid?: string[];
  antiPatterns?: string[];
  writingSamples?: unknown;
  channelTones?: unknown;
  contentGuidelines?: string[] | null;
  writingGuidelines?: string[] | null;
  examplePhrases?: unknown;
  guidelinesSavedForAi?: boolean;
  examplePhrasesSavedForAi?: boolean;
}

/**
 * Format Brand Voiceguide row into a readable string for AI context.
 * Replaces voice-specific output that previously came from BrandPersonality.
 *
 * Includes:
 *  - Voice description (one-paragraph summary)
 *  - Tone dimensions (4-axis NN/g)
 *  - Channel-specific tone overrides
 *  - Words we use / avoid
 *  - Anti-patterns (forbidden phrasings)
 *  - First writing sample as voice exemplar (truncated)
 */
export function formatBrandVoiceguide(data: BrandVoiceguideRow): string {
  const parts: string[] = [];

  if (data.voiceDescription) {
    parts.push(`Voice: ${data.voiceDescription}`);
  }

  // Tone dimensions: 4-axis NN/g sliders (1-7), 4 = neutral
  if (data.toneDimensions && typeof data.toneDimensions === 'object') {
    const td = data.toneDimensions as Record<string, number>;
    const tones = Object.entries(td)
      .filter(([, v]) => typeof v === 'number' && v !== 4)
      .map(([k, v]) => {
        const labels = TONE_LABELS[k];
        if (!labels) return null;
        return v < 4 ? labels[0] : labels[1];
      })
      .filter(Boolean);
    if (tones.length > 0) parts.push(`Tone of voice: ${tones.join(', ')}`);
  }

  // Channel tones: per-channel overrides. Twee opslagvormen in het wild:
  // legacy platte string, en de UI-vorm { description, axisShift } uit
  // ChannelTonesSection — beide moeten de AI-context bereiken.
  if (data.channelTones && typeof data.channelTones === 'object') {
    const channels = Object.entries(data.channelTones as Record<string, unknown>)
      .map(([k, v]) => {
        const text =
          typeof v === 'string'
            ? v
            : v && typeof v === 'object' && typeof (v as { description?: unknown }).description === 'string'
              ? (v as { description: string }).description
              : '';
        return text.trim().length > 0 ? `${k}: ${text.trim()}` : null;
      })
      .filter(Boolean);
    if (channels.length > 0) parts.push(`Channel-specific tone: ${channels.join('; ')}`);
  }

  if (Array.isArray(data.wordsWeUse) && data.wordsWeUse.length > 0) {
    parts.push(`Words we use: ${data.wordsWeUse.filter(Boolean).join(', ')}`);
  }
  if (Array.isArray(data.wordsWeAvoid) && data.wordsWeAvoid.length > 0) {
    parts.push(`Words we avoid: ${data.wordsWeAvoid.filter(Boolean).join(', ')}`);
  }
  if (Array.isArray(data.antiPatterns) && data.antiPatterns.length > 0) {
    parts.push(`Anti-patterns (never write): ${data.antiPatterns.filter(Boolean).join(', ')}`);
  }

  // Content + writing guidelines (verhuisd van Brandstyleguide, ADR 2026-05-15)
  // — gate op savedForAi-flag, default schema is true.
  // Emitten binnen formatBrandVoiceguide zodat de canonical voiceguide-string
  // ze meedraagt; voorheen werden ze in ctx.brandToneOfVoice gezet wat door
  // prompt-templates gated wordt achter `!ctx.brandVoiceguide` — dood pad.
  if (data.guidelinesSavedForAi) {
    if (Array.isArray(data.contentGuidelines) && data.contentGuidelines.length > 0) {
      parts.push(`Content guidelines: ${data.contentGuidelines.join('; ')}`);
    }
    if (Array.isArray(data.writingGuidelines) && data.writingGuidelines.length > 0) {
      parts.push(`Writing style: ${data.writingGuidelines.join('; ')}`);
    }
  }

  // Do/Don't examples (verhuisd van Brandstyleguide, ADR 2026-05-15) — gate
  // op savedForAi-flag, default schema is true dus truthy check correct.
  if (data.examplePhrasesSavedForAi && Array.isArray(data.examplePhrases) && data.examplePhrases.length > 0) {
    const examples = (data.examplePhrases as unknown[]).filter(
      (e): e is { text: string; type: "do" | "dont" } =>
        !!e && typeof e === "object" && typeof (e as { text?: unknown }).text === "string",
    );
    const doExamples = examples.filter((e) => e.type === "do").map((e) => `"${e.text}"`);
    const dontExamples = examples.filter((e) => e.type === "dont").map((e) => `"${e.text}"`);
    if (doExamples.length > 0) parts.push(`Do examples: ${doExamples.join(", ")}`);
    if (dontExamples.length > 0) parts.push(`Don't examples: ${dontExamples.join(", ")}`);
  }

  // F13 Phase A1 (audit 2026-05-13): voice-anchor — gebruik tot 3 writing-
  // samples als gestructureerde reference i.p.v. 1. AI ziet meerdere
  // concrete voorbeelden van merk-stijl, kan voice-fingerprint beter
  // matchen vanaf de eerste generation. Per-sample 400 chars (3 × 400 =
  // 1200 chars max, ~300 tokens). Verbetert pijler 1 (style-fit) zonder
  // dat auto-iterate gewenst is.
  if (Array.isArray(data.writingSamples) && data.writingSamples.length > 0) {
    const samples = (data.writingSamples as unknown[])
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .slice(0, 3)
      .map((s) => (s.length > 400 ? s.slice(0, 400) + '…' : s.trim()));
    if (samples.length > 0) {
      const sampleBlock = samples.map((s, i) => `[${i + 1}] "${s}"`).join(' ');
      parts.push(
        `Writing samples — match THIS voice-fingerprint exactly (woordkeuze, ritme, openingsstijl, zinsstructuur): ${sampleBlock}`,
      );
    }
  }

  return parts.join('. ');
}

/** Format Brand Personality frameworkData into a readable string for AI context */
export function formatBrandPersonality(data: BrandPersonalityData): string {
  const parts: string[] = [];

  // Primary/secondary dimension
  if (data.primaryDimension) {
    let identity = `Primary dimension: ${DIMENSION_LABELS[data.primaryDimension] || data.primaryDimension}`;
    if (data.secondaryDimension) {
      identity += `, Secondary: ${DIMENSION_LABELS[data.secondaryDimension] || data.secondaryDimension}`;
    }
    parts.push(identity);
  }

  // Dimension scores
  if (data.dimensionScores) {
    const scored = Object.entries(data.dimensionScores)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([k, v]) => `${DIMENSION_LABELS[k] || k}: ${v}/5`);
    if (scored.length > 0) parts.push(`Personality scores: ${scored.join(', ')}`);
  }

  // Personality traits
  if (Array.isArray(data.personalityTraits) && data.personalityTraits.length > 0) {
    const traits = data.personalityTraits
      .filter((t) => t.name)
      .map((t) => {
        let s = t.name;
        if (t.description) s += ` (${t.description})`;
        if (t.weAreThis) s += ` — We are: ${t.weAreThis}`;
        if (t.butNeverThat) s += ` — But never: ${t.butNeverThat}`;
        return s;
      });
    if (traits.length > 0) parts.push(`Core traits: ${traits.join('; ')}`);
  }

  // Spectrum sliders
  if (data.spectrumSliders) {
    const positions = Object.entries(data.spectrumSliders)
      .filter(([, v]) => v !== 4) // 4 = neutral
      .map(([k, v]) => {
        const labels = SPECTRUM_LABELS[k];
        if (!labels) return null;
        const position = v < 4 ? labels[0] : labels[1];
        const strength = Math.abs(v - 4);
        const intensity = strength >= 2 ? 'strongly' : 'slightly';
        return `${intensity} ${position}`;
      })
      .filter(Boolean);
    if (positions.length > 0) parts.push(`Personality positioning: ${positions.join(', ')}`);
  }

  // Tone dimensions
  // Voice-related fields (toneDimensions, brandVoiceDescription, wordsWeUse,
  // wordsWeAvoid, writingSample, channelTones) MOVED to BrandVoiceguide. They
  // are formatted by formatBrandVoiceguide() and surfaced as ctx.brandVoiceguide.
  // The legacy frameworkData shape still carries them for historical workspaces
  // that haven't migrated yet — those fields are intentionally NOT rendered here
  // to avoid duplicate voice context in AI prompts.

  // Visual expression
  if (data.colorDirection) parts.push(`Color direction: ${data.colorDirection}`);
  if (data.typographyDirection) parts.push(`Typography direction: ${data.typographyDirection}`);
  if (data.imageryDirection) parts.push(`Imagery direction: ${data.imageryDirection}`);

  return parts.join('. ');
}

// ─── Social Relevancy (ESG) ─────────────────────────────────

interface SocialRelevancyExportData {
  impactStatement?: string;
  impactNarrative?: string;
  activismLevel?: string;
  milieu?: {
    statements?: Array<{ text?: string; score?: number; evidence?: string; target?: string; timeline?: string }>;
    pillarReflection?: string;
  };
  mens?: {
    statements?: Array<{ text?: string; score?: number; evidence?: string; target?: string; timeline?: string }>;
    pillarReflection?: string;
  };
  maatschappij?: {
    statements?: Array<{ text?: string; score?: number; evidence?: string; target?: string; timeline?: string }>;
    pillarReflection?: string;
  };
  authenticityScores?: Record<string, number>;
  proofPoints?: string[];
  certifications?: string[];
  antiGreenwashingStatement?: string;
  sdgAlignment?: number[];
  communicationPrinciples?: string[];
  keyStakeholders?: string[];
  activationChannels?: string[];
  annualCommitment?: string;
}

/** Format Social Relevancy frameworkData into a readable string for AI context */
function formatSocialRelevancy(sr: SocialRelevancyExportData): string | null {
  const parts: string[] = [];

  // Foundation
  if (sr.impactStatement) parts.push(`Impact Statement: ${sr.impactStatement}`);
  if (sr.impactNarrative) parts.push(`Impact Narrative: ${sr.impactNarrative}`);
  if (sr.activismLevel) parts.push(`Activism Level: ${sr.activismLevel}`);

  // Pillar formatter
  const formatPillar = (label: string, pillar?: SocialRelevancyExportData['milieu']) => {
    if (!pillar?.statements) return;
    const stmts = pillar.statements.filter(s => s.score && s.score > 0);
    if (stmts.length === 0 && !pillar.pillarReflection) return;
    const total = stmts.reduce((sum, s) => sum + (s.score ?? 0), 0);
    const lines = [`${label} (Score: ${total}/15)`];
    for (const s of stmts) {
      lines.push(`  - ${s.text} [${s.score}/5]`);
      if (s.evidence) lines.push(`    Evidence: ${s.evidence}`);
      if (s.target) lines.push(`    Target: ${s.target}${s.timeline ? ` (${s.timeline})` : ''}`);
    }
    if (pillar.pillarReflection) lines.push(`  Reflection: ${pillar.pillarReflection}`);
    parts.push(lines.join('\n'));
  };

  formatPillar('Environment (Milieu)', sr.milieu);
  formatPillar('People (Mens)', sr.mens);
  formatPillar('Society (Maatschappij)', sr.maatschappij);

  // Grand total
  const milieuScore = sr.milieu?.statements?.reduce((s, st) => s + (st.score ?? 0), 0) ?? 0;
  const mensScore = sr.mens?.statements?.reduce((s, st) => s + (st.score ?? 0), 0) ?? 0;
  const maatScore = sr.maatschappij?.statements?.reduce((s, st) => s + (st.score ?? 0), 0) ?? 0;
  const grandTotal = milieuScore + mensScore + maatScore;
  if (grandTotal > 0) parts.push(`Grand Total: ${grandTotal}/45`);

  // Authenticity
  if (sr.authenticityScores) {
    const entries = Object.entries(sr.authenticityScores).filter(([, v]) => typeof v === 'number' && v > 0);
    if (entries.length > 0) {
      const avg = Math.round((entries.reduce((s, [, v]) => s + v, 0) / entries.length) * 20);
      const labels: Record<string, string> = {
        walkTheTalk: 'Walk-the-Talk',
        transparency: 'Transparency',
        consistency: 'Consistency',
        stakeholderTrust: 'Stakeholder Trust',
        measurability: 'Measurability',
        longTermCommitment: 'Long-term Commitment',
      };
      parts.push(`Authenticity Score: ${avg}% — ${entries.map(([k, v]) => `${labels[k] ?? k}: ${v}/5`).join(', ')}`);
    }
  }

  // Evidence
  if (sr.proofPoints && sr.proofPoints.length > 0) parts.push(`Evidence (Social Relevancy): ${sr.proofPoints.join('; ')}`);
  if (sr.certifications && sr.certifications.length > 0) parts.push(`Certifications: ${sr.certifications.join(', ')}`);
  if (sr.antiGreenwashingStatement) parts.push(`Anti-Greenwashing: ${sr.antiGreenwashingStatement}`);

  // Activation
  if (sr.sdgAlignment && sr.sdgAlignment.length > 0) parts.push(`UN SDG Alignment: ${sr.sdgAlignment.map(n => `SDG ${n}`).join(', ')}`);
  if (sr.communicationPrinciples && sr.communicationPrinciples.length > 0) parts.push(`Communication Principles: ${sr.communicationPrinciples.join('; ')}`);
  if (sr.keyStakeholders && sr.keyStakeholders.length > 0) parts.push(`Key Stakeholders: ${sr.keyStakeholders.join(', ')}`);
  if (sr.activationChannels && sr.activationChannels.length > 0) parts.push(`Activation Channels: ${sr.activationChannels.join(', ')}`);
  if (sr.annualCommitment) parts.push(`Annual Commitment: ${sr.annualCommitment}`);

  return parts.length > 0 ? parts.join('\n') : null;
}

// ─── Brand Story ───────────────────────────────────────────

interface BrandStoryData {
  originStory?: string;
  founderMotivation?: string;
  coreBeliefStatement?: string;
  worldContext?: string;
  customerExternalProblem?: string;
  customerInternalProblem?: string;
  philosophicalProblem?: string;
  stakesCostOfInaction?: string;
  brandRole?: string;
  empathyStatement?: string;
  authorityCredentials?: string;
  transformationPromise?: string;
  customerSuccessVision?: string;
  abtStatement?: string;
  brandThemes?: string[];
  emotionalTerritory?: string[];
  keyNarrativeMessages?: string[];
  narrativeArc?: string;
  proofPoints?: string[];
  valuesInAction?: string[];
  brandMilestones?: string[];
  elevatorPitch?: string;
  manifestoText?: string;
  audienceAdaptations?: { customers?: string; investors?: string; employees?: string; partners?: string };
}

/** Format Brand Story frameworkData into a readable string for AI context */
function formatBrandStory(data: BrandStoryData): string {
  const parts: string[] = [];

  // Origin & Belief
  if (data.originStory) parts.push(`Origin: ${data.originStory}`);
  if (data.founderMotivation) parts.push(`Founder motivation: ${data.founderMotivation}`);
  if (data.coreBeliefStatement) parts.push(`Core belief: ${data.coreBeliefStatement}`);

  // Problem landscape
  if (data.worldContext) parts.push(`World context: ${data.worldContext}`);
  const problems: string[] = [];
  if (data.customerExternalProblem) problems.push(`External: ${data.customerExternalProblem}`);
  if (data.customerInternalProblem) problems.push(`Internal: ${data.customerInternalProblem}`);
  if (data.philosophicalProblem) problems.push(`Philosophical: ${data.philosophicalProblem}`);
  if (problems.length > 0) parts.push(`Customer problem: ${problems.join(' | ')}`);
  if (data.stakesCostOfInaction) parts.push(`Stakes: ${data.stakesCostOfInaction}`);

  // Brand as Guide
  if (data.brandRole) parts.push(`Brand role: ${data.brandRole}`);
  if (data.empathyStatement) parts.push(`Empathy: ${data.empathyStatement}`);
  if (data.authorityCredentials) parts.push(`Authority: ${data.authorityCredentials}`);

  // Transformation
  if (data.transformationPromise) parts.push(`Transformation: ${data.transformationPromise}`);
  if (data.customerSuccessVision) parts.push(`Customer success vision: ${data.customerSuccessVision}`);

  // Narrative toolkit
  if (data.abtStatement) parts.push(`ABT: ${data.abtStatement}`);
  if (data.narrativeArc) parts.push(`Narrative arc: ${data.narrativeArc}`);
  if (Array.isArray(data.brandThemes) && data.brandThemes.length > 0) {
    parts.push(`Themes: ${data.brandThemes.filter(Boolean).join(', ')}`);
  }
  if (Array.isArray(data.emotionalTerritory) && data.emotionalTerritory.length > 0) {
    parts.push(`Emotional territory: ${data.emotionalTerritory.filter(Boolean).join(', ')}`);
  }
  if (Array.isArray(data.keyNarrativeMessages) && data.keyNarrativeMessages.length > 0) {
    parts.push(`Key messages: ${data.keyNarrativeMessages.filter(Boolean).join('; ')}`);
  }

  // Evidence
  if (Array.isArray(data.proofPoints) && data.proofPoints.length > 0) {
    parts.push(`Evidence (Brand Story): ${data.proofPoints.filter(Boolean).join('; ')}`);
  }
  if (Array.isArray(data.valuesInAction) && data.valuesInAction.length > 0) {
    parts.push(`Values in action: ${data.valuesInAction.filter(Boolean).join('; ')}`);
  }
  if (Array.isArray(data.brandMilestones) && data.brandMilestones.length > 0) {
    parts.push(`Milestones: ${data.brandMilestones.filter(Boolean).join('; ')}`);
  }

  // Expressions
  if (data.elevatorPitch) parts.push(`Elevator pitch: ${data.elevatorPitch}`);
  if (data.manifestoText) parts.push(`Manifesto: ${data.manifestoText}`);
  const adaptations: string[] = [];
  if (data.audienceAdaptations?.customers) adaptations.push(`Customers: ${data.audienceAdaptations.customers}`);
  if (data.audienceAdaptations?.investors) adaptations.push(`Investors: ${data.audienceAdaptations.investors}`);
  if (data.audienceAdaptations?.employees) adaptations.push(`Employees: ${data.audienceAdaptations.employees}`);
  if (data.audienceAdaptations?.partners) adaptations.push(`Partners: ${data.audienceAdaptations.partners}`);
  if (adaptations.length > 0) parts.push(`Audience adaptations: ${adaptations.join(' | ')}`);

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

/** Format BrandHouse Values frameworkData into a readable string for AI context. */
function formatBrandHouseValues(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const sections: string[] = [];

  // Helper to format a single BrandHouseValue (name + description)
  const fmtValue = (raw: unknown): string | null => {
    if (!raw || typeof raw !== 'object') return null;
    const v = raw as Record<string, unknown>;
    if (typeof v.name !== 'string' || !v.name) return null;
    return typeof v.description === 'string' && v.description
      ? `${v.name} — ${v.description}`
      : v.name;
  };

  // Roots (Anchor Values) — foundational values already lived today
  const root1 = fmtValue(obj.anchorValue1);
  const root2 = fmtValue(obj.anchorValue2);
  if (root1 || root2) {
    const roots = [root1, root2].filter(Boolean).join('; ');
    sections.push(`Roots (Anchor Values): ${roots}`);
  }

  // Wings (Aspiration Values) — values that give direction and ambition
  const wing1 = fmtValue(obj.aspirationValue1);
  const wing2 = fmtValue(obj.aspirationValue2);
  if (wing1 || wing2) {
    const wings = [wing1, wing2].filter(Boolean).join('; ');
    sections.push(`Wings (Aspiration Values): ${wings}`);
  }

  // Fire (Own Value) — the most distinguishing characteristic
  const fire = fmtValue(obj.ownValue);
  if (fire) {
    sections.push(`Fire (Own Value): ${fire}`);
  }

  // Value Tension — how the values balance each other
  if (typeof obj.valueTension === 'string' && obj.valueTension) {
    sections.push(`Value Tension: ${obj.valueTension}`);
  }

  // Fallback: legacy { values: [...] } shape
  if (sections.length === 0 && Array.isArray(obj.values) && obj.values.length > 0) {
    return (obj.values as unknown[]).map((v: unknown) => {
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v !== null) {
        const val = v as Record<string, unknown>;
        return typeof val.name === 'string' ? val.name : String(v);
      }
      return String(v);
    }).join(', ');
  }

  return sections.length > 0 ? sections.join('. ') : null;
}

// ─── Aggregator ────────────────────────────────────────────

/**
 * Fetch and aggregate brand context from the database.
 * Returns a BrandContextBlock suitable for prompt injection.
 *
 * Cached for 5 minutes per workspace.
 */
export async function getBrandContext(
  workspaceId: string,
  localeProfileId?: string,
): Promise<BrandContextBlock> {
  // Cache-key = workspace + locale-profiel; weggelaten profileId → 'default'
  // (het isDefault-profiel), zodat het single-locale-pad byte-identiek blijft.
  const cacheKey = `${workspaceId}:${localeProfileId ?? 'default'}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Fetch all sources in parallel
  const [workspace, brandAssets, personas, products, activatedTrends, competitors, styleguide, consistentModels, voiceguide] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, contentLanguage: true },
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
      select: {
        title: true,
        description: true,
        category: true,
        impactLevel: true,
        scope: true,
        timeframe: true,
        relevanceScore: true,
        direction: true,
        confidence: true,
        whyNow: true,
        dataPoints: true,
        aiAnalysis: true,
      },
      orderBy: { relevanceScore: 'desc' },
      take: 5,
    }),

    prisma.competitor.findMany({
      where: { workspaceId, status: 'ANALYZED' },
      select: {
        name: true,
        tier: true,
        competitiveScore: true,
        valueProposition: true,
        differentiators: true,
        strengths: true,
        weaknesses: true,
        targetAudience: true,
        mainOfferings: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),

    prisma.brandStyleguide.findFirst({
      where: { workspaceId },
      select: {
        colors: { select: { name: true, hex: true, category: true } },
        primaryFontName: true,
        typeScale: true,
        photographyStyle: true,
        photographyGuidelines: true,
        imageryDonts: true,
        colorsSavedForAi: true,
        typographySavedForAi: true,
        imagerySavedForAi: true,
        graphicElements: true,
        graphicElementsDonts: true,
        patternsTextures: true,
        iconographyStyle: true,
        iconographyDonts: true,
        gradientsEffects: true,
        layoutPrinciples: true,
        designLanguageSavedForAi: true,
        visualLanguage: true,
        visualLanguageSavedForAi: true,
        // Fase 2: publish gate
        published: true,
        // Fase 1: brand assets
        fonts: { select: { name: true, role: true, source: true, fileUrl: true, weight: true } },
        // Fase 3: semantic colors
        semanticColors: true,
        // Fase 5: components
        components: { select: { type: true, label: true } },
      },
    }),

    prisma.consistentModel.findMany({
      where: { workspaceId, status: 'READY' },
      select: { name: true, type: true, description: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),

    prisma.brandVoiceguide.findUnique({
      where: { workspaceId },
      select: {
        voiceDescription: true,
        toneDimensions: true,
        wordsWeUse: true,
        wordsWeAvoid: true,
        antiPatterns: true,
        writingSamples: true,
        channelTones: true,
        contentLocale: true,
        contentGuidelines: true,
        writingGuidelines: true,
        examplePhrases: true,
        guidelinesSavedForAi: true,
        examplePhrasesSavedForAi: true,
        // DTS-plan C1+C2
        vocabularyDo: true,
        vocabularyDont: true,
        voiceSample: true,
      },
    }),
  ]);

  // Build asset lookup by slug for reliable mapping
  const assetBySlug = new Map<string, typeof brandAssets[0]>();
  for (const asset of brandAssets) {
    if (asset.slug) assetBySlug.set(asset.slug, asset);
  }

  // Content-locale foundation: alleen bij een EXPLICIET gekozen profiel (Fase 2
  // target-picker) wint de profiel-locale. Het default-pad (localeProfileId
  // weggelaten) blijft ongewijzigd — voiceguide-override → Workspace.contentLanguage
  // → 'en' — en reproduceert dus byte-identiek.
  const localeProfile = localeProfileId
    ? await prisma.brandLocaleProfile.findUnique({ where: { id: localeProfileId }, select: { locale: true } })
    : null;

  // Build context block.
  // Language-precedence: expliciet profiel wint; anders de bestaande fallback
  // (BrandVoiceguide.contentLocale ISO-prefix → Workspace.contentLanguage → 'en').
  const profileLocalePrefix = localeProfile?.locale?.split('-')[0]?.toLowerCase();
  const voiceguideLocalePrefix = voiceguide?.contentLocale?.split('-')[0]?.toLowerCase();
  const ctx: BrandContextBlock = {
    brandName: workspace?.name,
    contentLanguage: profileLocalePrefix ?? voiceguideLocalePrefix ?? workspace?.contentLanguage ?? 'en',
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

  // Brand Essence (extended frameworkData)
  const essence = assetBySlug.get('brand-essence');
  if (essence) {
    const fwData = essence.frameworkData as BrandEssenceData | null;
    if (fwData?.essenceStatement) {
      const parts: string[] = [];
      parts.push(`Essence: ${fwData.essenceStatement}`);
      if (fwData.essenceNarrative) parts.push(fwData.essenceNarrative);
      if (fwData.functionalBenefit) parts.push(`Functional benefit (Identity): ${fwData.functionalBenefit}`);
      if (fwData.emotionalBenefit) parts.push(`Emotional benefit (Identity): ${fwData.emotionalBenefit}`);
      if (fwData.selfExpressiveBenefit) parts.push(`Self-expressive benefit (Identity): ${fwData.selfExpressiveBenefit}`);
      if (fwData.discriminator) parts.push(`Discriminator: ${fwData.discriminator}`);
      if (fwData.audienceInsight) parts.push(`Audience insight: ${fwData.audienceInsight}`);
      if (Array.isArray(fwData.proofPoints) && fwData.proofPoints.length > 0) {
        parts.push(`Identity evidence: ${fwData.proofPoints.filter(Boolean).join('; ')}`);
      }
      if (Array.isArray(fwData.attributes) && fwData.attributes.length > 0) {
        parts.push(`Attributes: ${fwData.attributes.filter(Boolean).join(', ')}`);
      }
      ctx.brandEssence = parts.join('. ');
    } else {
      ctx.brandEssence = extractContentText(essence.content) || essence.description || undefined;
    }
  }

  // Brand Promise (extended frameworkData)
  const promise = assetBySlug.get('brand-promise');
  if (promise) {
    const fwData = promise.frameworkData as BrandPromiseData | null;
    if (fwData?.promiseStatement) {
      const parts: string[] = [];
      if (fwData.promiseOneLiner) parts.push(`Promise: ${fwData.promiseOneLiner}`);
      else parts.push(`Promise: ${fwData.promiseStatement}`);
      if (fwData.promiseOneLiner && fwData.promiseStatement) parts.push(fwData.promiseStatement);
      if (fwData.functionalValue) parts.push(`Functional value (Commitment): ${fwData.functionalValue}`);
      if (fwData.emotionalValue) parts.push(`Emotional value (Commitment): ${fwData.emotionalValue}`);
      if (fwData.selfExpressiveValue) parts.push(`Self-expressive value (Commitment): ${fwData.selfExpressiveValue}`);
      if (fwData.targetAudience) parts.push(`Target audience: ${fwData.targetAudience}`);
      if (fwData.coreCustomerNeed) parts.push(`Core customer need: ${fwData.coreCustomerNeed}`);
      if (fwData.differentiator) parts.push(`Differentiator: ${fwData.differentiator}`);
      if (fwData.onlynessStatement) parts.push(`Onlyness: ${fwData.onlynessStatement}`);
      if (Array.isArray(fwData.proofPoints) && fwData.proofPoints.length > 0) {
        parts.push(`Delivery evidence: ${fwData.proofPoints.filter(Boolean).join('; ')}`);
      }
      if (Array.isArray(fwData.measurableOutcomes) && fwData.measurableOutcomes.length > 0) {
        parts.push(`Measurable outcomes: ${fwData.measurableOutcomes.filter(Boolean).join('; ')}`);
      }
      ctx.brandPromise = parts.join('. ');
    } else {
      ctx.brandPromise = extractContentText(promise.content) || promise.description || undefined;
    }
  }

  // Mission & Vision (merged asset, frameworkType MISSION_STATEMENT)
  const mission = assetBySlug.get('mission-statement');
  if (mission) {
    const fwData = mission.frameworkData as MissionVisionData | null;
    if (fwData?.missionStatement) {
      const formatted = formatMissionVision(fwData);
      if (formatted) ctx.brandMission = formatted;
      // Also extract vision separately for brandVision field
      if (fwData.visionStatement) ctx.brandVision = fwData.visionStatement;
    } else {
      ctx.brandMission = extractContentText(mission.content) || mission.description || undefined;
      // Legacy: extract vision from frameworkData if available
      const missionFw = mission.frameworkData as Record<string, unknown> | null;
      if (missionFw?.visionStatement && typeof missionFw.visionStatement === 'string') {
        ctx.brandVision = missionFw.visionStatement as string;
      }
    }
  }

  // Brand Archetype (rich formatting from frameworkData)
  const archetype = assetBySlug.get('brand-archetype');
  if (archetype) {
    const fwData = archetype.frameworkData as BrandArchetypeData | null;
    if (fwData?.primaryArchetype) {
      const formatted = formatBrandArchetype(fwData);
      if (formatted) ctx.brandArchetype = formatted;
    } else {
      ctx.brandArchetype = extractContentText(archetype.content) || archetype.description || undefined;
    }
  }

  // Brand Personality (rich formatting from frameworkData)
  const personality = assetBySlug.get('brand-personality');
  if (personality) {
    const fwData = personality.frameworkData as BrandPersonalityData | null;
    if (fwData?.primaryDimension || (fwData?.personalityTraits && fwData.personalityTraits.length > 0)) {
      const formatted = formatBrandPersonality(fwData);
      if (formatted) ctx.brandPersonality = formatted;
    } else {
      ctx.brandPersonality = extractContentText(personality.content) || personality.description || undefined;
    }
  }

  // Brand Voiceguide (split from personality — voiceguide row wins; fallback
  // re-projects legacy BrandPersonality voice fields into the voiceguide shape
  // so unmigrated workspaces still get voice context in AI prompts.)
  //
  // Two formats produced from the same source:
  //  - `brandVoiceguide`: legacy free-form-list (formatBrandVoiceguide)
  //  - `voiceBaseline1Pager`: methodology-conform 1-pager (Δ-3) — preferred for
  //    F-VAL judge-prompts and Strategy Analyst. Both coexist until consumers
  //    finish migrating.
  if (voiceguide) {
    const formatted = formatBrandVoiceguide(voiceguide as BrandVoiceguideRow);
    if (formatted) ctx.brandVoiceguide = formatted;
    // Δ-3 1-pager: derive from the same row via the canonical pure function.
    // Cast is safe because select-shape in the Prisma query above mirrors the
    // BrandVoiceguide model's read-fields.
    const baseline = deriveVoiceBaseline1Pager(voiceguide as Parameters<typeof deriveVoiceBaseline1Pager>[0]);
    ctx.voiceBaseline1Pager = formatVoiceBaseline1Pager(baseline);
  } else if (personality?.frameworkData) {
    const fw = personality.frameworkData as BrandPersonalityData | null;
    if (fw) {
      const fallback = formatBrandVoiceguide({
        voiceDescription: fw.brandVoiceDescription ?? null,
        toneDimensions: fw.toneDimensions ?? null,
        wordsWeUse: fw.wordsWeUse ?? [],
        wordsWeAvoid: fw.wordsWeAvoid ?? [],
        antiPatterns: [],
        writingSamples: fw.writingSample ? [fw.writingSample] : [],
        channelTones: fw.channelTones ?? null,
      });
      if (fallback) ctx.brandVoiceguide = fallback;
      // Δ-3 1-pager fallback: project legacy personality fields into a minimal
      // BrandVoiceguide-shaped row so the same derivation function works.
      const baseline = deriveVoiceBaseline1Pager({
        voiceDescription: fw.brandVoiceDescription ?? null,
        toneDimensions: fw.toneDimensions ?? null,
        wordsWeUse: fw.wordsWeUse ?? [],
        wordsWeAvoid: fw.wordsWeAvoid ?? [],
        antiPatterns: [],
        writingSamples: fw.writingSample ? [fw.writingSample] : [],
        channelTones: null,
        // Fields the derivation function does not read but the BrandVoiceguide
        // type requires — cast through unknown to satisfy the type-check.
      } as unknown as Parameters<typeof deriveVoiceBaseline1Pager>[0]);
      ctx.voiceBaseline1Pager = formatVoiceBaseline1Pager(baseline);
    }
  }

  // Brand Story (rich formatting from frameworkData)
  const story = assetBySlug.get('brand-story');
  if (story) {
    const fwData = story.frameworkData as BrandStoryData | null;
    if (fwData?.originStory || fwData?.elevatorPitch || fwData?.transformationPromise) {
      const formatted = formatBrandStory(fwData);
      if (formatted) ctx.brandStory = formatted;
    } else {
      ctx.brandStory = extractContentText(story.content) || story.description || undefined;
    }
  }

  // Core Values (BRANDHOUSE_VALUES)
  const values = assetBySlug.get('core-values');
  if (values) {
    const formatted = formatBrandHouseValues(values.frameworkData);
    if (formatted) {
      ctx.brandValues = [formatted];
    } else {
      const contentText = extractContentText(values.content);
      if (contentText) ctx.brandValues = [contentText];
    }
  }

  // Transformative Goals (rich formatting from frameworkData)
  const goals = assetBySlug.get('transformative-goals');
  if (goals) {
    const fwData = goals.frameworkData as TransformativeGoalsData | null;
    if (fwData?.massiveTransformativePurpose) {
      const formatted = formatTransformativeGoals(fwData);
      if (formatted) ctx.transformativeGoals = formatted;
    } else {
      ctx.transformativeGoals = extractContentText(goals.content) || goals.description || undefined;
    }
  }

  // Social Relevancy (ESG / Purpose Kompas)
  const social = assetBySlug.get('social-relevancy');
  if (social) {
    const fwData = social.frameworkData as SocialRelevancyExportData | null;
    const formatted = fwData ? formatSocialRelevancy(fwData) : null;
    if (formatted) {
      ctx.socialRelevancy = formatted;
    } else {
      ctx.socialRelevancy = extractContentText(social.content) || social.description || undefined;
    }
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

  // Visual identity from brandstyle
  // Fase 2 gate: only expose the styleguide context when published is true.
  // Individual per-section `savedForAi` flags then provide finer-grained control.
  if (styleguide && styleguide.published) {
    // Colors
    if (styleguide.colorsSavedForAi && styleguide.colors.length > 0) {
      const colorsByCategory = new Map<string, typeof styleguide.colors>();
      for (const c of styleguide.colors) {
        const arr = colorsByCategory.get(c.category) ?? [];
        arr.push(c);
        colorsByCategory.set(c.category, arr);
      }
      const colorParts: string[] = [];
      for (const [cat, colors] of colorsByCategory) {
        const items = colors.map((c) => `${c.name} ${c.hex}`).join(', ');
        colorParts.push(`${cat}: ${items}`);
      }

      // Fase 3: semantic color tints (info/success/warning/danger)
      const sem = styleguide.semanticColors as {
        info?: { light?: string; base?: string; dark?: string };
        success?: { light?: string; base?: string; dark?: string };
        warning?: { light?: string; base?: string; dark?: string };
        danger?: { light?: string; base?: string; dark?: string };
      } | null;
      if (sem) {
        const semParts: string[] = [];
        for (const key of ["info", "success", "warning", "danger"] as const) {
          const tint = sem[key];
          if (!tint) continue;
          const swatches = [tint.light, tint.base, tint.dark].filter(Boolean).join(" / ");
          if (swatches) semParts.push(`${key} ${swatches}`);
        }
        if (semParts.length > 0) colorParts.push(`Semantic: ${semParts.join("; ")}`);
      }
      ctx.brandColors = colorParts.join('; ');
    }

    // Fase 1: brand fonts (uploaded files let the writer know the real type
    // is available for previews / exports). Cap to 3 per role to keep the
    // context tight — for a site with 15 scraped Google Fonts we don't want
    // to flood the prompt with detector noise.
    if (styleguide.fonts && styleguide.fonts.length > 0) {
      const byRole = new Map<string, string[]>();
      for (const f of styleguide.fonts) {
        const status = f.source === "UPLOADED" ? "uploaded" : "detected";
        const label = `${f.name} (${status}${f.weight ? `, ${f.weight}` : ""})`;
        const arr = byRole.get(f.role) ?? [];
        if (arr.length < 3) arr.push(label);
        byRole.set(f.role, arr);
      }
      const fontParts: string[] = [];
      for (const [role, items] of byRole) {
        fontParts.push(`${role}: ${items.join(", ")}`);
      }
      if (fontParts.length > 0) ctx.brandFonts = fontParts.join("; ");
    }

    // Typography
    if (styleguide.typographySavedForAi) {
      const typoParts: string[] = [];
      if (styleguide.primaryFontName) typoParts.push(`Primary font: ${styleguide.primaryFontName}`);
      if (Array.isArray(styleguide.typeScale) && styleguide.typeScale.length > 0) {
        const scaleItems = (styleguide.typeScale as { level?: string; size?: string; weight?: string }[])
          .filter((s) => s.level && s.size)
          .map((s) => `${s.level} ${s.size}/${s.weight ?? 'regular'}`)
          .join(', ');
        if (scaleItems) typoParts.push(`Type scale: ${scaleItems}`);
      }
      if (typoParts.length > 0) ctx.brandTypography = typoParts.join('. ');
    }

    // Tone of Voice — guidelines (verhuisd naar BrandVoiceguide, ADR 2026-05-15).
    // ctx.brandToneOfVoice blijft als guidelines-only veld voor backwards compat
    // met campaign brief render + studio brand-voice-directive fallback paths.
    // Gate-semantiek consistent met andere ai-context readers: truthy check
    // (schema-default is true, dus ongezet = niet meenemen).
    if (voiceguide?.guidelinesSavedForAi) {
      const toneParts: string[] = [];
      if (Array.isArray(voiceguide.contentGuidelines) && voiceguide.contentGuidelines.length > 0) {
        toneParts.push(`Content guidelines: ${voiceguide.contentGuidelines.join('; ')}`);
      }
      if (Array.isArray(voiceguide.writingGuidelines) && voiceguide.writingGuidelines.length > 0) {
        toneParts.push(`Writing style: ${voiceguide.writingGuidelines.join('; ')}`);
      }
      if (toneParts.length > 0) ctx.brandToneOfVoice = toneParts.join('. ');
    }

    // Imagery — analyzer markers (OBSERVED:/RECOMMENDED:) are review metadata,
    // not style direction; strip them here, before the cache write, so every
    // consumer (image/video/canvas prompts) gets clean text (audit T5). The
    // "label: value" segment structure must stay intact: downstream parsers
    // (featureSafeImagerySegments) split on these labels.
    if (styleguide.imagerySavedForAi) {
      const imgParts: string[] = [];
      const photoStyle = styleguide.photographyStyle as { mood?: string; subjects?: string; composition?: string } | null;
      const mood = stripAnalyzerMarkers(photoStyle?.mood);
      const subjects = stripAnalyzerMarkers(photoStyle?.subjects);
      const composition = stripAnalyzerMarkers(photoStyle?.composition);
      if (mood) imgParts.push(`Photography mood: ${mood}`);
      if (subjects) imgParts.push(`Subjects: ${subjects}`);
      if (composition) imgParts.push(`Composition: ${composition}`);
      const guidelines = stripAnalyzerMarkersFromList(styleguide.photographyGuidelines);
      if (guidelines.length > 0) {
        imgParts.push(`Guidelines: ${guidelines.join('; ')}`);
      }
      if (imgParts.length > 0) ctx.brandImageryStyle = imgParts.join('. ');
      // imageryDonts wordt apart geëxposeerd zodat image-providers het via
      // hun native negative-prompt parameter consumeren (Pattern A image-
      // quality-chain). Niet meer als "Avoid: …" suffix in brandImageryStyle
      // omdat dat het signaal duplificeert wanneer beide kanalen actief zijn.
      if (styleguide.imageryDonts.length > 0) {
        ctx.brandImageryDonts = styleguide.imageryDonts;
      }
    }

    // Design Language — use visualLanguageSavedForAi as gate (merged Visual System tab)
    // Backward compat: also accept the legacy designLanguageSavedForAi flag
    if (styleguide.designLanguageSavedForAi || styleguide.visualLanguageSavedForAi) {
      const dlParts: string[] = [];
      const graphicEl = styleguide.graphicElements as { brandShapes?: string[]; decorativeElements?: string[]; visualDevices?: string[]; usageNotes?: string } | null;
      if (graphicEl) {
        const shapes = [...(graphicEl.brandShapes ?? []), ...(graphicEl.decorativeElements ?? []), ...(graphicEl.visualDevices ?? [])].filter(Boolean);
        if (shapes.length > 0) dlParts.push(`Graphic elements: ${shapes.join(', ')}`);
        if (graphicEl.usageNotes) dlParts.push(`Graphic usage: ${graphicEl.usageNotes}`);
      }
      if (styleguide.graphicElementsDonts.length > 0) {
        dlParts.push(`Graphic don'ts: ${styleguide.graphicElementsDonts.join('; ')}`);
      }
      const patternsEl = styleguide.patternsTextures as { patterns?: string[]; textures?: string[]; backgrounds?: string[]; usageNotes?: string } | null;
      if (patternsEl) {
        const items = [...(patternsEl.patterns ?? []), ...(patternsEl.textures ?? []), ...(patternsEl.backgrounds ?? [])].filter(Boolean);
        if (items.length > 0) dlParts.push(`Patterns & textures: ${items.join(', ')}`);
        if (patternsEl.usageNotes) dlParts.push(`Pattern usage: ${patternsEl.usageNotes}`);
      }
      const iconStyle = styleguide.iconographyStyle as { style?: string; sizing?: string; strokeWeight?: string; cornerRadius?: string; colorUsage?: string; usageNotes?: string } | null;
      if (iconStyle?.style) {
        let iconStr = `Icon style: ${iconStyle.style}`;
        if (iconStyle.sizing) iconStr += `, sizing ${iconStyle.sizing}`;
        if (iconStyle.strokeWeight) iconStr += `, stroke ${iconStyle.strokeWeight}`;
        if (iconStyle.cornerRadius) iconStr += `, corner radius ${iconStyle.cornerRadius}`;
        if (iconStyle.colorUsage) iconStr += `, color usage ${iconStyle.colorUsage}`;
        dlParts.push(iconStr);
        if (iconStyle.usageNotes) dlParts.push(`Icon usage: ${iconStyle.usageNotes}`);
      }
      if (styleguide.iconographyDonts.length > 0) {
        dlParts.push(`Iconography don'ts: ${styleguide.iconographyDonts.join('; ')}`);
      }
      const grads = styleguide.gradientsEffects as { name?: string; type?: string; colors?: string[]; angle?: string; usage?: string }[] | null;
      if (Array.isArray(grads) && grads.length > 0) {
        const gradStrs = grads.filter((g) => g.name).map((g) => {
          let str = `${g.name} (${g.type}, ${(g.colors ?? []).join(' → ')}`;
          if (g.angle) str += `, ${g.angle}`;
          str += ')';
          if (g.usage) str += ` — ${g.usage}`;
          return str;
        });
        if (gradStrs.length > 0) dlParts.push(`Gradients: ${gradStrs.join('; ')}`);
      }
      const layout = styleguide.layoutPrinciples as { gridSystem?: string; spacingScale?: string; whitespacePhilosophy?: string; compositionRules?: string[]; usageNotes?: string } | null;
      if (layout) {
        if (layout.gridSystem) dlParts.push(`Grid: ${layout.gridSystem}`);
        if (layout.spacingScale) dlParts.push(`Spacing: ${layout.spacingScale}`);
        if (layout.whitespacePhilosophy) dlParts.push(`Whitespace: ${layout.whitespacePhilosophy}`);
        if (layout.compositionRules && layout.compositionRules.length > 0) dlParts.push(`Composition rules: ${layout.compositionRules.join('; ')}`);
        if (layout.usageNotes) dlParts.push(`Layout usage: ${layout.usageNotes}`);
      }
      if (dlParts.length > 0) ctx.brandDesignLanguage = dlParts.join('. ');
    }

    // Visual Language (Vormentaal) — the brand's visual DNA
    if (styleguide.visualLanguageSavedForAi && styleguide.visualLanguage) {
      const vl = styleguide.visualLanguage as { promptFragment?: string; summary?: string };
      if (vl.promptFragment) {
        ctx.brandVisualLanguage = vl.promptFragment;
      } else if (vl.summary) {
        ctx.brandVisualLanguage = vl.summary;
      }
    }

    // Merged Visual System — combines design language + visual language into one context block.
    // Used by downstream prompts as a single coherent visual identity reference.
    const vsysParts: string[] = [];
    if (ctx.brandVisualLanguage) vsysParts.push(ctx.brandVisualLanguage);
    if (ctx.brandDesignLanguage) vsysParts.push(ctx.brandDesignLanguage);
    if (vsysParts.length > 0) ctx.brandVisualSystem = vsysParts.join('\n\n');

    // Fase 5: component samples — aggregate high-level counts per type so the
    // writer knows which component vocabulary the brand uses. Gated by the
    // visual-system saved-for-AI flag since components belong to the same tier.
    if (
      (styleguide.designLanguageSavedForAi || styleguide.visualLanguageSavedForAi) &&
      Array.isArray(styleguide.components) &&
      styleguide.components.length > 0
    ) {
      const counts = new Map<string, number>();
      for (const c of styleguide.components) {
        counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
      }
      const compParts = Array.from(counts.entries())
        .map(([type, count]) => `${count} ${type.toLowerCase().replace(/_/g, " ")}`)
        .join(", ");
      if (compParts) ctx.brandComponents = `Detected samples: ${compParts}.`;
    }
  }

  // Competitor analysis
  if (competitors.length > 0) {
    ctx.competitorAnalysis = competitors
      .map((c) => {
        const parts = [`- ${c.name} [${c.tier}`];
        if (c.competitiveScore != null) parts[0] += `, score: ${c.competitiveScore}/100`;
        parts[0] += ']';
        if (c.valueProposition) parts.push(`  Value Proposition: ${c.valueProposition}`);
        if (c.targetAudience) parts.push(`  Target Audience: ${c.targetAudience}`);
        if (c.differentiators.length > 0) parts.push(`  Differentiators: ${c.differentiators.join('; ')}`);
        if (c.mainOfferings.length > 0) parts.push(`  Offerings: ${c.mainOfferings.join('; ')}`);
        if (c.strengths.length > 0) parts.push(`  Strengths: ${c.strengths.join('; ')}`);
        if (c.weaknesses.length > 0) parts.push(`  Weaknesses: ${c.weaknesses.join('; ')}`);
        return parts.join('\n');
      })
      .join('\n');
  }

  // Competitive landscape from activated trends
  if (activatedTrends.length > 0) {
    const highImpact = activatedTrends.filter(
      (t) => t.impactLevel === 'HIGH' || t.impactLevel === 'CRITICAL',
    );
    const relevant = highImpact.length > 0 ? highImpact : activatedTrends.slice(0, 3);
    ctx.competitiveLandscape = relevant
      .map((t) => {
        const parts = [`- ${t.title} [${t.category}, ${t.impactLevel} impact`];
        if (t.direction) parts[0] += `, ${t.direction}`;
        if (t.scope) parts[0] += `, ${t.scope}`;
        parts[0] += ']';
        if (t.description) parts.push(`  ${t.description}`);
        if (t.whyNow) parts.push(`  Why now: ${t.whyNow}`);
        if (t.aiAnalysis) parts.push(`  Analysis: ${t.aiAnalysis}`);
        if (Array.isArray(t.dataPoints)) {
          const filtered = t.dataPoints.filter(Boolean);
          if (filtered.length > 0) {
            parts.push(`  Data: ${filtered.join('; ')}`);
          }
        }
        return parts.join('\n');
      })
      .join('\n');
  }

  // Consistent AI models
  if (consistentModels.length > 0) {
    ctx.consistentModels = consistentModels
      .map((m) => `- ${m.name} (${m.type})${m.description ? `: ${m.description}` : ''}`)
      .join('\n');
  }

  // DTS-plan C1+C2: vocabulary + voice-sample uit BrandVoiceguide direct
  // doorgeven aan content-generators (variant-generator gebruikt deze).
  if (voiceguide) {
    if (Array.isArray(voiceguide.vocabularyDo) && voiceguide.vocabularyDo.length > 0) {
      ctx.vocabularyDo = voiceguide.vocabularyDo;
    }
    if (Array.isArray(voiceguide.vocabularyDont) && voiceguide.vocabularyDont.length > 0) {
      ctx.vocabularyDont = voiceguide.vocabularyDont;
    }
    if (typeof voiceguide.voiceSample === 'string' && voiceguide.voiceSample.trim().length > 0) {
      ctx.voiceSample = voiceguide.voiceSample.trim();
    }
  }

  // Cache and return
  setCache(cacheKey, ctx);
  return ctx;
}
