import { Target, Eye, Zap, Users, Heart, Sparkles, Globe, Compass, TrendingUp, Users2, MessageSquare, Palette, Crown } from 'lucide-react';

export type ContentType = 'think-feel-act' | 'esg' | 'simple-text' | 'custom';

export interface FrameworkInfo {
  title: string;
  description: string;
  examples: Array<{
    category: string;
    commitment: string;
    impact: 'high' | 'medium' | 'low';
    initiatives: string;
  }>;
}

export interface AssetDashboardConfig {
  // Content configuration
  contentType: ContentType;
  contentEditable: boolean;
  showRegenerateButton: boolean;
  
  // Framework information (accordion)
  frameworkInfo?: FrameworkInfo;
  
  // Features
  enableLocking: boolean;
  enableVersionHistory: boolean;
  showDecisionQuality: boolean;
  
  // Visual
  gradientColors: {
    from: string;
    to: string;
  };
  
  // Content defaults (for editable content)
  defaultContent?: {
    think?: { text: string };
    feel?: { text: string };
    act?: { text: string };
    environmental?: { text: string; initiatives: string; impact: 'high' | 'medium' | 'low' };
    social?: { text: string; initiatives: string; impact: 'high' | 'medium' | 'low' };
    governance?: { text: string; initiatives: string; impact: 'high' | 'medium' | 'low' };
    simpleText?: string;
  };
}

