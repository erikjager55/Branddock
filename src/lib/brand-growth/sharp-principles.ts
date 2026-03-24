/**
 * Byron Sharp / Ehrenberg-Bass Brand Growth Principles
 *
 * Based on "How Brands Grow" (2010) and Ehrenberg-Bass Institute research.
 * Provides evidence-based principles for brand growth that challenge
 * conventional marketing wisdom.
 *
 * Used in strategy-phase prompt injection for growth-oriented recommendations.
 */

// ─── Types ──────────────────────────────────────────────

export type BrandGrowthPrincipleId =
  | 'mental_availability'
  | 'physical_availability'
  | 'distinctive_assets'
  | 'category_entry_points'
  | 'double_jeopardy'
  | 'light_buyers'
  | 'duplication_of_purchase'
  | 'natural_monopoly';

export interface BrandGrowthPrinciple {
  id: BrandGrowthPrincipleId;
  name: string;
  description: string;
  source: string;
  keyMetric: string;
  implication: string;
  antiPattern: string;
}

// ─── Principles Catalog ─────────────────────────────────

export const SHARP_PRINCIPLES: Record<BrandGrowthPrincipleId, BrandGrowthPrinciple> = {
  mental_availability: {
    id: 'mental_availability',
    name: 'Mental Availability',
    description: 'The probability that a buyer will notice, recognize, or think of a brand in buying situations. Built through consistent, broad-reach advertising.',
    source: 'Sharp (2010), Romaniuk & Sharp (2022)',
    keyMetric: 'Brand salience across category entry points',
    implication: 'Maximize the number of buying situations where the brand comes to mind. Broad reach trumps narrow targeting.',
    antiPattern: 'Over-targeting niche audiences instead of reaching all category buyers.',
  },
  physical_availability: {
    id: 'physical_availability',
    name: 'Physical Availability',
    description: 'How easy it is for consumers to find and buy the brand. Distribution, shelf presence, digital findability.',
    source: 'Sharp (2010)',
    keyMetric: 'Distribution reach, share of shelf, digital findability score',
    implication: 'Make the brand as easy to buy as possible across all relevant channels and moments.',
    antiPattern: 'Focusing on brand building without ensuring the product is easy to find and purchase.',
  },
  distinctive_assets: {
    id: 'distinctive_assets',
    name: 'Distinctive Brand Assets (DBAs)',
    description: 'Unique sensory elements (colors, logos, characters, jingles, taglines) that identify the brand without needing the brand name.',
    source: 'Romaniuk (2018), "Building Distinctive Brand Assets"',
    keyMetric: 'Asset uniqueness and fame scores (recognition without brand name prompt)',
    implication: 'Invest in building and consistently using distinctive brand assets across all touchpoints. They are the brand\'s most valuable creative property.',
    antiPattern: 'Constantly refreshing creative without maintaining distinctive brand elements.',
  },
  category_entry_points: {
    id: 'category_entry_points',
    name: 'Category Entry Points (CEPs)',
    description: 'The cues that buyers use to access their memory when faced with a buying situation. Linking the brand to more CEPs drives growth.',
    source: 'Romaniuk & Sharp (2022), "How Brands Grow Part 2"',
    keyMetric: 'Number of CEPs linked to the brand in buyer memory',
    implication: 'Map all relevant buying situations and ensure the brand is mentally linked to each one. More CEPs = more opportunities to be considered.',
    antiPattern: 'Positioning the brand narrowly around a single benefit or occasion.',
  },
  double_jeopardy: {
    id: 'double_jeopardy',
    name: 'Double Jeopardy Law',
    description: 'Smaller brands suffer twice: they have fewer buyers AND those buyers are slightly less loyal. Growth comes from penetration, not loyalty.',
    source: 'Ehrenberg (1990), Sharp (2010)',
    keyMetric: 'Market penetration rate (% of category buyers who buy the brand)',
    implication: 'Focus on acquiring new buyers rather than extracting more from existing ones. Penetration growth drives loyalty growth, not vice versa.',
    antiPattern: 'Over-investing in loyalty programs for existing customers while neglecting new customer acquisition.',
  },
  light_buyers: {
    id: 'light_buyers',
    name: 'Importance of Light Buyers',
    description: 'Most of a brand\'s sales come from light and occasional buyers, not heavy loyalists. These light buyers are the largest growth opportunity.',
    source: 'Sharp (2010), Ehrenberg-Bass Institute',
    keyMetric: 'Share of revenue from light vs heavy buyers',
    implication: 'Design campaigns that reach and resonate with light category buyers, not just brand enthusiasts. Broad reach > narrow targeting of loyalists.',
    antiPattern: 'Creating campaigns only for "super fans" or heavy users while ignoring the vast pool of light buyers.',
  },
  duplication_of_purchase: {
    id: 'duplication_of_purchase',
    name: 'Duplication of Purchase Law',
    description: 'Brands share customers with other brands in proportion to their market share. Buyers are polygamous, not monogamous.',
    source: 'Ehrenberg (1988), Sharp (2010)',
    keyMetric: 'Customer sharing rates between brands',
    implication: 'Accept that customers buy from competitors too. The goal is to increase your share of their purchases, not demand exclusivity.',
    antiPattern: 'Messaging that demands exclusive loyalty or demonizes competitor usage.',
  },
  natural_monopoly: {
    id: 'natural_monopoly',
    name: 'Natural Monopoly Law',
    description: 'In established categories, large brands attract a disproportionate share of light buyers. This creates a natural advantage for scale.',
    source: 'Ehrenberg (1988), Sharp (2010)',
    keyMetric: 'Light buyer penetration relative to market share',
    implication: 'Challenger brands must invest disproportionately to overcome the natural monopoly effect. This aligns with the ESOV principle.',
    antiPattern: 'Assuming equal marketing budgets will produce equal growth regardless of current market position.',
  },
};

// ─── Helpers ────────────────────────────────────────────

export function getSharpPrinciple(id: BrandGrowthPrincipleId): BrandGrowthPrinciple | undefined {
  return SHARP_PRINCIPLES[id];
}

export function formatSharpForPrompt(): string {
  const lines = ['## Brand Growth Principles (Byron Sharp / Ehrenberg-Bass)', ''];
  for (const p of Object.values(SHARP_PRINCIPLES)) {
    lines.push(`### ${p.name}`);
    lines.push(p.description);
    lines.push(`**Key metric**: ${p.keyMetric}`);
    lines.push(`**Implication**: ${p.implication}`);
    lines.push(`**Anti-pattern to avoid**: ${p.antiPattern}`);
    lines.push('');
  }
  return lines.join('\n');
}
