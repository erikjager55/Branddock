// ─── Brand Asset Exploration Config ─────────────────────────
// Frontend configuration for AI Exploration on Brand Assets.
// Slug-specific dimensions and field mappings.
// ────────────────────────────────────────────────────────────

import { Compass, Heart, Leaf, Globe, Lightbulb, Rocket, Target, FileText, BarChart2, Zap } from 'lucide-react';
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
    label: 'Impact op Mens',
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
    label: 'Impact op Milieu',
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
    label: 'Impact op Maatschappij',
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

// ─── Purpose Statement Dimensions ─────────────────────────

const PURPOSE_STATEMENT_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'why',
    label: 'Waarom — Bestaansrecht',
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
    label: 'Hoe — Unieke Aanpak',
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
    label: 'Impact — Gewenst Effect',
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
    label: 'Alignment — Organisatie & Uitvoering',
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

// ─── Field Mappings per Slug ──────────────────────────────

const SOCIAL_RELEVANCY_FIELD_MAPPING: FieldMapping[] = [
  { field: 'content', label: 'Beschrijving', type: 'text' },
  { field: 'frameworkData.pillars.mens.description', label: 'Mens — Beschrijving', type: 'text' },
  { field: 'frameworkData.pillars.milieu.description', label: 'Milieu — Beschrijving', type: 'text' },
  { field: 'frameworkData.pillars.maatschappij.description', label: 'Maatschappij — Beschrijving', type: 'text' },
];

const PURPOSE_STATEMENT_FIELD_MAPPING: FieldMapping[] = [
  { field: 'content.why', label: 'Waarom — Bestaansrecht', type: 'text' },
  { field: 'content.how', label: 'Hoe — Unieke Aanpak', type: 'text' },
  { field: 'content.impact', label: 'Impact — Gewenst Effect', type: 'text' },
];

const DEFAULT_FIELD_MAPPING: FieldMapping[] = [
  { field: 'content', label: 'Content', type: 'text' },
  { field: 'description', label: 'Beschrijving', type: 'text' },
];

// ─── Resolver Functions ───────────────────────────────────

export function getDimensionsForSlug(slug: string): DimensionConfig[] {
  switch (slug) {
    case 'social-relevancy':
      return SOCIAL_RELEVANCY_DIMENSIONS;
    case 'purpose-statement':
      return PURPOSE_STATEMENT_DIMENSIONS;
    default:
      return DEFAULT_BRAND_ASSET_DIMENSIONS;
  }
}

export function getFieldMappingForSlug(slug: string): FieldMapping[] {
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
