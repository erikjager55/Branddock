import { z } from 'zod';
import type { ArenaEnrichmentMeta } from '@/lib/arena/arena-client';

// =============================================================================
// Campaign Strategy Blueprint — Types + Zod Schemas
// 4-laags campagneblauwdruk: Strategy → Architecture → Channel Plan → Asset Plan
// =============================================================================

// ─── Enums ──────────────────────────────────────────────────

export type StrategicIntent = 'brand_building' | 'sales_activation' | 'hybrid';
export type ProductionPriority = 'must-have' | 'should-have' | 'nice-to-have';
export type EffortLevel = 'low' | 'medium' | 'high';
export type BudgetLevel = 'high' | 'medium' | 'low';
export type ChannelRole = 'hero' | 'hub' | 'hygiene';
export type TouchpointRole = 'primary' | 'supporting';
export type PersonaRelevance = 'high' | 'medium' | 'low';
export type PreferredVariant = 'A' | 'B' | 'C';

// ─── Layer 1: Campaign Strategy ─────────────────────────────

export interface MessagingHierarchy {
  brandMessage: string;
  campaignMessage: string;
  proofPoints: string[];
}

export interface JTBDFraming {
  jobStatement: string;
  functionalJob: string;
  emotionalJob: string;
  socialJob: string;
}

export interface StrategicChoice {
  choice: string;
  rationale: string;
  tradeoff: string;
}

export interface StrategyLayer {
  strategicIntent: StrategicIntent;
  intentRatio: { brand: number; activation: number };
  campaignTheme: string;
  positioningStatement: string;
  messagingHierarchy: MessagingHierarchy;
  jtbdFraming: JTBDFraming;
  strategicChoices: (string | StrategicChoice)[];
  /** The underlying human truth that drives recognition */
  humanInsight?: string;
  /** The societal tension the brand addresses */
  culturalTension?: string;
  /** The Big Idea — the organizing principle across all touchpoints */
  creativePlatform?: string;
  /** Visual/emotional world description */
  creativeTerritory?: string;
  /** How the brand resolves the tension or insight */
  brandRole?: string;
  /** The distinctive mechanism that makes the concept unforgettable */
  memorableDevice?: string;
  /** Why this concept has award potential */
  effieRationale?: string;
}

// ─── Layer 2: Campaign Architecture ─────────────────────────

export interface PersonaPhaseData {
  personaId: string;
  personaName: string;
  needs: string[];
  painPoints: string[];
  mindset: string;
  keyQuestion: string;
  triggers: string[];
}

export interface TouchpointPersonaRelevance {
  personaId: string;
  relevance: PersonaRelevance;
  messagingAngle: string;
}

export interface Touchpoint {
  channel: string;
  contentType: string;
  message: string;
  role: TouchpointRole;
  personaRelevance: TouchpointPersonaRelevance[];
}

export interface JourneyPhase {
  id: string;
  name: string;
  description: string;
  orderIndex: number;
  goal: string;
  kpis: string[];
  personaPhaseData: PersonaPhaseData[];
  touchpoints: Touchpoint[];
}

export interface ArchitectureLayer {
  campaignType: string;
  journeyPhases: JourneyPhase[];
}

// ─── Layer 3: Channel & Media Plan ──────────────────────────

export interface ChannelContentMix {
  contentType: string;
  frequency: string;
  phase: string;
}

export interface Channel {
  name: string;
  role: ChannelRole;
  objective: string;
  targetPersonas: string[];
  contentMix: ChannelContentMix[];
  budgetAllocation: BudgetLevel;
  priority: number;
}

export interface PhaseDuration {
  phaseId: string;
  suggestedWeeks: number;
}

export interface ChannelPlanLayer {
  channels: Channel[];
  timingStrategy: string;
  phaseDurations: PhaseDuration[];
}

// ─── Layer 4: Asset Plan ────────────────────────────────────

export interface DeliverableBrief {
  objective: string;
  keyMessage: string;
  toneDirection: string;
  callToAction: string;
  contentOutline: string[];
}

export interface AssetPlanDeliverable {
  title: string;
  contentType: string;
  channel: string;
  phase: string;
  targetPersonas: string[];
  brief: DeliverableBrief;
  productionPriority: ProductionPriority;
  estimatedEffort: EffortLevel;
  /** 1-based deployment order within phase, set by AI in Step 6 */
  suggestedOrder?: number;
}

/** A preparation deliverable for the pre-campaign "Week 0" phase */
export interface PrepDeliverable {
  title: string;
  description: string;
  /** e.g. "brand-guidelines", "content-calendar", "audience-brief", "campaign-brief", "asset-checklist" */
  category: string;
  /** Who is responsible (e.g. "Brand Manager", "Content Lead", "Strategy Team") */
  owner: string;
  /** Estimated effort: "low" (< 2h), "medium" (2-8h), "high" (> 8h) */
  estimatedEffort: EffortLevel;
}

export interface AssetPlanLayer {
  deliverables: AssetPlanDeliverable[];
  totalDeliverables: number;
  prioritySummary: string;
  /** Pre-campaign preparation deliverables for Week 0 (optional — AI-generated) */
  prepDeliverables?: PrepDeliverable[];
}

// ─── Persona Validation ─────────────────────────────────────

export interface PersonaValidationResult {
  personaId: string;
  personaName: string;
  overallScore: number;
  feedback: string;
  resonates: string[];
  concerns: string[];
  suggestions: string[];
  preferredVariant: PreferredVariant;
  /** Creative quality: would this make me stop scrolling? (1-10) */
  originalityScore?: number;
  /** Would I still remember this next week? (1-10) */
  memorabilityScore?: number;
  /** Does this feel culturally relevant right now? (1-10) */
  culturalRelevanceScore?: number;
  /** Would I share this or spark conversation? (1-10) */
  talkabilityScore?: number;
  /** One-line creative judgment */
  creativeVerdict?: string;
  /** Per-hook score for Hook A (1-10) — used in hook review phase */
  hookAScore?: number;
  /** Per-hook score for Hook B (1-10) — used in hook review phase */
  hookBScore?: number;
  /** Per-hook score for Hook C (1-10) — used in hook review phase */
  hookCScore?: number;
}

// ─── Complete Blueprint ─────────────────────────────────────

