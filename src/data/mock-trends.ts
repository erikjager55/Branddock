export interface Trend {
  id: string;
  title: string;
  category: 'technology' | 'consumer' | 'social' | 'business' | 'environmental';
  description: string;
  impact: 'high' | 'medium' | 'low';
  timeframe: 'short-term' | 'medium-term' | 'long-term';
  relevantIndustries: string[];
  keyInsights?: string;
  // Additional fields for Trend Library display
  direction?: 'rising' | 'declining' | 'stable';
  relevance?: number;
  sources?: string[];
  dateAdded?: string;
  tags?: string[];
  // NEW: Strategic level segmentation
  level?: 'micro' | 'meso' | 'macro';
}

export const mockTrends: Trend[] = [
  {
    id: 'trend-1',
    title: 'AI-Powered Personalization',
    category: 'technology',
    description: 'Artificial intelligence enabling hyper-personalized customer experiences at scale',
    impact: 'high',
    timeframe: 'short-term',
    relevantIndustries: ['E-commerce', 'Marketing', 'Media', 'Financial Services'],
    keyInsights: 'Consumers expect personalized interactions; brands using AI see 30% higher engagement',
    direction: 'rising',
    relevance: 95,
    sources: ['McKinsey Report', 'TechCrunch', 'Industry Survey'],
    dateAdded: '2025-12-20',
    tags: ['AI', 'Personalization', 'Customer Experience'],
    level: 'micro'
  },
  {
    id: 'trend-2',
    title: 'Sustainability as Standard',
    category: 'environmental',
    description: 'Environmental consciousness shifting from nice-to-have to business imperative',
    impact: 'high',
    timeframe: 'long-term',
    relevantIndustries: ['Retail', 'Manufacturing', 'Fashion', 'Food & Beverage'],
    keyInsights: '70% of consumers willing to pay premium for sustainable products',
    direction: 'rising',
    relevance: 88,
    sources: ['Nielsen Study', 'Deloitte Research', 'Brand Finance'],
    dateAdded: '2025-12-19',
    tags: ['Sustainability', 'Brand Values', 'Consumer Behavior'],
    level: 'macro'
  },
  {
    id: 'trend-3',
    title: 'Remote-First Work Culture',
    category: 'social',
    description: 'Permanent shift to distributed workforce and digital collaboration',
    impact: 'high',
    timeframe: 'medium-term',
    relevantIndustries: ['Technology', 'Professional Services', 'Education', 'Healthcare'],
    keyInsights: 'Companies offering flexibility see 25% better talent retention',
    direction: 'rising',
    relevance: 82,
    sources: ['Gartner', 'Harvard Business Review', 'Remote Work Report'],
    dateAdded: '2025-12-18',
    tags: ['Remote Work', 'Culture', 'Flexibility'],
    level: 'meso'
  },
  {
    id: 'trend-4',
    title: 'Micro-Moment Marketing',
    category: 'consumer',
    description: 'Consumers making decisions in split seconds on mobile devices',
    impact: 'high',
    timeframe: 'short-term',
    relevantIndustries: ['Retail', 'Travel', 'Finance', 'Entertainment'],
    keyInsights: '80% of purchase decisions happen in 3-second micro-moments',
    direction: 'rising',
    relevance: 90,
    sources: ['Google Think', 'eMarketer', 'Mobile Commerce Study'],
    dateAdded: '2025-12-17',
    tags: ['Mobile', 'Marketing', 'Consumer Behavior'],
    level: 'micro'
  },
  {
    id: 'trend-5',
    title: 'Community Commerce',
    category: 'business',
    description: 'Social commerce and community-driven purchasing decisions',
    impact: 'medium',
    timeframe: 'short-term',
    relevantIndustries: ['E-commerce', 'Social Media', 'Beauty', 'Fashion'],
    keyInsights: 'Community recommendations drive 5x higher conversion than ads',
    direction: 'rising',
    relevance: 85,
    sources: ['Social Commerce Report', 'Shopify Research', 'Community Study'],
    dateAdded: '2025-12-16',
    tags: ['Social Commerce', 'Community', 'E-commerce'],
    level: 'meso'
  },
  {
    id: 'trend-6',
    title: 'Privacy-First Data Strategies',
    category: 'technology',
    description: 'End of third-party cookies driving new approaches to customer data',
    impact: 'high',
    timeframe: 'short-term',
    relevantIndustries: ['Marketing', 'Technology', 'Media', 'E-commerce'],
    keyInsights: 'First-party data strategies becoming competitive advantage',
    direction: 'rising',
    relevance: 92,
    sources: ['Privacy Report', 'Google Research', 'AdTech Study'],
    dateAdded: '2025-12-15',
    tags: ['Privacy', 'Data', 'Marketing Technology'],
    level: 'micro'
  },
  {
    id: 'trend-7',
    title: 'Experience Economy',
    category: 'consumer',
    description: 'Consumers prioritizing memorable experiences over material possessions',
    impact: 'high',
    timeframe: 'long-term',
    relevantIndustries: ['Travel', 'Entertainment', 'Retail', 'Hospitality'],
    keyInsights: 'Experience-focused brands see 40% higher customer loyalty',
    direction: 'rising',
    relevance: 87,
    sources: ['Experience Economy Report', 'Consumer Trends', 'Loyalty Study'],
    dateAdded: '2025-12-14',
    tags: ['Experience', 'Customer Loyalty', 'Brand Strategy'],
    level: 'macro'
  }
];