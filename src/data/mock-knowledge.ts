export interface Knowledge {
  id: string;
  title: string;
  category: 'best-practice' | 'case-study' | 'research' | 'framework' | 'insight';
  description: string;
  source?: string;
  industry?: string;
  applicability: 'universal' | 'industry-specific' | 'niche';
  keyTakeaway?: string;
}

export const mockKnowledge: Knowledge[] = [
  {
    id: 'know-1',
    title: 'The Rule of 7 in Marketing',
    category: 'best-practice',
    description: 'Consumers need to see a message 7 times before taking action',
    source: 'Marketing Psychology Research',
    applicability: 'universal',
    keyTakeaway: 'Plan for 7+ touchpoints in your campaign for optimal conversion'
  },
  {
    id: 'know-2',
    title: 'Nike\'s Digital Transformation',
    category: 'case-study',
    description: 'How Nike became a digital-first brand through direct-to-consumer strategy',
    source: 'Nike Annual Reports & Analysis',
    industry: 'Retail/Fashion',
    applicability: 'industry-specific',
    keyTakeaway: 'DTC channels can drive 40% higher margins and deeper customer relationships'
  },
  {
    id: 'know-3',
    title: 'Jobs-to-be-Done Framework',
    category: 'framework',
    description: 'Understanding customer needs through the "jobs" they hire products to do',
    source: 'Clayton Christensen',
    applicability: 'universal',
    keyTakeaway: 'Focus on the problem customers are trying to solve, not just product features'
  },
  {
    id: 'know-4',
    title: 'Color Psychology in Branding',
    category: 'research',
    description: 'How different colors influence perception and purchase decisions',
    source: 'Consumer Psychology Studies',
    applicability: 'universal',
    keyTakeaway: 'Color increases brand recognition by 80%; choose colors aligned with brand personality'
  },
  {
    id: 'know-5',
    title: 'Apple\'s Product Launch Formula',
    category: 'case-study',
    description: 'The systematic approach Apple uses to create anticipation and drive demand',
    source: 'Apple Product Launch Analysis',
    industry: 'Technology',
    applicability: 'universal',
    keyTakeaway: 'Build anticipation through controlled information release and storytelling'
  },
  {
    id: 'know-6',
    title: 'Hook Model for User Engagement',
    category: 'framework',
    description: 'Four-step process to build habit-forming products: Trigger, Action, Reward, Investment',
    source: 'Nir Eyal - Hooked',
    applicability: 'universal',
    keyTakeaway: 'Create product experiences that naturally become part of users\' routines'
  },
  {
    id: 'know-7',
    title: 'The Paradox of Choice',
    category: 'insight',
    description: 'Too many options lead to decision paralysis and lower satisfaction',
    source: 'Barry Schwartz Research',
    applicability: 'universal',
    keyTakeaway: 'Limit choices to 3-5 options to optimize conversion and satisfaction'
  },
  {
    id: 'know-8',
    title: 'Airbnb\'s Growth Hacking Strategy',
    category: 'case-study',
    description: 'How Airbnb leveraged Craigslist integration and community building for explosive growth',
    source: 'Growth Marketing Case Studies',
    industry: 'Travel/Hospitality',
    applicability: 'industry-specific',
    keyTakeaway: 'Find creative ways to leverage existing platforms and communities'
  },
  {
    id: 'know-9',
    title: 'Golden Ratio in Design',
    category: 'best-practice',
    description: 'Using the 1.618 ratio to create aesthetically pleasing and balanced designs',
    source: 'Design Theory',
    applicability: 'universal',
    keyTakeaway: 'Apply golden ratio to layouts, typography, and visual hierarchy for harmonious designs'
  },
  {
    id: 'know-10',
    title: 'Peak-End Rule',
    category: 'research',
    description: 'People judge experiences based on peak moments and endings, not averages',
    source: 'Daniel Kahneman Research',
    applicability: 'universal',
    keyTakeaway: 'Design memorable peak moments and strong endings in customer journeys'
  }
];
