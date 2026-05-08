/**
 * Type definitions voor de campaign-brief output-mapper (Fase A van Cowork-pariteit).
 *
 * `BriefViewModel` is de pure data-shape die `brief-data-mapper.ts` produceert
 * en die `brief-renderer.ts` consumeert. Een `BriefMissingDataFlag` wordt
 * geretourneerd per ontbrekend veld zodat de UI gerichte meldingen kan tonen
 * in plaats van te crashen of een blanco sectie te renderen.
 */

export interface BriefMeta {
  campaignTitle: string;
  campaignType: string;
  campaignGoalType: string | null;
  startDate: string | null;
  endDate: string | null;
  durationWeeks: number | null;
  generatedAt: string;
}

export interface PersonaSegment {
  id: string;
  name: string;
  tagline: string | null;
  occupation: string | null;
  ageRange: string | null;
  painPoints: string[];
  motivations: string[];
  preferredChannels: string[];
  buyingTriggers: string[];
}

export interface BriefAudience {
  primary: PersonaSegment[];
  secondary: PersonaSegment[];
}

export interface BriefMessaging {
  coreMessage: string | null;
  supportingMessages: string[];
  tonePerChannel: { channel: string; tone: string }[];
  proofPoints: string[];
}

export interface BriefChannelEntry {
  name: string;
  role: string;
  objective: string;
  contentMix: string[];
  budgetAllocation: string;
  priority: number;
}

export interface BriefChannels {
  selected: BriefChannelEntry[];
  timingStrategy: string | null;
}

export interface BriefAssetEntry {
  title: string;
  contentType: string;
  channel: string;
  phase: string;
  estimatedEffort: string;
  productionPriority: string;
  briefObjective: string;
  briefKeyMessage: string;
  briefToneDirection: string;
  briefCallToAction: string;
  briefContentOutline: string[];
  targetPersonas: string[];
}

export interface BriefPrepEntry {
  title: string;
  description: string;
  category: string;
  owner: string;
  estimatedEffort: string;
}

export interface BriefAssets {
  mustHave: BriefAssetEntry[];
  shouldHave: BriefAssetEntry[];
  niceToHave: BriefAssetEntry[];
  prepDeliverables: BriefPrepEntry[];
}

export interface BriefNextSteps {
  thisWeek: BriefPrepEntry[];
}

export interface BriefOverview {
  campaignName: string;
  campaignTheme: string | null;
  positioningStatement: string | null;
  primaryGoalStatement: string | null;
  goalType: string | null;
  durationWeeks: number | null;
  budgetLevel: string | null;
}

export interface BriefViewModel {
  meta: BriefMeta;
  overview: BriefOverview;
  audience: BriefAudience;
  messaging: BriefMessaging;
  channels: BriefChannels;
  assets: BriefAssets;
  nextSteps: BriefNextSteps;
}

export interface WeekTheme {
  weekNumber: number;
  theme: string;
  rationale: string;
}

export interface BriefMissingDataFlag {
  section: number;
  fieldName: string;
  severity: 'warning' | 'error';
  message: string;
}

/**
 * Identifiers voor de 4 ontbrekende secties (placeholders in Fase A,
 * geactiveerd via Fase B follow-up tasks).
 */
export const BRIEF_FOLLOWUP_FEATURES = {
  metrics: 'campaign-kpi-structure',
  budget: 'campaign-budget-table',
  risks: 'campaign-risk-assessment',
} as const;
