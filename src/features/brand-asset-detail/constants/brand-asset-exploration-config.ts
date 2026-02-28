// ─── Brand Asset Exploration Config ─────────────────────────
// Frontend configuration for AI Exploration on Brand Assets.
// Slug-specific dimensions and field mappings.
// ────────────────────────────────────────────────────────────

import { Compass, Heart, Leaf, Globe, Lightbulb, Rocket, Target, FileText, BarChart2, Zap, Cog, FlaskConical } from 'lucide-react';
import type { DimensionConfig, FieldMapping } from '@/components/ai-exploration/types';

// ─── Social Relevancy Dimensions ──────────────────────────

const SOCIAL_RELEVANCY_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'purpose_clarity',
    label: 'Purpose Clarity',
    icon: Compass,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: [
      'Why does your organization exist beyond making profit?',
      'What change do you want to see in the world?',
      'How does your brand contribute to that change?',
    ],
  },
  {
    key: 'mens',
    label: 'Impact on People',
    icon: Heart,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: [
      'How do your products contribute to personal growth?',
      'What impact do you have on employee well-being?',
      'How do you support a healthier lifestyle?',
    ],
  },
  {
    key: 'milieu',
    label: 'Impact on Environment',
    icon: Leaf,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: [
      'What steps have you taken toward sustainability?',
      'How does your production minimize environmental impact?',
      'What sustainable innovations are you pursuing?',
    ],
  },
  {
    key: 'maatschappij',
    label: 'Impact on Society',
    icon: Globe,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: [
      'How does your brand improve society?',
      'Do you fight inequality or promote education?',
      'How do you make tools accessible to a wider audience?',
    ],
  },
];

// ─── Purpose Wheel Framework Dimensions ──────────────────

const PURPOSE_WHEEL_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'core_purpose',
    label: 'Core Purpose',
    icon: Target,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: [
      'Why does your organization exist beyond profit?',
      'What fundamental belief drives everything you do?',
      'Can you express your purpose in one clear sentence?',
      'Would employees recognize this as the core purpose?',
    ],
  },
  {
    key: 'impact_type',
    label: 'Impact & Reach',
    icon: Lightbulb,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: [
      'Which IDEO impact type best describes your purpose?',
      'How does this impact manifest for customers?',
      'What tangible difference does your purpose make?',
      'How would stakeholders describe your impact?',
    ],
  },
  {
    key: 'mechanism',
    label: 'Mechanism & Delivery',
    icon: Cog,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: [
      'Through what means do you deliver on your purpose?',
      'What is unique about your mechanism?',
      'How does your approach differ from competitors?',
      'Is your mechanism scalable and sustainable?',
    ],
  },
  {
    key: 'pressure_test',
    label: 'Pressure Test & Alignment',
    icon: FlaskConical,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: [
      'What would this purpose unlock for employees?',
      'How would it change product decisions?',
      'What partnerships would you pursue or decline?',
      'Would a stranger recognize this purpose from your actions?',
    ],
  },
];

// ─── Purpose Statement Dimensions ─────────────────────────

const PURPOSE_STATEMENT_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'why',
    label: 'Why — Raison d\u2019\u00EAtre',
    icon: Compass,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: [
      'Why was your organization founded?',
      'What fundamental problem drove its creation?',
      'What belief is at the core?',
    ],
  },
  {
    key: 'how',
    label: 'How — Unique Approach',
    icon: Lightbulb,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: [
      'How do you fulfill your purpose uniquely?',
      'What makes your method different?',
      'What philosophy drives your approach?',
    ],
  },
  {
    key: 'impact',
    label: 'Impact — Desired Effect',
    icon: Rocket,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: [
      'What does the world look like when your purpose is realized?',
      'How do people think differently because of your brand?',
      'What measurable impact do you aim for?',
    ],
  },
  {
    key: 'alignment',
    label: 'Alignment — Organization & Execution',
    icon: Target,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: [
      'How well does your organization reflect your purpose?',
      'Is your purpose visible in daily decisions?',
      'Where are the gaps between purpose and execution?',
    ],
  },
];

// ─── Default Dimensions (other brand assets) ──────────────