/** Context selection metadata — which IDs were selected for generation */
export interface ContextSelection {
  personaIds: string[];
  productIds: string[];
  competitorIds: string[];
  trendIds: string[];
  /** Are.na channels that contributed associative context */
  arenaChannels?: Array<{ title: string; slug: string; blockCount: number }>;
  /** Exa neural search queries used for cross-industry enrichment */
  exaQueries?: string[];
  /** Number of Semantic Scholar papers used for behavioral science enrichment */
  scholarPaperCount?: number;
  /** Goal type used for BCT behavioral science mapping */
  bctGoalType?: string;
  /** Whether external enrichment (Are.na, Exa, Scholar) was enabled during generation */
  useExternalEnrichment?: boolean;
}

export interface CampaignBlueprint {
  strategy: StrategyLayer;
  architecture: ArchitectureLayer;
  channelPlan: ChannelPlanLayer;
  assetPlan: AssetPlanLayer;
  personaValidation: PersonaValidationResult[];
  confidence: number;
  confidenceBreakdown: Record<string, number>;
  generatedAt: string;
  variantAScore: number;
  variantBScore: number;
  variantCScore: number;
  pipelineDuration: number;
  modelsUsed: string[];
  /** Stores which context items were selected during generation (for regeneration) */
  contextSelection?: ContextSelection;
  /** The human insight selected during insight mining (new pipeline) */
  selectedInsight?: HumanInsight;
  /** The creative concept selected during creative leap (new pipeline) */
  selectedConcept?: CreativeConcept;
  /** Campaign mockup visuals generated from the selected concept */
  conceptVisuals?: ConceptVisual[];
}


// ─── Creative Quality Pipeline Types ──────────────────────────

/** Goldenberg creativity template identifier */
export type GoldenbergTemplate =
  | 'unification' | 'activation' | 'metaphor' | 'subtraction'
  | 'extreme_consequence' | 'absurd_alternative' | 'inversion' | 'extreme_effort';

/** SUCCESs stickiness score (Heath & Heath "Made to Stick") */
export interface StickinessScore {
  simple: number;       // 1-10: Can a 10-year-old understand the core message?
  unexpected: number;   // 1-10: Does it violate a category norm?
  concrete: number;     // 1-10: Can you picture it? Is it sensory?
  credible: number;     // 1-10: Would the audience believe it?
  emotional: number;    // 1-10: Does it trigger a specific emotion?
  story: number;        // 1-10: Is there character + tension + resolution?
  total: number;        // Weighted average of above
}

/** Campaign line quality tests */
export interface CampaignLineTests {
  barTest: boolean;        // Would someone say this in a bar?
  tShirtTest: boolean;     // Would someone wear this on a t-shirt?
  parodyTest: boolean;     // Could people make their own versions?
  tenYearTest: boolean;    // Will this still be relevant in a decade?
  categoryEscapeTest: boolean; // Does it transcend the product category?
  oppositeTest: boolean;   // Is the opposite also interesting? (if not, too generic)
}

/** Bisociation domain — the "other world" connected to the insight */
export interface BisociationDomain {
  domain: string;
  connectionToInsight: string;
  visualPotential: string;
}

/** Human Insight — output of Fase 1 Insight Mining */
export interface HumanInsight {
  /** The human truth in 1-2 sentences */
  insightStatement: string;
  /** What people say vs what they actually do/feel */
  underlyingTension: string;
  /** The emotional space this insight lives in */
  emotionalTerritory: string;
  /** Evidence: persona data, trends, cultural signals */
  proofPoints: string[];
  /** What the category currently assumes (the convention to break) */
  categoryConvention: string;
  /** The deeper truth beneath the convention */
  humanTruth: string;
  /** Which LLM provider generated this insight */
  providerUsed: string;
  /** Which model was used */
  modelUsed: string;
}

/** Creative Concept — output of Fase 2a Creative Leap */
export interface CreativeConcept {
  /** The campaign line: 3-7 words, memorable, ownable */
  campaignLine: string;
  /** The Big Idea that lives across all touchpoints */
  bigIdea: string;
  /** Which Goldenberg template was applied */
  goldenbergTemplate: GoldenbergTemplate;
  /** How the template was specifically applied */
  goldenbergApplication: string;
  /** The bisociation domain — the "other world" connected to the insight */
  bisociationDomain: BisociationDomain;
  /** Concrete description of the visual/emotional world */
  visualWorld: string;
  /** The distinctive mechanism: a ritual, format, catchphrase, or visual motif */
  memorableDevice: string;
  /** SUCCESs stickiness scoring */
  stickinessScore: StickinessScore;
  /** Campaign line quality tests */
  campaignLineTests: CampaignLineTests;
  /** Description of the creative territory */
  creativeTerritory: string;
  /** How this concept can extend across touchpoints */
  extendability: string[];
  /** Which LLM provider generated this concept */
  providerUsed: string;
  /** Which model was used */
  modelUsed: string;
}

/** Result of the Insight Mining phase */
export interface InsightMiningResult {
  insights: HumanInsight[];
  selectedInsightIndex: number | null;
}

/** Result of the Creative Leap phase */
export interface CreativeLeapResult {
  concepts: CreativeConcept[];
  selectedConceptIndex: number | null;
  /** The insight that seeded these concepts */
  selectedInsight: HumanInsight;
}

// ─── Concept Visuals ──────────────────────────────────────

/** A single campaign mockup visual generated from a creative concept */
export interface ConceptVisual {
  format: 'hero' | 'square' | 'story';
  imageUrl: string;
  prompt: string;
  width: number;
  height: number;
  appliedModels: Array<{ name: string; type: string; scale: number }>;
}

/** Result of the concept visuals generation phase */
export interface ConceptVisualsResult {
  visuals: ConceptVisual[];
  concept: CreativeConcept;
}

// ─── Deployment Timeline Types ───────────────────────────────

/** A deliverable placed on the deployment timeline */
export interface ScheduledDeliverable {
  deliverable: AssetPlanDeliverable;
  /** 0-based absolute beat index across all phases */
  beatIndex: number;
  phaseIndex: number;
  channel: string;
  /** Normalized channel key (e.g. "LinkedIn Post" → "linkedin") */
  normalizedChannel: string;
  targetPersonas: string[];
  /** True when targetPersonas is empty (targets all personas) */
  isShared: boolean;
  priority: ProductionPriority;
}

/** Channel capacity exceeded in a single beat */
export interface DeploymentCollision {
  beatIndex: number;
  channel: string;
  items: ScheduledDeliverable[];
  capacity: number;
  severity: 'warning' | 'overload';
}

/** Persona has no touchpoints for 2+ consecutive beats (Byron Sharp gap) */
export interface ContinuityGap {
  persona: string;
  startBeat: number;
  endBeat: number;
  gapLength: number;
}

