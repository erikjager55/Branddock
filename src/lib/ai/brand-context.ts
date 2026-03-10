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
  milestones?: { title?: string; achieved?: boolean }[];
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
          const achieved = g.milestones.filter((m) => m.achieved).length;
          gParts.push(`Milestones: ${achieved}/${g.milestones.length} achieved`);
        }
        if (Array.isArray(g.sdgAlignment) && g.sdgAlignment.length > 0) {
          gParts.push(`SDGs: ${g.sdgAlignment.join(', ')}`);
        }
        return gParts.join(' ');
      });
    if (goalSummaries.length > 0) parts.push(`Goals: ${goalSummaries.join('; ')}`);
  }
  if (data.authenticityScores) {
    const vals = Object.values(data.authenticityScores);
    const total = vals.reduce((a, b) => a + b, 0);
    if (total > 0) {
      const avg = Math.round((total / vals.length) * 20);
      parts.push(`Authenticity score: ${avg}%`);
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
  coreDesire?: string;
  coreFear?: string;
  brandGoal?: string;
  strategy?: string;
  giftTalent?: string;
  shadowWeakness?: string;
  brandVoiceDescription?: string;
  voiceAdjectives?: string[];
  languagePatterns?: string;
  weSayNotThat?: { weSay?: string; notThat?: string }[];
  toneVariations?: string;
  blacklistedPhrases?: string[];
  colorDirection?: string;
  typographyDirection?: string;
  imageryStyle?: string;
  visualMotifs?: string;
  archetypeInAction?: string;
  marketingExpression?: string;
  customerExperience?: string;
  contentStrategy?: string;
  storytellingApproach?: string;
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

  // Voice & messaging
  if (data.brandVoiceDescription) parts.push(`Voice: ${data.brandVoiceDescription}`);
  if (Array.isArray(data.voiceAdjectives) && data.voiceAdjectives.length > 0) {
    parts.push(`Voice adjectives: ${data.voiceAdjectives.filter(Boolean).join(', ')}`);
  }
  if (data.languagePatterns) parts.push(`Language patterns: ${data.languagePatterns}`);
  if (Array.isArray(data.weSayNotThat) && data.weSayNotThat.length > 0) {
    const pairs = data.weSayNotThat
      .filter((p) => p.weSay)
      .map((p) => `"${p.weSay}" (not "${p.notThat ?? '...'}")`)
      .join('; ');
    if (pairs) parts.push(`We say/Not that: ${pairs}`);
  }
  if (data.toneVariations) parts.push(`Tone variations: ${data.toneVariations}`);
  if (Array.isArray(data.blacklistedPhrases) && data.blacklistedPhrases.length > 0) {
    parts.push(`Blacklisted phrases: ${data.blacklistedPhrases.filter(Boolean).join(', ')}`);
  }

  // Visual expression
  if (data.colorDirection) parts.push(`Color direction: ${data.colorDirection}`);
  if (data.typographyDirection) parts.push(`Typography: ${data.typographyDirection}`);
  if (data.imageryStyle) parts.push(`Imagery style: ${data.imageryStyle}`);
  if (data.visualMotifs) parts.push(`Visual motifs: ${data.visualMotifs}`);

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

interface BrandPersonalityData {
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

/** Format Brand Personality frameworkData into a readable string for AI context */
function formatBrandPersonality(data: BrandPersonalityData): string {
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
  if (data.toneDimensions) {
    const tones = Object.entries(data.toneDimensions)
      .filter(([, v]) => v !== 4)
      .map(([k, v]) => {
        const labels = TONE_LABELS[k];
        if (!labels) return null;
        const position = v < 4 ? labels[0] : labels[1];
        return position;
      })
      .filter(Boolean);
    if (tones.length > 0) parts.push(`Tone of voice: ${tones.join(', ')}`);
  }

  // Voice description
  if (data.brandVoiceDescription) parts.push(`Brand voice: ${data.brandVoiceDescription}`);

  // Word preferences
  if (Array.isArray(data.wordsWeUse) && data.wordsWeUse.length > 0) {
    parts.push(`Words we use: ${data.wordsWeUse.filter(Boolean).join(', ')}`);
  }
  if (Array.isArray(data.wordsWeAvoid) && data.wordsWeAvoid.length > 0) {
    parts.push(`Words we avoid: ${data.wordsWeAvoid.filter(Boolean).join(', ')}`);
  }

  // Writing sample
  if (data.writingSample) parts.push(`Writing sample: "${data.writingSample}"`);

  // Channel tones
  if (data.channelTones) {
    const channels = Object.entries(data.channelTones)
      .filter(([, v]) => !!v)
      .map(([k, v]) => `${k}: ${v}`);
    if (channels.length > 0) parts.push(`Channel-specific tone: ${channels.join('; ')}`);
  }

  // Visual expression
  if (data.colorDirection) parts.push(`Color direction: ${data.colorDirection}`);
  if (data.typographyDirection) parts.push(`Typography direction: ${data.typographyDirection}`);
  if (data.imageryDirection) parts.push(`Imagery direction: ${data.imageryDirection}`);

  return parts.join('. ');
}

// ─── Social Relevancy (ESG / Purpose Kompas) ──────────────

/** Format Social Relevancy / ESG / Purpose Kompas frameworkData into a readable string */
function formatSocialRelevancy(data: Record<string, unknown>): string | null {
  const parts: string[] = [];

  // Purpose Kompas shape: { pillars: { mens: {...}, milieu: {...}, maatschappij: {...} } }
  const pillars = data.pillars as Record<string, { impact?: string; description?: string }> | undefined;
  if (pillars && typeof pillars === 'object') {
    const pillarNames: Record<string, string> = {
      mens: 'People',
      milieu: 'Planet',
      maatschappij: 'Society',
      environmental: 'Environmental',
      social: 'Social',
      governance: 'Governance',
    };
    for (const [key, pillar] of Object.entries(pillars)) {
      if (pillar && typeof pillar === 'object') {
        const label = pillarNames[key] || key;
        const pParts: string[] = [label];
        if (pillar.impact) pParts.push(`(${pillar.impact} impact)`);
        if (pillar.description) pParts.push(`— ${pillar.description}`);
        parts.push(pParts.join(' '));
      }
    }
  }

  // Any top-level string fields (e.g. summary, statement)
  for (const [key, value] of Object.entries(data)) {
    if (key === 'pillars') continue;
    if (typeof value === 'string' && value.length > 0) {
      parts.push(`${key}: ${value}`);
    }
  }

  return parts.length > 0 ? parts.join('. ') : null;
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
    parts.push(`Proof points: ${data.proofPoints.filter(Boolean).join('; ')}`);
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

/** Format BrandHouse Values frameworkData into a readable string for AI context */
function formatBrandHouseValues(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const parts: string[] = [];

  // BrandHouse model: anchorValue1/2, aspirationValue1/2, ownValue, valueTension
  const valueFields = [
    { key: 'anchorValue1', label: 'Anchor Value 1' },
    { key: 'anchorValue2', label: 'Anchor Value 2' },
    { key: 'aspirationValue1', label: 'Aspiration Value 1' },
    { key: 'aspirationValue2', label: 'Aspiration Value 2' },
    { key: 'ownValue', label: 'Own Value' },
  ];

  for (const { key, label } of valueFields) {
    const val = obj[key] as { name?: string; description?: string } | undefined;
    if (val?.name) {
      let entry = `${label}: ${val.name}`;
      if (val.description) entry += ` — ${val.description}`;
      parts.push(entry);
    }
  }

  if (typeof obj.valueTension === 'string' && obj.valueTension) {
    parts.push(`Value tension: ${obj.valueTension}`);
  }

  // Fallback: legacy { values: [...] } shape
  if (parts.length === 0 && Array.isArray(obj.values) && obj.values.length > 0) {
    return (obj.values as unknown[]).map((v: unknown) => {
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v !== null) {
        const val = v as Record<string, unknown>;
        return typeof val.name === 'string' ? val.name : String(v);
      }
      return String(v);
    }).join(', ');
  }

  return parts.length > 0 ? parts.join('. ') : null;
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
  const [workspace, brandAssets, personas, products, activatedTrends, styleguide] = await Promise.all([
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

    prisma.brandStyleguide.findFirst({
      where: { workspaceId },
      select: {
        colors: { select: { name: true, hex: true, category: true } },
        primaryFontName: true,
        typeScale: true,
        contentGuidelines: true,
        writingGuidelines: true,
        photographyStyle: true,
        photographyGuidelines: true,
        colorsSavedForAi: true,
        typographySavedForAi: true,
        toneSavedForAi: true,
        imagerySavedForAi: true,
      },
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

  // Brand Essence (extended frameworkData)
  const essence = assetBySlug.get('brand-essence');
  if (essence) {
    const fwData = essence.frameworkData as BrandEssenceData | null;
    if (fwData?.essenceStatement) {
      const parts: string[] = [];
      parts.push(`Essence: ${fwData.essenceStatement}`);
      if (fwData.essenceNarrative) parts.push(fwData.essenceNarrative);
      if (fwData.functionalBenefit) parts.push(`Functional benefit: ${fwData.functionalBenefit}`);
      if (fwData.emotionalBenefit) parts.push(`Emotional benefit: ${fwData.emotionalBenefit}`);
      if (fwData.selfExpressiveBenefit) parts.push(`Self-expressive benefit: ${fwData.selfExpressiveBenefit}`);
      if (fwData.discriminator) parts.push(`Discriminator: ${fwData.discriminator}`);
      if (fwData.audienceInsight) parts.push(`Audience insight: ${fwData.audienceInsight}`);
      if (Array.isArray(fwData.proofPoints) && fwData.proofPoints.length > 0) {
        parts.push(`Proof points: ${fwData.proofPoints.filter(Boolean).join('; ')}`);
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
      if (fwData.functionalValue) parts.push(`Functional value: ${fwData.functionalValue}`);
      if (fwData.emotionalValue) parts.push(`Emotional value: ${fwData.emotionalValue}`);
      if (fwData.selfExpressiveValue) parts.push(`Self-expressive value: ${fwData.selfExpressiveValue}`);
      if (fwData.targetAudience) parts.push(`Target audience: ${fwData.targetAudience}`);
      if (fwData.coreCustomerNeed) parts.push(`Core customer need: ${fwData.coreCustomerNeed}`);
      if (fwData.differentiator) parts.push(`Differentiator: ${fwData.differentiator}`);
      if (fwData.onlynessStatement) parts.push(`Onlyness: ${fwData.onlynessStatement}`);
      if (Array.isArray(fwData.proofPoints) && fwData.proofPoints.length > 0) {
        parts.push(`Proof points: ${fwData.proofPoints.filter(Boolean).join('; ')}`);
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
    const fwData = social.frameworkData as Record<string, unknown> | null;
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

  // Visual identity from brandstyle (only sections marked as saved for AI)
  if (styleguide) {
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
      ctx.brandColors = colorParts.join('; ');
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

    // Tone of Voice
    if (styleguide.toneSavedForAi) {
      const toneParts: string[] = [];
      if (styleguide.contentGuidelines.length > 0) {
        toneParts.push(`Content guidelines: ${styleguide.contentGuidelines.join('; ')}`);
      }
      if (styleguide.writingGuidelines.length > 0) {
        toneParts.push(`Writing style: ${styleguide.writingGuidelines.join('; ')}`);
      }
      if (toneParts.length > 0) ctx.brandToneOfVoice = toneParts.join('. ');
    }

    // Imagery
    if (styleguide.imagerySavedForAi) {
      const imgParts: string[] = [];
      const photoStyle = styleguide.photographyStyle as { mood?: string; subjects?: string; composition?: string } | null;
      if (photoStyle?.mood) imgParts.push(`Photography mood: ${photoStyle.mood}`);
      if (photoStyle?.subjects) imgParts.push(`Subjects: ${photoStyle.subjects}`);
      if (photoStyle?.composition) imgParts.push(`Composition: ${photoStyle.composition}`);
      if (styleguide.photographyGuidelines.length > 0) {
        imgParts.push(`Guidelines: ${styleguide.photographyGuidelines.join('; ')}`);
      }
      if (imgParts.length > 0) ctx.brandImageryStyle = imgParts.join('. ');
    }
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

  // Cache and return
  setCache(workspaceId, ctx);
  return ctx;
}