const DEFAULT_BRAND_ASSET_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'definition',
    label: 'Definition & Scope',
    icon: FileText,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: [
      'What does this brand asset mean for your organization?',
      'How would you explain it to someone unfamiliar?',
    ],
  },
  {
    key: 'current_state',
    label: 'Current State',
    icon: BarChart2,
    color: 'pink',
    bgClass: 'bg-pink-100',
    textClass: 'text-pink-600',
    defaultQuestions: [
      'Is it well-defined and actively used?',
      "What's working well and what needs improvement?",
    ],
  },
  {
    key: 'differentiation',
    label: 'Differentiation',
    icon: Zap,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: [
      'How does this asset set you apart from competitors?',
      'What makes your approach unique?',
    ],
  },
  {
    key: 'activation',
    label: 'Activation & Application',
    icon: Rocket,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: [
      'How is this asset activated across your organization?',
      'Where is the biggest opportunity for better activation?',
    ],
  },
];

// ─── Field Mappings per Framework Type ───────────────────

const FRAMEWORK_FIELD_MAPPINGS: Record<string, FieldMapping[]> = {
  PURPOSE_WHEEL: [
    { field: 'frameworkData.statement', label: 'Purpose Statement', type: 'text' },
    { field: 'frameworkData.impactType', label: 'Impact Type', type: 'string' },
    { field: 'frameworkData.mechanism', label: 'Mechanism', type: 'text' },
    { field: 'frameworkData.pressureTest', label: 'Pressure Test', type: 'text' },
  ],
  GOLDEN_CIRCLE: [
    { field: 'frameworkData.why.statement', label: 'Why Statement', type: 'text' },
    { field: 'frameworkData.how.statement', label: 'How Statement', type: 'text' },
    { field: 'frameworkData.what.statement', label: 'What Statement', type: 'text' },
  ],
  BRAND_ESSENCE: [
    { field: 'frameworkData.essenceStatement', label: 'Essence Statement', type: 'text' },
    { field: 'frameworkData.emotionalBenefit', label: 'Emotional Benefit', type: 'text' },
    { field: 'frameworkData.functionalBenefit', label: 'Functional Benefit', type: 'text' },
    { field: 'frameworkData.brandPersonalityTraits', label: 'Personality Traits', type: 'text' },
    { field: 'frameworkData.proofPoints', label: 'Proof Points', type: 'text' },
  ],
  BRAND_PROMISE: [
    { field: 'frameworkData.promiseStatement', label: 'Promise Statement', type: 'text' },
    { field: 'frameworkData.functionalValue', label: 'Functional Value', type: 'text' },
    { field: 'frameworkData.emotionalValue', label: 'Emotional Value', type: 'text' },
    { field: 'frameworkData.targetAudience', label: 'Target Audience', type: 'text' },
    { field: 'frameworkData.differentiator', label: 'Differentiator', type: 'text' },
  ],
  MISSION_STATEMENT: [
    { field: 'frameworkData.missionStatement', label: 'Mission Statement', type: 'text' },
    { field: 'frameworkData.whatWeDo', label: 'What We Do', type: 'text' },
    { field: 'frameworkData.forWhom', label: 'For Whom', type: 'text' },
    { field: 'frameworkData.howWeDoIt', label: 'How We Do It', type: 'text' },
    { field: 'frameworkData.impactGoal', label: 'Impact Goal', type: 'text' },
  ],
  VISION_STATEMENT: [
    { field: 'frameworkData.visionStatement', label: 'Vision Statement', type: 'text' },
    { field: 'frameworkData.timeHorizon', label: 'Time Horizon', type: 'string' },
    { field: 'frameworkData.desiredFutureState', label: 'Desired Future State', type: 'text' },
    { field: 'frameworkData.boldAspiration', label: 'Bold Aspiration', type: 'text' },
    { field: 'frameworkData.successIndicators', label: 'Success Indicators', type: 'text' },
  ],
  BRAND_ARCHETYPE: [
    { field: 'frameworkData.primaryArchetype', label: 'Primary Archetype', type: 'string' },
    { field: 'frameworkData.coreDesire', label: 'Core Desire', type: 'text' },
    { field: 'frameworkData.brandVoiceDescription', label: 'Brand Voice', type: 'text' },
    { field: 'frameworkData.archetypeInAction', label: 'Archetype in Action', type: 'text' },
  ],
  TRANSFORMATIVE_GOALS: [
    { field: 'frameworkData.massiveTransformativePurpose', label: 'Massive Transformative Purpose', type: 'text' },
  ],
  BRAND_PERSONALITY: [
    { field: 'frameworkData.primaryDimension', label: 'Primary Dimension', type: 'string' },
    { field: 'frameworkData.toneOfVoice', label: 'Tone of Voice', type: 'text' },
    { field: 'frameworkData.personalityInPractice', label: 'Personality in Practice', type: 'text' },
  ],
  BRAND_STORY: [
    { field: 'frameworkData.elevatorPitch', label: 'Elevator Pitch', type: 'text' },
    { field: 'frameworkData.theChallenge', label: 'The Challenge', type: 'text' },
    { field: 'frameworkData.theSolution', label: 'The Solution', type: 'text' },
    { field: 'frameworkData.theOutcome', label: 'The Outcome', type: 'text' },
    { field: 'frameworkData.originStory', label: 'Origin Story', type: 'text' },
  ],
  BRANDHOUSE_VALUES: [
    { field: 'frameworkData.valueTension', label: 'Value Tension', type: 'text' },
  ],
  ESG: [
    { field: 'frameworkData.pillars.environmental.description', label: 'Environmental Impact', type: 'text' },
    { field: 'frameworkData.pillars.social.description', label: 'Social Impact', type: 'text' },
    { field: 'frameworkData.pillars.governance.description', label: 'Governance Impact', type: 'text' },
  ],
};