/** Complete deployment schedule computed from asset plan */
export interface DeploymentSchedule {
  scheduled: ScheduledDeliverable[];
  collisions: DeploymentCollision[];
  gaps: ContinuityGap[];
  totalBeats: number;
  phaseBoundaries: { phase: string; startBeat: number; endBeat: number }[];
}

// ─── Strategy Phase Types ────────────────────────────────────

/** Tracks which interactive phase the wizard strategy step is in */
export type StrategyPhase =
  | 'idle'
  | 'validating_briefing'      // Phase 1: AI validates briefing
  | 'review_briefing'          // Phase 1b: User reviews validation
  | 'building_foundation'      // Phase 2: Enrichment + behavioral strategy development
  | 'review_strategy'          // Phase 3: User reviews/validates developed strategy
  | 'rationale_complete'       // Strategy rationale approved, ready for Concept step
  // Creative quality pipeline phases
  | 'mining_insights'          // Insight mining: LLMs generate human insights
  | 'review_insights'          // User reviews and selects an insight
  | 'generating_concepts'      // Creative leap: LLMs generate creative concepts
  | 'review_concepts'          // User reviews and selects a concept
  | 'creative_debate'          // Multi-agent debate on selected concept
  | 'review_debate'            // User reviews debate outcome
  | 'building_strategy'        // Final strategy assembly from all inputs
  | 'review_final_strategy'    // User reviews the final assembled strategy
  | 'generating_journey'       // Phase 7: Channel plan + asset plan
  | 'complete';                // Done, timeline computed client-side

/** @deprecated Use CreativeHook instead — kept for backward compatibility */
export interface FullVariant {
  strategy: StrategyLayer;
  architecture: ArchitectureLayer;
}

// ─── CASI Determinant Types ────────────────────────────────

export type CasiDeterminant =
  | 'resistance' | 'self_image' | 'automatisms' | 'emotions'
  | 'social_environment' | 'physical_environment'
  | 'capability' | 'knowledge' | 'attitude_risk_perception';

export interface CasiDeterminantScore {
  determinant: CasiDeterminant;
  score: number;                  // 1-5 (1=not a barrier, 5=major barrier)
  assessment: string;
  comBComponent: 'capability' | 'opportunity' | 'motivation';
}

export interface PersonaTTMStage {
  personaId: string;
  personaName: string;
  stage: 'precontemplation' | 'contemplation' | 'preparation' | 'action' | 'maintenance';
  rationale: string;
}

export interface ComBMapping {
  capability: string;
  opportunity: string;
  motivation: string;
  primaryTarget: 'capability' | 'opportunity' | 'motivation';
}

// ─── Chain Step 2a Output: Behavioral Diagnosis ────────────

export interface BehavioralDiagnosis {
  ttmStages: PersonaTTMStage[];
  casiDeterminantAnalysis: CasiDeterminantScore[];
  comBMapping: ComBMapping;
  behavioralBarriers: string[];
  desiredBehaviors: string[];
}

// ─── Chain Step 2b Output: Enrichment Synthesis ────────────

export interface EnrichmentSourceSummary {
  arena: string;
  exa: string;
  scholar: string;
  bct: string;
}

export interface StrategyInsight {
  insight: string;
  source: 'arena' | 'exa' | 'scholar' | 'bct' | 'casi' | 'internal';
  confidence: 'high' | 'medium' | 'low';
}

export interface EnrichmentSynthesis {
  perSourceFindings: EnrichmentSourceSummary;
  crossSourcePatterns: string[];
  sourceAttributedInsights: StrategyInsight[];
}

// ─── Behavioral Strategy Detail ────────────────────────────

export interface SelectedBCT {
  techniqueName: string;
  casiStrategy: string;
  targetDeterminant: CasiDeterminant;
  applicationHint: string;
  rationale: string;
}

export interface BehavioralStrategyDetail {
  summary: string;
  casiInterventionStrategy: string;
  selectedBCTs: SelectedBCT[];
  desiredBehavior: string;
}

// ─── ELM + MINDSPACE Assessment ────────────────────────────

export interface ElmRouteRecommendation {
  primaryRoute: 'central' | 'peripheral';
  rationale: string;
  perPersona: { personaId: string; route: 'central' | 'peripheral'; reason: string }[];
}

export type MindspaceFactor =
  | 'messenger' | 'incentives' | 'norms' | 'defaults' | 'salience'
  | 'priming' | 'affect' | 'commitments' | 'ego';

export interface MindspaceAssessment {
  factor: MindspaceFactor;
  applicable: boolean;
  opportunity: string;
}

// ─── Audience Insights ─────────────────────────────────────

export interface AudienceInsight {
  personaId: string;
  personaName: string;
  insight: string;
  ttmStage: string;
  topCasiBarriers: string[];
  recommendedBCTs: string[];
  elmRoute: 'central' | 'peripheral';
}

// ─── Chain Step 2c Output: Strategy Foundation ──────────────

export interface StrategyFoundation {
  strategicDirection: string;
  behavioralDiagnosis: BehavioralDiagnosis;
  enrichmentSynthesis: EnrichmentSynthesis;
  behavioralStrategy: BehavioralStrategyDetail;
  elmRouteRecommendation: ElmRouteRecommendation;
  mindspaceAssessment: MindspaceAssessment[];
  keyInsights: StrategyInsight[];
  suggestedApproach: string;
  targetBehaviors: string[];
  audienceInsights: AudienceInsight[];
}

// ─── Briefing Validation ───────────────────────────────────

export interface BriefingGap {
  field: string;
  severity: 'critical' | 'recommended' | 'nice-to-have';
  suggestion: string;
}

export interface BriefingValidation {
  isComplete: boolean;
  overallScore: number;
  strengths: string[];
  gaps: BriefingGap[];
  suggestions: string[];
}

// ─── Curator Types ─────────────────────────────────────────

export type InsightFamily = 'insight-driven' | 'structural' | 'narrative';

export interface CreativeAngleSelection {
  angleId: string;
  angleName: string;
  assignedProvider: string;
  assignedModel: string;
  featureKey: string;
  selectionRationale: string;
  llmMatchRationale: string;
  insightFamily: InsightFamily;
}

// ─── Creative Enrichment Brief ─────────────────────────────

export interface CreativeEnrichmentBrief {
  culturalTensions: string[];
  behavioralReframes: string[];
  crossIndustryAnalogies: string[];
  mindspaceOpportunities: string[];
  elmCreativeImplications: string;
  audienceEmotionalLandscape: string;
}

