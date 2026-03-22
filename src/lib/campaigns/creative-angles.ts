/**
 * Creative Angles Library — 20 Angles for Campaign Hook Generation
 *
 * Each angle represents a distinct creative approach. The AI curator
 * dynamically selects the 3 best-fit angles per campaign and assigns
 * each to the LLM best suited for that angle.
 *
 * @see Plan: "Campaign Strategy Pipeline Restructure — 9-Phase Architecture"
 */

import type { InsightFamily } from './strategy-blueprint.types';
import type { AiProvider } from '@/lib/ai/feature-models';

// ─── Types ────────────────────────────────────────────────

export type CreativeAngleId =
  | 'reversal' | 'exaggeration' | 'metaphor_transfer' | 'cultural_tension'
  | 'behavioral_insight' | 'provocation' | 'emotional_truth' | 'absurdist_humor'
  | 'social_proof' | 'simplification' | 'unexpected_juxtaposition' | 'nostalgia_reframe'
  | 'heroic_narrative' | 'personification' | 'product_as_hero' | 'challenger'
  | 'co_creation' | 'purpose_activism' | 'sensory_experiential' | 'cep_multiplication';

export interface CreativeAngleDefinition {
  id: CreativeAngleId;
  name: string;
  insightFamily: InsightFamily;
  startingInsightType: string;
  description: string;
  outputSignature: string;
  famousExamples: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'very-high';
  effieCannesPotential: 'medium' | 'high' | 'very-high';
  bestLlmFit: AiProvider[];
  subMethodologies?: string[];
  suitabilityByGoal: Record<string, number>;
}

// ─── Creative Angles ──────────────────────────────────────

