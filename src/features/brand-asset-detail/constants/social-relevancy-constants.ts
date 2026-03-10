// =============================================================
// Social Relevancy Constants
//
// Based on: Triple Bottom Line (Elkington), B Corp Impact Assessment,
// Brand Activism (Kotler & Sarkar), UN SDGs, ISO 26000, GRI.
//
// Three pillars: Milieu (Planet) / Mens (People) / Maatschappij (Society)
// Each with 3 fixed self-assessment statements (9 total).
// =============================================================

import type { SocialRelevancyFrameworkData, SocialRelevancyPillar, SocialRelevancyAuthenticityScores } from '../types/framework.types';

// ─── Pillar Configuration ─────────────────────────────────────

export interface PillarConfig {
  key: 'milieu' | 'mens' | 'maatschappij';
  label: string;
  subtitle: string;
  icon: string;     // Lucide icon name (resolved in component)
  color: string;     // Tailwind color prefix (e.g. "emerald")
  statements: string[];
}

export const PILLAR_CONFIGS: PillarConfig[] = [
  {
    key: 'milieu',
    label: 'Environment',
    subtitle: 'How large is your ecological footprint?',
    icon: 'Leaf',
    color: 'emerald',
    statements: [
      'We have implemented clear and verifiable environmental criteria in our procurement policy.',
      'We actively use our revenue to make a positive contribution to environmental improvement.',
      'We actively stimulate all forms of environment-improving activities within our organization (internally and externally).',
    ],
  },
  {
    key: 'mens',
    label: 'People',
    subtitle: 'Does your brand stimulate the wellbeing of individuals?',
    icon: 'Heart',
    color: 'rose',
    statements: [
      'We stimulate a positive lifestyle through the use of our products and services.',
      'We stimulate personal wellbeing through the use of our products and services.',
      'We stimulate a positive lifestyle and wellbeing for our employees.',
    ],
  },
  {
    key: 'maatschappij',
    label: 'Society',
    subtitle: 'Does your brand contribute to improving society?',
    icon: 'Globe',
    color: 'blue',
    statements: [
      'We stimulate positive interaction in society through the use of our products and services.',
      'We stimulate social harmony and cohesion through the use of our products and services.',
      'We stimulate positive interaction, social harmony and cohesion among employees within the organization.',
    ],
  },
];

// ─── Activism Levels (Kotler & Sarkar) ────────────────────────

export interface ActivismLevel {
  value: string;
  label: string;
  description: string;
  examples: string;
}

export const ACTIVISM_LEVELS: ActivismLevel[] = [
  { value: 'Silent', label: 'Silent', description: 'Acts but does not actively communicate', examples: 'IKEA (early), Costco' },
  { value: 'Vocal', label: 'Vocal', description: 'Openly communicates impact efforts', examples: "Patagonia, Ben & Jerry's" },
  { value: 'Leader', label: 'Leader', description: 'Sets industry standards for impact', examples: 'Unilever, Interface' },
  { value: 'Activist', label: 'Activist', description: 'Actively pushes for systemic change', examples: "Tony's Chocolonely, The Body Shop" },
];

// ─── Authenticity Criteria ────────────────────────────────────

export interface AuthenicityCriterion {
  key: keyof SocialRelevancyAuthenticityScores;
  label: string;
  question: string;
}

export const AUTHENTICITY_CRITERIA: AuthenicityCriterion[] = [
  { key: 'walkTheTalk', label: 'Walk-the-Talk', question: 'Do we do what we say?' },
  { key: 'transparency', label: 'Transparency', question: 'Are we open about progress and failures?' },
  { key: 'consistency', label: 'Consistency', question: 'Is this integrated in all touchpoints?' },
  { key: 'stakeholderTrust', label: 'Stakeholder Trust', question: 'Do stakeholders believe our claims?' },
  { key: 'measurability', label: 'Measurability', question: 'Can our claims be independently verified?' },
  { key: 'longTermCommitment', label: 'Long-term Commitment', question: 'Is this core strategy or a campaign?' },
];

// ─── UN Sustainable Development Goals ─────────────────────────

export interface SDGItem {
  number: number;
  name: string;
  color: string; // hex color for the SDG badge
}

export const UN_SDGS: SDGItem[] = [
  { number: 1, name: 'No Poverty', color: '#E5243B' },
  { number: 2, name: 'Zero Hunger', color: '#DDA63A' },
  { number: 3, name: 'Good Health and Well-being', color: '#4C9F38' },
  { number: 4, name: 'Quality Education', color: '#C5192D' },
  { number: 5, name: 'Gender Equality', color: '#FF3A21' },
  { number: 6, name: 'Clean Water and Sanitation', color: '#26BDE2' },
  { number: 7, name: 'Affordable and Clean Energy', color: '#FCC30B' },
  { number: 8, name: 'Decent Work and Economic Growth', color: '#A21942' },
  { number: 9, name: 'Industry, Innovation and Infrastructure', color: '#FD6925' },
  { number: 10, name: 'Reduced Inequalities', color: '#DD1367' },
  { number: 11, name: 'Sustainable Cities and Communities', color: '#FD9D24' },
  { number: 12, name: 'Responsible Consumption and Production', color: '#BF8B2E' },
  { number: 13, name: 'Climate Action', color: '#3F7E44' },
  { number: 14, name: 'Life Below Water', color: '#0A97D9' },
  { number: 15, name: 'Life on Land', color: '#56C02B' },
  { number: 16, name: 'Peace, Justice and Strong Institutions', color: '#00689D' },
  { number: 17, name: 'Partnerships for the Goals', color: '#19486A' },
];

