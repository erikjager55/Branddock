/**
 * Goldenberg Creativity Templates — 8 Systematic Creativity Patterns
 *
 * Based on Jacob Goldenberg's research (Marketing Science, 1999) which found
 * that 89% of award-winning ads follow one of a small set of systematic
 * creativity templates. These templates provide structured creative frameworks
 * for campaign ideation.
 *
 * @see Goldenberg, J., Mazursky, D., & Solomon, S. (1999). "The Fundamental
 *   Templates of Quality Ads." Marketing Science, 18(3), 333-351.
 */

// ─── Types ────────────────────────────────────────────────

export type GoldenbergTemplate =
  | 'unification'
  | 'activation'
  | 'metaphor'
  | 'subtraction'
  | 'extreme_consequence'
  | 'absurd_alternative'
  | 'inversion'
  | 'extreme_effort';

export interface GoldenbergTemplateDefinition {
  id: GoldenbergTemplate;
  name: string;
  description: string;
  mechanism: string;
  /** Famous campaign examples that used this template */
  examples: Array<{ campaign: string; brand: string; howItApplied: string }>;
  /** Which campaign goal types this template works best for */
  bestForGoals: string[];
  /** Risk level: how hard is it to execute well? */
  executionDifficulty: 'low' | 'medium' | 'high';
}

// ─── Template Families (used for diversity selection) ─────

const TEMPLATE_FAMILY: Record<GoldenbergTemplate, string> = {
  unification: 'replacement',
  activation: 'replacement',
  metaphor: 'replacement',
  subtraction: 'replacement',
  extreme_consequence: 'consequence',
  absurd_alternative: 'consequence',
  inversion: 'perspective',
  extreme_effort: 'perspective',
};

// ─── Templates ────────────────────────────────────────────

