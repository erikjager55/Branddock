import { 
  Megaphone, 
  Lightbulb, 
  TrendingUp, 
  Users, 
  Target,
  Rocket,
  Palette,
  Map,
  Zap,
  BarChart3,
  Package,
  Heart,
  Globe,
  Layers,
  ArrowUpRight,
  MessageSquare,
  Calendar,
  Sparkles,
  Award,
  ShoppingCart,
  Radio
} from 'lucide-react';
import { StrategyTool, StrategyCategory } from '../types/strategy';

// Comprehensive strategy tools library
export const strategyTools: StrategyTool[] = [
  // ===== MARKETING & GROWTH STRATEGIES =====
  {
    id: 'campaign-strategy-generator',
    name: 'Campaign Strategy Generator',
    category: 'marketing-growth',
    tagline: 'Create data-driven marketing campaigns',
    description: 'Generate comprehensive campaign strategies based on your brand positioning, target personas, and research insights.',
    icon: Megaphone,
    color: 'blue',
    status: 'available',
    outputs: {
      primary: 'Campaign Strategy Brief',
      formats: ['brief', 'roadmap', 'action-plan'],
      estimatedTime: '5-10 minutes'
    },
    inputs: {
      required: [
        {
          type: 'brand-asset',
          count: 2,
          description: 'Brand positioning and messaging'
        },
        {
          type: 'persona',
          count: 1,
          description: 'Target audience personas'
        }
      ],
      optional: [
        {
          type: 'product',
          count: 1,
          optional: true,
          description: 'Products or services to feature in the campaign'
        },
        {
          type: 'trend',
          count: 1,
          optional: true,
          description: 'Market trends and opportunities to leverage'
        },
        {
          type: 'knowledge',
          count: 1,
          optional: true,
          description: 'Industry insights and best practices'
        }
      ]
    },
    aiLevel: 'fully-generated',
    useCases: [
      'Launch a new product or service',
      'Increase brand awareness in target market',
      'Drive specific business objectives (leads, sales, engagement)'
    ],
    exampleOutput: 'Complete campaign brief with objectives, messaging, channel strategy, and KPIs',
    complexity: 'medium',
    businessValue: 'strategic',
    requiresResearch: true,
    minimumResearchPlans: 1,
    badge: 'Most Popular',
    popularityScore: 95
  },
  
  {
    id: 'content-strategy-planner',
    name: 'Content Strategy Planner',
    category: 'marketing-growth',
    tagline: 'Plan your content ecosystem',
    description: 'Build a comprehensive content strategy aligned with your brand voice and audience needs.',
    icon: Calendar,
    color: 'blue',
    status: 'available',
    outputs: {
      primary: 'Content Strategy Framework',
      formats: ['framework', 'roadmap'],
      estimatedTime: '7-12 minutes'
    },
    inputs: {
      required: [
        {
          type: 'brand-asset',
          count: 2,
          description: 'Brand voice, messaging, and values'
        },
        {
          type: 'persona',
          count: 2,
          description: 'Content consumer personas'
        }
      ]
    },
    aiLevel: 'ai-assisted',
    useCases: [
      'Build consistent content across channels',
      'Align content with customer journey stages',
      'Optimize content for different personas'
    ],
    complexity: 'medium',
    businessValue: 'strategic',
    requiresResearch: true,
    badge: 'High Value'
  },

  {
    id: 'channel-strategy-advisor',
    name: 'Channel Strategy Advisor',
    category: 'marketing-growth',
    tagline: 'Optimize your marketing channels',
    description: 'Get personalized recommendations on which marketing channels to prioritize based on your audience and goals.',
    icon: Radio,
    color: 'blue',
    status: 'available',
    outputs: {
      primary: 'Channel Mix Recommendation',
      formats: ['framework', 'action-plan'],
      estimatedTime: '5-8 minutes'
    },
    inputs: {
      required: [
        {
          type: 'persona',
          count: 1,
          description: 'Target audience analysis'
        }
      ],
      optional: [
        {
          type: 'research-plan',
          count: 1,
          optional: true,
          description: 'Market or competitive research'
        }
      ]
    },
    aiLevel: 'ai-assisted',
    useCases: [
      'Allocate marketing budget efficiently',
      'Reach specific audience segments',
      'Test new marketing channels'
    ],
    complexity: 'low',
    businessValue: 'tactical'
  },

  {
    id: 'messaging-framework-builder',
    name: 'Messaging Framework Builder',
    category: 'marketing-growth',
    tagline: 'Craft consistent brand messages',
    description: 'Create a messaging hierarchy that ensures consistency across all touchpoints and audiences.',
    icon: MessageSquare,
    color: 'blue',
    status: 'available',
    outputs: {
      primary: 'Messaging Framework',
      formats: ['framework'],
      estimatedTime: '10-15 minutes'
    },
    inputs: {
      required: [
        {
          type: 'brand-asset',
          count: 3,
          description: 'Brand purpose, positioning, and values'
        },
        {
          type: 'persona',
          count: 2,
          description: 'Key audience segments'
        }
      ]
    },
    aiLevel: 'fully-generated',
    useCases: [
      'Align messaging across teams',
      'Differentiate from competitors',
      'Tailor messages to different personas'
    ],
    complexity: 'high',
    businessValue: 'strategic',
    requiresResearch: true,
    badge: 'Strategic'
  },

  // ===== PRODUCT & INNOVATION STRATEGIES =====
  {
    id: 'product-concept-generator',
    name: 'Product Concept Generator',
    category: 'product-innovation',
    tagline: 'Discover new product opportunities',
    description: 'Generate innovative product concepts based on persona needs, market trends, and your brand capabilities.',
    icon: Lightbulb,
    color: 'purple',
    status: 'available',
    outputs: {
      primary: 'Product Concept Brief',
      formats: ['brief', 'canvas'],
      estimatedTime: '8-15 minutes'
    },
    inputs: {
      required: [
        {
          type: 'persona',
          count: 2,
          description: 'Target customer personas'
        }
      ],
      optional: [
        {
          type: 'trend',
          count: 1,
          optional: true,
          description: 'Market trends and opportunities'
        },
        {
          type: 'research-plan',
          count: 1,
          optional: true,
          description: 'Customer research insights'
        }
      ]
    },
    aiLevel: 'fully-generated',
    useCases: [
      'Explore new revenue streams',
      'Address unmet customer needs',
      'Leverage emerging trends'
    ],
    complexity: 'high',
    businessValue: 'transformational',
    requiresResearch: true,
    minimumResearchPlans: 1,
    badge: 'Innovation',
    popularityScore: 88
  },

  {
    id: 'feature-prioritization-matrix',
    name: 'Feature Prioritization Matrix',
    category: 'product-innovation',
    tagline: 'Prioritize what to build next',
    description: 'Create a data-driven prioritization framework for product features based on customer value and business impact.',
    icon: Layers,
    color: 'purple',
    status: 'available',
    outputs: {
      primary: 'Prioritization Framework',
      formats: ['framework', 'roadmap'],
      estimatedTime: '10-12 minutes'
    },
    inputs: {
      required: [
        {
          type: 'persona',
          count: 1,
          description: 'User needs and pain points'
        },
        {
          type: 'research-plan',
          count: 1,
          description: 'User research or validation data'
        }
      ]
    },
    aiLevel: 'ai-assisted',
    useCases: [
      'Align product roadmap with user needs',
      'Maximize ROI on development efforts',
      'Balance quick wins with strategic bets'
    ],
    complexity: 'medium',
    businessValue: 'strategic',
    requiresResearch: true
  },

  {
    id: 'service-design-blueprint',
    name: 'Service Design Blueprint',
    category: 'product-innovation',
    tagline: 'Design exceptional service experiences',
    description: 'Map out your service delivery including frontstage, backstage, and support processes.',
    icon: Map,
    color: 'purple',
    status: 'available',
    outputs: {
      primary: 'Service Blueprint',
      formats: ['canvas', 'framework'],
      estimatedTime: '15-20 minutes'
    },
    inputs: {
      required: [
        {
          type: 'persona',
          count: 1,
          description: 'Service users'
        },
        {
          type: 'brand-asset',
          count: 1,
          description: 'Brand values and promise'
        }
      ]
    },
    aiLevel: 'guided',
    useCases: [
      'Optimize service delivery',
      'Identify improvement opportunities',
      'Train service teams'
    ],
    complexity: 'high',
    businessValue: 'strategic'
  },

  {
    id: 'innovation-opportunity-scanner',
    name: 'Innovation Opportunity Scanner',
    category: 'product-innovation',
    tagline: 'Spot market white spaces',
    description: 'Identify untapped opportunities by analyzing trends, competitor gaps, and customer needs.',
    icon: Sparkles,
    color: 'purple',
    status: 'available',
    outputs: {
      primary: 'Innovation Opportunity Report',
      formats: ['brief', 'framework'],
      estimatedTime: '12-18 minutes'
    },
    inputs: {
      required: [
        {
          type: 'trend',
          count: 2,
          description: 'Market trends and shifts'
        },
        {
          type: 'persona',
          count: 2,
          description: 'Customer segments'
        }
      ],
      optional: [
        {
          type: 'research-plan',
          count: 1,
          optional: true,
          description: 'Competitive or market research'
        }
      ]
    },
    aiLevel: 'fully-generated',
    useCases: [
      'Find blue ocean opportunities',
      'Identify emerging customer needs',
      'Spot convergence opportunities'
    ],
    complexity: 'high',
    businessValue: 'transformational',
    badge: 'High Impact'
  },

  // ===== BUSINESS STRATEGY =====
  {
    id: 'go-to-market-strategy',
    name: 'Go-to-Market Strategy',
    category: 'business-strategy',
    tagline: 'Launch successfully into market',
    description: 'Create a comprehensive go-to-market plan including positioning, pricing, distribution, and launch tactics.',
    icon: Rocket,
    color: 'green',
    status: 'available',
    outputs: {
      primary: 'GTM Strategy Document',
      formats: ['brief', 'roadmap', 'action-plan'],
      estimatedTime: '15-20 minutes'
    },
    inputs: {
      required: [
        {
          type: 'brand-asset',
          count: 2,
          description: 'Brand positioning and value prop'
        },
        {
          type: 'persona',
          count: 2,
          description: 'Target market segments'
        }
      ],
      optional: [
        {
          type: 'research-plan',
          count: 1,
          optional: true,
          description: 'Market validation research'
        }
      ]
    },
    aiLevel: 'fully-generated',
    useCases: [
      'Launch new products or services',
      'Enter new markets',
      'Reposition existing offerings'
    ],
    complexity: 'high',
    businessValue: 'transformational',
    requiresResearch: true,
    badge: 'Complete',
    popularityScore: 92
  },

  {
    id: 'competitive-positioning-framework',
    name: 'Competitive Positioning Framework',
    category: 'business-strategy',
    tagline: 'Stand out from the competition',
    description: 'Develop a clear competitive positioning strategy that highlights your unique advantages.',
    icon: Target,
    color: 'green',
    status: 'available',
    outputs: {
      primary: 'Positioning Framework',
      formats: ['framework', 'canvas'],
      estimatedTime: '10-15 minutes'
    },
    inputs: {
      required: [
        {
          type: 'brand-asset',
          count: 2,
          description: 'Brand strengths and differentiation'
        },
        {
          type: 'persona',
          count: 1,
          description: 'Target audience'
        }
      ]
    },
    aiLevel: 'ai-assisted',
    useCases: [
      'Differentiate in crowded markets',
      'Clarify competitive advantages',
      'Guide brand communications'
    ],
    complexity: 'medium',
    businessValue: 'strategic',
    requiresResearch: true
  },

  {
    id: 'growth-strategy-roadmap',
    name: 'Growth Strategy Roadmap',
    category: 'business-strategy',
    tagline: 'Chart your path to growth',
    description: 'Build a strategic roadmap identifying growth opportunities and the steps to achieve them.',
    icon: TrendingUp,
    color: 'green',
    status: 'available',
    outputs: {
      primary: 'Growth Roadmap',
      formats: ['roadmap', 'framework'],
      estimatedTime: '12-18 minutes'
    },
    inputs: {
      required: [
        {
          type: 'brand-asset',
          count: 1,
          description: 'Current positioning and capabilities'
        },
        {
          type: 'persona',
          count: 2,
          description: 'Target segments for growth'
        }
      ],
      optional: [
        {
          type: 'trend',
          count: 1,
          optional: true,
          description: 'Market opportunities'
        }
      ]
    },
    aiLevel: 'fully-generated',
    useCases: [
      'Scale your business',
      'Diversify revenue streams',
      'Expand into new segments'
    ],
    complexity: 'high',
    businessValue: 'transformational',
    badge: 'Strategic'
  },

  {
    id: 'partnership-strategy',
    name: 'Partnership Strategy',
    category: 'business-strategy',
    tagline: 'Find the right strategic partners',
    description: 'Identify and evaluate potential partnership opportunities that align with your strategic goals.',
    icon: Globe,
    color: 'green',
    status: 'available',
    outputs: {
      primary: 'Partnership Framework',
      formats: ['framework', 'brief'],
      estimatedTime: '8-12 minutes'
    },
    inputs: {
      required: [
        {
          type: 'brand-asset',
          count: 2,
          description: 'Brand values and strategic objectives'
        }
      ],
      optional: [
        {
          type: 'trend',
          count: 1,
          optional: true,
          description: 'Market ecosystem analysis'
        }
      ]
    },
    aiLevel: 'ai-assisted',
    useCases: [
      'Accelerate market entry',
      'Access new capabilities',
      'Expand customer reach'
    ],
    complexity: 'medium',
    businessValue: 'strategic'
  },

  // ===== CUSTOMER EXPERIENCE =====
  {
    id: 'customer-journey-mapping',
    name: 'Customer Journey Mapping',
    category: 'customer-experience',
    tagline: 'Visualize the customer experience',
    description: 'Map detailed customer journeys identifying touchpoints, emotions, pain points, and opportunities.',
    icon: Map,
    color: 'pink',
    status: 'available',
    outputs: {
      primary: 'Customer Journey Map',
      formats: ['canvas', 'framework'],
      estimatedTime: '10-15 minutes'
    },
    inputs: {
      required: [
        {
          type: 'persona',
          count: 1,
          description: 'Customer persona to map'
        },
        {
          type: 'research-plan',
          count: 1,
          description: 'Customer research or interviews'
        }
      ]
    },
    aiLevel: 'ai-assisted',
    useCases: [
      'Improve customer experience',
      'Identify friction points',
      'Optimize touchpoint strategy'
    ],
    complexity: 'medium',
    businessValue: 'strategic',
    requiresResearch: true,
    badge: 'Experience',
    popularityScore: 85
  },

  {
    id: 'touchpoint-strategy',
    name: 'Touchpoint Strategy',
    category: 'customer-experience',
    tagline: 'Optimize every interaction',
    description: 'Design and optimize customer touchpoints across all channels and journey stages.',
    icon: Users,
    color: 'pink',
    status: 'available',
    outputs: {
      primary: 'Touchpoint Strategy',
      formats: ['framework', 'action-plan'],
      estimatedTime: '8-12 minutes'
    },
    inputs: {
      required: [
        {
          type: 'persona',
          count: 1,
          description: 'Target customer'
        },
        {
          type: 'brand-asset',
          count: 1,
          description: 'Brand experience principles'
        }
      ]
    },
    aiLevel: 'ai-assisted',
    useCases: [
      'Create consistent experiences',
      'Prioritize touchpoint improvements',
      'Align teams on CX standards'
    ],
    complexity: 'medium',
    businessValue: 'strategic'
  },

  {
    id: 'loyalty-retention-strategy',
    name: 'Loyalty & Retention Strategy',
    category: 'customer-experience',
    tagline: 'Keep customers coming back',
    description: 'Build strategies to increase customer lifetime value through loyalty and retention programs.',
    icon: Heart,
    color: 'pink',
    status: 'available',
    outputs: {
      primary: 'Retention Strategy',
      formats: ['framework', 'action-plan'],
      estimatedTime: '10-15 minutes'
    },
    inputs: {
      required: [
        {
          type: 'persona',
          count: 1,
          description: 'Customer segments to retain'
        }
      ],
      optional: [
        {
          type: 'research-plan',
          count: 1,
          optional: true,
          description: 'Customer satisfaction or churn research'
        }
      ]
    },
    aiLevel: 'fully-generated',
    useCases: [
      'Reduce churn rates',
      'Increase customer lifetime value',
      'Build brand advocates'
    ],
    complexity: 'medium',
    businessValue: 'strategic'
  },

  // ===== BRAND EXPANSION =====
  {
    id: 'brand-extension-opportunities',
    name: 'Brand Extension Opportunities',
    category: 'brand-expansion',
    tagline: 'Grow your brand into new areas',
    description: 'Identify viable brand extension opportunities that leverage your brand equity and capabilities.',
    icon: ArrowUpRight,
    color: 'amber',
    status: 'available',
    outputs: {
      primary: 'Brand Extension Framework',
      formats: ['framework', 'brief'],
      estimatedTime: '12-18 minutes'
    },
    inputs: {
      required: [
        {
          type: 'brand-asset',
          count: 3,
          description: 'Brand essence, values, and equity'
        },
        {
          type: 'persona',
          count: 1,
          description: 'Core customer base'
        }
      ]
    },
    aiLevel: 'fully-generated',
    useCases: [
      'Diversify product portfolio',
      'Leverage brand strength',
      'Enter adjacent categories'
    ],
    complexity: 'high',
    businessValue: 'transformational',
    requiresResearch: true
  },

  {
    id: 'brand-architecture-framework',
    name: 'Brand Architecture Framework',
    category: 'brand-expansion',
    tagline: 'Structure your brand portfolio',
    description: 'Design the optimal structure for your brand portfolio including sub-brands and product lines.',
    icon: Palette,
    color: 'amber',
    status: 'available',
    outputs: {
      primary: 'Brand Architecture',
      formats: ['framework', 'canvas'],
      estimatedTime: '15-20 minutes'
    },
    inputs: {
      required: [
        {
          type: 'brand-asset',
          count: 2,
          description: 'Master brand positioning'
        }
      ]
    },
    aiLevel: 'guided',
    useCases: [
      'Organize complex portfolios',
      'Clarify brand relationships',
      'Guide acquisition integration'
    ],
    complexity: 'high',
    businessValue: 'strategic',
    badge: 'Advanced'
  },

  {
    id: 'market-entry-strategy',
    name: 'Market Entry Strategy',
    category: 'brand-expansion',
    tagline: 'Enter new markets successfully',
    description: 'Develop comprehensive strategies for entering new geographic or demographic markets.',
    icon: Globe,
    color: 'amber',
    status: 'available',
    outputs: {
      primary: 'Market Entry Plan',
      formats: ['brief', 'roadmap', 'action-plan'],
      estimatedTime: '15-25 minutes'
    },
    inputs: {
      required: [
        {
          type: 'brand-asset',
          count: 2,
          description: 'Brand adaptability and core equity'
        },
        {
          type: 'persona',
          count: 1,
          description: 'New market audience'
        }
      ],
      optional: [
        {
          type: 'trend',
          count: 1,
          optional: true,
          description: 'New market trends and dynamics'
        }
      ]
    },
    aiLevel: 'fully-generated',
    useCases: [
      'Expand geographically',
      'Target new demographics',
      'Localize brand for new markets'
    ],
    complexity: 'high',
    businessValue: 'transformational',
    requiresResearch: true,
    badge: 'Enterprise'
  }
];