// ─── Creative Hook ("Creatieve Kapstok") ───────────────────

export interface HookConcept {
  hookTitle: string;
  bigIdea: string;
  creativeInsight: string;
  visualDirection: string;
  toneOfVoice: string;
  campaignLine: string;
  extendability: string[];
  effieRationale: string;
}

export interface CreativeHook {
  strategy: StrategyLayer;
  architecture: ArchitectureLayer;
  hookConcept: HookConcept;
  creativeAngleId: string;
  creativeAngleName: string;
  curatorSelection: CreativeAngleSelection;
  modelUsed: string;
  providerUsed: string;
}

// ─── Enrichment Context (stored in Zustand for reuse) ──────

export interface EnrichmentContext {
  arenaText: string;
  exaText: string;
  scholarText: string;
  bctContext: string;
  casiDeterminants: string;
  mindspaceChecklist: string;
  goalInsights: string;
  brandContext: string;
  personaProfiles: string;
  productContext: string;
  competitorContext: string;
  trendContext: string;
  styleguideContext: string;
}

/** Are.na enrichment tracking metadata — re-exported from arena-client for convenience */
export type ArenaEnrichmentTracking = ArenaEnrichmentMeta;

/** Data returned after Phase A (Steps 1-2) */
export interface VariantPhaseResult {
  strategyLayerA: StrategyLayer;
  strategyLayerB: StrategyLayer;
  strategyLayerC: StrategyLayer;
  variantA: ArchitectureLayer;
  variantB: ArchitectureLayer;
  variantC: ArchitectureLayer;
  personaValidation: PersonaValidationResult[];
  variantAScore: number;
  variantBScore: number;
  variantCScore: number;
  /** Are.na enrichment metadata (null if enrichment was skipped or produced no results) */
  arenaEnrichment: ArenaEnrichmentTracking | null;
}

/** Data returned after Phase B (Step 4) */
export interface SynthesisPhaseResult {
  strategy: StrategyLayer;
  architecture: ArchitectureLayer;
}

/** Data returned after Phase C (Steps 5-6) */
export interface JourneyPhaseResult {
  channelPlan: ChannelPlanLayer;
  assetPlan: AssetPlanLayer;
}

/** Body for the elaborate endpoint */
export interface ElaborateJourneyBody {
  synthesisFeedback: string;
  synthesizedStrategy: StrategyLayer;
  synthesizedArchitecture: ArchitectureLayer;
  personaValidation: PersonaValidationResult[];
  wizardContext: {
    campaignName: string;
    campaignDescription?: string;
    campaignGoalType?: string;
    briefing?: CampaignBriefing;
    useExternalEnrichment?: boolean;
  };
  personaIds?: string[];
  productIds?: string[];
  competitorIds?: string[];
  trendIds?: string[];
  strategicIntent?: StrategicIntent;
}

// ─── Pipeline Types ─────────────────────────────────────────

export type PipelineStepStatus = 'pending' | 'running' | 'complete' | 'error';

export interface PipelineStep {
  step: number;
  name: string;
  status: PipelineStepStatus;
  label: string;
  preview?: string;
  error?: string;
}

export type RegenerateLayer = 'strategy' | 'architecture' | 'channelPlan' | 'assetPlan';

/** Strategic briefing fields that guide the AI toward a specific, actionable strategy */
export interface CampaignBriefing {
  /** Why communicate now? What's the trigger or occasion? */
  occasion?: string;
  /** What should the audience Think, Feel, and Do after seeing this campaign? */
  audienceObjective?: string;
  /** The single most important message or promise the audience should take away */
  coreMessage?: string;
  /** Desired tone, style, or creative direction */
  tonePreference?: string;
  /** Constraints, mandatories, or requirements that must be respected */
  constraints?: string;
}

export interface GenerateBlueprintBody {
  personaIds?: string[];
  productIds?: string[];
  competitorIds?: string[];
  trendIds?: string[];
  strategicIntent?: StrategicIntent;
  /** Enable multi-agent strategy debate (Critic → Defense → Persona Panel) */
  multiAgent?: boolean;
  /** Wizard context — when provided, the pipeline runs without a DB campaign */
  wizardContext?: {
    campaignName: string;
    campaignDescription?: string;
    campaignGoalType?: string;
    briefing?: CampaignBriefing;
    useExternalEnrichment?: boolean;
  };
}

export interface RegenerateBlueprintBody {
  layer: RegenerateLayer;
  feedback?: string;
}

// ─── Phase-Based Pipeline Bodies ────────────────────────────

export interface ValidateBriefingBody {
  personaIds?: string[];
  productIds?: string[];
  competitorIds?: string[];
  trendIds?: string[];
  strategicIntent?: StrategicIntent;
  wizardContext: {
    campaignName: string;
    campaignDescription?: string;
    campaignGoalType?: string;
    briefing?: CampaignBriefing;
    useExternalEnrichment?: boolean;
  };
}

export interface ImproveBriefingBody {
  validation: BriefingValidation;
  strategicIntent?: StrategicIntent;
  wizardContext: {
    campaignName: string;
    campaignDescription?: string;
    campaignGoalType?: string;
    briefing?: CampaignBriefing;
    useExternalEnrichment?: boolean;
  };
}

export interface ImprovedBriefing {
  occasion: string;
  audienceObjective: string;
  coreMessage: string;
  tonePreference: string;
  constraints: string;
}

export interface BuildFoundationBody {
  personaIds?: string[];
  productIds?: string[];
  competitorIds?: string[];
  trendIds?: string[];
  strategicIntent?: StrategicIntent;
  wizardContext: {
    campaignName: string;
    campaignDescription?: string;
    campaignGoalType?: string;
    briefing?: CampaignBriefing;
    useExternalEnrichment?: boolean;
  };
}

export interface GenerateHooksBody {
  personaIds?: string[];
  productIds?: string[];
  competitorIds?: string[];
  trendIds?: string[];
  strategicIntent?: StrategicIntent;
  wizardContext: {
    campaignName: string;
    campaignDescription?: string;
    campaignGoalType?: string;
    briefing?: CampaignBriefing;
    useExternalEnrichment?: boolean;
  };
  foundation: StrategyFoundation;
  enrichmentContext: EnrichmentContext;
  strategyFeedback?: string;
}

