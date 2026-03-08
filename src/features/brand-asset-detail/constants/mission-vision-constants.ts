// =============================================================
// Mission & Vision Constants
// Academic basis: Collins & Porras (Built to Last), Drucker,
// Sinek (Golden Circle), 9-component model
// =============================================================

// ─── Time Horizon Options ────────────────────────────────────

export interface TimeHorizonOption {
  value: string;
  label: string;
  description: string;
}

export const TIME_HORIZON_OPTIONS: TimeHorizonOption[] = [
  { value: '3 years', label: '3 Years', description: 'Short-term, operationally focused' },
  { value: '5 years', label: '5 Years', description: 'Mid-range strategic planning horizon' },
  { value: '10 years', label: '10 Years', description: 'Long-term transformative vision' },
  { value: '15+ years', label: '15+ Years', description: 'Generational, legacy-defining ambition' },
  { value: 'Aspirational', label: 'Aspirational', description: 'Timeless north star without a fixed deadline' },
];

// ─── Mission Examples ────────────────────────────────────────

export interface BrandExample {
  brand: string;
  statement: string;
  analysis: string;
}

export const MISSION_EXAMPLES: BrandExample[] = [
  {
    brand: 'Tesla',
    statement: 'To accelerate the world\'s transition to sustainable energy.',
    analysis: 'Action-oriented, measurable, beyond profit',
  },
  {
    brand: 'Patagonia',
    statement: 'We\'re in business to save our home planet.',
    analysis: 'Bold, emotional, fits on a T-shirt',
  },
  {
    brand: 'TED',
    statement: 'Spread ideas.',
    analysis: 'Two words, crystal clear, infinitely scalable',
  },
  {
    brand: 'IKEA',
    statement: 'To create a better everyday life for the many people.',
    analysis: 'Inclusive, tangible benefit, democratic values',
  },
  {
    brand: 'Google',
    statement: 'To organize the world\'s information and make it universally accessible.',
    analysis: 'Specific yet vast, clear mechanism',
  },
];

// ─── Vision Examples ─────────────────────────────────────────

export const VISION_EXAMPLES: BrandExample[] = [
  {
    brand: 'Nike',
    statement: 'Bring inspiration and innovation to every athlete in the world.',
    analysis: 'Aspirational, inclusive ("if you have a body, you\'re an athlete")',
  },
  {
    brand: 'Microsoft',
    statement: 'Empower every person and every organization on the planet to achieve more.',
    analysis: 'Universal, empowering, technology-agnostic',
  },
  {
    brand: 'SpaceX',
    statement: 'Making life multi-planetary.',
    analysis: 'Audacious BHAG, vivid future state',
  },
  {
    brand: 'Oxfam',
    statement: 'A just world without poverty.',
    analysis: 'Concise, value-driven, clear end state',
  },
  {
    brand: 'Alzheimer\'s Association',
    statement: 'A world without Alzheimer\'s and all other dementia.',
    analysis: 'Definitive endpoint, emotionally resonant',
  },
];

// ─── Common Pitfalls ─────────────────────────────────────────

export interface Pitfall {
  title: string;
  description: string;
}

export const MISSION_PITFALLS: Pitfall[] = [
  { title: 'Too vague', description: '"To make the world a better place" — no specificity' },
  { title: 'Too long', description: 'If it doesn\'t fit on a T-shirt, it\'s too complex' },
  { title: 'Profit-focused', description: '"To maximize shareholder value" — that\'s a result, not a mission' },
  { title: 'No differentiator', description: 'Could apply to any competitor in your industry' },
  { title: 'Aspirational instead of operational', description: 'Describes what you want to be, not what you do' },
];

export const VISION_PITFALLS: Pitfall[] = [
  { title: 'Too vague', description: '"To be the best" — at what, for whom?' },
  { title: 'Not ambitious enough', description: 'A vision should make you slightly uncomfortable' },
  { title: 'Disconnected from mission', description: 'Vision and mission should form one coherent narrative' },
  { title: 'No time horizon', description: 'Without a timeframe, a vision has no urgency' },
];
