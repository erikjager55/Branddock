/**
 * Brand Personality reference data based on Jennifer Aaker's Brand Personality
 * Framework (1997) — 5 dimensions, 15 facets, 42 traits.
 *
 * Extended with NN/g's tone-of-voice dimensions, personality spectrum sliders,
 * and visual expression guidance per dimension.
 */

// ─── Aaker 5 Dimensions ────────────────────────────────────

export interface AakerDimension {
  key: string;
  label: string;
  description: string;
  facets: { name: string; traits: string[] }[];
  brandExamples: string[];
  colorAssociation: string;
  typographyAssociation: string;
  imageryAssociation: string;
}

export const AAKER_DIMENSIONS: AakerDimension[] = [
  {
    key: 'sincerity',
    label: 'Sincerity',
    description: 'Honest, warm, and genuine — brands that feel real and down-to-earth.',
    facets: [
      { name: 'Down-to-earth', traits: ['down-to-earth', 'family-oriented', 'small-town'] },
      { name: 'Honest', traits: ['honest', 'sincere', 'real'] },
      { name: 'Wholesome', traits: ['wholesome', 'original'] },
      { name: 'Cheerful', traits: ['cheerful', 'sentimental', 'friendly'] },
    ],
    brandExamples: ['Patagonia', 'Dove', 'Hallmark', 'IKEA'],
    colorAssociation: 'Warm tones (orange, warm yellow), earth tones, soft greens — low saturation, warm hue',
    typographyAssociation: 'Rounded sans-serif, humanist typefaces — approachable, readable, friendly',
    imageryAssociation: 'Authentic, natural, candid photography — genuine human connection, everyday moments',
  },
  {
    key: 'excitement',
    label: 'Excitement',
    description: 'Daring, spirited, and imaginative — brands that bring energy and innovation.',
    facets: [
      { name: 'Daring', traits: ['daring', 'trendy', 'exciting'] },
      { name: 'Spirited', traits: ['spirited', 'cool', 'young'] },
      { name: 'Imaginative', traits: ['imaginative', 'unique'] },
      { name: 'Up-to-date', traits: ['up-to-date', 'independent', 'contemporary'] },
    ],
    brandExamples: ['Red Bull', 'Nike', 'Tesla', 'GoPro'],
    colorAssociation: 'Red, bright orange, electric blue, vibrant colors — high saturation, high contrast',
    typographyAssociation: 'Display fonts, bold sans-serif, playful typefaces — dynamic, large, asymmetric',
    imageryAssociation: 'Action-oriented, dynamic, high-energy — movement, trending culture, bold visuals',
  },
  {
    key: 'competence',
    label: 'Competence',
    description: 'Reliable, intelligent, and successful — brands that deliver with expertise.',
    facets: [
      { name: 'Reliable', traits: ['reliable', 'hard-working', 'secure'] },
      { name: 'Intelligent', traits: ['intelligent', 'technical', 'corporate'] },
      { name: 'Successful', traits: ['successful', 'leader', 'confident'] },
    ],
    brandExamples: ['Apple', 'Microsoft', 'Volvo', 'McKinsey'],
    colorAssociation: 'Blue, navy, dark gray, professional neutrals — medium saturation, cool hue',
    typographyAssociation: 'Clean sans-serif, geometric typefaces — modern, efficient, neutral',
    imageryAssociation: 'Professional, structured, clean — capability demonstration, precision, data',
  },
  {
    key: 'sophistication',
    label: 'Sophistication',
    description: 'Elegant, charming, and refined — brands that exude class and exclusivity.',
    facets: [
      { name: 'Upper class', traits: ['upper class', 'glamorous', 'good-looking'] },
      { name: 'Charming', traits: ['charming', 'feminine', 'smooth'] },
    ],
    brandExamples: ['Louis Vuitton', 'Chanel', 'Mercedes-Benz', 'Rolex'],
    colorAssociation: 'Black, gold, deep purple, silver — low saturation or metallic, refined',
    typographyAssociation: 'Elegant serif, thin serif, script — refined, high contrast, classic',
    imageryAssociation: 'Minimalist, curated, artistic — refined aesthetics, ample white space, luxury details',
  },
  {
    key: 'ruggedness',
    label: 'Ruggedness',
    description: 'Tough, outdoorsy, and sturdy — brands built for adventure and resilience.',
    facets: [
      { name: 'Outdoorsy', traits: ['outdoorsy', 'masculine', 'Western'] },
      { name: 'Tough', traits: ['tough', 'rugged'] },
    ],
    brandExamples: ['Jeep', 'Harley-Davidson', 'The North Face', 'Timberland'],
    colorAssociation: 'Earth tones (brown, forest green, olive, rust) — low-medium saturation, dark value',
    typographyAssociation: 'Slab serif, bold serif, heavy weight — strong, sturdy, textured',
    imageryAssociation: 'Adventurous landscapes, gritty textures — nature, terrain, challenges, outdoor',
  },
];