export const CREATIVE_ANGLES: Record<CreativeAngleId, CreativeAngleDefinition> = {
  reversal: {
    id: 'reversal',
    name: 'Reversal',
    insightFamily: 'structural',
    startingInsightType: 'Assumption or convention',
    description: 'Flips an expectation or convention to reframe the brand message. What if the opposite were true?',
    outputSignature: 'A concept that subverts the audience\'s assumption, creating an "aha" moment when they realize the flip.',
    famousExamples: [
      'Patagonia "Don\'t Buy This Jacket" — reversed the buy-more message',
      'Diesel "Be Stupid" — reversed the smart-consumer narrative',
    ],
    riskLevel: 'medium',
    effieCannesPotential: 'high',
    bestLlmFit: ['openai', 'anthropic'],
    subMethodologies: ['SCAMPER (Reverse)'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 8, PRODUCT_LAUNCH: 6, MARKET_EXPANSION: 5, REBRANDING: 9,
      CONTENT_MARKETING: 6, AUDIENCE_ENGAGEMENT: 7, COMMUNITY_BUILDING: 5, LOYALTY_RETENTION: 4,
      EMPLOYER_BRANDING: 6, INTERNAL_BRANDING: 5, THOUGHT_LEADERSHIP: 8, CSR_IMPACT: 6,
      LEAD_GENERATION: 5, SALES_ACTIVATION: 4, EVENT_SEASONAL: 5,
    },
  },
  exaggeration: {
    id: 'exaggeration',
    name: 'Exaggeration',
    insightFamily: 'structural',
    startingInsightType: 'Product truth or benefit',
    description: 'Amplifies a genuine product truth or benefit to an absurd, memorable degree.',
    outputSignature: 'A concept that takes a real benefit and stretches it until it becomes visually/verbally unforgettable.',
    famousExamples: [
      'Snickers "You\'re Not You When You\'re Hungry" — exaggerated hunger effects',
      'Old Spice "The Man Your Man Could Smell Like" — exaggerated male grooming benefits',
    ],
    riskLevel: 'medium',
    effieCannesPotential: 'high',
    bestLlmFit: ['openai', 'google'],
    subMethodologies: ['SCAMPER (Magnify)'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 7, PRODUCT_LAUNCH: 9, MARKET_EXPANSION: 6, REBRANDING: 5,
      CONTENT_MARKETING: 5, AUDIENCE_ENGAGEMENT: 8, COMMUNITY_BUILDING: 4, LOYALTY_RETENTION: 5,
      EMPLOYER_BRANDING: 4, INTERNAL_BRANDING: 3, THOUGHT_LEADERSHIP: 4, CSR_IMPACT: 3,
      LEAD_GENERATION: 7, SALES_ACTIVATION: 8, EVENT_SEASONAL: 7,
    },
  },
  metaphor_transfer: {
    id: 'metaphor_transfer',
    name: 'Metaphor Transfer',
    insightFamily: 'narrative',
    startingInsightType: 'Cross-domain parallel',
    description: 'Maps a concept from an entirely different domain onto the brand. Creates unexpected meaning through analogy.',
    outputSignature: 'A creative concept that borrows the logic, imagery, or language of a foreign domain to illuminate the brand.',
    famousExamples: [
      'Apple "Think Different" — borrowed rebellion from counterculture',
      'Red Bull "Gives You Wings" — borrowed aviation/freedom metaphor',
    ],
    riskLevel: 'low',
    effieCannesPotential: 'high',
    bestLlmFit: ['anthropic', 'openai'],
    subMethodologies: ['Synectics (Direct Analogy, Personal Analogy)'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 8, PRODUCT_LAUNCH: 7, MARKET_EXPANSION: 7, REBRANDING: 8,
      CONTENT_MARKETING: 7, AUDIENCE_ENGAGEMENT: 6, COMMUNITY_BUILDING: 5, LOYALTY_RETENTION: 5,
      EMPLOYER_BRANDING: 7, INTERNAL_BRANDING: 6, THOUGHT_LEADERSHIP: 8, CSR_IMPACT: 7,
      LEAD_GENERATION: 5, SALES_ACTIVATION: 4, EVENT_SEASONAL: 5,
    },
  },
  cultural_tension: {
    id: 'cultural_tension',
    name: 'Cultural Tension',
    insightFamily: 'insight-driven',
    startingInsightType: 'Societal conflict or paradox',
    description: 'Identifies a genuine societal tension and positions the brand as part of the resolution.',
    outputSignature: 'A concept rooted in a real cultural conflict where the brand takes a meaningful stance.',
    famousExamples: [
      'Nike "Dream Crazy" (Kaepernick) — racial justice tension',
      'Always #LikeAGirl — gender expectation tension',
      'Dove Real Beauty — beauty standard tension',
    ],
    riskLevel: 'high',
    effieCannesPotential: 'very-high',
    bestLlmFit: ['anthropic', 'openai'],
    subMethodologies: ['Cultural Branding (Holt)', 'Tension-Based Strategy'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 9, PRODUCT_LAUNCH: 5, MARKET_EXPANSION: 7, REBRANDING: 9,
      CONTENT_MARKETING: 7, AUDIENCE_ENGAGEMENT: 9, COMMUNITY_BUILDING: 8, LOYALTY_RETENTION: 6,
      EMPLOYER_BRANDING: 8, INTERNAL_BRANDING: 5, THOUGHT_LEADERSHIP: 9, CSR_IMPACT: 10,
      LEAD_GENERATION: 4, SALES_ACTIVATION: 3, EVENT_SEASONAL: 4,
    },
  },
  behavioral_insight: {
    id: 'behavioral_insight',
    name: 'Behavioral Insight',
    insightFamily: 'insight-driven',
    startingInsightType: 'BCT barrier or desired behavior',
    description: 'Dramatizes a behavioral change insight. Turns a behavioral barrier or nudge into the creative hook.',
    outputSignature: 'A concept that makes the audience\'s behavioral barrier or desired behavior the star of the campaign.',
    famousExamples: [
      'Volkswagen "Fun Theory" — made behavior change playful',
      'Ogilvy "Nudge Unit" campaigns — applied behavioral science visually',
    ],
    riskLevel: 'medium',
    effieCannesPotential: 'very-high',
    bestLlmFit: ['google', 'anthropic'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 6, PRODUCT_LAUNCH: 7, MARKET_EXPANSION: 6, REBRANDING: 5,
      CONTENT_MARKETING: 7, AUDIENCE_ENGAGEMENT: 8, COMMUNITY_BUILDING: 7, LOYALTY_RETENTION: 8,
      EMPLOYER_BRANDING: 6, INTERNAL_BRANDING: 7, THOUGHT_LEADERSHIP: 7, CSR_IMPACT: 8,
      LEAD_GENERATION: 7, SALES_ACTIVATION: 8, EVENT_SEASONAL: 5,
    },
  },
  provocation: {
    id: 'provocation',
    name: 'Provocation',
    insightFamily: 'insight-driven',
    startingInsightType: 'Controversial or taboo truth',
    description: 'Deliberately polarizing concept that forces a reaction. Not for every brand, but powerful when authentic.',
    outputSignature: 'A concept that divides opinion but creates intense engagement and brand recall.',
    famousExamples: [
      'Benetton "United Colors" — racial/social provocation',
      'BrewDog "Punk IPA" — anti-establishment provocation',
    ],
    riskLevel: 'very-high',
    effieCannesPotential: 'high',
    bestLlmFit: ['openai', 'anthropic'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 9, PRODUCT_LAUNCH: 5, MARKET_EXPANSION: 4, REBRANDING: 7,
      CONTENT_MARKETING: 5, AUDIENCE_ENGAGEMENT: 9, COMMUNITY_BUILDING: 6, LOYALTY_RETENTION: 4,
      EMPLOYER_BRANDING: 5, INTERNAL_BRANDING: 2, THOUGHT_LEADERSHIP: 7, CSR_IMPACT: 6,
      LEAD_GENERATION: 5, SALES_ACTIVATION: 4, EVENT_SEASONAL: 4,
    },
  },
  emotional_truth: {
    id: 'emotional_truth',
    name: 'Emotional Truth',
    insightFamily: 'insight-driven',
    startingInsightType: 'Universal human emotion',
    description: 'Taps into a deep, universally recognized emotion as the creative foundation.',
    outputSignature: 'A concept built on an emotional truth so universal that it transcends demographics.',
    famousExamples: [
      'John Lewis Christmas ads — love and nostalgia',
      'Google "Loretta" — grief and memory',
      'P&G "Thank You Mom" — maternal love',
    ],
    riskLevel: 'low',
    effieCannesPotential: 'very-high',
    bestLlmFit: ['anthropic', 'openai'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 8, PRODUCT_LAUNCH: 6, MARKET_EXPANSION: 7, REBRANDING: 7,
      CONTENT_MARKETING: 7, AUDIENCE_ENGAGEMENT: 8, COMMUNITY_BUILDING: 8, LOYALTY_RETENTION: 9,
      EMPLOYER_BRANDING: 8, INTERNAL_BRANDING: 7, THOUGHT_LEADERSHIP: 5, CSR_IMPACT: 8,
      LEAD_GENERATION: 4, SALES_ACTIVATION: 5, EVENT_SEASONAL: 8,
    },
  },
  absurdist_humor: {
    id: 'absurdist_humor',
    name: 'Absurdist Humor',
    insightFamily: 'structural',
    startingInsightType: 'Logical leap or non-sequitur',
    description: 'Uses surreal, comedic logic to create a memorable and shareable creative concept.',
    outputSignature: 'A concept that makes people laugh through unexpected logic leaps, generating viral shareability.',
    famousExamples: [
      'Skittles "Taste the Rainbow" — surreal scenarios',
      'Dollar Shave Club "Our Blades Are F***ing Great" — deadpan absurdity',
    ],
    riskLevel: 'high',
    effieCannesPotential: 'medium',
    bestLlmFit: ['openai', 'anthropic'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 8, PRODUCT_LAUNCH: 7, MARKET_EXPANSION: 5, REBRANDING: 4,
      CONTENT_MARKETING: 6, AUDIENCE_ENGAGEMENT: 9, COMMUNITY_BUILDING: 6, LOYALTY_RETENTION: 5,
      EMPLOYER_BRANDING: 5, INTERNAL_BRANDING: 3, THOUGHT_LEADERSHIP: 3, CSR_IMPACT: 2,
      LEAD_GENERATION: 6, SALES_ACTIVATION: 6, EVENT_SEASONAL: 8,
    },
  },
  social_proof: {
    id: 'social_proof',
    name: 'Social Proof',
    insightFamily: 'structural',
    startingInsightType: 'Crowd behavior or peer influence',
    description: 'Makes belonging, popularity, or peer behavior the central creative hook.',
    outputSignature: 'A concept where the sheer number of participants or the visibility of adoption IS the message.',
    famousExamples: [
      'Spotify Wrapped — social sharing as product',
      'ALS Ice Bucket Challenge — peer participation chain',
    ],
    riskLevel: 'low',
    effieCannesPotential: 'medium',
    bestLlmFit: ['google', 'openai'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 7, PRODUCT_LAUNCH: 6, MARKET_EXPANSION: 8, REBRANDING: 4,
      CONTENT_MARKETING: 5, AUDIENCE_ENGAGEMENT: 8, COMMUNITY_BUILDING: 9, LOYALTY_RETENTION: 7,
      EMPLOYER_BRANDING: 6, INTERNAL_BRANDING: 5, THOUGHT_LEADERSHIP: 5, CSR_IMPACT: 7,
      LEAD_GENERATION: 7, SALES_ACTIVATION: 6, EVENT_SEASONAL: 7,
    },
  },
  simplification: {
    id: 'simplification',
    name: 'Simplification',
    insightFamily: 'structural',
    startingInsightType: 'Complex product or message',
    description: 'Radical clarity as the creative concept. Strips complexity to a single, powerful idea.',
    outputSignature: 'A concept that communicates a complex value proposition through radical simplicity.',
    famousExamples: [
      'Apple iPod "1,000 songs in your pocket" — product simplification',
      'Google homepage — design simplification as brand statement',
    ],
    riskLevel: 'low',
    effieCannesPotential: 'medium',
    bestLlmFit: ['google', 'anthropic'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 6, PRODUCT_LAUNCH: 9, MARKET_EXPANSION: 7, REBRANDING: 6,
      CONTENT_MARKETING: 6, AUDIENCE_ENGAGEMENT: 5, COMMUNITY_BUILDING: 3, LOYALTY_RETENTION: 5,
      EMPLOYER_BRANDING: 5, INTERNAL_BRANDING: 6, THOUGHT_LEADERSHIP: 6, CSR_IMPACT: 4,
      LEAD_GENERATION: 8, SALES_ACTIVATION: 9, EVENT_SEASONAL: 5,
    },
  },
  unexpected_juxtaposition: {
    id: 'unexpected_juxtaposition',
    name: 'Unexpected Juxtaposition',
    insightFamily: 'narrative',
    startingInsightType: 'Two unrelated elements',
    description: 'Collision of two worlds creates new meaning. The combination is the creative concept.',
    outputSignature: 'A concept where the surprising combination of two unrelated elements creates a fresh, memorable idea.',
    famousExamples: [
      'Absolut Vodka bottle art — vodka + fine art',
      'LEGO "Rebuild the World" — toys + world issues',
    ],
    riskLevel: 'medium',
    effieCannesPotential: 'high',
    bestLlmFit: ['anthropic', 'openai'],
    subMethodologies: ['Synectics (Compressed Conflict)'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 8, PRODUCT_LAUNCH: 7, MARKET_EXPANSION: 6, REBRANDING: 8,
      CONTENT_MARKETING: 7, AUDIENCE_ENGAGEMENT: 7, COMMUNITY_BUILDING: 5, LOYALTY_RETENTION: 4,
      EMPLOYER_BRANDING: 6, INTERNAL_BRANDING: 5, THOUGHT_LEADERSHIP: 7, CSR_IMPACT: 6,
      LEAD_GENERATION: 5, SALES_ACTIVATION: 5, EVENT_SEASONAL: 7,
    },
  },
  nostalgia_reframe: {
    id: 'nostalgia_reframe',
    name: 'Nostalgia Reframe',
    insightFamily: 'narrative',
    startingInsightType: 'Cultural memory or era',
    description: 'Connects a past cultural moment to the present through the brand. Nostalgia with a modern twist.',
    outputSignature: 'A concept that revives a cultural memory and reframes it through the brand\'s lens.',
    famousExamples: [
      'Nintendo Switch launch — childhood gaming nostalgia for adults',
      'Stranger Things + brand partnerships — 80s cultural nostalgia',
    ],
    riskLevel: 'medium',
    effieCannesPotential: 'high',
    bestLlmFit: ['anthropic', 'openai'],
    subMethodologies: ['Cultural Branding (Holt)'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 7, PRODUCT_LAUNCH: 6, MARKET_EXPANSION: 5, REBRANDING: 8,
      CONTENT_MARKETING: 7, AUDIENCE_ENGAGEMENT: 8, COMMUNITY_BUILDING: 7, LOYALTY_RETENTION: 8,
      EMPLOYER_BRANDING: 6, INTERNAL_BRANDING: 5, THOUGHT_LEADERSHIP: 4, CSR_IMPACT: 4,
      LEAD_GENERATION: 4, SALES_ACTIVATION: 5, EVENT_SEASONAL: 9,
    },
  },
  heroic_narrative: {
    id: 'heroic_narrative',
    name: 'Heroic Narrative',
    insightFamily: 'narrative',
    startingInsightType: 'Customer struggle',
    description: 'Positions the customer as the hero. The brand is the enabler/mentor, not the protagonist.',
    outputSignature: 'A concept where the customer\'s journey from struggle to triumph is the story, with the brand as catalyst.',
    famousExamples: [
      'Nike "Just Do It" — athlete as hero',
      'Airbnb "Belong Anywhere" — traveler as hero',
    ],
    riskLevel: 'low',
    effieCannesPotential: 'medium',
    bestLlmFit: ['anthropic', 'google'],
    subMethodologies: ['Brand Archetypes (Hero journey)'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 7, PRODUCT_LAUNCH: 6, MARKET_EXPANSION: 6, REBRANDING: 6,
      CONTENT_MARKETING: 8, AUDIENCE_ENGAGEMENT: 7, COMMUNITY_BUILDING: 7, LOYALTY_RETENTION: 8,
      EMPLOYER_BRANDING: 9, INTERNAL_BRANDING: 7, THOUGHT_LEADERSHIP: 6, CSR_IMPACT: 7,
      LEAD_GENERATION: 6, SALES_ACTIVATION: 5, EVENT_SEASONAL: 5,
    },
  },
  personification: {
    id: 'personification',
    name: 'Personification',
    insightFamily: 'narrative',
    startingInsightType: 'Abstract concept or product',
    description: 'Gives human traits to a non-human element. The product, value, or concept becomes a character.',
    outputSignature: 'A concept where an abstract idea or product becomes a relatable character with personality.',
    famousExamples: [
      'M&M\'s characters — candy personified',
      'Duracell Bunny — energy personified',
      'Insurance comparison meerkats — comparison shopping personified',
    ],
    riskLevel: 'medium',
    effieCannesPotential: 'high',
    bestLlmFit: ['anthropic', 'openai'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 8, PRODUCT_LAUNCH: 7, MARKET_EXPANSION: 6, REBRANDING: 6,
      CONTENT_MARKETING: 7, AUDIENCE_ENGAGEMENT: 8, COMMUNITY_BUILDING: 6, LOYALTY_RETENTION: 7,
      EMPLOYER_BRANDING: 5, INTERNAL_BRANDING: 5, THOUGHT_LEADERSHIP: 4, CSR_IMPACT: 5,
      LEAD_GENERATION: 6, SALES_ACTIVATION: 6, EVENT_SEASONAL: 7,
    },
  },
  product_as_hero: {
    id: 'product_as_hero',
    name: 'Product-as-Hero',
    insightFamily: 'structural',
    startingInsightType: 'Product feature or capability',
    description: 'The product itself IS the creative concept. Its feature or capability drives the entire campaign.',
    outputSignature: 'A concept where the product\'s unique capability is dramatized as the central creative element.',
    famousExamples: [
      'Volvo "Epic Split" with Van Damme — product precision',
      'Dyson "Engineered for Performance" — product engineering as creative',
    ],
    riskLevel: 'low',
    effieCannesPotential: 'medium',
    bestLlmFit: ['google', 'openai'],
    subMethodologies: ['JTBD (Jobs To Be Done)'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 5, PRODUCT_LAUNCH: 10, MARKET_EXPANSION: 6, REBRANDING: 4,
      CONTENT_MARKETING: 5, AUDIENCE_ENGAGEMENT: 5, COMMUNITY_BUILDING: 3, LOYALTY_RETENTION: 5,
      EMPLOYER_BRANDING: 3, INTERNAL_BRANDING: 3, THOUGHT_LEADERSHIP: 4, CSR_IMPACT: 3,
      LEAD_GENERATION: 8, SALES_ACTIVATION: 9, EVENT_SEASONAL: 5,
    },
  },
  challenger: {
    id: 'challenger',
    name: 'Challenger',
    insightFamily: 'insight-driven',
    startingInsightType: 'Market leader or status quo',
    description: 'Positions the brand as the underdog or disruptor challenging the established order.',
    outputSignature: 'A concept that frames the brand as the bold alternative to the dominant player or way of thinking.',
    famousExamples: [
      'Apple "1984" — challenger to IBM',
      'Avis "We Try Harder" — #2 position as advantage',
      'BrewDog vs big beer — craft challenger narrative',
    ],
    riskLevel: 'high',
    effieCannesPotential: 'high',
    bestLlmFit: ['openai', 'anthropic'],
    subMethodologies: ['Brand Archetypes (Outlaw/Rebel)'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 8, PRODUCT_LAUNCH: 7, MARKET_EXPANSION: 9, REBRANDING: 7,
      CONTENT_MARKETING: 6, AUDIENCE_ENGAGEMENT: 8, COMMUNITY_BUILDING: 7, LOYALTY_RETENTION: 5,
      EMPLOYER_BRANDING: 7, INTERNAL_BRANDING: 4, THOUGHT_LEADERSHIP: 7, CSR_IMPACT: 5,
      LEAD_GENERATION: 7, SALES_ACTIVATION: 7, EVENT_SEASONAL: 4,
    },
  },
  co_creation: {
    id: 'co_creation',
    name: 'Co-creation',
    insightFamily: 'narrative',
    startingInsightType: 'Audience participation',
    description: 'The audience becomes part of the creative. User-generated, participatory, or crowd-sourced.',
    outputSignature: 'A concept designed so the audience completes or creates it, generating organic content and ownership.',
    famousExamples: [
      'Coca-Cola "Share a Coke" — personalized bottles',
      'LEGO Ideas — user-designed products',
      'Spotify Wrapped — user data as creative',
    ],
    riskLevel: 'medium',
    effieCannesPotential: 'high',
    bestLlmFit: ['openai', 'google'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 7, PRODUCT_LAUNCH: 6, MARKET_EXPANSION: 6, REBRANDING: 5,
      CONTENT_MARKETING: 8, AUDIENCE_ENGAGEMENT: 10, COMMUNITY_BUILDING: 10, LOYALTY_RETENTION: 8,
      EMPLOYER_BRANDING: 7, INTERNAL_BRANDING: 6, THOUGHT_LEADERSHIP: 5, CSR_IMPACT: 7,
      LEAD_GENERATION: 6, SALES_ACTIVATION: 5, EVENT_SEASONAL: 8,
    },
  },
  purpose_activism: {
    id: 'purpose_activism',
    name: 'Purpose / Activism',
    insightFamily: 'insight-driven',
    startingInsightType: 'Social cause or belief',
    description: 'The brand takes a stand on a social issue. The stance IS the creative hook.',
    outputSignature: 'A concept where the brand\'s position on a social issue drives the entire creative direction.',
    famousExamples: [
      'Patagonia "The President Stole Your Land" — environmental activism',
      'Ben & Jerry\'s social justice campaigns — brand values as creative',
      'REI #OptOutside — anti-consumerism stance',
    ],
    riskLevel: 'very-high',
    effieCannesPotential: 'very-high',
    bestLlmFit: ['anthropic', 'openai'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 8, PRODUCT_LAUNCH: 3, MARKET_EXPANSION: 5, REBRANDING: 7,
      CONTENT_MARKETING: 7, AUDIENCE_ENGAGEMENT: 8, COMMUNITY_BUILDING: 9, LOYALTY_RETENTION: 7,
      EMPLOYER_BRANDING: 9, INTERNAL_BRANDING: 8, THOUGHT_LEADERSHIP: 8, CSR_IMPACT: 10,
      LEAD_GENERATION: 3, SALES_ACTIVATION: 2, EVENT_SEASONAL: 4,
    },
  },
  sensory_experiential: {
    id: 'sensory_experiential',
    name: 'Sensory / Experiential',
    insightFamily: 'narrative',
    startingInsightType: 'Physical sensation or experience',
    description: 'Creates a visceral, multi-sensory concept that goes beyond visual/verbal communication.',
    outputSignature: 'A concept designed to be felt, not just seen — creating physical or emotional sensation.',
    famousExamples: [
      'Guinness "Surfer" — visceral wave imagery',
      'IKEA sleepover experiences — brand as physical experience',
      'Cadbury Gorilla — rhythm and anticipation',
    ],
    riskLevel: 'medium',
    effieCannesPotential: 'high',
    bestLlmFit: ['anthropic', 'google'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 7, PRODUCT_LAUNCH: 8, MARKET_EXPANSION: 5, REBRANDING: 6,
      CONTENT_MARKETING: 6, AUDIENCE_ENGAGEMENT: 9, COMMUNITY_BUILDING: 6, LOYALTY_RETENTION: 7,
      EMPLOYER_BRANDING: 5, INTERNAL_BRANDING: 5, THOUGHT_LEADERSHIP: 4, CSR_IMPACT: 5,
      LEAD_GENERATION: 5, SALES_ACTIVATION: 6, EVENT_SEASONAL: 9,
    },
  },
  cep_multiplication: {
    id: 'cep_multiplication',
    name: 'CEP Multiplication',
    insightFamily: 'structural',
    startingInsightType: 'Category Entry Point',
    description: 'Expands the buying occasions, contexts, or reasons to engage with the brand.',
    outputSignature: 'A concept that creates new mental associations between the brand and previously unlinked occasions/needs.',
    famousExamples: [
      'Kit Kat "Have a Break" — linked to break-taking occasion',
      'De Beers "A Diamond Is Forever" — linked diamonds to engagement',
      'Snickers as meal replacement — new occasion',
    ],
    riskLevel: 'low',
    effieCannesPotential: 'medium',
    bestLlmFit: ['google', 'openai'],
    subMethodologies: ['JTBD (Jobs To Be Done)', 'Byron Sharp CEP theory'],
    suitabilityByGoal: {
      BRAND_AWARENESS: 6, PRODUCT_LAUNCH: 7, MARKET_EXPANSION: 10, REBRANDING: 5,
      CONTENT_MARKETING: 6, AUDIENCE_ENGAGEMENT: 5, COMMUNITY_BUILDING: 4, LOYALTY_RETENTION: 7,
      EMPLOYER_BRANDING: 3, INTERNAL_BRANDING: 3, THOUGHT_LEADERSHIP: 4, CSR_IMPACT: 3,
      LEAD_GENERATION: 8, SALES_ACTIVATION: 9, EVENT_SEASONAL: 8,
    },
  },
} as const satisfies Record<CreativeAngleId, CreativeAngleDefinition>;

