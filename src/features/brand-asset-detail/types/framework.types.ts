// =============================================================
// Framework type definitions for the 11 core brand assets (Mission & Vision merged)
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

// ─── 5. Mission & Vision (merged) ────────────────────────────

export interface MissionVisionFrameworkData {
  // Card 1: Mission Statement
  missionStatement: string;
  missionOneLiner: string;

  // Card 2: Mission Components
  forWhom: string;
  whatWeDo: string;
  howWeDoIt: string;

  // Card 3: Vision Statement
  visionStatement: string;
  timeHorizon: string; // 3 years / 5 years / 10 years / 15+ years / Aspirational
  boldAspiration: string;

  // Card 4: Envisioned Future (Collins & Porras)
  desiredFutureState: string;
  successIndicators: string[];
  stakeholderBenefit: string;

  // Card 5: Impact & Alignment
  impactGoal: string;
  valuesAlignment: string;
  missionVisionTension: string;
}

/** @deprecated Use MissionVisionFrameworkData instead */
export type MissionStatementFrameworkData = MissionVisionFrameworkData;

// ─── 7. Brand Archetype (Jung / Mark & Pearson) ─────────────

export interface WeSayNotThatPair {
  weSay: string;
  notThat: string;
}

export interface BrandArchetypeFrameworkData {
  // Section 1: Archetype Selection (single archetype only)
  primaryArchetype: string; // Innocent / Everyman / Hero / Outlaw / Explorer / Creator / Ruler / Magician / Lover / Caregiver / Jester / Sage
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

export interface PersonalityTrait {
  name: string;           // Multi-word phrase, e.g. "Quietly Confident"
  description: string;    // 1-2 sentence description
  weAreThis: string;      // Concrete examples of the trait in action
  butNeverThat: string;   // Guard rails / boundaries
}

export interface AakerDimensionScores {
  sincerity: number;       // 1-5
  excitement: number;      // 1-5
  competence: number;      // 1-5
  sophistication: number;  // 1-5
  ruggedness: number;      // 1-5
}

export interface PersonalitySpectrumValues {
  friendlyFormal: number;        // 1-7 (1=Friendly/Approachable, 7=Corporate/Formal)
  energeticThoughtful: number;   // 1-7
  modernTraditional: number;     // 1-7
  innovativeProven: number;      // 1-7
  playfulSerious: number;        // 1-7
  inclusiveExclusive: number;    // 1-7
  boldReserved: number;          // 1-7
}

export interface ToneDimensions {
  formalCasual: number;               // 1-7 (1=Formal, 7=Casual)
  seriousFunny: number;               // 1-7
  respectfulIrreverent: number;       // 1-7
  matterOfFactEnthusiastic: number;   // 1-7
}

export interface ChannelTones {
  website: string;
  socialMedia: string;
  customerSupport: string;
  email: string;
  crisis: string;
}

export interface BrandPersonalityFrameworkData {
  // Section 1: Aaker Dimension Scores
  dimensionScores: AakerDimensionScores;
  primaryDimension: string;     // Dominant dimension name
  secondaryDimension?: string;

  // Section 2: Core Personality Traits (3-5)
  personalityTraits: PersonalityTrait[];

  // Section 3: Personality Spectrum (7 sliders)
  spectrumSliders: PersonalitySpectrumValues;

  // Section 4: Voice & Tone
  toneDimensions: ToneDimensions;
  brandVoiceDescription: string;
  wordsWeUse: string[];
  wordsWeAvoid: string[];
  writingSample: string;

  // Section 5: Communication Style
  channelTones: ChannelTones;

  // Section 6: Visual Personality Expression
  colorDirection: string;
  typographyDirection: string;
  imageryDirection: string;
}

// ─── 10. Brand Story (StoryBrand / Hero's Journey / ABT) ────

export interface AudienceAdaptations {
  customers: string;
  investors: string;
  employees: string;
  partners: string;
}

export interface BrandStoryFrameworkData {
  // Card 1: Origin & Belief
  originStory: string;             // Founding narrative
  founderMotivation: string;       // Personal driver of the founder(s)
  coreBeliefStatement: string;     // The fundamental belief the brand is built on

  // Card 2: The World We See — Context & Problem
  worldContext: string;            // External forces making the brand relevant now
  customerExternalProblem: string; // Visible, tangible customer problem
  customerInternalProblem: string; // Emotional experience — frustration, doubt, fear
  philosophicalProblem: string;    // Why it matters on a human/societal level
  stakesCostOfInaction: string;    // What's at stake if the problem isn't solved

  // Card 3: The Brand as Guide
  brandRole: string;               // Guide / Mentor / Enabler / Partner
  empathyStatement: string;        // How the brand shows understanding
  authorityCredentials: string;    // What gives the brand credibility

  // Card 4: Transformation & Resolution
  transformationPromise: string;   // The specific before → after change
  customerSuccessVision: string;   // Vivid description of life after transformation

  // Card 5: Narrative Toolkit
  abtStatement: string;            // And/But/Therefore summary (Park Howell)
  brandThemes: string[];           // 2-4 thematic territories the brand "owns"
  emotionalTerritory: string[];    // Specific emotions the story evokes
  keyNarrativeMessages: string[];  // 3-5 recurring key messages
  narrativeArc: string;            // Hero's Journey / Sparkline / Rags to Riches / Overcoming the Monster / Quest

  // Card 6: Evidence & Milestones
  proofPoints: string[];           // Concrete evidence supporting the story
  valuesInAction: string[];        // Stories where values were demonstrated through action
  brandMilestones: string[];       // Key moments in the brand's journey

  // Card 7: Story Expressions
  elevatorPitch: string;           // 30-second version
  manifestoText: string;           // Long-form emotional brand manifesto
  audienceAdaptations: AudienceAdaptations; // Per-audience story notes

  // Legacy fields (mapped for backward compatibility)
  /** @deprecated Use customerExternalProblem instead */
  theChallenge?: string;
  /** @deprecated Use brandRole + empathyStatement instead */
  theSolution?: string;
  /** @deprecated Use transformationPromise instead */
  theOutcome?: string;
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
  | MissionVisionFrameworkData
  | BrandArchetypeFrameworkData
  | TransformativeGoalsFrameworkData
  | BrandPersonalityFrameworkData
  | BrandStoryFrameworkData
  | BrandHouseValuesFrameworkData
  | ESGFrameworkData
  | SWOTFrameworkData
  | PurposeKompasFrameworkData;
