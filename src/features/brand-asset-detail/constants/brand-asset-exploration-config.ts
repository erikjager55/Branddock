// ─── Brand Asset Exploration Config ─────────────────────────
// Frontend configuration for AI Exploration on Brand Assets.
// Slug-specific dimensions for progress bar UI.
// Field mappings are now dynamic (generated from frameworkData on the backend).
// ────────────────────────────────────────────────────────────

import {
  Compass, Heart, Leaf, Globe, Lightbulb, Rocket, Target, FileText, BarChart2, Zap, Cog, FlaskConical,
  Package, Fingerprint, Sparkles, Layers, Shield, CheckCircle, AlertTriangle, TrendingUp, Users, Eye,
  Mountain, Map, Crown, Activity, Moon, BookOpen, Award, User, MessageCircle, AlertCircle, Star,
  ArrowRight, Scale, Building,
} from 'lucide-react';
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

// ─── Golden Circle Dimensions ────────────────────────────

const GOLDEN_CIRCLE_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'why',
    label: 'WHY — Core Belief',
    icon: Heart,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['Why does your organization exist?', 'What is the fundamental belief that drives everything you do?'],
  },
  {
    key: 'how',
    label: 'HOW — Unique Approach',
    icon: Cog,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: ['How do you bring your WHY to life?', 'What processes or values make your approach unique?'],
  },
  {
    key: 'what',
    label: 'WHAT — Offering',
    icon: Package,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: ['What exactly do you offer?', 'How do your products prove your WHY and HOW?'],
  },
  {
    key: 'coherence',
    label: 'Inside-Out Coherence',
    icon: Target,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: ['How consistently does your organization communicate from WHY to HOW to WHAT?', 'Where are the gaps?'],
  },
];

// ─── Brand Essence Dimensions ────────────────────────────

const BRAND_ESSENCE_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'core_identity',
    label: 'Core Identity',
    icon: Fingerprint,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: ['If your brand were a person, how would you describe their essential character?'],
  },
  {
    key: 'emotional_connection',
    label: 'Emotional Connection',
    icon: Heart,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: ['What emotion should people feel every time they interact with your brand?'],
  },
  {
    key: 'differentiation',
    label: 'Unique DNA',
    icon: Sparkles,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['What makes your brand fundamentally different from everything else in your category?'],
  },
  {
    key: 'consistency',
    label: 'Essence in Action',
    icon: Layers,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: ['Where does your brand essence show up most clearly?', 'Where does it get lost?'],
  },
];

// ─── Brand Promise Dimensions ────────────────────────────

const BRAND_PROMISE_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'commitment',
    label: 'Core Commitment',
    icon: Shield,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: ['What is the one promise your brand makes to every customer, every time?'],
  },
  {
    key: 'proof',
    label: 'Proof & Delivery',
    icon: CheckCircle,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: ['How do you consistently deliver on this promise?', 'What evidence can customers point to?'],
  },
  {
    key: 'gap_analysis',
    label: 'Promise Gap',
    icon: AlertTriangle,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['Where is the biggest gap between what you promise and what customers actually experience?'],
  },
  {
    key: 'evolution',
    label: 'Future Promise',
    icon: TrendingUp,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: ['How should your brand promise evolve as your market and customers change?'],
  },
];

// ─── Mission Statement Dimensions ────────────────────────

const MISSION_STATEMENT_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'purpose',
    label: 'Purpose & Direction',
    icon: Compass,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: ['What is your organization trying to achieve right now?', 'What is the primary mission?'],
  },
  {
    key: 'audience',
    label: 'Who You Serve',
    icon: Users,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: ['Who are the primary beneficiaries of your mission?', 'How does it improve their lives?'],
  },
  {
    key: 'approach',
    label: 'How You Deliver',
    icon: Rocket,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: ['What is your unique approach to fulfilling this mission?', 'What sets your method apart?'],
  },
  {
    key: 'measurement',
    label: 'Impact & Measurement',
    icon: BarChart2,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: ['How do you know if your mission is succeeding?', 'What does progress look like?'],
  },
];

// ─── Vision Statement Dimensions ─────────────────────────

const VISION_STATEMENT_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'future_state',
    label: 'Future State',
    icon: Eye,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: ['What does the world look like when your organization has fully succeeded?'],
  },
  {
    key: 'ambition',
    label: 'Scale of Ambition',
    icon: Mountain,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['How ambitious is your vision?', 'Does it inspire people to go beyond what seems possible today?'],
  },
  {
    key: 'relevance',
    label: 'Stakeholder Relevance',
    icon: Users,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: ['How does this vision connect to what your employees, customers, and partners care about?'],
  },
  {
    key: 'pathway',
    label: 'Vision to Action',
    icon: Map,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: ['What are the key milestones between today and your vision?', 'What needs to happen first?'],
  },
];

// ─── Brand Archetype Dimensions ──────────────────────────

const BRAND_ARCHETYPE_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'archetype_fit',
    label: 'Archetype Identity',
    icon: Crown,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['Which archetype best represents your brand?', 'What traits does your brand naturally embody?'],
  },
  {
    key: 'behavior',
    label: 'Archetypal Behavior',
    icon: Activity,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: ['How does this archetype show up in your communication, products, and interactions?'],
  },
  {
    key: 'shadow',
    label: 'Shadow Side',
    icon: Moon,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: ['What is the shadow side of your archetype?', 'How do you avoid falling into those patterns?'],
  },
  {
    key: 'storytelling',
    label: 'Narrative Power',
    icon: BookOpen,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: ['How does your archetype shape the stories you tell?', 'What recurring themes define your brand?'],
  },
];