// Helper functions
export function getToolsByCategory(category: StrategyCategory): StrategyTool[] {
  return strategyTools.filter(tool => tool.category === category);
}

export function getAvailableTools(): StrategyTool[] {
  return strategyTools.filter(tool => tool.status === 'available');
}

export function getToolById(id: string): StrategyTool | undefined {
  return strategyTools.find(tool => tool.id === id);
}

export function getPopularTools(limit: number = 5): StrategyTool[] {
  return strategyTools
    .filter(tool => tool.status === 'available' && tool.popularityScore)
    .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
    .slice(0, limit);
}

export function getToolsRequiringResearch(): StrategyTool[] {
  return strategyTools.filter(tool => tool.requiresResearch);
}

// Category metadata
export const strategyCategories = [
  {
    id: 'marketing-growth' as StrategyCategory,
    name: 'Marketing & Growth',
    description: 'Drive awareness, engagement, and growth',
    icon: Megaphone,
    color: 'blue',
    toolCount: getToolsByCategory('marketing-growth').length
  },
  {
    id: 'product-innovation' as StrategyCategory,
    name: 'Product & Innovation',
    description: 'Discover and develop new offerings',
    icon: Lightbulb,
    color: 'purple',
    toolCount: getToolsByCategory('product-innovation').length
  },
  {
    id: 'business-strategy' as StrategyCategory,
    name: 'Business Strategy',
    description: 'Position and grow your business',
    icon: TrendingUp,
    color: 'green',
    toolCount: getToolsByCategory('business-strategy').length
  },
  {
    id: 'customer-experience' as StrategyCategory,
    name: 'Customer Experience',
    description: 'Design exceptional customer journeys',
    icon: Users,
    color: 'pink',
    toolCount: getToolsByCategory('customer-experience').length
  },
  {
    id: 'brand-expansion' as StrategyCategory,
    name: 'Brand Expansion',
    description: 'Extend your brand into new territories',
    icon: ArrowUpRight,
    color: 'amber',
    toolCount: getToolsByCategory('brand-expansion').length
  }
];