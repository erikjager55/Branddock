import type { StrategyType, InitialObjective } from '../types/business-strategy.types';

export interface StrategyTemplate {
  id: string;
  label: string;
  description: string;
  type: StrategyType;
  name: string;
  strategyDescription: string;
  vision: string;
  focusAreas: string[];
  objectives: InitialObjective[];
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'growth-scale',
    label: 'Growth & Scale',
    description: 'Revenue growth, market expansion, and customer acquisition',
    type: 'GROWTH',
    name: 'Growth & Scale Strategy',
    strategyDescription: 'Accelerate revenue growth through market expansion, customer acquisition, and retention optimization.',
    vision: 'Become the market leader in our segment within the next 12 months.',
    focusAreas: ['Revenue Growth', 'Customer Acquisition', 'Market Expansion'],
    objectives: [
      { title: 'Increase monthly recurring revenue by 30%', keyResults: ['Acquire 50 new customers', 'Reduce churn to under 5%'] },
      { title: 'Expand into 2 new market segments', keyResults: ['Complete market research', 'Launch pilot in first segment'] },
    ],
  },
  {
    id: 'product-launch',
    label: 'Product Launch',
    description: 'New product introduction with go-to-market strategy',
    type: 'PRODUCT_LAUNCH',
    name: 'Product Launch Strategy',
    strategyDescription: 'Successfully launch a new product with a comprehensive go-to-market plan covering positioning, messaging, and distribution.',
    vision: 'Deliver a product that sets a new standard in the market.',
    focusAreas: ['Product Readiness', 'Go-to-Market', 'Launch Execution'],
    objectives: [
      { title: 'Achieve product-market fit validation', keyResults: ['Conduct 20 customer interviews', 'Reach 100 beta sign-ups'] },
      { title: 'Execute launch campaign', keyResults: ['Prepare 10 content pieces', 'Secure 3 media placements'] },
    ],
  },
  {
    id: 'brand-building',
    label: 'Brand Building',
    description: 'Strengthen brand identity, awareness, and authority',
    type: 'BRAND_BUILDING',
    name: 'Brand Building Strategy',
    strategyDescription: 'Build a strong and recognizable brand through consistent messaging, thought leadership, and audience engagement.',
    vision: 'Establish our brand as the trusted authority in our industry.',
    focusAreas: ['Brand Identity', 'Thought Leadership', 'Community'],
    objectives: [
      { title: 'Increase brand awareness by 40%', keyResults: ['Grow social following by 25%', 'Publish 12 thought leadership articles'] },
      { title: 'Build engaged community', keyResults: ['Launch community platform', 'Reach 500 active members'] },
    ],
  },
  {
    id: 'market-entry',
    label: 'Market Entry',
    description: 'Enter a new geographic or vertical market',
    type: 'MARKET_ENTRY',
    name: 'Market Entry Strategy',
    strategyDescription: 'Strategically enter a new market with localized positioning, partnerships, and competitive analysis.',
    vision: 'Establish a strong foothold in the new market within 6 months.',
    focusAreas: ['Market Research', 'Localization', 'Partnerships'],
    objectives: [
      { title: 'Complete market analysis and positioning', keyResults: ['Analyze top 5 competitors', 'Define local value proposition'] },
      { title: 'Establish initial partnerships', keyResults: ['Sign 2 local distribution partners', 'Launch localized website'] },
    ],
  },
  {
    id: 'operational-excellence',
    label: 'Operational Excellence',
    description: 'Optimize processes, reduce costs, and improve efficiency',
    type: 'OPERATIONAL_EXCELLENCE',
    name: 'Operational Excellence Strategy',
    strategyDescription: 'Drive efficiency gains and cost reduction through process optimization, automation, and performance management.',
    vision: 'Achieve industry-leading operational efficiency.',
    focusAreas: ['Process Optimization', 'Automation', 'Cost Reduction'],
    objectives: [
      { title: 'Reduce operational costs by 20%', keyResults: ['Automate 5 manual processes', 'Renegotiate top 3 vendor contracts'] },
      { title: 'Improve team productivity', keyResults: ['Implement project management tool', 'Reduce meeting time by 30%'] },
    ],
  },
];
