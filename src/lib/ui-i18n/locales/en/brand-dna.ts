// Canonical (source-of-truth) English UI strings — `brand-dna` namespace.
// Render-edge catalog for the brand-DNA constant registries (archetypes,
// social relevancy, personality, brand story, mission & vision). The constant
// files stay the English source; render sites resolve these keys with a
// { defaultValue } fallback, so a missing key renders the English source.
const ns = {
  // ─── Archetypes (ARCHETYPES, keyed by id) ──────────────────
  archetypes: {
    innocent: { name: 'The Innocent', motto: 'Free to be you and me' },
    sage: { name: 'The Sage', motto: 'The truth will set you free' },
    explorer: { name: 'The Explorer', motto: 'You only get one life — make it count' },
    outlaw: { name: 'The Outlaw', motto: 'Rules are meant to be broken' },
    magician: { name: 'The Magician', motto: 'Anything can happen — I make things happen' },
    hero: { name: 'The Hero', motto: "Where there's a will, there's a way" },
    lover: { name: 'The Lover', motto: "You're the only one" },
    jester: { name: 'The Jester', motto: "If I can't dance, I don't want to be part of your revolution" },
    everyman: { name: 'The Everyman', motto: 'All people are created equal' },
    caregiver: { name: 'The Caregiver', motto: 'Love your neighbor as yourself' },
    ruler: { name: 'The Ruler', motto: "Power isn't everything — it's the only thing" },
    creator: { name: 'The Creator', motto: 'If it can be imagined, it can be created' },
  },

  // ─── Archetype quadrants (keyed by quadrant enum) ──────────
  quadrants: {
    freedom: 'Independence & Fulfillment',
    mastery: 'Risk & Mastery',
    belonging: 'Belonging & Enjoyment',
    stability: 'Stability & Control',
  },

  // ─── Positioning approaches (POSITIONING_OPTIONS, by value) ─
  positioning: {
    similarity: { label: 'Similarity', description: '"We are the same as you"' },
    aspiration: { label: 'Aspiration', description: '"We are who you aspire to be"' },
    guidance: { label: 'Guidance', description: '"We are your lighthouse"' },
    inspiration: { label: 'Inspiration', description: '"We inspire you to believe"' },
  },

  // ─── Social relevancy pillars (PILLAR_CONFIGS, by key) ─────
  pillars: {
    milieu: {
      label: 'Environment',
      subtitle: 'How large is your ecological footprint?',
      statements: [
        'We have implemented clear and verifiable environmental criteria in our procurement policy.',
        'We actively use our revenue to make a positive contribution to environmental improvement.',
        'We actively stimulate all forms of environment-improving activities within our organization (internally and externally).',
      ],
    },
    mens: {
      label: 'People',
      subtitle: 'Does your brand stimulate the wellbeing of individuals?',
      statements: [
        'We stimulate a positive lifestyle through the use of our products and services.',
        'We stimulate personal wellbeing through the use of our products and services.',
        'We stimulate a positive lifestyle and wellbeing for our employees.',
      ],
    },
    maatschappij: {
      label: 'Society',
      subtitle: 'Does your brand contribute to improving society?',
      statements: [
        'We stimulate positive interaction in society through the use of our products and services.',
        'We stimulate social harmony and cohesion through the use of our products and services.',
        'We stimulate positive interaction, social harmony and cohesion among employees within the organization.',
      ],
    },
  },

  // ─── Brand activism levels (ACTIVISM_LEVELS, by value) ─────
  activism: {
    Silent: { label: 'Silent', description: 'Acts but does not actively communicate' },
    Vocal: { label: 'Vocal', description: 'Openly communicates impact efforts' },
    Leader: { label: 'Leader', description: 'Sets industry standards for impact' },
    Activist: { label: 'Activist', description: 'Actively pushes for systemic change' },
  },

  // ─── Authenticity criteria (AUTHENTICITY_CRITERIA, by key) ─
  authenticity: {
    walkTheTalk: { label: 'Walk-the-Talk', question: 'Do we do what we say?' },
    transparency: { label: 'Transparency', question: 'Are we open about progress and failures?' },
    consistency: { label: 'Consistency', question: 'Is this integrated in all touchpoints?' },
    stakeholderTrust: { label: 'Stakeholder Trust', question: 'Do stakeholders believe our claims?' },
    measurability: { label: 'Measurability', question: 'Can our claims be independently verified?' },
    longTermCommitment: { label: 'Long-term Commitment', question: 'Is this core strategy or a campaign?' },
  },

  // ─── UN Sustainable Development Goals (UN_SDGS, by number) ──
  sdg: {
    '1': 'No Poverty',
    '2': 'Zero Hunger',
    '3': 'Good Health and Well-being',
    '4': 'Quality Education',
    '5': 'Gender Equality',
    '6': 'Clean Water and Sanitation',
    '7': 'Affordable and Clean Energy',
    '8': 'Decent Work and Economic Growth',
    '9': 'Industry, Innovation and Infrastructure',
    '10': 'Reduced Inequalities',
    '11': 'Sustainable Cities and Communities',
    '12': 'Responsible Consumption and Production',
    '13': 'Climate Action',
    '14': 'Life Below Water',
    '15': 'Life on Land',
    '16': 'Peace, Justice and Strong Institutions',
    '17': 'Partnerships for the Goals',
  },

  // ─── Score threshold labels (keyed by threshold color) ─────
  scoreThresholds: {
    red: 'Needs Attention',
    amber: 'Developing',
    emerald: 'Good',
    teal: 'Excellent',
  },

  // ─── Reference frameworks (REFERENCE_FRAMEWORKS, by slug) ───
  referenceFrameworks: {
    tripleBottomLine: {
      name: 'Triple Bottom Line',
      description: 'Organizations should measure success across three dimensions beyond financial profit.',
      keyPoints: [
        'People: Social equity, labor practices, community impact',
        'Planet: Environmental stewardship, resource conservation, pollution reduction',
        'Profit: Economic viability, sustainable business models',
      ],
    },
    bCorp: {
      name: 'B Corp Impact Assessment',
      description: 'Rigorous assessment of a company across 5 impact areas, scored on 200 points.',
      keyPoints: [
        '5 areas: Governance, Workers, Community, Environment, Customers',
        '80+ points required for certification',
        'Core principle: Outcomes over policies',
      ],
    },
    brandActivism: {
      name: 'Brand Activism Spectrum',
      description: 'Four levels of brand activism, from silent to systemic change agents.',
      keyPoints: [
        'Silent: Acts but does not actively communicate',
        'Vocal: Openly communicates impact efforts',
        'Leader: Sets industry standards for impact',
        'Activist: Actively pushes for systemic change',
      ],
    },
  },

  // ─── Aaker personality dimensions (AAKER_DIMENSIONS, by key) ─
  aaker: {
    sincerity: {
      label: 'Sincerity',
      description: 'Honest, warm, and genuine — brands that feel real and down-to-earth.',
      colorAssociation: 'Warm tones (orange, warm yellow), earth tones, soft greens — low saturation, warm hue',
      typographyAssociation: 'Rounded sans-serif, humanist typefaces — approachable, readable, friendly',
      imageryAssociation: 'Authentic, natural, candid photography — genuine human connection, everyday moments',
    },
    excitement: {
      label: 'Excitement',
      description: 'Daring, spirited, and imaginative — brands that bring energy and innovation.',
      colorAssociation: 'Red, bright orange, electric blue, vibrant colors — high saturation, high contrast',
      typographyAssociation: 'Display fonts, bold sans-serif, playful typefaces — dynamic, large, asymmetric',
      imageryAssociation: 'Action-oriented, dynamic, high-energy — movement, trending culture, bold visuals',
    },
    competence: {
      label: 'Competence',
      description: 'Reliable, intelligent, and successful — brands that deliver with expertise.',
      colorAssociation: 'Blue, navy, dark gray, professional neutrals — medium saturation, cool hue',
      typographyAssociation: 'Clean sans-serif, geometric typefaces — modern, efficient, neutral',
      imageryAssociation: 'Professional, structured, clean — capability demonstration, precision, data',
    },
    sophistication: {
      label: 'Sophistication',
      description: 'Elegant, charming, and refined — brands that exude class and exclusivity.',
      colorAssociation: 'Black, gold, deep purple, silver — low saturation or metallic, refined',
      typographyAssociation: 'Elegant serif, thin serif, script — refined, high contrast, classic',
      imageryAssociation: 'Minimalist, curated, artistic — refined aesthetics, ample white space, luxury details',
    },
    ruggedness: {
      label: 'Ruggedness',
      description: 'Tough, outdoorsy, and sturdy — brands built for adventure and resilience.',
      colorAssociation: 'Earth tones (brown, forest green, olive, rust) — low-medium saturation, dark value',
      typographyAssociation: 'Slab serif, bold serif, heavy weight — strong, sturdy, textured',
      imageryAssociation: 'Adventurous landscapes, gritty textures — nature, terrain, challenges, outdoor',
    },
  },

  // ─── Personality spectrum sliders (SPECTRUM_SLIDERS, by key) ─
  spectrum: {
    friendlyFormal: {
      leftLabel: 'Friendly / Approachable',
      rightLabel: 'Corporate / Formal',
      leftDescription: 'Casual, warm, conversational',
      rightDescription: 'Professional, structured, authoritative',
    },
    energeticThoughtful: {
      leftLabel: 'High-Energy / Enthusiastic',
      rightLabel: 'Thoughtful / Careful',
      leftDescription: 'Fast-paced, action-oriented, bold',
      rightDescription: 'Measured, deliberate, reflective',
    },
    modernTraditional: {
      leftLabel: 'Modern / Contemporary',
      rightLabel: 'Traditional / Classic',
      leftDescription: 'Forward-looking, progressive, new',
      rightDescription: 'Time-tested, heritage, established',
    },
    innovativeProven: {
      leftLabel: 'Cutting Edge / Innovative',
      rightLabel: 'Established / Proven',
      leftDescription: 'Disruptive, experimental, pioneering',
      rightDescription: 'Reliable, trusted, battle-tested',
    },
    playfulSerious: {
      leftLabel: 'Fun / Playful',
      rightLabel: 'Serious / Professional',
      leftDescription: 'Lighthearted, witty, entertaining',
      rightDescription: 'Focused, no-nonsense, business-like',
    },
    inclusiveExclusive: {
      leftLabel: 'Inclusive / Welcoming',
      rightLabel: 'Exclusive / Selective',
      leftDescription: 'Open to everyone, democratized, mass appeal',
      rightDescription: 'Curated, elite, limited access',
    },
    boldReserved: {
      leftLabel: 'Bold / Daring',
      rightLabel: 'Reserved / Understated',
      leftDescription: 'Loud, provocative, attention-grabbing',
      rightDescription: 'Quiet, subtle, lets quality speak',
    },
  },

  // ─── Narrative arc types (NARRATIVE_ARC_TYPES, by id) ───────
  narrativeArc: {
    'heros-journey': {
      label: "Hero's Journey",
      description: 'Classic hero-quest: call to adventure, trials, mentor, transformation, return. Best for brands that help customers overcome significant challenges.',
    },
    sparkline: {
      label: 'Sparkline',
      description: 'Oscillation between "What Is" (current reality) and "What Could Be" (desired future). Effective for change narratives and innovation brands.',
    },
    'rags-to-riches': {
      label: 'Rags to Riches',
      description: 'From humble beginnings to success. Powerful for startups and brands with an underdog origin story.',
    },
    'overcoming-the-monster': {
      label: 'Overcoming the Monster',
      description: 'Defeating a great enemy or systemic challenge. Ideal for disruptors and brands that challenge the status quo.',
    },
    quest: {
      label: 'Quest',
      description: 'A group on a journey toward a shared goal. Perfect for community-driven and purpose-led brands.',
    },
  },

  // ─── Brand role options (BRAND_ROLE_OPTIONS, by id) ────────
  brandRole: {
    guide: {
      label: 'Guide',
      description: 'Wise mentor who shows the way — think Yoda or Gandalf. The most common and powerful brand position.',
    },
    mentor: {
      label: 'Mentor',
      description: 'Experienced teacher who transfers knowledge and builds capability in the customer.',
    },
    enabler: {
      label: 'Enabler',
      description: "Provides the tools, platform, or resources that unlock the customer's own potential.",
    },
    partner: {
      label: 'Partner',
      description: 'Walks alongside the customer as an equal — shared journey, shared success.',
    },
  },

  // ─── Storytelling frameworks (STORYTELLING_FRAMEWORKS, by id) ─
  storyFrameworks: {
    storybrand: {
      name: 'StoryBrand SB7',
      principle: 'The customer is the hero, not the brand',
      elements: [
        'Character (customer with a desire)',
        'Problem (external + internal + philosophical)',
        'Guide (brand with empathy + authority)',
      ],
    },
    abt: {
      name: 'ABT Framework',
      principle: 'And/But/Therefore — the simplest three-act story structure',
      elements: [
        'AND — context and setup',
        'BUT — the problem or tension',
        "THEREFORE — the brand's role and resolution",
      ],
    },
    'heros-journey': {
      name: "Hero's Journey",
      principle: 'The customer undergoes a transformative journey with the brand as mentor',
      elements: [
        'Ordinary World → Call to Adventure',
        'Trials & Challenges',
        'Meeting the Mentor (brand)',
      ],
    },
    sparkline: {
      name: 'Sparkline',
      principle: 'Oscillation between "What Is" and "What Could Be" creates emotional investment',
      elements: [
        'What Is — the current, unsatisfying reality',
        'What Could Be — the compelling future',
        'Repeated contrast builds tension',
      ],
    },
    merit: {
      name: 'MERIT Framework',
      principle: 'Great brand stories score high on five qualities',
      elements: [
        'Memorable — sticks in the mind',
        'Emotional — triggers feeling',
        'Relatable — audience sees themselves',
      ],
    },
  },

  // ─── Vision time horizons (TIME_HORIZON_OPTIONS, by value) ──
  timeHorizon: {
    '3 years': { label: '3 Years', description: 'Short-term, operationally focused' },
    '5 years': { label: '5 Years', description: 'Mid-range strategic planning horizon' },
    '10 years': { label: '10 Years', description: 'Long-term transformative vision' },
    '15+ years': { label: '15+ Years', description: 'Generational, legacy-defining ambition' },
    Aspirational: { label: 'Aspirational', description: 'Timeless north star without a fixed deadline' },
  },

  // ─── Mission examples (MISSION_EXAMPLES, by brand) ─────────
  missionExamples: {
    Tesla: {
      statement: "To accelerate the world's transition to sustainable energy.",
      analysis: 'Action-oriented, measurable, beyond profit',
    },
    Patagonia: {
      statement: "We're in business to save our home planet.",
      analysis: 'Bold, emotional, fits on a T-shirt',
    },
    TED: {
      statement: 'Spread ideas.',
      analysis: 'Two words, crystal clear, infinitely scalable',
    },
    IKEA: {
      statement: 'To create a better everyday life for the many people.',
      analysis: 'Inclusive, tangible benefit, democratic values',
    },
    Google: {
      statement: "To organize the world's information and make it universally accessible.",
      analysis: 'Specific yet vast, clear mechanism',
    },
  },

  // ─── Vision examples (VISION_EXAMPLES, by brand) ───────────
  visionExamples: {
    Nike: {
      statement: 'Bring inspiration and innovation to every athlete in the world.',
      analysis: 'Aspirational, inclusive ("if you have a body, you\'re an athlete")',
    },
    Microsoft: {
      statement: 'Empower every person and every organization on the planet to achieve more.',
      analysis: 'Universal, empowering, technology-agnostic',
    },
    SpaceX: {
      statement: 'Making life multi-planetary.',
      analysis: 'Audacious BHAG, vivid future state',
    },
    Oxfam: {
      statement: 'A just world without poverty.',
      analysis: 'Concise, value-driven, clear end state',
    },
    "Alzheimer's Association": {
      statement: "A world without Alzheimer's and all other dementia.",
      analysis: 'Definitive endpoint, emotionally resonant',
    },
  },
} as const;

export default ns;
