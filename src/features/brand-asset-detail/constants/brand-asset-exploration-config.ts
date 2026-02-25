// ─── Brand Asset Exploration Config ─────────────────────────
// Frontend configuration for AI Exploration on Brand Assets.
// Mirrors the server-side dimensions but includes UI-specific
// properties (icons as components, colors, etc.)

import { FileText, Users, TrendingUp, Zap } from 'lucide-react';
import type { DimensionConfig, FieldMapping } from '@/components/ai-exploration/types';

// ─── Dimensions ────────────────────────────────────────────

export const BRAND_ASSET_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'definition_clarity',
    label: 'Definition & Clarity',
    icon: FileText,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: [
      'What is the core meaning of this brand asset?',
      'How does it fit within your brand architecture?',
      'Is the definition clear enough for consistent use?',
      'What makes it distinct from similar concepts?',
    ],
  },
  {
    key: 'audience_relevance',
    label: 'Audience Relevance',
    icon: Users,
    color: 'pink',
    bgClass: 'bg-pink-100',
    textClass: 'text-pink-600',
    defaultQuestions: [
      'How does this asset resonate with your target audience?',
      'Can customers articulate what this means for them?',
      'Does it influence purchase decisions or brand loyalty?',
      'How do different segments perceive this asset?',
    ],
  },
  {
    key: 'competitive_differentiation',
    label: 'Competitive Differentiation',
    icon: TrendingUp,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: [
      'How does this asset differentiate from competitors?',
      'Is the positioning unique and defensible?',
      'What would competitors need to replicate it?',
      'Does it create a sustainable competitive advantage?',
    ],
  },
  {
    key: 'strategic_application',
    label: 'Strategic Application',
    icon: Zap,
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
    defaultQuestions: [
      'How is this asset currently applied across channels?',
      'Are there untapped opportunities for leverage?',
      'How does it integrate with other brand assets?',
      'What campaigns or content could amplify it?',
    ],
  },
];

// ─── Field Mapping ─────────────────────────────────────────

export const BRAND_ASSET_FIELD_MAPPING: FieldMapping[] = [
  { field: 'description', label: 'Description', type: 'text' },
];
