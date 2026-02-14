import { BrandAsset } from '../types/brand-asset';

export const mockBrandAssets: BrandAsset[] = [
  {
    id: '1',
    type: 'Golden Circle',
    title: 'Golden Circle Framework',
    content: 'Why: To empower businesses to transform. How: Through innovative digital solutions. What: Comprehensive digital transformation services.',
    category: 'Foundation',
    lastUpdated: '2025-01-20',
    status: 'ready-to-validate',
    description: 'The Golden Circle framework helps define the core purpose, process, and product of your brand.',
    isCritical: true,
    priority: 'essential',
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'completed',
        completedAt: '2025-01-12',
        metadata: {}
      },
      {
        type: 'canvas-workshop',
        status: 'completed',
        completedAt: '2025-01-15',
        metadata: { participants: 12, facilitator: 'John Doe' }
      },
      {
        type: 'interviews',
        status: 'completed',
        completedAt: '2025-01-18',
        metadata: { sessions: 5 }
      },
      {
        type: 'questionnaire',
        status: 'locked'  // 🔒 Example: Locked method - requires upgrade
      }
    ],
    researchCoverage: 75,
    artifactsGenerated: 3,
    artifactsValidated: 0
  },
  {
    id: '2',
    type: 'Vision Statement',
    title: 'Brand Vision',
    content: 'To be the leading innovation partner that empowers businesses to transform their digital presence and create meaningful connections with their audiences.',
    category: 'Strategy',
    lastUpdated: '2025-01-18',
    status: 'validated',
    description: 'Your vision statement is a forward-looking declaration of your organizations core purpose and focus.',
    isCritical: true,
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'completed',
        completedAt: '2025-01-13',
        metadata: {}
      },
      {
        type: 'canvas-workshop',
        status: 'completed',
        completedAt: '2025-01-15',
        metadata: { participants: 12 }
      },
      {
        type: 'interviews',
        status: 'completed',
        completedAt: '2025-01-16',
        metadata: { sessions: 5 }
      },
      {
        type: 'questionnaire',
        status: 'available'
      }
    ],
    researchCoverage: 100,
    artifactsGenerated: 1,
    artifactsValidated: 1,
    validatedAt: '2025-01-18',
    validatedBy: 'User'
  },
  {
    id: '3',
    type: 'Mission Statement',
    title: 'Mission Statement',
    content: 'We deliver cutting-edge digital solutions that combine creativity, technology, and strategic thinking to help our clients achieve sustainable growth.',
    category: 'Strategy',
    lastUpdated: '2025-01-17',
    status: 'validated',
    description: 'Your mission statement defines what your organization does, how it does it, and for whom it does it.',
    isCritical: true,
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'completed',
        completedAt: '2025-01-14',
        metadata: {}
      },
      {
        type: 'canvas-workshop',
        status: 'completed',
        completedAt: '2025-01-15',
        metadata: { participants: 12 }
      },
      {
        type: 'interviews',
        status: 'running',
        progress: 40,
        metadata: { sessions: 2 }
      },
      {
        type: 'questionnaire',
        status: 'available'
      }
    ],
    researchCoverage: 50,
    artifactsGenerated: 1,
    artifactsValidated: 1,
    validatedAt: '2025-01-17',
    validatedBy: 'User'
  },
  {
    id: '4',
    type: 'Brand Archetype',
    title: 'Brand Archetype',
    content: 'The Creator - We are innovative, artistic, and imaginative. We believe in the power of creativity to solve complex problems.',
    category: 'Personality',
    lastUpdated: '2025-01-16',
    status: 'in-development',
    description: 'Brand archetypes are universal patterns of behavior that help define your brands personality.',
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'completed',
        completedAt: '2025-01-14',
        metadata: {}
      },
      {
        type: 'canvas-workshop',
        status: 'completed',
        completedAt: '2025-01-16',
        metadata: { participants: 8 }
      },
      {
        type: 'interviews',
        status: 'available'
      },
      {
        type: 'questionnaire',
        status: 'available'
      }
    ],
    researchCoverage: 25,
    artifactsGenerated: 1,
    artifactsValidated: 0
  },
  {
    id: '5',
    type: 'Core Values',
    title: 'Core Values',
    content: 'Innovation, Integrity, Collaboration, Excellence, Customer-Centricity',
    category: 'Culture',
    lastUpdated: '2025-01-19',
    status: 'ready-to-validate',
    description: 'Core values are the fundamental beliefs and principles that guide your organizations decisions.',
    isCritical: true,
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'completed',
        completedAt: '2025-01-15',
        metadata: {}
      },
      {
        type: 'canvas-workshop',
        status: 'completed',
        completedAt: '2025-01-17',
        metadata: { participants: 10 }
      },
      {
        type: 'interviews',
        status: 'available'
      },
      {
        type: 'questionnaire',
        status: 'available'
      }
    ],
    researchCoverage: 50,
    artifactsGenerated: 1,
    artifactsValidated: 0
  },
  {
    id: '6',
    type: 'Transformative Goals',
    title: 'Transformative Goals',
    content: '',
    category: 'Strategy',
    lastUpdated: '2025-01-15',
    status: 'in-development',
    description: 'Define ambitious goals that will transform your business and create lasting impact.',
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'completed',
        completedAt: '2025-01-12',
        metadata: {}
      },
      {
        type: 'canvas-workshop',
        status: 'completed',
        completedAt: '2025-01-14',
        metadata: { participants: 8, facilitator: 'Sarah Johnson' }
      },
      {
        type: 'interviews',
        status: 'available'
      },
      {
        type: 'questionnaire',
        status: 'available'
      }
    ],
    researchCoverage: 50,
    artifactsGenerated: 1,
    artifactsValidated: 0
  },
  {
    id: '7',
    type: 'Social Relevancy',
    title: 'Social Relevancy',
    content: 'Our commitment to sustainable technology solutions that benefit society and the environment.',
    category: 'Purpose',
    lastUpdated: '2025-01-14',
    status: 'in-development',
    description: 'How your brand contributes to society and addresses relevant social issues.',
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'completed',
        completedAt: '2025-01-14',
        metadata: {}
      },
      {
        type: 'canvas-workshop',
        status: 'available'
      },
      {
        type: 'interviews',
        status: 'running',
        progress: 40,
        metadata: { sessions: 2 }
      },
      {
        type: 'questionnaire',
        status: 'available'
      }
    ],
    researchCoverage: 25,
    artifactsGenerated: 1,
    artifactsValidated: 0
  },
  {
    id: '8',
    type: 'Brand Tone & Voice',
    title: 'Tonology',
    content: '',
    category: 'Communication',
    lastUpdated: '',
    status: 'awaiting-research',
    description: 'The consistent voice and tone that defines how your brand communicates.',
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'available'
      },
      {
        type: 'canvas-workshop',
        status: 'available'
      },
      {
        type: 'interviews',
        status: 'available'
      },
      {
        type: 'questionnaire',
        status: 'available'
      }
    ],
    researchCoverage: 0,
    artifactsGenerated: 0,
    artifactsValidated: 0
  },
  {
    id: '9',
    type: 'Brand Promise',
    title: 'Brand Promise',
    content: '',
    category: 'Strategy',
    lastUpdated: '',
    status: 'awaiting-research',
    description: 'The commitment you make to your customers about what they can expect.',
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'available'
      },
      {
        type: 'canvas-workshop',
        status: 'available'
      },
      {
        type: 'interviews',
        status: 'available'
      },
      {
        type: 'questionnaire',
        status: 'available'
      }
    ],
    researchCoverage: 0,
    artifactsGenerated: 0,
    artifactsValidated: 0
  },
  {
    id: '10',
    type: 'Brand Story',
    title: 'Brand Story',
    content: 'Founded with the vision to bridge the gap between traditional business and digital innovation...',
    category: 'Narrative',
    lastUpdated: '2025-01-12',
    status: 'in-development',
    description: "The narrative that connects your brand's past, present, and future.",
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'available'
      },
      {
        type: 'canvas-workshop',
        status: 'completed',
        completedAt: '2025-01-10',
        metadata: { participants: 6 }
      },
      {
        type: 'interviews',
        status: 'running',
        progress: 75,
        metadata: { sessions: 3 }
      },
      {
        type: 'questionnaire',
        status: 'available'
      }
    ],
    researchCoverage: 25,
    artifactsGenerated: 1,
    artifactsValidated: 0
  },
  {
    id: '11',
    type: 'Brand Essence',
    title: 'Brand Essence',
    content: '',
    category: 'Core',
    lastUpdated: '',
    status: 'awaiting-research',
    description: 'The core idea that captures the heart and soul of your brand.',
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'available'
      },
      {
        type: 'canvas-workshop',
        status: 'available'
      },
      {
        type: 'interviews',
        status: 'available'
      },
      {
        type: 'questionnaire',
        status: 'available'
      }
    ],
    researchCoverage: 0,
    artifactsGenerated: 0,
    artifactsValidated: 0
  },
  {
    id: '12',
    type: 'Brand Personality',
    title: 'Brand Personality',
    content: 'Professional yet approachable, innovative but reliable, confident while remaining humble.',
    category: 'Personality',
    lastUpdated: '2025-01-13',
    status: 'in-development',
    description: "The human characteristics and traits that define your brand's character.",
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'available'
      },
      {
        type: 'canvas-workshop',
        status: 'available'
      },
      {
        type: 'interviews',
        status: 'completed',
        completedAt: '2025-01-12',
        metadata: { sessions: 4 }
      },
      {
        type: 'questionnaire',
        status: 'running',
        progress: 45,
        metadata: { responses: 45 }
      }
    ],
    researchCoverage: 25,
    artifactsGenerated: 1,
    artifactsValidated: 0
  },
  {
    id: '13',
    type: 'Brand Positioning',
    title: 'Brand Positioning',
    content: 'We position ourselves as the trusted digital transformation partner for mid-market companies seeking innovative solutions.',
    category: 'Strategy',
    lastUpdated: '2025-01-21',
    status: 'validated',
    description: 'How your brand is uniquely positioned in the market relative to competitors.',
    isCritical: true,
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'completed',
        completedAt: '2025-01-21',
        metadata: {}
      },
      {
        type: 'canvas-workshop',
        status: 'completed',
        completedAt: '2025-01-15',
        metadata: { participants: 10 }
      },
      {
        type: 'interviews',
        status: 'completed',
        completedAt: '2025-01-18',
        metadata: { sessions: 6 }
      },
      {
        type: 'questionnaire',
        status: 'completed',
        completedAt: '2025-01-20',
        metadata: { responses: 156 }
      }
    ],
    researchCoverage: 100,
    artifactsGenerated: 1,
    artifactsValidated: 1,
    validatedAt: '2025-01-21',
    validatedBy: 'User'
  }
];