// ─── Slug-based Field Mappings (legacy fallback) ─────────

const SOCIAL_RELEVANCY_FIELD_MAPPING: FieldMapping[] = [
  { field: 'content', label: 'Description', type: 'text' },
  { field: 'frameworkData.pillars.mens.description', label: 'People — Description', type: 'text' },
  { field: 'frameworkData.pillars.milieu.description', label: 'Environment — Description', type: 'text' },
  { field: 'frameworkData.pillars.maatschappij.description', label: 'Society — Description', type: 'text' },
];

const PURPOSE_STATEMENT_FIELD_MAPPING: FieldMapping[] = [
  { field: 'content.why', label: 'Why — Raison d\u2019\u00EAtre', type: 'text' },
  { field: 'content.how', label: 'How — Unique Approach', type: 'text' },
  { field: 'content.impact', label: 'Impact — Desired Effect', type: 'text' },
];

const DEFAULT_FIELD_MAPPING: FieldMapping[] = [
  { field: 'description', label: 'Description', type: 'text' },
];

// ─── Resolver Functions ───────────────────────────────────

export function getDimensionsForSlug(slug: string, frameworkType?: string): DimensionConfig[] {
  // Framework-specific dimensions take priority
  if (frameworkType === 'PURPOSE_WHEEL') return PURPOSE_WHEEL_DIMENSIONS;

  switch (slug) {
    case 'social-relevancy':
      return SOCIAL_RELEVANCY_DIMENSIONS;
    case 'purpose-statement':
      return PURPOSE_STATEMENT_DIMENSIONS;
    default:
      return DEFAULT_BRAND_ASSET_DIMENSIONS;
  }
}

export function getFieldMappingForSlug(slug: string, frameworkType?: string): FieldMapping[] {
  // Framework-specific field mapping takes priority
  if (frameworkType && FRAMEWORK_FIELD_MAPPINGS[frameworkType]) {
    return FRAMEWORK_FIELD_MAPPINGS[frameworkType];
  }

  // Slug-based fallback
  switch (slug) {
    case 'social-relevancy':
      return SOCIAL_RELEVANCY_FIELD_MAPPING;
    case 'purpose-statement':
      return PURPOSE_STATEMENT_FIELD_MAPPING;
    default:
      return DEFAULT_FIELD_MAPPING;
  }
}

// ─── Backwards-compatible exports ─────────────────────────
// For any code still importing the old constants
export const BRAND_ASSET_DIMENSIONS = DEFAULT_BRAND_ASSET_DIMENSIONS;
export const BRAND_ASSET_FIELD_MAPPING = DEFAULT_FIELD_MAPPING;
