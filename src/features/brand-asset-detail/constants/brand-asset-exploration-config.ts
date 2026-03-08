// ─── Brand Asset Exploration Config ─────────────────────────
// Frontend configuration for AI Exploration on Brand Assets.
// Slug-specific dimensions for progress bar UI.
// Field mappings are now dynamic (generated from frameworkData on the backend).
// ────────────────────────────────────────────────────────────

import {
  Compass, Heart, Leaf, Globe, Rocket, Target, FileText, BarChart2, Zap, Cog,
  Package, Fingerprint, Sparkles, Shield, ShieldCheck, CheckCircle, AlertTriangle, TrendingUp, Users, Eye,
  Mountain, Map, Crown, Activity, Moon, BookOpen, Award, User, MessageCircle, AlertCircle, Star,
  ArrowRight, Scale, Building, Palette,
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

// ─── Purpose Statement Dimensions (IDEO Purpose Wheel — 5 phases) ──

const PURPOSE_STATEMENT_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'origin_belief',
    label: 'Origin & Belief',
    icon: BookOpen,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: [
      'Why was your organization founded?',
      'What fundamental belief drove that decision?',
      'What problem were you trying to solve?',
    ],
  },
  {
    key: 'impact_exploration',
    label: 'Impact Exploration',
    icon: Zap,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: [
      'Describe a moment when your organization was at its best.',
      'What happened, and why was that special?',
      'How does your brand create impact in the world?',
    ],
  },
  {
    key: 'mechanism',
    label: 'Mechanism & Approach',
    icon: Cog,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: [
      'Through what unique mechanism do you deliver your impact?',
      'What do you do differently from the rest?',
      'Why is your approach effective?',
    ],
  },
  {
    key: 'pressure_test',
    label: 'Pressure Test',
    icon: Shield,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: [
      'What would the world lose if your organization ceased to exist?',
      'What gap would remain that nobody else can fill?',
    ],
  },
  {
    key: 'articulation',
    label: 'Articulation & Formulation',
    icon: Target,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: [
      'How would you summarize your purpose in one powerful sentence?',
      'Is it clear, emotional, and actionable?',
    ],
  },
];

// PURPOSE_WHEEL and purpose-statement share the same 5-phase IDEO dimensions.
// This alias ensures getDimensionsForSlug returns the correct config for both paths.
const PURPOSE_WHEEL_DIMENSIONS = PURPOSE_STATEMENT_DIMENSIONS;

// ─── Golden Circle Dimensions (Simon Sinek — 5 phases) ──

const GOLDEN_CIRCLE_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'origin_story',
    label: 'Origin & Drive',
    icon: BookOpen,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['Tell me the story of your organization.', 'What moment or belief was the spark?'],
  },
  {
    key: 'why_deepdive',
    label: 'WHY — Core Belief',
    icon: Heart,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: ['If you strip away all products and services, what remains?', 'What do you fundamentally believe?'],
  },
  {
    key: 'how_differentiation',
    label: 'HOW — Differentiating Approach',
    icon: Compass,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: ['What principles, values, or methods make your approach different?', 'What are your guiding principles?'],
  },
  {
    key: 'what_proof',
    label: 'WHAT — Proof & Offering',
    icon: Package,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: ['Which products or services prove your WHY?', 'How do you truly live up to your belief?'],
  },
  {
    key: 'inside_out_test',
    label: 'Inside-Out Test',
    icon: Target,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: ['Would customers guess your WHY based solely on your products?', 'How coherent is WHY→HOW→WHAT?'],
  },
];

// ─── Brand Essence Dimensions (Brand Essence Wheel — 6 phases) ──

const BRAND_ESSENCE_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'brand_dna',
    label: 'Brand DNA',
    icon: Fingerprint,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: ['If your brand were a person in a room full of competitors, what would make people gravitate toward them? What is the single most defining characteristic?'],
  },
  {
    key: 'value_landscape',
    label: 'Value Landscape',
    icon: Heart,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: ['Describe the best experience a customer has with your brand. What tangible result do they get, what feeling does it create, and how does it let them express who they are?'],
  },
  {
    key: 'audience_truth',
    label: 'Audience Truth',
    icon: Users,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: ['What is the underlying tension, frustration, or deep desire your audience carries — the thing they might not say out loud but your brand uniquely addresses?'],
  },
  {
    key: 'evidence_heritage',
    label: 'Evidence & Heritage',
    icon: Shield,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['What concrete facts, achievements, or moments from your brand\'s history prove that your essence is real — not aspirational, but lived?'],
  },
  {
    key: 'differentiation',
    label: 'Differentiation',
    icon: Target,
    color: 'violet',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-600',
    defaultQuestions: ['Complete this sentence: "Only [your brand] can _____ because _____." What is the single most compelling reason to choose your brand?'],
  },
  {
    key: 'essence_distillation',
    label: 'Essence Distillation',
    icon: Sparkles,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: ['Based on everything we discussed, distill your brand into 3 words: adjective, adjective, noun. What would that be, and why those words?'],
  },
];