export const GOLDENBERG_TEMPLATES: GoldenbergTemplateDefinition[] = [
  {
    id: 'unification',
    name: 'Unification',
    description:
      'An existing element in the ad environment takes on an additional, unexpected role — it simultaneously serves its original purpose and communicates the brand message.',
    mechanism:
      'Identify a component already present in the medium or environment (a billboard shadow, a bus door, a magazine crease) and assign it a second function that demonstrates the product benefit.',
    examples: [
      {
        campaign: 'Sundial Billboard',
        brand: 'McDonald\'s',
        howItApplied:
          'A billboard cast a shadow that acted as a sundial, pointing to different menu items depending on the time of day — breakfast, lunch, dinner.',
      },
      {
        campaign: 'Bus Shelter Oven',
        brand: 'Caribou Coffee',
        howItApplied:
          'A bus shelter was converted into a functioning oven, heating passengers while demonstrating the warmth of their coffee.',
      },
      {
        campaign: 'Bench Press Bench',
        brand: 'Gold\'s Gym',
        howItApplied:
          'A park bench was designed to look like a bench press, turning everyday street furniture into a gym reminder.',
      },
    ],
    bestForGoals: [
      'BRAND_AWARENESS',
      'AUDIENCE_ENGAGEMENT',
      'EVENT_SEASONAL',
    ],
    executionDifficulty: 'high',
  },
  {
    id: 'activation',
    name: 'Activation',
    description:
      'The ad requires the viewer to physically or mentally participate — the message is incomplete until the audience interacts with it.',
    mechanism:
      'Design the communication so that the audience must perform an action (tear, fold, scan, walk around, tilt) to reveal or complete the brand message.',
    examples: [
      {
        campaign: 'Peel-Off Sunburn Ad',
        brand: 'Nivea',
        howItApplied:
          'A magazine ad had a peel-off layer simulating sunburned skin. Peeling it revealed healthy skin underneath with the product message.',
      },
      {
        campaign: 'Scratch & Sniff Menu',
        brand: 'KFC',
        howItApplied:
          'A print ad that smelled like fried chicken when scratched, turning passive readers into active participants.',
      },
      {
        campaign: 'Interactive Billboard',
        brand: 'British Airways',
        howItApplied:
          'A digital billboard showed a child pointing at actual BA planes flying overhead, using real flight data to trigger the interaction.',
      },
    ],
    bestForGoals: [
      'AUDIENCE_ENGAGEMENT',
      'PRODUCT_LAUNCH',
      'COMMUNITY_BUILDING',
    ],
    executionDifficulty: 'medium',
  },
  {
    id: 'metaphor',
    name: 'Metaphor',
    description:
      'A symbolic representation replaces the literal communication — an unrelated object or scenario stands in for the product benefit, creating a vivid analogy.',
    mechanism:
      'Replace the product or its benefit with a symbol from a different domain that shares one essential quality. The audience decodes the connection, making the message more memorable.',
    examples: [
      {
        campaign: 'Iceberg Lettuce',
        brand: 'Volkswagen',
        howItApplied:
          'A tiny VW car was shown on top of a massive iceberg, metaphorically communicating that most of the car\'s value is hidden beneath the surface.',
      },
      {
        campaign: 'Feather Landing',
        brand: 'FedEx',
        howItApplied:
          'A fragile package was shown landing as gently as a feather, symbolizing careful handling without stating it literally.',
      },
      {
        campaign: 'Swiss Army Knife of Apps',
        brand: 'Apple',
        howItApplied:
          'The iPhone was positioned as a Swiss Army knife — one tool that replaces many — through visual metaphor in early advertising.',
      },
    ],
    bestForGoals: [
      'BRAND_AWARENESS',
      'REBRANDING',
      'THOUGHT_LEADERSHIP',
    ],
    executionDifficulty: 'medium',
  },
  {
    id: 'subtraction',
    name: 'Subtraction',
    description:
      'A key element is deliberately removed from the ad — its conspicuous absence tells the story more powerfully than its presence ever could.',
    mechanism:
      'Remove the product, the logo, or a critical visual element. The void creates tension that the viewer resolves by mentally filling in the missing piece with the brand message.',
    examples: [
      {
        campaign: 'No Logo Whopper',
        brand: 'Burger King',
        howItApplied:
          'Showed a Whopper with no branding at all — the product was so recognizable it needed no logo, proving iconic status.',
      },
      {
        campaign: 'Missing M',
        brand: 'McDonald\'s',
        howItApplied:
          'Removed the M from packaging during International Women\'s Day, flipping it to a W — the absence made the statement.',
      },
      {
        campaign: 'Invisible Car',
        brand: 'Mercedes-Benz',
        howItApplied:
          'Covered a car in LED panels showing the scenery behind it, making it "invisible" to demonstrate zero-emission technology.',
      },
    ],
    bestForGoals: [
      'BRAND_AWARENESS',
      'REBRANDING',
      'CSR_IMPACT',
    ],
    executionDifficulty: 'high',
  },
  {
    id: 'extreme_consequence',
    name: 'Extreme Consequence',
    description:
      'The result of using (or not using) the product is exaggerated to an absurd or extreme degree, making the benefit impossible to ignore.',
    mechanism:
      'Take the core benefit and push it to its logical extreme. What would happen if the product worked perfectly? What disaster would occur without it? Show that extreme scenario.',
    examples: [
      {
        campaign: 'Irresistible Taste',
        brand: 'Doritos',
        howItApplied:
          'People crashed through walls, fought animals, and caused chaos — all because the chips were so irresistibly tasty.',
      },
      {
        campaign: 'So Clean You Can Eat Off It',
        brand: 'Mr. Clean',
        howItApplied:
          'Showed a floor so clean that a chef prepared an entire meal directly on it, exaggerating the cleaning power.',
      },
      {
        campaign: 'Unbreakable Luggage',
        brand: 'Samsonite',
        howItApplied:
          'Showed luggage surviving being run over by a car, thrown from buildings, and attacked by gorillas — extreme durability.',
      },
    ],
    bestForGoals: [
      'PRODUCT_LAUNCH',
      'SALES_ACTIVATION',
      'BRAND_AWARENESS',
    ],
    executionDifficulty: 'low',
  },
  {
    id: 'absurd_alternative',
    name: 'Absurd Alternative',
    description:
      'A ridiculous, impractical, or comically inferior alternative to the product is shown — highlighting by contrast how much better and simpler the real solution is.',
    mechanism:
      'Show what life would look like if the product did not exist. The alternative should be so absurd that the audience immediately appreciates the elegance of the actual product.',
    examples: [
      {
        campaign: 'Carrier Pigeon Email',
        brand: 'Gmail',
        howItApplied:
          'Depicted people trying to send messages via carrier pigeons, smoke signals, and message bottles — making email seem miraculous.',
      },
      {
        campaign: 'Human GPS',
        brand: 'TomTom',
        howItApplied:
          'Showed a person physically sitting on the car roof giving turn-by-turn directions — the absurd alternative to a GPS device.',
      },
      {
        campaign: 'Manual Autocorrect',
        brand: 'Grammarly',
        howItApplied:
          'Depicted a tiny person inside a computer physically rearranging letters — the ridiculous alternative to automated writing assistance.',
      },
    ],
    bestForGoals: [
      'PRODUCT_LAUNCH',
      'MARKET_EXPANSION',
      'CONTENT_MARKETING',
    ],
    executionDifficulty: 'low',
  },
  {
    id: 'inversion',
    name: 'Inversion',
    description:
      'Roles, perspectives, or expectations are reversed — the ad shows the world from an unexpected viewpoint, flipping conventional logic on its head.',
    mechanism:
      'Swap the roles of product and user, brand and competitor, problem and solution, or any other pair. The reversal creates surprise and forces re-evaluation of assumptions.',
    examples: [
      {
        campaign: 'Don\'t Buy This Jacket',
        brand: 'Patagonia',
        howItApplied:
          'A brand telling customers NOT to buy its product — inverting the commercial relationship to demonstrate environmental commitment.',
      },
      {
        campaign: 'The Dog\'s Perspective',
        brand: 'Pedigree',
        howItApplied:
          'Shot entirely from a dog\'s point of view, showing the world through the eyes of the consumer (the dog, not the human buyer).',
      },
      {
        campaign: 'Reverse Robbery',
        brand: 'IKEA',
        howItApplied:
          'Showed "burglars" breaking INTO homes to leave IKEA furniture — inverting the robbery concept to show products are irresistibly desirable.',
      },
    ],
    bestForGoals: [
      'REBRANDING',
      'CSR_IMPACT',
      'THOUGHT_LEADERSHIP',
      'EMPLOYER_BRANDING',
    ],
    executionDifficulty: 'medium',
  },
  {
    id: 'extreme_effort',
    name: 'Extreme Effort',
    description:
      'Someone goes to absurd, heroic, or obsessive lengths to obtain, protect, or use the product — the extreme effort signals the product\'s extraordinary value.',
    mechanism:
      'Show a character enduring hardship, traveling impossible distances, or performing ridiculous feats — all to get or keep the product. The effort becomes proof of the product\'s worth.',
    examples: [
      {
        campaign: 'Man\'s Best Friend',
        brand: 'Budweiser',
        howItApplied:
          'A puppy traveled across the country, braving storms and highways, to reunite with its Clydesdale friend — extreme effort driven by love (and brand).',
      },
      {
        campaign: 'Epic Journey for a Pepsi',
        brand: 'Pepsi',
        howItApplied:
          'A man traversed deserts, climbed mountains, and swam rivers — all to reach a vending machine, showing extreme effort for one drink.',
      },
      {
        campaign: 'The Lengths We Go To',
        brand: 'John Lewis',
        howItApplied:
          'Showed a child counting down to Christmas — not to receive gifts, but to give one. The extreme patience and effort signaled emotional depth of the brand.',
      },
    ],
    bestForGoals: [
      'BRAND_AWARENESS',
      'LOYALTY_RETENTION',
      'AUDIENCE_ENGAGEMENT',
    ],
    executionDifficulty: 'medium',
  },
];

