/**
 * Brand Story reference data — storytelling frameworks, narrative arc types,
 * emotional territory suggestions, and brand role options.
 *
 * Based on: StoryBrand SB7 (Donald Miller), Hero's Journey (Campbell),
 * ABT (Park Howell), Sparkline (Nancy Duarte), MERIT (Jonah Sachs),
 * 6 Story Types (Annette Simmons), Seth Godin's authenticity model.
 */

// ─── Narrative Arc Types ────────────────────────────────────

export interface NarrativeArcType {
  id: string;
  label: string;
  description: string;
}

export const NARRATIVE_ARC_TYPES: NarrativeArcType[] = [
  {
    id: 'heros-journey',
    label: "Hero's Journey",
    description: 'Classic hero-quest: call to adventure, trials, mentor, transformation, return. Best for brands that help customers overcome significant challenges.',
  },
  {
    id: 'sparkline',
    label: 'Sparkline',
    description: 'Oscillation between "What Is" (current reality) and "What Could Be" (desired future). Effective for change narratives and innovation brands.',
  },
  {
    id: 'rags-to-riches',
    label: 'Rags to Riches',
    description: 'From humble beginnings to success. Powerful for startups and brands with an underdog origin story.',
  },
  {
    id: 'overcoming-the-monster',
    label: 'Overcoming the Monster',
    description: 'Defeating a great enemy or systemic challenge. Ideal for disruptors and brands that challenge the status quo.',
  },
  {
    id: 'quest',
    label: 'Quest',
    description: 'A group on a journey toward a shared goal. Perfect for community-driven and purpose-led brands.',
  },
];

// ─── Emotional Territory Suggestions ────────────────────────

export const EMOTIONAL_TERRITORY_SUGGESTIONS: string[] = [
  'Hope',
  'Empowerment',
  'Belonging',
  'Excitement',
  'Trust',
  'Courage',
  'Wonder',
  'Relief',
  'Pride',
  'Confidence',
  'Joy',
  'Security',
  'Freedom',
  'Inspiration',
];

// ─── Brand Role Options ─────────────────────────────────────

export interface BrandRoleOption {
  id: string;
  label: string;
  description: string;
}

export const BRAND_ROLE_OPTIONS: BrandRoleOption[] = [
  {
    id: 'guide',
    label: 'Guide',
    description: 'Wise mentor who shows the way — think Yoda or Gandalf. The most common and powerful brand position.',
  },
  {
    id: 'mentor',
    label: 'Mentor',
    description: 'Experienced teacher who transfers knowledge and builds capability in the customer.',
  },
  {
    id: 'enabler',
    label: 'Enabler',
    description: 'Provides the tools, platform, or resources that unlock the customer\'s own potential.',
  },
  {
    id: 'partner',
    label: 'Partner',
    description: 'Walks alongside the customer as an equal — shared journey, shared success.',
  },
];

// ─── Storytelling Framework Reference Data ──────────────────

export interface StorytellingFramework {
  id: string;
  name: string;
  author: string;
  principle: string;
  elements: string[];
  application: string;
}

export const STORYTELLING_FRAMEWORKS: StorytellingFramework[] = [
  {
    id: 'storybrand',
    name: 'StoryBrand SB7',
    author: 'Donald Miller',
    principle: 'The customer is the hero, not the brand',
    elements: [
      'Character (customer with a desire)',
      'Problem (external + internal + philosophical)',
      'Guide (brand with empathy + authority)',
      'Plan (clear steps)',
      'Call to Action',
      'Failure (stakes of inaction)',
      'Success (transformed life)',
    ],
    application: 'Website messaging, sales scripts, marketing copy',
  },
  {
    id: 'abt',
    name: 'ABT Framework',
    author: 'Park Howell (via Randy Olson)',
    principle: 'And/But/Therefore — the simplest three-act story structure',
    elements: [
      'AND — context and setup',
      'BUT — the problem or tension',
      'THEREFORE — the brand\'s role and resolution',
    ],
    application: 'Elevator pitches, executive summaries, campaign briefs',
  },
  {
    id: 'heros-journey',
    name: "Hero's Journey",
    author: 'Joseph Campbell (applied by Jonah Sachs)',
    principle: 'The customer undergoes a transformative journey with the brand as mentor',
    elements: [
      'Ordinary World → Call to Adventure',
      'Trials & Challenges',
      'Meeting the Mentor (brand)',
      'Transformation',
      'Return with the Elixir',
    ],
    application: 'Long-form brand narratives, video campaigns, brand films',
  },
  {
    id: 'sparkline',
    name: 'Sparkline',
    author: 'Nancy Duarte',
    principle: 'Oscillation between "What Is" and "What Could Be" creates emotional investment',
    elements: [
      'What Is — the current, unsatisfying reality',
      'What Could Be — the compelling future',
      'Repeated contrast builds tension',
      'New Bliss — the resolution',
    ],
    application: 'Keynotes, brand manifestos, change communications',
  },
  {
    id: 'merit',
    name: 'MERIT Framework',
    author: 'Jonah Sachs',
    principle: 'Great brand stories score high on five qualities',
    elements: [
      'Memorable — sticks in the mind',
      'Emotional — triggers feeling',
      'Relatable — audience sees themselves',
      'Immersive — draws you in',
      'Tangible — concrete, not abstract',
    ],
    application: 'Story quality assessment, content review checklist',
  },
];