// ─── Brand Promise Dimensions (Keller/Aaker/Neumeier — 5 phases) ──

const BRAND_PROMISE_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'promise_core',
    label: 'Promise Core',
    icon: Shield,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: [
      'What is the one promise your brand makes to every customer, every time — the commitment they can always count on?',
      'Can you distill that into a single sentence that could serve as a tagline?',
    ],
  },
  {
    key: 'value_layers',
    label: 'Value Layers',
    icon: Heart,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: [
      'Describe the best experience a customer has when you deliver on your promise. What tangible result do they get, what feeling does it create, and how does it let them express who they are?',
    ],
  },
  {
    key: 'audience_need',
    label: 'Audience & Need',
    icon: Users,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: [
      'Who is your promise for, and what deeper need does it address — the thing your audience might not say out loud but your brand uniquely solves?',
    ],
  },
  {
    key: 'onlyness',
    label: 'Onlyness & Differentiation',
    icon: Target,
    color: 'violet',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-600',
    defaultQuestions: [
      'Complete this sentence: "Only [your brand] can _____ because _____." What makes your promise impossible to replicate?',
    ],
  },
  {
    key: 'evidence',
    label: 'Evidence & Outcomes',
    icon: ShieldCheck,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: [
      'What concrete proof exists that you deliver on your promise? Name 3-5 specific facts, metrics, or customer outcomes that demonstrate it.',
    ],
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

// ─── Brand Archetype Dimensions (Jung / Mark & Pearson — 7 phases) ──

const BRAND_ARCHETYPE_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'archetype_discovery',
    label: 'Archetype Discovery',
    icon: Crown,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: [
      'If your brand were a character in a story, what role would it play? The hero who overcomes? The wise guide? The rebel who challenges the status quo?',
      'Think about the brands you admire most — what archetype do they embody, and how does yours differ?',
    ],
  },
  {
    key: 'core_psychology',
    label: 'Core Psychology',
    icon: Heart,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: [
      'What is the deepest desire your brand fulfills for customers — and what fear does it help them overcome?',
      'What unique gift or talent does your brand bring to the world?',
    ],
  },
  {
    key: 'shadow_risks',
    label: 'Shadow & Risks',
    icon: Moon,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: [
      'Every archetype has a shadow side — when taken too far, its strengths become weaknesses. What does that look like for your brand?',
      'How do you guard against falling into those negative patterns?',
    ],
  },
  {
    key: 'voice_messaging',
    label: 'Voice & Messaging',
    icon: MessageCircle,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: [
      'How does your archetype translate into the way your brand communicates? What words do you use — and what words would never fit?',
      'Give me a "We say / Not that" example for your brand.',
    ],
  },
  {
    key: 'visual_expression',
    label: 'Visual Expression',
    icon: Palette,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: [
      'If you were to express your archetype visually — colors, typography, imagery — what direction feels right?',
      'What visual motifs or symbols resonate with your archetype?',
    ],
  },
  {
    key: 'archetype_in_action',
    label: 'Archetype in Action',
    icon: Activity,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: [
      'How does your archetype come alive in marketing campaigns, customer experience, and content strategy?',
      'Describe a specific moment where your archetype was clearly visible to customers.',
    ],
  },
  {
    key: 'competitive_positioning',
    label: 'Competitive Positioning',
    icon: Target,
    color: 'violet',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-600',
    defaultQuestions: [
      'Which brands in your industry share a similar archetype? How do you differentiate within that archetype territory?',
      'What positioning approach works best — similarity, aspiration, guidance, or inspiration?',
    ],
  },
];

// ─── Transformative Goals Dimensions (MTP / BHAG / Moonshot — 7 phases) ──

const TRANSFORMATIVE_GOALS_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'origin_belief',
    label: 'MTP Foundation',
    icon: Sparkles,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['What massive, audacious change does your brand want to see in the world?'],
  },
  {
    key: 'future_vision',
    label: 'Future Vision',
    icon: Eye,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: ['If your brand\u2019s mission succeeds completely, what does the world look like in 10-15 years?'],
  },
  {
    key: 'impact_scope',
    label: 'Impact Scope',
    icon: Globe,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: ['Which impact domains are most relevant? People, Planet, or Prosperity?'],
  },
  {
    key: 'measurable_commitment',
    label: 'Measurable Commitments',
    icon: Target,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: ['What concrete, time-bound commitments can you make?'],
  },
  {
    key: 'theory_of_change',
    label: 'Theory of Change',
    icon: Map,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: ['How does your daily activity lead to the transformative impact you described?'],
  },
  {
    key: 'authenticity_alignment',
    label: 'Authenticity Alignment',
    icon: Shield,
    color: 'violet',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-600',
    defaultQuestions: ['How authentic are these goals given your current operations and history?'],
  },
  {
    key: 'activation_strategy',
    label: 'Activation Strategy',
    icon: Rocket,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: ['How will these goals be integrated into strategy, communication, and culture?'],
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