/** Get an Aaker dimension by key */
export function getAakerDimension(key: string): AakerDimension | undefined {
  return AAKER_DIMENSIONS.find(d => d.key === key);
}

// ─── Personality Spectrum Sliders ───────────────────────────

export interface SpectrumSliderConfig {
  key: string;
  leftLabel: string;
  rightLabel: string;
  leftDescription: string;
  rightDescription: string;
}

export const SPECTRUM_SLIDERS: SpectrumSliderConfig[] = [
  {
    key: 'friendlyFormal',
    leftLabel: 'Friendly / Approachable',
    rightLabel: 'Corporate / Formal',
    leftDescription: 'Casual, warm, conversational',
    rightDescription: 'Professional, structured, authoritative',
  },
  {
    key: 'energeticThoughtful',
    leftLabel: 'High-Energy / Enthusiastic',
    rightLabel: 'Thoughtful / Careful',
    leftDescription: 'Fast-paced, action-oriented, bold',
    rightDescription: 'Measured, deliberate, reflective',
  },
  {
    key: 'modernTraditional',
    leftLabel: 'Modern / Contemporary',
    rightLabel: 'Traditional / Classic',
    leftDescription: 'Forward-looking, progressive, new',
    rightDescription: 'Time-tested, heritage, established',
  },
  {
    key: 'innovativeProven',
    leftLabel: 'Cutting Edge / Innovative',
    rightLabel: 'Established / Proven',
    leftDescription: 'Disruptive, experimental, pioneering',
    rightDescription: 'Reliable, trusted, battle-tested',
  },
  {
    key: 'playfulSerious',
    leftLabel: 'Fun / Playful',
    rightLabel: 'Serious / Professional',
    leftDescription: 'Lighthearted, witty, entertaining',
    rightDescription: 'Focused, no-nonsense, business-like',
  },
  {
    key: 'inclusiveExclusive',
    leftLabel: 'Inclusive / Welcoming',
    rightLabel: 'Exclusive / Selective',
    leftDescription: 'Open to everyone, democratized, mass appeal',
    rightDescription: 'Curated, elite, limited access',
  },
  {
    key: 'boldReserved',
    leftLabel: 'Bold / Daring',
    rightLabel: 'Reserved / Understated',
    leftDescription: 'Loud, provocative, attention-grabbing',
    rightDescription: 'Quiet, subtle, lets quality speak',
  },
];

// ─── Tone Dimensions (NN/g) ────────────────────────────────

export interface ToneDimensionConfig {
  key: string;
  leftLabel: string;
  rightLabel: string;
  description: string;
}

export const TONE_DIMENSIONS: ToneDimensionConfig[] = [
  {
    key: 'formalCasual',
    leftLabel: 'Formal',
    rightLabel: 'Casual',
    description: 'How structured and professional vs. conversational and relaxed',
  },
  {
    key: 'seriousFunny',
    leftLabel: 'Serious',
    rightLabel: 'Funny',
    description: 'How straightforward vs. intentionally humorous',
  },
  {
    key: 'respectfulIrreverent',
    leftLabel: 'Respectful',
    rightLabel: 'Irreverent',
    description: 'How dignified vs. playful and unconventional',
  },
  {
    key: 'matterOfFactEnthusiastic',
    leftLabel: 'Matter-of-fact',
    rightLabel: 'Enthusiastic',
    description: 'How neutral and dry vs. energetic and emotionally engaged',
  },
];

// ─── Communication Channels ─────────────────────────────────

export interface ChannelConfig {
  key: string;
  label: string;
  placeholder: string;
}

export const CHANNELS: ChannelConfig[] = [
  { key: 'website', label: 'Website', placeholder: 'e.g. Core voice, slightly formal, authoritative...' },
  { key: 'socialMedia', label: 'Social Media', placeholder: 'e.g. More casual, personality-forward, engaging...' },
  { key: 'customerSupport', label: 'Customer Support', placeholder: 'e.g. Empathetic, solution-focused, patient...' },
  { key: 'email', label: 'Email Marketing', placeholder: 'e.g. Warm, personal, value-focused...' },
  { key: 'crisis', label: 'Crisis Communication', placeholder: 'e.g. Transparent, serious, accountable...' },
];
