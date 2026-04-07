/**
 * Bisociation Domains — 22 Cross-Domain Creative Inspiration Sources
 *
 * Based on Arthur Koestler's bisociation theory (The Act of Creation, 1964):
 * creative breakthroughs occur when two previously unrelated "matrices of
 * thought" are connected. Each domain below provides a rich set of visual
 * metaphors, emotional territories, and narrative structures that can be
 * combined with a brand's own domain to produce unexpected creative concepts.
 *
 * @see Koestler, A. (1964). The Act of Creation. London: Hutchinson.
 */

// ─── Types ────────────────────────────────────────────────

export interface BisociationDomainDefinition {
  id: string;
  name: string;
  /** What visual/narrative metaphors this domain offers */
  visualMetaphors: string[];
  /** What emotional territories this domain naturally evokes */
  emotionalTerritories: string[];
  /** Example of how this domain was used in a famous campaign */
  campaignExample?: { brand: string; connection: string };
}

// ─── Industry Proximity Map (used to avoid obvious matches) ─

const INDUSTRY_DOMAIN_OVERLAP: Record<string, string[]> = {
  food: ['culinary_arts'],
  beverage: ['culinary_arts'],
  restaurant: ['culinary_arts'],
  hospitality: ['culinary_arts', 'theater'],
  fitness: ['sports', 'martial_arts', 'dance'],
  sports: ['sports', 'martial_arts'],
  music: ['music'],
  entertainment: ['music', 'theater', 'circus_performance'],
  architecture: ['architecture'],
  construction: ['architecture'],
  real_estate: ['architecture'],
  fashion: ['fashion', 'dance'],
  apparel: ['fashion'],
  beauty: ['fashion'],
  healthcare: ['medicine'],
  pharma: ['medicine'],
  biotech: ['medicine'],
  marine: ['oceanography'],
  shipping: ['oceanography', 'cartography_exploration'],
  travel: ['cartography_exploration'],
  tourism: ['cartography_exploration'],
  agriculture: ['gardening', 'nature_wildlife'],
  gardening: ['gardening'],
  photography: ['photography'],
  media: ['photography'],
  technology: ['clockwork_mechanics'],
  engineering: ['clockwork_mechanics'],
  automotive: ['clockwork_mechanics'],
  manufacturing: ['clockwork_mechanics'],
  weather: ['weather_storms'],
  aerospace: ['astronomy'],
  space: ['astronomy'],
  history: ['archaeology', 'mythology'],
  education: ['archaeology'],
  gaming: ['mythology'],
};

// ─── Domains ──────────────────────────────────────────────

