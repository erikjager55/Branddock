// =============================================================
// Framework type definitions for the 11 core brand assets
// =============================================================

// ─── Legacy types (kept for backward compat with existing renderers) ───

export interface ESGPillar {
  impact: "high" | "medium" | "low";
  description: string;
  projectCount?: number;
  programCount?: number;
  policyCount?: number;
}

export interface ESGFrameworkData {
  pillars: {
    environmental: ESGPillar;
    social: ESGPillar;
    governance: ESGPillar;
  };
}

export interface SWOTFrameworkData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface PurposeKompasPillar {
  impact: "high" | "medium" | "low";
  description: string;
}

export interface PurposeKompasFrameworkData {
  pillars: {
    mens: PurposeKompasPillar;
    milieu: PurposeKompasPillar;
    maatschappij: PurposeKompasPillar;
  };
}

// ─── 1. Purpose Statement (IDEO Purpose Wheel) ──────────────

export interface PurposeWheelFrameworkData {
  statement: string;
  impactType: string; // Enable Potential / Reduce Friction / Foster Prosperity / Encourage Exploration / Kindle Happiness
  impactDescription: string;
  mechanism: string;
  pressureTest: string;
}

// ─── 2. Golden Circle (Simon Sinek) ─────────────────────────

export interface GoldenCircleSection {
  statement: string;
  details: string;
}

export interface GoldenCircleFrameworkData {
  why: GoldenCircleSection;
  how: GoldenCircleSection;
  what: GoldenCircleSection;
}

// ─── 3. Brand Essence (Aaker) ───────────────────────────────

export interface BrandEssenceFrameworkData {
  essenceStatement: string;
  emotionalBenefit: string;
  functionalBenefit: string;
  brandPersonalityTraits: string;
  proofPoints: string;
}

// ─── 4. Brand Promise (BrandHouse©) ─────────────────────────

export interface BrandPromiseFrameworkData {
  promiseStatement: string;
  functionalValue: string;
  emotionalValue: string;
  targetAudience: string;
  differentiator: string;
}

// ─── 5. Mission Statement ───────────────────────────────────

export interface MissionStatementFrameworkData {
  missionStatement: string;
  whatWeDo: string;
  forWhom: string;
  howWeDoIt: string;
  impactGoal: string;
}

// ─── 6. Vision Statement (Collins & Porras) ─────────────────

export interface VisionStatementFrameworkData {
  visionStatement: string;
  timeHorizon: string; // 3 years / 5 years / 10 years / 15+ years
  desiredFutureState: string;
  boldAspiration: string;
  successIndicators: string;
}

// ─── 7. Brand Archetype (Jung / Mark & Pearson) ─────────────

export interface BrandArchetypeFrameworkData {
  primaryArchetype: string; // Innocent / Everyman / Hero / Outlaw / Explorer / Creator / Ruler / Magician / Lover / Caregiver / Jester / Sage
  secondaryArchetype?: string;
  coreDesire: string;
  brandVoiceDescription: string;
  archetypeInAction: string;
}

// ─── 8. Transformative Goals (MTP / Exponential Orgs) ───────

export interface TransformativeGoal {
  title: string;
  description: string;
  timeframe: string;
  measurableOutcome: string;
}

export interface TransformativeGoalsFrameworkData {
  massiveTransformativePurpose: string;
  goals: TransformativeGoal[];
}

// ─── 9. Brand Personality (Aaker 5 Dimensions) ─────────────

export interface BrandPersonalityFrameworkData {
  primaryDimension: string; // Sincerity / Excitement / Competence / Sophistication / Ruggedness
  secondaryDimension?: string;
  personalityTraits: string[];
  toneOfVoice: string;
  personalityInPractice: string;
}

// ─── 10. Brand Story / Elevator Pitch (StoryBrand) ──────────

export interface BrandStoryFrameworkData {
  elevatorPitch: string;
  theChallenge: string;
  theSolution: string;
  theOutcome: string;
  originStory: string;
}

// ─── 11. Core Values (BrandHouse© Model) ────────────────────

export interface BrandHouseValue {
  name: string;
  description: string;
}

export interface BrandHouseValuesFrameworkData {
  anchorValue1: BrandHouseValue;
  anchorValue2: BrandHouseValue;
  aspirationValue1: BrandHouseValue;
  aspirationValue2: BrandHouseValue;
  ownValue: BrandHouseValue;
  valueTension: string;
}

// ─── Union types ────────────────────────────────────────────

export type FrameworkType =
  | "PURPOSE_WHEEL"
  | "GOLDEN_CIRCLE"
  | "BRAND_ESSENCE"
  | "BRAND_PROMISE"
  | "MISSION_STATEMENT"
  | "VISION_STATEMENT"
  | "BRAND_ARCHETYPE"
  | "TRANSFORMATIVE_GOALS"
  | "BRAND_PERSONALITY"
  | "BRAND_STORY"
  | "BRANDHOUSE_VALUES"
  // Legacy types (kept for backward compat)
  | "ESG"
  | "SWOT"
  | "PURPOSE_KOMPAS";

export type FrameworkData =
  | PurposeWheelFrameworkData
  | GoldenCircleFrameworkData
  | BrandEssenceFrameworkData
  | BrandPromiseFrameworkData
  | MissionStatementFrameworkData
  | VisionStatementFrameworkData
  | BrandArchetypeFrameworkData
  | TransformativeGoalsFrameworkData
  | BrandPersonalityFrameworkData
  | BrandStoryFrameworkData
  | BrandHouseValuesFrameworkData
  | ESGFrameworkData
  | SWOTFrameworkData
  | PurposeKompasFrameworkData;
