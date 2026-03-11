// ─── Brand Asset Exploration Config ─────────────────────────
// Frontend configuration for AI Exploration on Brand Assets.
// Slug-specific dimensions for progress bar UI.
// Field mappings are now dynamic (generated from frameworkData on the backend).
// ────────────────────────────────────────────────────────────

import {
  Compass, Heart, Leaf, Globe, Rocket, Target, FileText, BarChart2, Zap, Cog,
  Package, Fingerprint, Sparkles, Shield, ShieldCheck, CheckCircle, AlertTriangle, TrendingUp, Users, Eye,
  Mountain, Map, Crown, Activity, Moon, BookOpen, Award, User, MessageCircle, AlertCircle, Star,
  ArrowRight, Scale, Building, Palette, Sliders, List, Anchor, Flame,
} from 'lucide-react';
import type { DimensionConfig, FieldMapping } from '@/components/ai-exploration/types';

// ─── Social Relevancy Dimensions ──────────────────────────

const SOCIAL_RELEVANCY_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'impact_foundation',
    label: 'Impact Foundation',
    icon: Sparkles,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: [
      'Why does your brand care about social impact? Tell me the story behind your commitment — was there a triggering moment, a founding belief, or an evolving realization?',
    ],
  },
  {
    key: 'milieu_assessment',
    label: 'Environmental Impact',
    icon: Leaf,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: [
      'How are sustainability criteria embedded in your procurement? How do you invest revenue in environmental improvement? How do you stimulate environment-improving activities? Be specific about evidence and outcomes.',
    ],
  },
  {
    key: 'mens_assessment',
    label: 'Impact on People',
    icon: Heart,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: [
      'How do your products and services contribute to personal wellbeing and a positive lifestyle? Think about both your customers and your employees separately. Where is your impact strongest, and where do you see room for improvement?',
    ],
  },
  {
    key: 'maatschappij_assessment',
    label: 'Impact on Society',
    icon: Globe,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: [
      'How does your brand contribute to positive societal interaction, social harmony, and cohesion? Consider the impact through your products on society, and the impact within your organization on employees.',
    ],
  },
  {
    key: 'authenticity_test',
    label: 'Authenticity Test',
    icon: ShieldCheck,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: [
      'Every brand talks about impact — do you walk the talk? Where is alignment between words and actions strongest? Where are the gaps? What would a critical journalist or skeptical consumer say about your claims?',
    ],
  },
  {
    key: 'evidence_proof',
    label: 'Evidence & Proof',
    icon: Award,
    color: 'indigo',
    bgClass: 'bg-indigo-100',
    textClass: 'text-indigo-600',
    defaultQuestions: [
      'What concrete evidence makes your social impact credible? Think about certifications, measurable outcomes, independent validations, and specific initiatives where your values were proven through action.',
    ],
  },
  {
    key: 'activation_communication',
    label: 'Activation & Communication',
    icon: TrendingUp,
    color: 'violet',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-600',
    defaultQuestions: [
      'How do you communicate your social impact without greenwashing? Which UN SDGs align most closely (pick max 3)? What is your concrete annual commitment? Who benefits most from your impact?',
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

// ─── Mission & Vision Dimensions (Collins & Porras / Drucker — 8 phases) ────

const MISSION_VISION_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'mission_core',
    label: 'Mission Core',
    icon: Compass,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: [
      'What is the fundamental reason your organization exists — beyond making money?',
      'If you had to explain your mission to a child in one sentence, what would you say?',
    ],
  },
  {
    key: 'audience_impact',
    label: 'Audience & Impact',
    icon: Users,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: [
      'Who are the people your organization serves, and what specific change do you create in their lives?',
      'Describe both the primary audience and the tangible outcome they experience.',
    ],
  },
  {
    key: 'unique_approach',
    label: 'Unique Approach',
    icon: Rocket,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: [
      'What makes your approach fundamentally different from others trying to achieve a similar mission?',
      'Describe your method, philosophy, or "secret ingredient" that competitors cannot easily replicate.',
    ],
  },
  {
    key: 'mission_authenticity',
    label: 'Mission Authenticity',
    icon: Shield,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: [
      'How does your current daily work reflect your stated mission?',
      'Where is the alignment strongest, and where are the biggest gaps between what you say and what you do?',
    ],
  },
  {
    key: 'future_vision',
    label: 'Future Vision',
    icon: Eye,
    color: 'violet',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-600',
    defaultQuestions: [
      'Close your eyes and imagine your organization has fully succeeded — 10 years from now. What does the world look like?',
      'Paint a vivid, concrete picture of this future state.',
    ],
  },
  {
    key: 'bold_aspiration',
    label: 'Scale of Ambition',
    icon: Mountain,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: [
      'What is the boldest, most audacious goal your organization could set — one that makes you slightly uncomfortable because of its scale?',
      'What would you attempt if you knew you could not fail?',
    ],
  },
  {
    key: 'success_signals',
    label: 'Success Signals',
    icon: BarChart2,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: [
      'How would you know your vision is becoming reality?',
      'What are the 3-5 concrete, measurable indicators you would track?',
    ],
  },
  {
    key: 'mission_vision_bridge',
    label: 'Mission-Vision Bridge',
    icon: Map,
    color: 'indigo',
    bgClass: 'bg-indigo-100',
    textClass: 'text-indigo-600',
    defaultQuestions: [
      'Your mission describes what you do today; your vision describes where you are going. What is the creative tension between these two?',
      'What key milestones or transformations need to happen to bridge the gap?',
    ],
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
      'Tell me about your brand\'s personality. What emotions do you want to evoke? What role does your brand play in customers\' lives?',
      'If your brand were a character in a story — the hero, the wise guide, the rebel, the caregiver — what feels most natural?',
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
      'What deep desire does your brand fulfill for customers? What fear or problem does it help them overcome?',
      'What unique gift or talent does your brand bring to the world?',
    ],
  },
  {
    key: 'shadow_risks',
    label: 'Shadow & Guardrails',
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
    key: 'dimension_mapping',
    label: 'Personality Dimensions',
    icon: User,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: [
      'If your brand walked into a room, what impression would it make? Describe its character in terms of: sincerity, excitement, competence, sophistication, and ruggedness.',
      'Which 1-2 of these dimensions feel most dominant for your brand?',
    ],
  },
  {
    key: 'core_traits',
    label: 'Core Traits',
    icon: Fingerprint,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: [
      'Name 3-5 defining personality traits for your brand. For each, give a concrete example of what the trait looks like in action.',
      'For each trait, what would be the "too far" version that your brand should never become?',
    ],
  },
  {
    key: 'spectrum_positioning',
    label: 'Personality Spectrum',
    icon: Sliders,
    color: 'indigo',
    bgClass: 'bg-indigo-100',
    textClass: 'text-indigo-600',
    defaultQuestions: [
      'Where does your brand sit on these spectrums: friendly vs. formal, energetic vs. thoughtful, modern vs. traditional, playful vs. serious, inclusive vs. exclusive, bold vs. reserved?',
    ],
  },
  {
    key: 'voice_tone',
    label: 'Voice & Tone',
    icon: MessageCircle,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: [
      'Describe how your brand sounds in writing and speech. Is it formal or casual? Serious or humorous? Respectful or irreverent? Matter-of-fact or enthusiastic?',
      'What specific words or phrases does your brand love to use — and which would it never use?',
    ],
  },
  {
    key: 'writing_sample',
    label: 'Voice in Action',
    icon: Award,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: [
      'Write a short paragraph (3-4 sentences) in your brand\'s voice. This could be a product description, email opening, or social media post.',
    ],
  },
  {
    key: 'channel_adaptation',
    label: 'Channel Adaptation',
    icon: MessageCircle,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: [
      'How does your brand\'s tone shift across different channels — website, social media, customer support, email marketing, and crisis communication? The voice stays the same, but the tone adapts.',
    ],
  },
  {
    key: 'visual_expression',
    label: 'Visual Personality',
    icon: Palette,
    color: 'violet',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-600',
    defaultQuestions: [
      'How should your brand personality translate into visual design? Think about color feeling, typography style, and imagery direction.',
    ],
  },
];