export const BISOCIATION_DOMAINS: BisociationDomainDefinition[] = [
  {
    id: 'astronomy',
    name: 'Astronomy',
    visualMetaphors: [
      'orbits and gravitational pull',
      'constellations forming patterns from chaos',
      'black holes and event horizons',
      'the vastness of scale (macro to micro)',
    ],
    emotionalTerritories: ['wonder', 'insignificance', 'discovery', 'aspiration'],
    campaignExample: {
      brand: 'Apple',
      connection:
        'The "Think Different" campaign used imagery of stars and the cosmos to associate the brand with visionary thinking.',
    },
  },
  {
    id: 'culinary_arts',
    name: 'Culinary Arts',
    visualMetaphors: [
      'raw ingredients transforming through heat and skill',
      'the precision of plating and presentation',
      'fermentation as slow, invisible progress',
      'recipes as formulas for success',
    ],
    emotionalTerritories: ['comfort', 'craftsmanship', 'sensory pleasure', 'tradition'],
    campaignExample: {
      brand: 'HSBC',
      connection:
        'Used food customs across cultures to illustrate how the same gesture means different things worldwide.',
    },
  },
  {
    id: 'sports',
    name: 'Sports',
    visualMetaphors: [
      'the starting line and the finish tape',
      'instant replay and slow-motion mastery',
      'the underdog comeback arc',
      'team formation and individual brilliance',
    ],
    emotionalTerritories: ['determination', 'triumph', 'rivalry', 'belonging'],
    campaignExample: {
      brand: 'Nike',
      connection:
        '"Just Do It" borrowed the athlete\'s internal monologue and applied it to everyone\'s daily struggles.',
    },
  },
  {
    id: 'music',
    name: 'Music',
    visualMetaphors: [
      'harmony and dissonance',
      'the crescendo building to a climax',
      'improvisation within structure (jazz)',
      'resonance and vibration spreading outward',
    ],
    emotionalTerritories: ['emotion', 'rhythm', 'unity', 'nostalgia'],
    campaignExample: {
      brand: 'Coca-Cola',
      connection:
        '"I\'d Like to Teach the World to Sing" turned a brand message into a shared musical experience.',
    },
  },
  {
    id: 'architecture',
    name: 'Architecture',
    visualMetaphors: [
      'blueprints becoming buildings',
      'load-bearing structures and invisible support',
      'doorways and thresholds as transitions',
      'ruins revealing what endures',
    ],
    emotionalTerritories: ['stability', 'ambition', 'legacy', 'shelter'],
    campaignExample: {
      brand: 'LEGO',
      connection:
        'Used architectural landmarks built from LEGO bricks to connect playful creativity with structural mastery.',
    },
  },
  {
    id: 'mythology',
    name: 'Mythology',
    visualMetaphors: [
      'the hero\'s journey and trials',
      'shape-shifting and transformation',
      'the trickster who breaks rules to reveal truth',
      'the quest for a sacred object',
    ],
    emotionalTerritories: ['destiny', 'courage', 'wonder', 'moral clarity'],
    campaignExample: {
      brand: 'Nike',
      connection:
        'Named after the Greek goddess of victory, embedding mythological triumph into every product interaction.',
    },
  },
  {
    id: 'nature_wildlife',
    name: 'Nature & Wildlife',
    visualMetaphors: [
      'migration patterns and seasonal cycles',
      'camouflage and reveal',
      'symbiosis between species',
      'the butterfly emerging from a cocoon',
    ],
    emotionalTerritories: ['renewal', 'resilience', 'interconnectedness', 'raw beauty'],
    campaignExample: {
      brand: 'WWF',
      connection:
        'The panda logo itself is a bisociation — connecting corporate branding with the vulnerability of nature.',
    },
  },
  {
    id: 'theater',
    name: 'Theater',
    visualMetaphors: [
      'masks revealing hidden identities',
      'the spotlight isolating a single truth',
      'the stage as a world within a world',
      'curtain calls and dramatic reveals',
    ],
    emotionalTerritories: ['drama', 'vulnerability', 'catharsis', 'performance'],
    campaignExample: {
      brand: 'Dos Equis',
      connection:
        '"The Most Interesting Man in the World" borrowed theatrical monologue and character acting for brand storytelling.',
    },
  },
  {
    id: 'martial_arts',
    name: 'Martial Arts',
    visualMetaphors: [
      'using the opponent\'s force against them',
      'the calm before the strike',
      'belts and ranks marking progression',
      'disciplined repetition creating mastery',
    ],
    emotionalTerritories: ['discipline', 'inner strength', 'respect', 'precision'],
    campaignExample: {
      brand: 'Under Armour',
      connection:
        'Applied the martial arts concept of "earning every inch" to athletic training messaging.',
    },
  },
  {
    id: 'cartography_exploration',
    name: 'Cartography & Exploration',
    visualMetaphors: [
      'uncharted territory and "here be dragons"',
      'compass needles finding true north',
      'contour lines revealing hidden depth',
      'the expedition journal documenting discovery',
    ],
    emotionalTerritories: ['adventure', 'curiosity', 'pioneering spirit', 'orientation'],
    campaignExample: {
      brand: 'Jeep',
      connection:
        'Used topographic map imagery and explorer narratives to position the vehicle as a gateway to uncharted experiences.',
    },
  },
  {
    id: 'medicine',
    name: 'Medicine',
    visualMetaphors: [
      'diagnosis revealing the invisible',
      'the healing scar as proof of survival',
      'the pulse as a sign of life',
      'vaccines — a small dose preventing catastrophe',
    ],
    emotionalTerritories: ['care', 'trust', 'precision', 'hope'],
    campaignExample: {
      brand: 'Dove',
      connection:
        'Applied the medical concept of "first, do no harm" to beauty, arguing against damaging beauty standards.',
    },
  },
  {
    id: 'archaeology',
    name: 'Archaeology',
    visualMetaphors: [
      'excavation layers revealing hidden histories',
      'artifacts telling stories without words',
      'piecing together fragments to see the whole',
      'the Rosetta Stone as a key to understanding',
    ],
    emotionalTerritories: ['mystery', 'patience', 'revelation', 'heritage'],
    campaignExample: {
      brand: 'Guinness',
      connection:
        '"Good things come to those who wait" borrowed archaeology\'s patient excavation as a metaphor for the slow pour.',
    },
  },
  {
    id: 'fashion',
    name: 'Fashion',
    visualMetaphors: [
      'the runway as a stage for transformation',
      'stitching and tailoring as precision work',
      'vintage revival and cyclical trends',
      'the fitting room as a space of identity exploration',
    ],
    emotionalTerritories: ['identity', 'confidence', 'self-expression', 'aspiration'],
    campaignExample: {
      brand: 'Airbnb',
      connection:
        'Applied the fashion concept of "trying on" different identities to travel — each destination lets you be someone new.',
    },
  },
  {
    id: 'circus_performance',
    name: 'Circus & Performance',
    visualMetaphors: [
      'the tightrope walker balancing risk and reward',
      'the ringmaster commanding attention',
      'juggling multiple objects in fluid motion',
      'the safety net as invisible support',
    ],
    emotionalTerritories: ['spectacle', 'risk', 'joy', 'amazement'],
    campaignExample: {
      brand: 'Red Bull',
      connection:
        'Adopted the daredevil circus performer archetype for extreme sports content, making the brand synonymous with spectacle.',
    },
  },
  {
    id: 'gardening',
    name: 'Gardening',
    visualMetaphors: [
      'seeds planted today yielding harvests tomorrow',
      'pruning to strengthen growth',
      'the greenhouse as a controlled environment for nurturing',
      'weeding out what does not serve the whole',
    ],
    emotionalTerritories: ['patience', 'nurturing', 'growth', 'seasons of life'],
    campaignExample: {
      brand: 'Mailchimp',
      connection:
        'Used gardening language ("growing your audience", "nurturing leads") to make email marketing feel organic and natural.',
    },
  },
  {
    id: 'oceanography',
    name: 'Oceanography',
    visualMetaphors: [
      'currents moving invisibly beneath the surface',
      'the deep dive into unknown territory',
      'tides as predictable yet powerful forces',
      'bioluminescence — beauty in darkness',
    ],
    emotionalTerritories: ['depth', 'mystery', 'power', 'tranquility'],
    campaignExample: {
      brand: 'Rolex',
      connection:
        'The Submariner line connected the brand with ocean exploration, using deep-sea imagery to communicate precision under pressure.',
    },
  },
  {
    id: 'clockwork_mechanics',
    name: 'Clockwork & Mechanics',
    visualMetaphors: [
      'interlocking gears in perfect synchronization',
      'the spring mechanism storing and releasing energy',
      'the pendulum finding its rhythm',
      'dismantling a machine to reveal its elegant simplicity',
    ],
    emotionalTerritories: ['precision', 'reliability', 'ingenuity', 'complexity made simple'],
    campaignExample: {
      brand: 'Honda',
      connection:
        'The "Cog" ad showed a Rube Goldberg machine made entirely of car parts — clockwork mechanics as brand philosophy.',
    },
  },
  {
    id: 'dance',
    name: 'Dance',
    visualMetaphors: [
      'the pas de deux as partnership',
      'choreography turning chaos into beauty',
      'the pirouette — spinning with control',
      'freestyle expression within a beat',
    ],
    emotionalTerritories: ['grace', 'passion', 'liberation', 'connection'],
    campaignExample: {
      brand: 'Apple',
      connection:
        'iPod silhouette ads showed dancing figures, using dance as a metaphor for the freedom and joy music brings.',
    },
  },
  {
    id: 'photography',
    name: 'Photography',
    visualMetaphors: [
      'the decisive moment frozen in time',
      'depth of field — choosing what to focus on',
      'the darkroom where negatives become positives',
      'overexposure and underexposure as extremes',
    ],
    emotionalTerritories: ['truth', 'perspective', 'memory', 'framing'],
    campaignExample: {
      brand: 'Canon',
      connection:
        'Used the idea of "seeing the world differently through a lens" to position the camera as a tool for new perspectives.',
    },
  },
  {
    id: 'weather_storms',
    name: 'Weather & Storms',
    visualMetaphors: [
      'the calm eye of the storm',
      'lightning as sudden illumination',
      'the rainbow after the rain',
      'pressure systems building before a breakthrough',
    ],
    emotionalTerritories: ['power', 'unpredictability', 'cleansing', 'awe'],
    campaignExample: {
      brand: 'Volvo',
      connection:
        'Used storm and harsh weather imagery to demonstrate vehicle safety — positioning the car as shelter in life\'s storms.',
    },
  },
  {
    id: 'alchemy',
    name: 'Alchemy',
    visualMetaphors: [
      'turning lead into gold through transformation',
      'the philosopher\'s stone as the ultimate catalyst',
      'distillation — extracting the essence',
      'the crucible where raw materials are tested by fire',
    ],
    emotionalTerritories: ['transformation', 'magic', 'ambition', 'secret knowledge'],
    campaignExample: {
      brand: 'Chanel',
      connection:
        'No. 5 was positioned as alchemy — transforming simple ingredients into something transcendent through a secret process.',
    },
  },
  {
    id: 'beekeeping',
    name: 'Beekeeping',
    visualMetaphors: [
      'the hive as organized collective intelligence',
      'pollination connecting disparate ecosystems',
      'the hexagonal honeycomb as nature\'s most efficient structure',
      'the queen bee as focal point of productivity',
    ],
    emotionalTerritories: ['community', 'industriousness', 'sweetness from effort', 'interconnection'],
    campaignExample: {
      brand: 'Burt\'s Bees',
      connection:
        'Built an entire brand identity around the beekeeping domain — naturalness, community effort, and golden rewards.',
    },
  },
];