// ─── Helpers ──────────────────────────────────────────────

export function getCreativeAngle(id: CreativeAngleId): CreativeAngleDefinition | undefined {
  return CREATIVE_ANGLES[id];
}

export function getAnglesByFamily(family: InsightFamily): CreativeAngleDefinition[] {
  return Object.values(CREATIVE_ANGLES).filter((a) => a.insightFamily === family);
}

export function getTopAnglesForGoal(goalType: string, count = 5): CreativeAngleDefinition[] {
  return Object.values(CREATIVE_ANGLES)
    .sort((a, b) => (b.suitabilityByGoal[goalType] ?? 0) - (a.suitabilityByGoal[goalType] ?? 0))
    .slice(0, count);
}

/**
 * Format the creative angles library as a markdown prompt section for the curator.
 */
export function formatCreativeAnglesForPrompt(): string {
  const lines = ['## Creative Angles Library (20 angles)', ''];
  for (const angle of Object.values(CREATIVE_ANGLES)) {
    lines.push(`### ${angle.name} [${angle.id}]`);
    lines.push(`Family: ${angle.insightFamily} | Risk: ${angle.riskLevel} | Effie potential: ${angle.effieCannesPotential}`);
    lines.push(`Starting insight: ${angle.startingInsightType}`);
    lines.push(angle.description);
    lines.push(`Output: ${angle.outputSignature}`);
    lines.push(`Examples: ${angle.famousExamples.join('; ')}`);
    lines.push(`Best LLM fit: ${angle.bestLlmFit.join(', ')}`);
    if (angle.subMethodologies?.length) {
      lines.push(`Sub-methodologies: ${angle.subMethodologies.join(', ')}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