// ─── Helper ───────────────────────────────────────────────

/**
 * Select 3 diverse templates appropriate for the given goal type.
 *
 * Selection strategy:
 * 1. Filter templates whose `bestForGoals` includes the goal type.
 * 2. If fewer than 3 match, include all templates as candidates.
 * 3. Pick 3 ensuring no two share the same template "family"
 *    (replacement, consequence, perspective).
 * 4. Selection is deterministic — the same goal type always returns
 *    the same 3 templates.
 */
export function selectTemplatesForGoal(
  goalType: string,
): GoldenbergTemplateDefinition[] {
  const upper = goalType.toUpperCase();

  // Score each template: matching goal gets priority
  const scored = GOLDENBERG_TEMPLATES.map((t) => ({
    template: t,
    score: t.bestForGoals.includes(upper) ? 1 : 0,
    family: TEMPLATE_FAMILY[t.id],
  }));

  // Sort by score descending, then by array index for determinism
  scored.sort((a, b) => b.score - a.score);

  // Pick up to 3, ensuring family diversity
  const selected: GoldenbergTemplateDefinition[] = [];
  const usedFamilies = new Set<string>();

  for (const item of scored) {
    if (selected.length >= 3) break;
    if (!usedFamilies.has(item.family)) {
      selected.push(item.template);
      usedFamilies.add(item.family);
    }
  }

  // If we still have fewer than 3 (unlikely), fill from remaining
  if (selected.length < 3) {
    for (const item of scored) {
      if (selected.length >= 3) break;
      if (!selected.includes(item.template)) {
        selected.push(item.template);
      }
    }
  }

  return selected;
}
