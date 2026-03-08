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
  mechanismCategory: string; // One of the 15 IDEO Outer Wheel categories
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

// ─── 3. Brand Essence Wheel (Bates/Aaker) ───────────────────

export interface BrandEssenceValidationScores {
  unique: number;       // 0-5: Is it ownable and distinctive?
  intangible: number;   // 0-5: Is it beyond a product feature?
  meaningful: number;   // 0-5: Does it resonate deeply?
  authentic: number;    // 0-5: Does it reflect reality?
  enduring: number;     // 0-5: Will it last 10+ years?
  scalable: number;     // 0-5: Does it work across markets?
}

export interface BrandEssenceFrameworkData {
  essenceStatement: string;          // 1-3 word core (e.g. "Authentic Athletic Performance")
  essenceNarrative: string;          // 2-3 sentence explanation
  functionalBenefit: string;         // Tangible delivery
  emotionalBenefit: string;          // Feeling it evokes
  selfExpressiveBenefit: string;     // How customers express themselves
  discriminator: string;             // Compelling difference vs competitors
  proofPoints: string[];             // 3-5 evidence items
  attributes: string[];              // Tangible brand characteristics
  audienceInsight: string;           // Deep human truth
  validationScores: BrandEssenceValidationScores;
}

// ─── 4. Brand Promise (Keller/Aaker Value Model) ────────────

export interface BrandPromiseFrameworkData {
  promiseStatement: string;           // The core promise (1-2 sentences)
  promiseOneLiner: string;            // Distilled to a single tagline-length sentence
  functionalValue: string;            // Tangible benefit delivered
  emotionalValue: string;             // Feeling it creates
  selfExpressiveValue: string;        // How customers express themselves through the brand
  targetAudience: string;             // Who the promise is for
  coreCustomerNeed: string;           // The deep underlying need being addressed
  differentiator: string;             // What sets the promise apart
  onlynessStatement: string;          // "Only [brand] can ___ because ___"
  proofPoints: string[];              // 3-5 evidence items that the promise is real
  measurableOutcomes: string[];       // Concrete measurable outcomes of the promise
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

export interface WeSayNotThatPair {
  weSay: string;
  notThat: string;
}

export interface BrandArchetypeFrameworkData {
  // Section 1: Archetype Selection
  primaryArchetype: string; // Innocent / Everyman / Hero / Outlaw / Explorer / Creator / Ruler / Magician / Lover / Caregiver / Jester / Sage
  secondaryArchetype?: string;
  blendRatio?: string; // e.g. "70/30"
  subArchetype?: string; // Specific variant within primary (e.g. "Rescuer" for Hero)

  // Section 2: Core Psychology
  coreDesire: string;
  coreFear: string;
  brandGoal: string;
  strategy: string;
  giftTalent: string;
  shadowWeakness: string;

  // Section 3: Voice & Messaging
  brandVoiceDescription: string;
  voiceAdjectives: string[]; // 3-5 adjectives
  languagePatterns: string;
  weSayNotThat: WeSayNotThatPair[];
  toneVariations: string;
  blacklistedPhrases: string[];

  // Section 4: Visual Expression
  colorDirection: string;
  typographyDirection: string;
  imageryStyle: string;
  visualMotifs: string;

  // Section 5: Archetype in Action
  archetypeInAction: string;
  marketingExpression: string;
  customerExperience: string;
  contentStrategy: string;
  storytellingApproach: string;

  // Section 6: Reference & Positioning
  brandExamples: string[];
  positioningApproach?: string; // Similarity / Aspiration / Guidance / Inspiration
  competitiveLandscape: string;
}

// ─── 8. Transformative Goals (MTP / BHAG / Moonshot) ────────

export type ImpactDomain = 'PEOPLE' | 'PLANET' | 'PROSPERITY';

export type TimeframeHorizon = 'SHORT' | 'MEDIUM' | 'LONG' | 'ASPIRATIONAL';

export interface GoalMilestone {
  year: number;
  target: string;
  achieved?: boolean;
}

export interface TransformativeGoal {
  title: string;
  description: string;
  impactDomain: ImpactDomain;
  timeframe: string;             // e.g. "2030"
  timeframeHorizon: TimeframeHorizon;
  measurableCommitment: string;  // Concrete measurable target
  theoryOfChange: string;        // How brand activity leads to impact
  currentProgress: number;       // 0-100
  milestones: GoalMilestone[];
  sdgAlignment: number[];        // UN SDG numbers (1-17)
}

export interface AuthenticityScore {
  ambition: number;       // 1-5: Is it bold enough to inspire?
  authenticity: number;   // 1-5: Does it match brand DNA?
  clarity: number;        // 1-5: Can anyone understand it?
  measurability: number;  // 1-5: Can progress be tracked?
  integration: number;    // 1-5: Does it drive strategy?
  longevity: number;      // 1-5: Will it endure 10+ years?
}

export interface StakeholderImpact {
  stakeholder: string;    // e.g. "Employees", "Customers"
  role: string;           // e.g. "Ambassadors & executors"
  expectedImpact: string; // e.g. "Culture, motivation, retention"
}

export interface BrandIntegration {
  positioningLink: string;
  communicationThemes: string[];
  campaignDirections: string[];
  internalActivation: string;
}

export interface TransformativeGoalsFrameworkData {
  massiveTransformativePurpose: string;
  mtpNarrative: string;
  goals: TransformativeGoal[];
  authenticityScores: AuthenticityScore;
  stakeholderImpact: StakeholderImpact[];
  brandIntegration: BrandIntegration;
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
