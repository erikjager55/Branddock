// ─── Brand Asset Exploration Config ─────────────────────────
// Frontend configuration for AI Exploration on Brand Assets.
// Slug-specific dimensions for progress bar UI.
// Field mappings are now dynamic (generated from frameworkData on the backend).
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

// ─── Backwards-compatible exports ─────────────────────────
// For any code still importing the old constants
export const BRAND_ASSET_DIMENSIONS = DEFAULT_BRAND_ASSET_DIMENSIONS;
export const BRAND_ASSET_FIELD_MAPPING: FieldMapping[] = [
  { field: 'description', label: 'Description', type: 'text' },
];