// ─── Brand Story Dimensions ──────────────────────────────

const BRAND_STORY_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'origin_belief',
    label: 'Origin & Belief',
    icon: BookOpen,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['How did your brand come into being?', 'What conviction or moment made you say: this has to exist?'],
  },
  {
    key: 'world_problem',
    label: 'World & Problem',
    icon: Eye,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: ['What problem does your brand solve on three levels: practical, emotional, and philosophical?'],
  },
  {
    key: 'brand_as_guide',
    label: 'Brand as Guide',
    icon: Compass,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: ['How does your brand show empathy and authority as the customer\'s guide?'],
  },
  {
    key: 'transformation',
    label: 'Transformation',
    icon: Sparkles,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: ['What transformation does the customer experience? Paint the before and after.'],
  },
  {
    key: 'narrative_craft',
    label: 'Narrative Craft',
    icon: MessageCircle,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: ['Distill your brand story using And/But/Therefore. What themes does your brand own?'],
  },
  {
    key: 'evidence_proof',
    label: 'Evidence & Proof',
    icon: Award,
    color: 'indigo',
    bgClass: 'bg-indigo-100',
    textClass: 'text-indigo-600',
    defaultQuestions: ['What concrete evidence makes your story credible? Customer successes, milestones, values in action?'],
  },
  {
    key: 'story_expression',
    label: 'Story Expressions',
    icon: FileText,
    color: 'violet',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-600',
    defaultQuestions: ['Draft your 30-second elevator pitch and your emotional brand manifesto.'],
  },
];