export interface RefineHookBody {
  personaIds?: string[];
  productIds?: string[];
  competitorIds?: string[];
  trendIds?: string[];
  strategicIntent?: StrategicIntent;
  wizardContext: {
    campaignName: string;
    campaignDescription?: string;
    campaignGoalType?: string;
    briefing?: CampaignBriefing;
    useExternalEnrichment?: boolean;
  };
  selectedHook: CreativeHook;
  foundation: StrategyFoundation;
  personaValidation: PersonaValidationResult[];
  hookFeedback?: string;
}

// ─── SSE Event Types ────────────────────────────────────────

export interface PipelineProgressEvent {
  step: number;
  name: string;
  status: PipelineStepStatus;
  label: string;
  preview?: string;
  error?: string;
}

export interface PipelineCompleteEvent {
  type: 'complete';
  blueprint: CampaignBlueprint;
}

export interface PipelineErrorEvent {
  type: 'error';
  error: string;
  failedStep: number;
}

export type PipelineSSEEvent = PipelineProgressEvent | PipelineCompleteEvent | PipelineErrorEvent;

// =============================================================================
// Zod Schemas — for validating AI responses
// =============================================================================

// ─── Layer 1 Schema ─────────────────────────────────────────

export const messagingHierarchySchema = z.object({
  brandMessage: z.string(),
  campaignMessage: z.string(),
  proofPoints: z.array(z.string()),
});

export const jtbdFramingSchema = z.object({
  jobStatement: z.string(),
  functionalJob: z.string(),
  emotionalJob: z.string(),
  socialJob: z.string(),
});

export const strategicChoiceSchema = z.object({
  choice: z.string(),
  rationale: z.string(),
  tradeoff: z.string(),
});

export const strategyLayerSchema = z.object({
  strategicIntent: z.enum(['brand_building', 'sales_activation', 'hybrid']),
  intentRatio: z.object({ brand: z.number(), activation: z.number() }),
  campaignTheme: z.string(),
  positioningStatement: z.string(),
  messagingHierarchy: messagingHierarchySchema,
  jtbdFraming: jtbdFramingSchema,
  strategicChoices: z.array(z.union([z.string(), strategicChoiceSchema])),
  humanInsight: z.string().optional(),
  culturalTension: z.string().optional(),
  creativePlatform: z.string().optional(),
  creativeTerritory: z.string().optional(),
  brandRole: z.string().optional(),
  memorableDevice: z.string().optional(),
  effieRationale: z.string().optional(),
});

// ─── Layer 2 Schema ─────────────────────────────────────────

export const personaPhaseDataSchema = z.object({
  personaId: z.string(),
  personaName: z.string(),
  needs: z.array(z.string()),
  painPoints: z.array(z.string()),
  mindset: z.string(),
  keyQuestion: z.string(),
  triggers: z.array(z.string()),
});

export const touchpointPersonaRelevanceSchema = z.object({
  personaId: z.string(),
  relevance: z.enum(['high', 'medium', 'low']),
  messagingAngle: z.string(),
});

export const touchpointSchema = z.object({
  channel: z.string(),
  contentType: z.string(),
  message: z.string(),
  role: z.enum(['primary', 'supporting']),
  personaRelevance: z.array(touchpointPersonaRelevanceSchema),
});

export const journeyPhaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  orderIndex: z.number(),
  goal: z.string(),
  kpis: z.array(z.string()),
  personaPhaseData: z.array(personaPhaseDataSchema),
  touchpoints: z.array(touchpointSchema),
});

export const architectureLayerSchema = z.object({
  campaignType: z.string(),
  journeyPhases: z.array(journeyPhaseSchema),
});

/** Combined full variant schema (strategy + architecture) */
export const fullVariantSchema = z.object({
  strategy: strategyLayerSchema,
  architecture: architectureLayerSchema,
});

// ─── Layer 3 Schema ─────────────────────────────────────────

export const channelContentMixSchema = z.object({
  contentType: z.string(),
  frequency: z.string(),
  phase: z.string(),
});

export const channelSchema = z.object({
  name: z.string(),
  role: z.enum(['hero', 'hub', 'hygiene']),
  objective: z.string(),
  targetPersonas: z.array(z.string()),
  contentMix: z.array(channelContentMixSchema),
  budgetAllocation: z.enum(['high', 'medium', 'low']),
  priority: z.number(),
});

export const phaseDurationSchema = z.object({
  phaseId: z.string(),
  suggestedWeeks: z.number(),
});

export const channelPlanLayerSchema = z.object({
  channels: z.array(channelSchema),
  timingStrategy: z.string(),
  phaseDurations: z.array(phaseDurationSchema),
});

// ─── Layer 4 Schema ─────────────────────────────────────────

export const deliverableBriefSchema = z.object({
  objective: z.string(),
  keyMessage: z.string(),
  toneDirection: z.string(),
  callToAction: z.string(),
  contentOutline: z.array(z.string()),
});

export const assetPlanDeliverableSchema = z.object({
  title: z.string(),
  contentType: z.string(),
  channel: z.string(),
  phase: z.string(),
  targetPersonas: z.array(z.string()),
  brief: deliverableBriefSchema,
  productionPriority: z.enum(['must-have', 'should-have', 'nice-to-have']),
  estimatedEffort: z.enum(['low', 'medium', 'high']),
  suggestedOrder: z.number().optional(),
});

export const prepDeliverableSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  owner: z.string(),
  estimatedEffort: z.enum(['low', 'medium', 'high']),
});

export const assetPlanLayerSchema = z.object({
  deliverables: z.array(assetPlanDeliverableSchema),
  totalDeliverables: z.number(),
  prioritySummary: z.string(),
  prepDeliverables: z.array(prepDeliverableSchema).optional(),
});

// ─── Persona Validation Schema ──────────────────────────────

export const personaValidationSchema = z.object({
  personaId: z.string(),
  personaName: z.string(),
  overallScore: z.number().min(1).max(10),
  feedback: z.string().min(10),
  resonates: z.array(z.string()),
  concerns: z.array(z.string()),
  suggestions: z.array(z.string()),
  preferredVariant: z.enum(['A', 'B', 'C']),
  originalityScore: z.number().min(1).max(10).optional(),
  memorabilityScore: z.number().min(1).max(10).optional(),
  culturalRelevanceScore: z.number().min(1).max(10).optional(),
  talkabilityScore: z.number().min(1).max(10).optional(),
  creativeVerdict: z.string().optional(),
  hookAScore: z.number().min(1).max(10).optional(),
  hookBScore: z.number().min(1).max(10).optional(),
  hookCScore: z.number().min(1).max(10).optional(),
});

export const personaValidationArraySchema = z.array(personaValidationSchema);