// ─── Score Thresholds ─────────────────────────────────────────

export interface ScoreThreshold {
  min: number;
  max: number;
  label: string;
  color: string; // Tailwind color name
}

export const PILLAR_SCORE_THRESHOLDS: ScoreThreshold[] = [
  { min: 0, max: 6, label: 'Needs Attention', color: 'red' },
  { min: 7, max: 9, label: 'Developing', color: 'amber' },
  { min: 10, max: 12, label: 'Good', color: 'emerald' },
  { min: 13, max: 15, label: 'Excellent', color: 'teal' },
];

export function getScoreThreshold(score: number): ScoreThreshold {
  return PILLAR_SCORE_THRESHOLDS.find(t => score >= t.min && score <= t.max)
    ?? PILLAR_SCORE_THRESHOLDS[0];
}

export function getGrandTotalThreshold(score: number): ScoreThreshold {
  if (score <= 18) return { min: 9, max: 18, label: 'Needs Attention', color: 'red' };
  if (score <= 27) return { min: 19, max: 27, label: 'Developing', color: 'amber' };
  if (score <= 36) return { min: 28, max: 36, label: 'Good', color: 'emerald' };
  return { min: 37, max: 45, label: 'Excellent', color: 'teal' };
}

// ─── Reference Frameworks ─────────────────────────────────────

export interface ReferenceFramework {
  name: string;
  author: string;
  year: string;
  description: string;
  keyPoints: string[];
}

export const REFERENCE_FRAMEWORKS: ReferenceFramework[] = [
  {
    name: 'Triple Bottom Line',
    author: 'John Elkington',
    year: '1994',
    description: 'Organizations should measure success across three dimensions beyond financial profit.',
    keyPoints: [
      'People: Social equity, labor practices, community impact',
      'Planet: Environmental stewardship, resource conservation, pollution reduction',
      'Profit: Economic viability, sustainable business models',
    ],
  },
  {
    name: 'B Corp Impact Assessment',
    author: 'B Lab',
    year: '2006',
    description: 'Rigorous assessment of a company across 5 impact areas, scored on 200 points.',
    keyPoints: [
      '5 areas: Governance, Workers, Community, Environment, Customers',
      '80+ points required for certification',
      'Core principle: Outcomes over policies',
    ],
  },
  {
    name: 'Brand Activism Spectrum',
    author: 'Kotler & Sarkar',
    year: '2017',
    description: 'Four levels of brand activism, from silent to systemic change agents.',
    keyPoints: [
      'Silent: Acts but does not actively communicate',
      'Vocal: Openly communicates impact efforts',
      'Leader: Sets industry standards for impact',
      'Activist: Actively pushes for systemic change',
    ],
  },
];

// ─── Pillar Score Calculators ─────────────────────────────────

export function calculatePillarScore(pillar: SocialRelevancyPillar): number {
  return pillar.statements.reduce((sum, s) => sum + (s.score || 0), 0);
}

export function calculateGrandTotal(data: SocialRelevancyFrameworkData): number {
  return calculatePillarScore(data.milieu)
    + calculatePillarScore(data.mens)
    + calculatePillarScore(data.maatschappij);
}

export function calculateAuthenticityAverage(scores: SocialRelevancyAuthenticityScores): number {
  const vals = Object.values(scores).filter(v => typeof v === 'number' && v > 0);
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 20);
}

// ─── Empty Data ───────────────────────────────────────────────

function emptyPillar(statements: string[]): SocialRelevancyPillar {
  return {
    statements: statements.map(text => ({
      text,
      score: 0,
      evidence: '',
      target: '',
      timeline: '',
    })),
    pillarReflection: '',
  };
}

export const EMPTY_SOCIAL_RELEVANCY_DATA: SocialRelevancyFrameworkData = {
  impactStatement: '',
  impactNarrative: '',
  activismLevel: '',
  milieu: emptyPillar(PILLAR_CONFIGS[0].statements),
  mens: emptyPillar(PILLAR_CONFIGS[1].statements),
  maatschappij: emptyPillar(PILLAR_CONFIGS[2].statements),
  authenticityScores: {
    walkTheTalk: 0,
    transparency: 0,
    consistency: 0,
    stakeholderTrust: 0,
    measurability: 0,
    longTermCommitment: 0,
  },
  proofPoints: [],
  certifications: [],
  antiGreenwashingStatement: '',
  sdgAlignment: [],
  communicationPrinciples: [],
  keyStakeholders: [],
  activationChannels: [],
  annualCommitment: '',
};