// ─── Brandhouse Values Dimensions ────────────────────────

const BRANDHOUSE_VALUES_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'value_inventory',
    label: 'Value Inventory',
    icon: List,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: ['What words come up when you ask your team "what do we stand for"?'],
  },
  {
    key: 'roots_foundation',
    label: 'Roots — Foundation',
    icon: Anchor,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
    defaultQuestions: ['Which values are already embedded in your DNA — proven through daily actions?'],
  },
  {
    key: 'wings_direction',
    label: 'Wings — Direction',
    icon: Compass,
    color: 'violet',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-600',
    defaultQuestions: ['Which values give direction to the movement your brand wants to make?'],
  },
  {
    key: 'fire_distinction',
    label: 'Fire — Distinction',
    icon: Flame,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: ['What is the one value that most distinctively describes how your organization does things?'],
  },
  {
    key: 'validation_test',
    label: 'Validation & Selection',
    icon: ShieldCheck,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: ['Is each value truly distinguishing, or just a prerequisite? Does everyone agree?'],
  },
  {
    key: 'tension_balance',
    label: 'Value Tension',
    icon: Scale,
    color: 'rose',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
    defaultQuestions: ['How do your roots, wings, and fire create productive tension?'],
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
      case 'MISSION_STATEMENT': return MISSION_VISION_DIMENSIONS;
      case 'BRAND_ARCHETYPE': return BRAND_ARCHETYPE_DIMENSIONS;
      case 'TRANSFORMATIVE_GOALS': return TRANSFORMATIVE_GOALS_DIMENSIONS;
      case 'BRAND_PERSONALITY': return BRAND_PERSONALITY_DIMENSIONS;
      case 'BRAND_STORY': return BRAND_STORY_DIMENSIONS;
      case 'BRANDHOUSE_VALUES': return BRANDHOUSE_VALUES_DIMENSIONS;
      case 'ESG': return SOCIAL_RELEVANCY_DIMENSIONS;
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