// ─── Briefing Validation Schemas ────────────────────────────

export const briefingGapSchema = z.object({
  field: z.string(),
  severity: z.enum(['critical', 'recommended', 'nice-to-have']),
  suggestion: z.string(),
});

export const briefingValidationSchema = z.object({
  isComplete: z.boolean(),
  overallScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  gaps: z.array(briefingGapSchema),
  suggestions: z.array(z.string()),
});

// ─── Behavioral Science Sub-Schemas ─────────────────────────

export const personaTTMStageSchema = z.object({
  personaId: z.string(),
  personaName: z.string(),
  stage: z.enum(['precontemplation', 'contemplation', 'preparation', 'action', 'maintenance']),
  rationale: z.string(),
});

export const casiDeterminantScoreSchema = z.object({
  determinant: z.enum([
    'resistance', 'self_image', 'automatisms', 'emotions',
    'social_environment', 'physical_environment',
    'capability', 'knowledge', 'attitude_risk_perception',
  ]),
  score: z.number().min(1).max(5),
  assessment: z.string(),
  comBComponent: z.enum(['capability', 'opportunity', 'motivation']),
});

export const comBMappingSchema = z.object({
  capability: z.string(),
  opportunity: z.string(),
  motivation: z.string(),
  primaryTarget: z.enum(['capability', 'opportunity', 'motivation']),
});

export const behavioralDiagnosisSchema = z.object({
  ttmStages: z.array(personaTTMStageSchema),
  casiDeterminantAnalysis: z.array(casiDeterminantScoreSchema),
  comBMapping: comBMappingSchema,
  behavioralBarriers: z.array(z.string()),
  desiredBehaviors: z.array(z.string()),
});

export const enrichmentSourceSummarySchema = z.object({
  arena: z.string(),
  exa: z.string(),
  scholar: z.string(),
  bct: z.string(),
});

export const strategyInsightSchema = z.object({
  insight: z.string(),
  source: z.enum(['arena', 'exa', 'scholar', 'bct', 'casi', 'internal']),
  confidence: z.enum(['high', 'medium', 'low']),
});

export const enrichmentSynthesisSchema = z.object({
  perSourceFindings: enrichmentSourceSummarySchema,
  crossSourcePatterns: z.array(z.string()),
  sourceAttributedInsights: z.array(strategyInsightSchema),
});

export const selectedBCTSchema = z.object({
  techniqueName: z.string(),
  casiStrategy: z.string(),
  targetDeterminant: z.enum([
    'resistance', 'self_image', 'automatisms', 'emotions',
    'social_environment', 'physical_environment',
    'capability', 'knowledge', 'attitude_risk_perception',
  ]),
  applicationHint: z.string(),
  rationale: z.string(),
});

export const behavioralStrategyDetailSchema = z.object({
  summary: z.string(),
  casiInterventionStrategy: z.string(),
  selectedBCTs: z.array(selectedBCTSchema),
  desiredBehavior: z.string(),
});

export const elmRouteRecommendationSchema = z.object({
  primaryRoute: z.enum(['central', 'peripheral']),
  rationale: z.string(),
  perPersona: z.array(z.object({
    personaId: z.string(),
    route: z.enum(['central', 'peripheral']),
    reason: z.string(),
  })),
});

export const mindspaceAssessmentSchema = z.object({
  factor: z.enum([
    'messenger', 'incentives', 'norms', 'defaults', 'salience',
    'priming', 'affect', 'commitments', 'ego',
  ]),
  applicable: z.boolean(),
  opportunity: z.string(),
});

export const audienceInsightSchema = z.object({
  personaId: z.string(),
  personaName: z.string(),
  insight: z.string(),
  ttmStage: z.string(),
  topCasiBarriers: z.array(z.string()),
  recommendedBCTs: z.array(z.string()),
  elmRoute: z.enum(['central', 'peripheral']),
});

// ─── Strategy Foundation Schema ─────────────────────────────

export const strategyFoundationSchema = z.object({
  strategicDirection: z.string(),
  behavioralDiagnosis: behavioralDiagnosisSchema,
  enrichmentSynthesis: enrichmentSynthesisSchema,
  behavioralStrategy: behavioralStrategyDetailSchema,
  elmRouteRecommendation: elmRouteRecommendationSchema,
  mindspaceAssessment: z.array(mindspaceAssessmentSchema),
  keyInsights: z.array(strategyInsightSchema),
  suggestedApproach: z.string(),
  targetBehaviors: z.array(z.string()),
  audienceInsights: z.array(audienceInsightSchema),
});

// ─── Creative Hook Schemas ──────────────────────────────────

export const hookConceptSchema = z.object({
  hookTitle: z.string(),
  bigIdea: z.string(),
  creativeInsight: z.string(),
  visualDirection: z.string(),
  toneOfVoice: z.string(),
  campaignLine: z.string(),
  extendability: z.array(z.string()),
  effieRationale: z.string(),
});

export const creativeAngleSelectionSchema = z.object({
  angleId: z.string(),
  angleName: z.string(),
  assignedProvider: z.string(),
  assignedModel: z.string(),
  featureKey: z.string(),
  selectionRationale: z.string(),
  llmMatchRationale: z.string(),
  insightFamily: z.enum(['insight-driven', 'structural', 'narrative']),
});

export const creativeHookSchema = z.object({
  strategy: strategyLayerSchema,
  architecture: architectureLayerSchema,
  hookConcept: hookConceptSchema,
  creativeAngleId: z.string(),
  creativeAngleName: z.string(),
  curatorSelection: creativeAngleSelectionSchema,
  modelUsed: z.string(),
  providerUsed: z.string(),
});

// ─── Complete Blueprint Schema (for storage validation) ─────

export const campaignBlueprintSchema = z.object({
  strategy: strategyLayerSchema,
  architecture: architectureLayerSchema,
  channelPlan: channelPlanLayerSchema,
  assetPlan: assetPlanLayerSchema,
  personaValidation: z.array(personaValidationSchema),
  confidence: z.number().min(0).max(100),
  confidenceBreakdown: z.record(z.string(), z.number()),
  generatedAt: z.string(),
  variantAScore: z.number(),
  variantBScore: z.number(),
  variantCScore: z.number(),
  pipelineDuration: z.number(),
  modelsUsed: z.array(z.string()),
});

// ─── Gemini Response Schemas (constrained JSON decoding) ─────

