// ─── Persona Exploration Config ─────────────────────────────
// Configuration for AI Exploration when used as validation method
// for Persona items. Defines dimensions, questions, and field mappings.

import { Target, Heart, Zap, Brain } from 'lucide-react';
import type { DimensionConfig, FieldMapping } from '@/components/ai-exploration/types';

// ─── Dimensions ────────────────────────────────────────────

export const PERSONA_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'demographics',
    label: 'Demographics & Background',
    icon: Target,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
    defaultQuestions: [
      'What is the age, gender, and location of this persona?',
      'What is the education level and income level?',
      'What is the family situation and life stage?',
      'What is the job title or professional background?',
    ],
  },
  {
    key: 'psychographics',
    label: 'Psychographics & Values',
    icon: Heart,
    color: 'pink',
    bgClass: 'bg-pink-100',
    textClass: 'text-pink-600',
    defaultQuestions: [
      'What are the core values of this persona?',
      'Which personality type fits best?',
      'What are the main interests and hobbies?',
      'How would you describe the lifestyle?',
    ],
  },
  {
    key: 'goals_motivations',
    label: 'Goals & Motivations',
    icon: Zap,
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
    defaultQuestions: [
      'What are the professional goals of this persona?',
      'What motivates this persona in daily life?',
      'What are the biggest frustrations or pain points?',
      'Which triggers lead to purchase decisions?',
    ],
  },
  {
    key: 'behaviors',
    label: 'Behaviors & Decision Making',
    icon: Brain,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-600',
    defaultQuestions: [
      'How does this persona gather information for decisions?',
      'Which channels and platforms does this persona use most?',
      'What does a typical decision-making process look like?',
      'What are the most important decision criteria?',
    ],
  },
];

// ─── Field Mappings ────────────────────────────────────────

export const PERSONA_FIELD_MAPPING: FieldMapping[] = [
  // Demographics
  { field: 'tagline', label: 'Tagline', type: 'string' },
  { field: 'age', label: 'Age', type: 'string' },
  { field: 'gender', label: 'Gender', type: 'string' },
  { field: 'location', label: 'Location', type: 'string' },
  { field: 'occupation', label: 'Occupation', type: 'string' },
  { field: 'education', label: 'Education', type: 'string' },
  { field: 'income', label: 'Income', type: 'string' },
  { field: 'familyStatus', label: 'Family Status', type: 'string' },

  // Psychographics
  { field: 'personalityType', label: 'Personality Type', type: 'string' },
  { field: 'coreValues', label: 'Core Values', type: 'string[]' },
  { field: 'interests', label: 'Interests', type: 'string[]' },

  // Goals & Motivations
  { field: 'goals', label: 'Goals', type: 'string[]' },
  { field: 'motivations', label: 'Motivations', type: 'string[]' },
  { field: 'frustrations', label: 'Frustrations', type: 'string[]' },
  { field: 'buyingTriggers', label: 'Buying Triggers', type: 'string[]' },

  // Behaviors
  { field: 'behaviors', label: 'Behaviors', type: 'string[]' },
  { field: 'preferredChannels', label: 'Preferred Channels', type: 'string[]' },
  { field: 'decisionCriteria', label: 'Decision Criteria', type: 'string[]' },

  // Content
  { field: 'bio', label: 'Bio', type: 'text' },
  { field: 'quote', label: 'Quote', type: 'string' },
  { field: 'strategicImplications', label: 'Strategic Implications', type: 'text' },
];
