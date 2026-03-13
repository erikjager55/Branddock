import { z } from 'zod';

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
export type PreferredVariant = 'A' | 'B';

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

export interface StrategyLayer {
  strategicIntent: StrategicIntent;
  intentRatio: { brand: number; activation: number };
  campaignTheme: string;
  positioningStatement: string;
  messagingHierarchy: MessagingHierarchy;
  jtbdFraming: JTBDFraming;
  strategicChoices: string[];
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
}

export interface AssetPlanLayer {
  deliverables: AssetPlanDeliverable[];
  totalDeliverables: number;
  prioritySummary: string;
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
}

// ─── Complete Blueprint ─────────────────────────────────────

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
  pipelineDuration: number;
  modelsUsed: string[];
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

export interface GenerateBlueprintBody {
  personaIds?: string[];
  strategicIntent?: StrategicIntent;
  /** Wizard context — when provided, the pipeline runs without a DB campaign */
  wizardContext?: {
    campaignName: string;
    campaignDescription?: string;
    campaignGoalType?: string;
  };
}

export interface RegenerateBlueprintBody {
  layer: RegenerateLayer;
  feedback?: string;
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

export const strategyLayerSchema = z.object({
  strategicIntent: z.enum(['brand_building', 'sales_activation', 'hybrid']),
  intentRatio: z.object({ brand: z.number(), activation: z.number() }),
  campaignTheme: z.string(),
  positioningStatement: z.string(),
  messagingHierarchy: messagingHierarchySchema,
  jtbdFraming: jtbdFramingSchema,
  strategicChoices: z.array(z.string()),
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
});

export const assetPlanLayerSchema = z.object({
  deliverables: z.array(assetPlanDeliverableSchema),
  totalDeliverables: z.number(),
  prioritySummary: z.string(),
});

// ─── Persona Validation Schema ──────────────────────────────

export const personaValidationSchema = z.object({
  personaId: z.string(),
  personaName: z.string(),
  overallScore: z.number().min(1).max(10),
  feedback: z.string(),
  resonates: z.array(z.string()),
  concerns: z.array(z.string()),
  suggestions: z.array(z.string()),
  preferredVariant: z.enum(['A', 'B']),
});

export const personaValidationArraySchema = z.array(personaValidationSchema);

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
        },
        required: ['title', 'contentType', 'channel', 'phase', 'targetPersonas', 'brief', 'productionPriority', 'estimatedEffort'],
      },
    },
    totalDeliverables: { type: 'number' },
    prioritySummary: { type: 'string' },
  },
  required: ['deliverables', 'totalDeliverables', 'prioritySummary'],
};