/** Gemini responseSchema for Architecture Layer (step 2b) */
export const architectureLayerResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    campaignType: { type: 'string' },
    journeyPhases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          orderIndex: { type: 'number' },
          goal: { type: 'string' },
          kpis: { type: 'array', items: { type: 'string' } },
          personaPhaseData: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                personaId: { type: 'string' },
                personaName: { type: 'string' },
                needs: { type: 'array', items: { type: 'string' } },
                painPoints: { type: 'array', items: { type: 'string' } },
                mindset: { type: 'string' },
                keyQuestion: { type: 'string' },
                triggers: { type: 'array', items: { type: 'string' } },
              },
              required: ['personaId', 'personaName', 'needs', 'painPoints', 'mindset', 'keyQuestion', 'triggers'],
            },
          },
          touchpoints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                channel: { type: 'string' },
                contentType: { type: 'string' },
                message: { type: 'string' },
                role: { type: 'string', enum: ['primary', 'supporting'] },
                personaRelevance: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      personaId: { type: 'string' },
                      relevance: { type: 'string', enum: ['high', 'medium', 'low'] },
                      messagingAngle: { type: 'string' },
                    },
                    required: ['personaId', 'relevance', 'messagingAngle'],
                  },
                },
              },
              required: ['channel', 'contentType', 'message', 'role', 'personaRelevance'],
            },
          },
        },
        required: ['id', 'name', 'description', 'orderIndex', 'goal', 'kpis', 'personaPhaseData', 'touchpoints'],
      },
    },
  },
  required: ['campaignType', 'journeyPhases'],
};

/** Gemini responseSchema for Full Variant (strategy + architecture) */
export const fullVariantResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    strategy: {
      type: 'object',
      properties: {
        strategicIntent: { type: 'string', enum: ['brand_building', 'sales_activation', 'hybrid'] },
        intentRatio: {
          type: 'object',
          properties: {
            brand: { type: 'number' },
            activation: { type: 'number' },
          },
          required: ['brand', 'activation'],
        },
        campaignTheme: { type: 'string' },
        positioningStatement: { type: 'string' },
        messagingHierarchy: {
          type: 'object',
          properties: {
            brandMessage: { type: 'string' },
            campaignMessage: { type: 'string' },
            proofPoints: { type: 'array', items: { type: 'string' } },
          },
          required: ['brandMessage', 'campaignMessage', 'proofPoints'],
        },
        jtbdFraming: {
          type: 'object',
          properties: {
            jobStatement: { type: 'string' },
            functionalJob: { type: 'string' },
            emotionalJob: { type: 'string' },
            socialJob: { type: 'string' },
          },
          required: ['jobStatement', 'functionalJob', 'emotionalJob', 'socialJob'],
        },
        strategicChoices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              choice: { type: 'string' },
              rationale: { type: 'string' },
              tradeoff: { type: 'string' },
            },
            required: ['choice', 'rationale', 'tradeoff'],
          },
        },
        humanInsight: { type: 'string' },
        culturalTension: { type: 'string' },
        creativePlatform: { type: 'string' },
        creativeTerritory: { type: 'string' },
        brandRole: { type: 'string' },
        memorableDevice: { type: 'string' },
        effieRationale: { type: 'string' },
      },
      required: ['strategicIntent', 'intentRatio', 'campaignTheme', 'positioningStatement', 'messagingHierarchy', 'jtbdFraming', 'strategicChoices', 'humanInsight', 'creativePlatform', 'creativeTerritory', 'brandRole'],
    },
    architecture: architectureLayerResponseSchema,
  },
  required: ['strategy', 'architecture'],
};

/** Gemini responseSchema for Channel Plan (step 5) */
export const channelPlanResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    channels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string', enum: ['hero', 'hub', 'hygiene'] },
          objective: { type: 'string' },
          targetPersonas: { type: 'array', items: { type: 'string' } },
          contentMix: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                contentType: { type: 'string' },
                frequency: { type: 'string' },
                phase: { type: 'string' },
              },
              required: ['contentType', 'frequency', 'phase'],
            },
          },
          budgetAllocation: { type: 'string', enum: ['high', 'medium', 'low'] },
          priority: { type: 'number' },
        },
        required: ['name', 'role', 'objective', 'targetPersonas', 'contentMix', 'budgetAllocation', 'priority'],
      },
    },
    timingStrategy: { type: 'string' },
    phaseDurations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          phaseId: { type: 'string' },
          suggestedWeeks: { type: 'number' },
        },
        required: ['phaseId', 'suggestedWeeks'],
      },
    },
  },
  required: ['channels', 'timingStrategy', 'phaseDurations'],
};

/** Gemini responseSchema for Asset Plan (step 6) */
export const assetPlanResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    deliverables: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          contentType: { type: 'string' },
          channel: { type: 'string' },
          phase: { type: 'string' },
          targetPersonas: { type: 'array', items: { type: 'string' } },
          brief: {
            type: 'object',
            properties: {
              objective: { type: 'string' },
              keyMessage: { type: 'string' },
              toneDirection: { type: 'string' },
              callToAction: { type: 'string' },
              contentOutline: { type: 'array', items: { type: 'string' } },
            },
            required: ['objective', 'keyMessage', 'toneDirection', 'callToAction', 'contentOutline'],
          },
          productionPriority: { type: 'string', enum: ['must-have', 'should-have', 'nice-to-have'] },
          estimatedEffort: { type: 'string', enum: ['low', 'medium', 'high'] },
          suggestedOrder: { type: 'number' },
        },
        required: ['title', 'contentType', 'channel', 'phase', 'targetPersonas', 'brief', 'productionPriority', 'estimatedEffort', 'suggestedOrder'],
      },
    },
    totalDeliverables: { type: 'number' },
    prioritySummary: { type: 'string' },
    prepDeliverables: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string', enum: ['campaign-brief', 'brand-guidelines', 'content-calendar', 'audience-brief', 'asset-checklist', 'channel-setup', 'stakeholder-alignment'] },
          owner: { type: 'string' },
          estimatedEffort: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['title', 'description', 'category', 'owner', 'estimatedEffort'],
      },
    },
  },
  required: ['deliverables', 'totalDeliverables', 'prioritySummary'],
};

// ─── Gemini Response Schemas for 9-Phase Pipeline ───────────

/** Gemini responseSchema for Briefing Validation (Phase 1) */
export const briefingValidationResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    isComplete: { type: 'boolean' },
    overallScore: { type: 'number' },
    strengths: { type: 'array', items: { type: 'string' } },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'recommended', 'nice-to-have'] },
          suggestion: { type: 'string' },
        },
        required: ['field', 'severity', 'suggestion'],
      },
    },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['isComplete', 'overallScore', 'strengths', 'gaps', 'suggestions'],
};