export const assetDashboardConfigs: Record<string, AssetDashboardConfig> = {
  // 1. Golden Circle
  '1': {
    contentType: 'think-feel-act',
    contentEditable: true,
    showRegenerateButton: true,
    enableLocking: true,
    enableVersionHistory: false,
    showDecisionQuality: true,
    gradientColors: {
      from: '#FFB800',
      to: '#FF8C00',
    },
    frameworkInfo: {
      title: 'The Golden Circle Framework',
      description: 'Simon Sinek\'s Golden Circle helps define your purpose (Why), process (How), and product (What)',
      examples: [
        {
          category: 'Why',
          commitment: 'Our core purpose and belief that drives everything we do',
          impact: 'high',
          initiatives: 'Purpose-driven culture',
        },
        {
          category: 'How',
          commitment: 'Our unique approach and values that set us apart',
          impact: 'high',
          initiatives: 'Differentiation strategy',
        },
        {
          category: 'What',
          commitment: 'The tangible products and services we offer',
          impact: 'medium',
          initiatives: 'Product portfolio',
        },
      ],
    },
    defaultContent: {
      think: {
        text: 'We believe in challenging the status quo and thinking differently about how technology can serve humanity.',
      },
      feel: {
        text: 'We make innovative products that are beautifully designed, simple to use, and user-friendly.',
      },
      act: {
        text: 'We happen to make great computers, phones, and tablets.',
      },
    },
  },

  // 2. Vision Statement
  '2': {
    contentType: 'simple-text',
    contentEditable: true,
    showRegenerateButton: true,
    enableLocking: true,
    enableVersionHistory: false,
    showDecisionQuality: true,
    gradientColors: {
      from: '#667EEA',
      to: '#764BA2',
    },
    frameworkInfo: {
      title: 'Vision Statement Framework',
      description: 'Your vision describes the future state you aspire to create and the long-term impact you aim to have',
      examples: [
        {
          category: 'Aspirational',
          commitment: 'Paint a compelling picture of your desired future',
          impact: 'high',
          initiatives: 'Long-term direction',
        },
        {
          category: 'Inspirational',
          commitment: 'Motivate stakeholders with a bold ambition',
          impact: 'high',
          initiatives: 'Stakeholder alignment',
        },
        {
          category: 'Directional',
          commitment: 'Guide strategic decisions and priorities',
          impact: 'medium',
          initiatives: 'Strategic roadmap',
        },
      ],
    },
    defaultContent: {
      simpleText: 'To become the most trusted and innovative leader in our industry, transforming how businesses operate and creating lasting value for all stakeholders.',
    },
  },

  // 3. Mission Statement
  '3': {
    contentType: 'simple-text',
    contentEditable: true,
    showRegenerateButton: true,
    enableLocking: true,
    enableVersionHistory: false,
    showDecisionQuality: true,
    gradientColors: {
      from: '#F093FB',
      to: '#F5576C',
    },
    frameworkInfo: {
      title: 'Mission Statement Framework',
      description: 'Your mission defines your purpose, what you do, who you serve, and how you create value today',
      examples: [
        {
          category: 'Purpose',
          commitment: 'Define your core reason for existing',
          impact: 'high',
          initiatives: 'Organizational identity',
        },
        {
          category: 'Audience',
          commitment: 'Identify who you serve and support',
          impact: 'high',
          initiatives: 'Customer focus',
        },
        {
          category: 'Value',
          commitment: 'Articulate how you make a difference',
          impact: 'medium',
          initiatives: 'Value proposition',
        },
      ],
    },
    defaultContent: {
      simpleText: 'We empower businesses to achieve extraordinary results through innovative technology solutions, exceptional service, and unwavering commitment to our clients\' success.',
    },
  },

  // 4. Brand Archetype
  '4': {
    contentType: 'simple-text',
    contentEditable: true,
    showRegenerateButton: true,
    enableLocking: true,
    enableVersionHistory: false,
    showDecisionQuality: true,
    gradientColors: {
      from: '#FA709A',
      to: '#FEE140',
    },
    frameworkInfo: {
      title: 'Brand Archetype Framework',
      description: 'Based on Carl Jung\'s archetypes, this framework helps define your brand\'s personality and emotional connection',
      examples: [
        {
          category: 'The Hero',
          commitment: 'Courage, determination, and triumph over adversity',
          impact: 'high',
          initiatives: 'Transformation stories',
        },
        {
          category: 'The Magician',
          commitment: 'Innovation, transformation, and making dreams reality',
          impact: 'high',
          initiatives: 'Visionary leadership',
        },
        {
          category: 'The Sage',
          commitment: 'Knowledge, wisdom, and truth-seeking',
          impact: 'medium',
          initiatives: 'Thought leadership',
        },
      ],
    },
    defaultContent: {
      simpleText: 'The Magician: We transform reality and make dreams come true through innovation and possibility. We inspire wonder and create special moments that change lives.',
    },
  },

  // 5. Core Values
  '5': {
    contentType: 'simple-text',
    contentEditable: true,
    showRegenerateButton: true,
    enableLocking: true,
    enableVersionHistory: false,
    showDecisionQuality: true,
    gradientColors: {
      from: '#FF6B6B',
      to: '#FF8E53',
    },
    frameworkInfo: {
      title: 'Core Values Framework',
      description: 'Your core values are the fundamental beliefs that guide behavior, decisions, and culture',
      examples: [
        {
          category: 'Authenticity',
          commitment: 'Be genuine and true to who you are',
          impact: 'high',
          initiatives: 'Cultural foundation',
        },
        {
          category: 'Excellence',
          commitment: 'Strive for the highest quality in everything',
          impact: 'high',
          initiatives: 'Quality standards',
        },
        {
          category: 'Collaboration',
          commitment: 'Work together to achieve more',
          impact: 'medium',
          initiatives: 'Team dynamics',
        },
      ],
    },
    defaultContent: {
      simpleText: 'Innovation • Integrity • Customer-Centricity • Sustainability • Excellence • Collaboration',
    },
  },

  // 6. Transformative Goals (Think-Feel-Act)
  '6': {
    contentType: 'think-feel-act',
    contentEditable: true,
    showRegenerateButton: true,
    enableLocking: true,
    enableVersionHistory: false,
    showDecisionQuality: true,
    gradientColors: {
      from: '#1FD1B2',
      to: '#1FD1B2',
    },
    frameworkInfo: {
      title: 'The Think-Feel-Act Framework',
      description: 'This framework helps define what you want your audience to Think (cognitive), Feel (emotional), and Act (behavioral)',
      examples: [
        {
          category: 'Think',
          commitment: 'The rational belief you want to establish in your audience\'s mind',
          impact: 'high',
          initiatives: 'Cognitive positioning',
        },
        {
          category: 'Feel',
          commitment: 'The emotional connection and sentiment you want to evoke',
          impact: 'high',
          initiatives: 'Emotional resonance',
        },
        {
          category: 'Act',
          commitment: 'The specific behaviors and actions you want to drive',
          impact: 'high',
          initiatives: 'Behavioral outcomes',
        },
      ],
    },
    defaultContent: {
      think: {
        text: 'Position ourselves as the premier innovation catalyst for sustainable business transformation in the European market',
      },
      feel: {
        text: 'Inspire confidence and excitement about building a more sustainable, digitally-empowered future together',
      },
      act: {
        text: 'Drive strategic partnerships and platform adoption among forward-thinking enterprises ready to lead industry transformation',
      },
    },
  },

  // 7. Social Relevancy (ESG)
  '7': {
    contentType: 'esg',
    contentEditable: true,
    showRegenerateButton: true,
    enableLocking: true,
    enableVersionHistory: false,
    showDecisionQuality: true,
    gradientColors: {
      from: '#1FD1B2',
      to: '#1FD1B2',
    },
    frameworkInfo: {
      title: 'The ESG Framework',
      description: 'Understand how Environmental, Social, and Governance factors shape your impact',
      examples: [
        {
          category: 'Environmental',
          commitment: 'Carbon-neutral operations by 2027',
          impact: 'high',
          initiatives: '5 active projects',
        },
        {
          category: 'Social',
          commitment: 'Inclusive employment & digital skills training',
          impact: 'high',
          initiatives: '8 active programs',
        },
        {
          category: 'Governance',
          commitment: 'Transparent AI ethics & data privacy leadership',
          impact: 'medium',
          initiatives: '3 active policies',
        },
      ],
    },
    defaultContent: {
      environmental: {
        text: 'Committed to carbon-neutral operations by 2027, reducing digital waste through sustainable tech solutions and eco-conscious service delivery',
        initiatives: '5 active projects',
        impact: 'high',
      },
      social: {
        text: 'Empowering underrepresented communities through digital skills training, creating inclusive employment opportunities, and supporting diversity in tech',
        initiatives: '8 active programs',
        impact: 'high',
      },
      governance: {
        text: 'Transparent business practices with ethical AI implementation, data privacy leadership, and stakeholder accountability frameworks',
        initiatives: '3 active policies',
        impact: 'medium',
      },
    },
  },

  // 8. Brand Tone & Voice
  '8': {
    contentType: 'simple-text',
    contentEditable: true,
    showRegenerateButton: true,
    enableLocking: true,
    enableVersionHistory: false,
    showDecisionQuality: true,
    gradientColors: {
      from: '#A8EDEA',
      to: '#FED6E3',
    },
    frameworkInfo: {
      title: 'Brand Tone & Voice Framework',
      description: 'Define how your brand communicates - the personality and style that makes your communication distinctive',
      examples: [
        {
          category: 'Voice',
          commitment: 'Your brand\'s consistent personality across all communications',
          impact: 'high',
          initiatives: 'Brand identity',
        },
        {
          category: 'Tone',
          commitment: 'How voice adapts to different contexts and audiences',
          impact: 'high',
          initiatives: 'Communication flexibility',
        },
        {
          category: 'Style',
          commitment: 'The specific language, structure, and grammar choices',
          impact: 'medium',
          initiatives: 'Editorial guidelines',
        },
      ],
    },
    defaultContent: {
      simpleText: 'Clear, confident, and inspiring. We communicate with authority but remain accessible. We educate without condescending, and inspire without overpromising.',
    },
  },

  // 9. Brand Promise
  '9': {
    contentType: 'simple-text',
    contentEditable: true,
    showRegenerateButton: true,
    enableLocking: true,
    enableVersionHistory: false,
    showDecisionQuality: true,
    gradientColors: {
      from: '#4FACFE',
      to: '#00F2FE',
    },
    frameworkInfo: {
      title: 'Brand Promise Framework',
      description: 'Your brand promise is the commitment you make to customers about what they can expect from every interaction',
      examples: [
        {
          category: 'Commitment',
          commitment: 'What you guarantee to deliver consistently',
          impact: 'high',
          initiatives: 'Customer expectation',
        },
        {
          category: 'Differentiation',
          commitment: 'How your promise sets you apart',
          impact: 'high',
          initiatives: 'Competitive advantage',
        },
        {
          category: 'Experience',
          commitment: 'The tangible outcomes customers will receive',
          impact: 'medium',
          initiatives: 'Customer journey',
        },
      ],
    },
    defaultContent: {
      simpleText: 'We promise to deliver exceptional value through innovation, reliability, and unwavering commitment to your success.',
    },
  },

  // 10. Brand Story
  '10': {
    contentType: 'simple-text',
    contentEditable: true,
    showRegenerateButton: true,
    enableLocking: true,
    enableVersionHistory: false,
    showDecisionQuality: true,
    gradientColors: {
      from: '#FFD89B',
      to: '#19547B',
    },
    frameworkInfo: {
      title: 'Brand Story Framework',
      description: 'Your brand story creates emotional connection by sharing your journey, challenges, and transformation',
      examples: [
        {
          category: 'Origin',
          commitment: 'Where you came from and what inspired your beginning',
          impact: 'high',
          initiatives: 'Authentic narrative',
        },
        {
          category: 'Challenge',
          commitment: 'The problems you faced and overcame',
          impact: 'high',
          initiatives: 'Relatable journey',
        },
        {
          category: 'Impact',
          commitment: 'The difference you\'re making today',
          impact: 'medium',
          initiatives: 'Present achievements',
        },
      ],
    },
    defaultContent: {
      simpleText: 'Founded on the belief that technology should serve humanity, we started as a small team of innovators determined to make a difference. Today, we continue that mission at scale.',
    },
  },

  // 11. Brand Essence
  '11': {
    contentType: 'simple-text',
    contentEditable: true,
    showRegenerateButton: true,
    enableLocking: true,
    enableVersionHistory: false,
    showDecisionQuality: true,
    gradientColors: {
      from: '#43E97B',
      to: '#38F9D7',
    },
    frameworkInfo: {
      title: 'Brand Essence Framework',
      description: 'Your brand essence captures the core emotional and functional benefits in a simple, powerful statement',
      examples: [
        {
          category: 'Emotional',
          commitment: 'The feeling your brand evokes',
          impact: 'high',
          initiatives: 'Emotional connection',
        },
        {
          category: 'Functional',
          commitment: 'The practical value you deliver',
          impact: 'high',
          initiatives: 'Tangible benefits',
        },
        {
          category: 'Unique',
          commitment: 'What makes you unmistakably you',
          impact: 'medium',
          initiatives: 'Distinctive identity',
        },
      ],
    },
    defaultContent: {
      simpleText: 'Innovation meets purpose. We are the catalyst for meaningful transformation.',
    },
  },

  // 12. Brand Personality
  '12': {
    contentType: 'simple-text',
    contentEditable: true,
    showRegenerateButton: true,
    enableLocking: true,
    enableVersionHistory: false,
    showDecisionQuality: true,
    gradientColors: {
      from: '#FA8BFF',
      to: '#2BD2FF',
    },
    frameworkInfo: {
      title: 'Brand Personality Framework',
      description: 'Define your brand as if it were a person - the human characteristics that make your brand relatable',
      examples: [
        {
          category: 'Character Traits',
          commitment: 'The personality attributes that define you',
          impact: 'high',
          initiatives: 'Brand humanization',
        },
        {
          category: 'Behavior',
          commitment: 'How your brand acts and interacts',
          impact: 'high',
          initiatives: 'Consistent conduct',
        },
        {
          category: 'Relationships',
          commitment: 'How you connect with others',
          impact: 'medium',
          initiatives: 'Stakeholder dynamics',
        },
      ],
    },
    defaultContent: {
      simpleText: 'Innovative yet approachable, professional yet personable, ambitious yet authentic. We blend visionary thinking with practical execution.',
    },
  },

  // 13. Brand Positioning
  '13': {
    contentType: 'simple-text',
    contentEditable: true,
    showRegenerateButton: true,
    enableLocking: true,
    enableVersionHistory: false,
    showDecisionQuality: true,
    gradientColors: {
      from: '#1FD1B2',
      to: '#1FD1B2',
    },
    frameworkInfo: {
      title: 'Brand Positioning Framework',
      description: 'Your positioning defines the unique space you occupy in the market and in customers\' minds',
      examples: [
        {
          category: 'Target Audience',
          commitment: 'Who you serve and why you\'re ideal for them',
          impact: 'high',
          initiatives: 'Market segmentation',
        },
        {
          category: 'Point of Difference',
          commitment: 'What makes you different from competitors',
          impact: 'high',
          initiatives: 'Competitive advantage',
        },
        {
          category: 'Proof Points',
          commitment: 'Evidence that supports your positioning',
          impact: 'medium',
          initiatives: 'Credibility markers',
        },
      ],
    },
    defaultContent: {
      simpleText: 'Our brand occupies a unique position at the intersection of innovation and sustainability, delivering cutting-edge solutions that empower businesses to thrive while making a positive impact on the world.',
    },
  },
};

// Default config for any asset not specifically configured
export const defaultAssetConfig: AssetDashboardConfig = {
  contentType: 'simple-text',
  contentEditable: true,
  showRegenerateButton: false,
  enableLocking: false,
  enableVersionHistory: false,
  showDecisionQuality: true,
  gradientColors: {
    from: '#1FD1B2',
    to: '#1FD1B2',
  },
  defaultContent: {
    simpleText: 'Define your brand asset content here...',
  },
};