// ─── Helper ───────────────────────────────────────────────

/**
 * Select 3 diverse bisociation domains, avoiding domains too close
 * to the brand's own industry.
 *
 * Selection strategy:
 * 1. Normalize the brand industry to find overlapping domains.
 * 2. Exclude domains that share the brand's own conceptual territory.
 * 3. Pick 3 from different emotional territory clusters for maximum
 *    creative distance.
 * 4. Selection is deterministic — the same industry always returns
 *    the same 3 domains.
 */
export function selectDomainsForBrand(
  brandIndustry: string,
): BisociationDomainDefinition[] {
  const normalized = brandIndustry.toLowerCase().replace(/[^a-z]/g, '');

  // Find which domain IDs to exclude
  const excludedIds = new Set<string>();
  for (const [industry, domainIds] of Object.entries(INDUSTRY_DOMAIN_OVERLAP)) {
    if (normalized.includes(industry) || industry.includes(normalized)) {
      for (const id of domainIds) {
        excludedIds.add(id);
      }
    }
  }

  // Filter out overlapping domains
  const candidates = BISOCIATION_DOMAINS.filter(
    (d) => !excludedIds.has(d.id),
  );

  // If exclusion left fewer than 3, use all domains
  const pool = candidates.length >= 3 ? candidates : BISOCIATION_DOMAINS;

  // Use a simple deterministic hash of the industry string to select
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);

  // Select 3 with maximum emotional distance
  const selected: BisociationDomainDefinition[] = [];
  const usedTerritories = new Set<string>();

  // First pass: pick domains whose primary emotional territory is unique
  const startIdx = hash % pool.length;
  for (let i = 0; i < pool.length && selected.length < 3; i++) {
    const idx = (startIdx + i) % pool.length;
    const domain = pool[idx];
    const primaryTerritory = domain.emotionalTerritories[0];

    if (!usedTerritories.has(primaryTerritory)) {
      selected.push(domain);
      for (const t of domain.emotionalTerritories) {
        usedTerritories.add(t);
      }
    }
  }

  // Second pass: fill remaining slots if needed
  for (let i = 0; i < pool.length && selected.length < 3; i++) {
    const idx = (startIdx + i) % pool.length;
    const domain = pool[idx];
    if (!selected.includes(domain)) {
      selected.push(domain);
    }
  }

  return selected;
}