// ─── Transformative Goals Dimensions ─────────────────────

const TRANSFORMATIVE_GOALS_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'transformation',
    label: 'Desired Transformation',
    icon: Sparkles,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['What fundamental change does your brand want to create in the world?'],
  },
  {
    key: 'barriers',
    label: 'Barriers to Change',
    icon: Shield,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: ['What stands in the way of this transformation?', 'What obstacles do your customers face?'],
  },
  {
    key: 'enablers',
    label: 'How You Enable',
    icon: Zap,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: ['How does your brand help people overcome barriers and achieve transformation?'],
  },
  {
    key: 'evidence',
    label: 'Transformation Evidence',
    icon: Award,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: ['What evidence exists that your brand has already created this transformation?'],
  },
];

// ─── Brand Personality Dimensions ────────────────────────

const BRAND_PERSONALITY_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'traits',
    label: 'Core Traits',
    icon: User,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: ['If your brand were a person, how would others describe them?', 'Name 3-5 key personality traits.'],
  },
  {
    key: 'voice',
    label: 'Voice & Tone',
    icon: MessageCircle,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: ['How does your brand speak?', 'What words would it use — and never use?'],
  },
  {
    key: 'relationships',
    label: 'Relationship Style',
    icon: Heart,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: ['What kind of relationship does your brand build with people?', 'A trusted advisor? A fun friend?'],
  },
  {
    key: 'boundaries',
    label: 'Personality Boundaries',
    icon: AlertCircle,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['What is your brand personality NOT?', 'What traits would feel inauthentic?'],
  },
];

// ─── Brand Story Dimensions ──────────────────────────────

const BRAND_STORY_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'origin',
    label: 'Origin Story',
    icon: BookOpen,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['How did your brand begin?', 'What problem or moment sparked its creation?'],
  },
  {
    key: 'struggle',
    label: 'Challenge & Struggle',
    icon: Mountain,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: ['What challenges has your brand overcome?', 'What makes the journey compelling?'],
  },
  {
    key: 'turning_point',
    label: 'Turning Point',
    icon: Star,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: ['What was the defining moment that shaped who your brand is today?'],
  },
  {
    key: 'future_chapter',
    label: 'The Next Chapter',
    icon: ArrowRight,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: ['What is the next chapter of your brand story?', 'Where is the narrative heading?'],
  },
];

// ─── Brandhouse Values Dimensions ────────────────────────

const BRANDHOUSE_VALUES_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'core_values',
    label: 'Core Values',
    icon: Heart,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: ['What are the 3-5 non-negotiable values that guide every decision in your organization?'],
  },
  {
    key: 'lived_values',
    label: 'Values in Practice',
    icon: CheckCircle,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: ['How do these values show up in daily operations, hiring, and customer interactions?'],
  },
  {
    key: 'tension',
    label: 'Value Tensions',
    icon: Scale,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['When have your values been tested?', 'How do you handle conflicts between competing values?'],
  },
  {
    key: 'cultural_fit',
    label: 'Cultural Expression',
    icon: Building,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: ['How do your values shape your internal culture?', 'Would employees recognize these values?'],
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

// ─── Resolver Functions ───────────────────────────────────

export function getDimensionsForSlug(slug: string, frameworkType?: string): DimensionConfig[] {
  // Framework-specific dimensions take priority
  if (frameworkType) {
    switch (frameworkType) {
      case 'PURPOSE_WHEEL': return PURPOSE_WHEEL_DIMENSIONS;
      case 'GOLDEN_CIRCLE': return GOLDEN_CIRCLE_DIMENSIONS;
      case 'BRAND_ESSENCE': return BRAND_ESSENCE_DIMENSIONS;
      case 'BRAND_PROMISE': return BRAND_PROMISE_DIMENSIONS;
      case 'MISSION_STATEMENT': return MISSION_STATEMENT_DIMENSIONS;
      case 'VISION_STATEMENT': return VISION_STATEMENT_DIMENSIONS;
      case 'BRAND_ARCHETYPE': return BRAND_ARCHETYPE_DIMENSIONS;
      case 'TRANSFORMATIVE_GOALS': return TRANSFORMATIVE_GOALS_DIMENSIONS;
      case 'BRAND_PERSONALITY': return BRAND_PERSONALITY_DIMENSIONS;
      case 'BRAND_STORY': return BRAND_STORY_DIMENSIONS;
      case 'BRANDHOUSE_VALUES': return BRANDHOUSE_VALUES_DIMENSIONS;
    }
  }

  // Slug-based fallback
  switch (slug) {
    case 'social-relevancy':
      return SOCIAL_RELEVANCY_DIMENSIONS;
    case 'purpose-statement':
      return PURPOSE_STATEMENT_DIMENSIONS;
    default:
      return DEFAULT_BRAND_ASSET_DIMENSIONS;
  }
}

// ─── Backwards-compatible exports ─────────────────────────
// For any code still importing the old constants
export const BRAND_ASSET_DIMENSIONS = DEFAULT_BRAND_ASSET_DIMENSIONS;
export const BRAND_ASSET_FIELD_MAPPING: FieldMapping[] = [
  { field: 'description', label: 'Description', type: 'text' },
];
