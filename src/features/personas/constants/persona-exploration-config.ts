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
      'Wat is de leeftijd, geslacht en locatie van deze persona?',
      'Wat is het opleidingsniveau en inkomensniveau?',
      'Wat is de gezinssituatie en levensfase?',
      'Wat is de functie of beroepsachtergrond?',
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
      'Wat zijn de kernwaarden van deze persona?',
      'Welk persoonlijkheidstype past het beste?',
      'Wat zijn de belangrijkste interesses en hobby\'s?',
      'Hoe zou je de levensstijl omschrijven?',
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
      'Wat zijn de professionele doelen van deze persona?',
      'Wat motiveert deze persona in het dagelijks leven?',
      'Wat zijn de grootste frustraties of pijnpunten?',
      'Welke triggers leiden tot aankoopbeslissingen?',
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
      'Hoe verzamelt deze persona informatie voor beslissingen?',
      'Welke kanalen en platformen gebruikt deze persona het meest?',
      'Hoe ziet een typisch beslissingsproces eruit?',
      'Wat zijn de belangrijkste besliscriteria?',
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