/** Gemini responseSchema for Strategy Foundation (Phase 2) */
export const strategyFoundationResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    strategicDirection: { type: 'string' },
    behavioralDiagnosis: {
      type: 'object',
      properties: {
        ttmStages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              personaId: { type: 'string' },
              personaName: { type: 'string' },
              stage: { type: 'string', enum: ['precontemplation', 'contemplation', 'preparation', 'action', 'maintenance'] },
              rationale: { type: 'string' },
            },
            required: ['personaId', 'personaName', 'stage', 'rationale'],
          },
        },
        casiDeterminantAnalysis: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              determinant: { type: 'string', enum: ['resistance', 'self_image', 'automatisms', 'emotions', 'social_environment', 'physical_environment', 'capability', 'knowledge', 'attitude_risk_perception'] },
              score: { type: 'number' },
              assessment: { type: 'string' },
              comBComponent: { type: 'string', enum: ['capability', 'opportunity', 'motivation'] },
            },
            required: ['determinant', 'score', 'assessment', 'comBComponent'],
          },
        },
        comBMapping: {
          type: 'object',
          properties: {
            capability: { type: 'string' },
            opportunity: { type: 'string' },
            motivation: { type: 'string' },
            primaryTarget: { type: 'string', enum: ['capability', 'opportunity', 'motivation'] },
          },
          required: ['capability', 'opportunity', 'motivation', 'primaryTarget'],
        },
        behavioralBarriers: { type: 'array', items: { type: 'string' } },
        desiredBehaviors: { type: 'array', items: { type: 'string' } },
      },
      required: ['ttmStages', 'casiDeterminantAnalysis', 'comBMapping', 'behavioralBarriers', 'desiredBehaviors'],
    },
    enrichmentSynthesis: {
      type: 'object',
      properties: {
        perSourceFindings: {
          type: 'object',
          properties: {
            arena: { type: 'string' },
            exa: { type: 'string' },
            scholar: { type: 'string' },
            bct: { type: 'string' },
          },
          required: ['arena', 'exa', 'scholar', 'bct'],
        },
        crossSourcePatterns: { type: 'array', items: { type: 'string' } },
        sourceAttributedInsights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              insight: { type: 'string' },
              source: { type: 'string', enum: ['arena', 'exa', 'scholar', 'bct', 'casi', 'internal'] },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['insight', 'source', 'confidence'],
          },
        },
      },
      required: ['perSourceFindings', 'crossSourcePatterns', 'sourceAttributedInsights'],
    },
    behavioralStrategy: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        casiInterventionStrategy: { type: 'string' },
        selectedBCTs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              techniqueName: { type: 'string' },
              casiStrategy: { type: 'string' },
              targetDeterminant: { type: 'string', enum: ['resistance', 'self_image', 'automatisms', 'emotions', 'social_environment', 'physical_environment', 'capability', 'knowledge', 'attitude_risk_perception'] },
              applicationHint: { type: 'string' },
              rationale: { type: 'string' },
            },
            required: ['techniqueName', 'casiStrategy', 'targetDeterminant', 'applicationHint', 'rationale'],
          },
        },
        desiredBehavior: { type: 'string' },
      },
      required: ['summary', 'casiInterventionStrategy', 'selectedBCTs', 'desiredBehavior'],
    },
    elmRouteRecommendation: {
      type: 'object',
      properties: {
        primaryRoute: { type: 'string', enum: ['central', 'peripheral'] },
        rationale: { type: 'string' },
        perPersona: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              personaId: { type: 'string' },
              route: { type: 'string', enum: ['central', 'peripheral'] },
              reason: { type: 'string' },
            },
            required: ['personaId', 'route', 'reason'],
          },
        },
      },
      required: ['primaryRoute', 'rationale', 'perPersona'],
    },
    mindspaceAssessment: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          factor: { type: 'string', enum: ['messenger', 'incentives', 'norms', 'defaults', 'salience', 'priming', 'affect', 'commitments', 'ego'] },
          applicable: { type: 'boolean' },
          opportunity: { type: 'string' },
        },
        required: ['factor', 'applicable', 'opportunity'],
      },
    },
    keyInsights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          insight: { type: 'string' },
          source: { type: 'string', enum: ['arena', 'exa', 'scholar', 'bct', 'casi', 'internal'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['insight', 'source', 'confidence'],
      },
    },
    suggestedApproach: { type: 'string' },
    targetBehaviors: { type: 'array', items: { type: 'string' } },
    audienceInsights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          personaId: { type: 'string' },
          personaName: { type: 'string' },
          insight: { type: 'string' },
          ttmStage: { type: 'string' },
          topCasiBarriers: { type: 'array', items: { type: 'string' } },
          recommendedBCTs: { type: 'array', items: { type: 'string' } },
          elmRoute: { type: 'string', enum: ['central', 'peripheral'] },
        },
        required: ['personaId', 'personaName', 'insight', 'ttmStage', 'topCasiBarriers', 'recommendedBCTs', 'elmRoute'],
      },
    },
  },
  required: ['strategicDirection', 'behavioralDiagnosis', 'enrichmentSynthesis', 'behavioralStrategy', 'elmRouteRecommendation', 'mindspaceAssessment', 'keyInsights', 'suggestedApproach', 'targetBehaviors', 'audienceInsights'],
};

/** Gemini responseSchema for Hook Concept (Phase 4 inner object) */
export const hookConceptResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    hookTitle: { type: 'string' },
    bigIdea: { type: 'string' },
    creativeInsight: { type: 'string' },
    visualDirection: { type: 'string' },
    toneOfVoice: { type: 'string' },
    campaignLine: { type: 'string' },
    extendability: { type: 'array', items: { type: 'string' } },
    effieRationale: { type: 'string' },
  },
  required: ['hookTitle', 'bigIdea', 'creativeInsight', 'visualDirection', 'toneOfVoice', 'campaignLine', 'extendability', 'effieRationale'],
};

/** Gemini responseSchema for Creative Hook (Phase 4 — strategy + architecture + hookConcept) */
export const creativeHookResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    strategy: (fullVariantResponseSchema as { properties: Record<string, unknown> }).properties.strategy,
    architecture: architectureLayerResponseSchema,
    hookConcept: hookConceptResponseSchema,
  },
  required: ['strategy', 'architecture', 'hookConcept'],
};
