/**
 * Framework Configurations
 * Defines fields and output sections for each strategy framework
 */

export interface FrameworkField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface FrameworkConfig {
  title: string;
  description: string;
  fields: FrameworkField[];
  outputSections: Array<{
    id: string;
    title: string;
    description: string;
  }>;
}

export const frameworkConfigs: Record<string, FrameworkConfig> = {
  'content-strategy': {
    title: 'Content Strategy Planner',
    description: 'Plan your content ecosystem aligned with brand voice',
    fields: [
      { id: 'name', label: 'Strategy Name', type: 'text', placeholder: 'e.g., Q1 Content Strategy', required: true },
      { id: 'contentGoals', label: 'Content Goals', type: 'textarea', placeholder: 'What do you want to achieve with your content?', required: true },
      { id: 'targetChannels', label: 'Primary Channels', type: 'text', placeholder: 'e.g., Blog, LinkedIn, Email Newsletter' },
      { id: 'contentPillars', label: 'Content Pillars (3-5 themes)', type: 'textarea', placeholder: 'List your main content themes, one per line' },
      { id: 'publishingFrequency', label: 'Publishing Frequency', type: 'select', options: ['Daily', 'Weekly', 'Bi-weekly', 'Monthly'] },
    ],
    outputSections: [
      { id: 'calendar', title: 'Content Calendar', description: 'Recommended publishing schedule and content distribution' },
      { id: 'channel-strategy', title: 'Channel Strategy', description: 'Platform-specific content approaches and tactics' },
      { id: 'voice-alignment', title: 'Voice Alignment', description: 'How your content aligns with brand voice guidelines' },
      { id: 'templates', title: 'Content Templates', description: 'Reusable templates for consistent content creation' }
    ]
  },

  'brand-positioning': {
    title: 'Brand Positioning Framework',
    description: 'Define your unique market position and value proposition',
    fields: [
      { id: 'name', label: 'Framework Name', type: 'text', placeholder: 'e.g., 2025 Brand Positioning', required: true },
      { id: 'targetMarket', label: 'Target Market', type: 'textarea', placeholder: 'Describe your primary target market', required: true },
      { id: 'categoryFrame', label: 'Category Frame', type: 'text', placeholder: 'What category do you compete in?' },
      { id: 'pointOfDifference', label: 'Point of Difference', type: 'textarea', placeholder: 'What makes you uniquely valuable?' },
      { id: 'reasonToBelieve', label: 'Reason to Believe', type: 'textarea', placeholder: 'Why should customers believe your claims?' },
    ],
    outputSections: [
      { id: 'positioning-statement', title: 'Positioning Statement', description: 'Your complete brand positioning statement' },
      { id: 'value-map', title: 'Value Map', description: 'Visual mapping of your value proposition' },
      { id: 'competitive-analysis', title: 'Competitive Analysis', description: 'How you compare to key competitors' },
      { id: 'market-opportunity', title: 'Market Opportunity', description: 'Identified opportunities in your market space' }
    ]
  },

  'messaging-framework': {
    title: 'Messaging & Communication',
    description: 'Create consistent messaging across all touchpoints',
    fields: [
      { id: 'name', label: 'Framework Name', type: 'text', placeholder: 'e.g., 2025 Messaging Framework', required: true },
      { id: 'coreMessage', label: 'Core Message', type: 'textarea', placeholder: 'Your primary message to the market', required: true },
      { id: 'keyBenefits', label: 'Key Benefits (3-5)', type: 'textarea', placeholder: 'List main benefits, one per line' },
      { id: 'toneAttributes', label: 'Tone Attributes', type: 'text', placeholder: 'e.g., Professional, Friendly, Innovative' },
      { id: 'messagingPriority', label: 'Messaging Priority', type: 'select', options: ['Emotional', 'Rational', 'Balanced'] },
    ],
    outputSections: [
      { id: 'message-hierarchy', title: 'Message Hierarchy', description: 'Prioritized messaging framework from core to supporting messages' },
      { id: 'tone-guidelines', title: 'Tone Guidelines', description: 'How to adjust tone across different contexts' },
      { id: 'messaging-matrix', title: 'Messaging Matrix', description: 'Messages mapped to different audiences and channels' },
      { id: 'channel-adaptations', title: 'Channel Adaptations', description: 'How to adapt messages for specific channels' }
    ]
  },

  'persona-journey': {
    title: 'Persona Journey Mapping',
    description: 'Map customer journeys and identify key touchpoints',
    fields: [
      { id: 'name', label: 'Journey Map Name', type: 'text', placeholder: 'e.g., B2B Buyer Journey', required: true },
      { id: 'journeyStages', label: 'Journey Stages', type: 'textarea', placeholder: 'List stages: Awareness, Consideration, Decision, etc.' },
      { id: 'primaryGoal', label: 'Primary Customer Goal', type: 'text', placeholder: 'What is the customer trying to achieve?' },
      { id: 'painPoints', label: 'Key Pain Points', type: 'textarea', placeholder: 'What challenges do customers face?' },
      { id: 'successMetrics', label: 'Success Metrics', type: 'text', placeholder: 'How will you measure journey optimization?' },
    ],
    outputSections: [
      { id: 'journey-map', title: 'Journey Map', description: 'Visual representation of the complete customer journey' },
      { id: 'touchpoint-analysis', title: 'Touchpoint Analysis', description: 'Critical touchpoints and interaction opportunities' },
      { id: 'pain-point-solutions', title: 'Pain Point Solutions', description: 'How to address customer challenges at each stage' },
      { id: 'opportunity-areas', title: 'Opportunity Areas', description: 'Identified opportunities to improve the journey' }
    ]
  },

  'content-calendar': {
    title: 'Content Calendar Builder',
    description: 'Plan and schedule content across channels',
    fields: [
      { id: 'name', label: 'Calendar Name', type: 'text', placeholder: 'e.g., Q1 2025 Content Calendar', required: true },
      { id: 'timeframe', label: 'Timeframe', type: 'select', options: ['1 Month', '3 Months', '6 Months', '12 Months'], required: true },
      { id: 'channels', label: 'Channels', type: 'text', placeholder: 'e.g., Blog, Social Media, Email' },
      { id: 'contentThemes', label: 'Content Themes', type: 'textarea', placeholder: 'List monthly or weekly themes' },
      { id: 'resourceAllocation', label: 'Team Resources', type: 'text', placeholder: 'Available team members and hours/week' },
    ],
    outputSections: [
      { id: 'publishing-schedule', title: 'Publishing Schedule', description: 'Complete content calendar with dates and channels' },
      { id: 'content-topics', title: 'Content Topics', description: 'Recommended topics and themes for each time period' },
      { id: 'resource-planning', title: 'Resource Planning', description: 'Resource allocation and workflow recommendations' },
      { id: 'campaign-integration', title: 'Campaign Integration', description: 'How content aligns with broader campaign initiatives' }
    ]
  },

  'brand-voice': {
    title: 'Brand Voice & Tone Guide',
    description: 'Establish consistent brand communication style',
    fields: [
      { id: 'name', label: 'Guide Name', type: 'text', placeholder: 'e.g., Brand Voice Guidelines 2025', required: true },
      { id: 'voiceAttributes', label: 'Voice Attributes (3-5)', type: 'textarea', placeholder: 'e.g., Authentic, Expert, Approachable' },
      { id: 'dosSayings', label: 'Do Say', type: 'textarea', placeholder: 'Phrases and language we use' },
      { id: 'dontsSayings', label: "Don't Say", type: 'textarea', placeholder: 'Phrases and language we avoid' },
      { id: 'audienceContext', label: 'Audience Context', type: 'text', placeholder: 'How does our audience speak?' },
    ],
    outputSections: [
      { id: 'voice-principles', title: 'Voice Principles', description: 'Core principles that define your brand voice' },
      { id: 'tone-variations', title: 'Tone Variations', description: 'How tone shifts across different contexts' },
      { id: 'writing-examples', title: 'Writing Examples', description: 'Before/after examples demonstrating voice application' },
      { id: 'usage-guidelines', title: 'Usage Guidelines', description: 'Practical guidelines for consistent voice application' }
    ]
  },

  'competitive-analysis': {
    title: 'Competitive Intelligence',
    description: 'Analyze competitors and identify market opportunities',
    fields: [
      { id: 'name', label: 'Analysis Name', type: 'text', placeholder: 'e.g., Q4 Competitive Analysis', required: true },
      { id: 'competitors', label: 'Key Competitors', type: 'textarea', placeholder: 'List main competitors (3-5)' },
      { id: 'analysisScope', label: 'Analysis Scope', type: 'text', placeholder: 'What aspects are you analyzing?' },
      { id: 'marketPosition', label: 'Your Current Position', type: 'textarea', placeholder: 'How do you currently position vs. competitors?' },
      { id: 'timeframe', label: 'Analysis Timeframe', type: 'select', options: ['Current State', '6 Months', '12 Months'] },
    ],
    outputSections: [
      { id: 'swot-analysis', title: 'SWOT Analysis', description: 'Strengths, weaknesses, opportunities, and threats' },
      { id: 'market-positioning', title: 'Market Positioning', description: 'Perceptual map of competitive landscape' },
      { id: 'competitive-gaps', title: 'Competitive Gaps', description: 'Identified gaps in competitor offerings' },
      { id: 'strategic-opportunities', title: 'Strategic Opportunities', description: 'Recommended opportunities based on analysis' }
    ]
  },

  'creative-brief': {
    title: 'Creative Brief Generator',
    description: 'Create detailed briefs for creative projects',
    fields: [
      { id: 'name', label: 'Project Name', type: 'text', placeholder: 'e.g., Summer Campaign Creative', required: true },
      { id: 'objective', label: 'Project Objective', type: 'textarea', placeholder: 'What should this creative achieve?', required: true },
      { id: 'deliverables', label: 'Required Deliverables', type: 'textarea', placeholder: 'List all required creative assets' },
      { id: 'mandatories', label: 'Mandatories', type: 'textarea', placeholder: 'Must-include elements (logo, tagline, etc.)' },
      { id: 'deadline', label: 'Deadline', type: 'text', placeholder: 'When is this needed?' },
    ],
    outputSections: [
      { id: 'brief-summary', title: 'Brief Summary', description: 'Executive summary of the creative brief' },
      { id: 'target-audience', title: 'Target Audience', description: 'Detailed audience profile for creative direction' },
      { id: 'creative-direction', title: 'Creative Direction', description: 'Visual and conceptual direction for the project' },
      { id: 'success-criteria', title: 'Success Criteria', description: 'How to measure creative success' }
    ]
  },

  'go-to-market': {
    title: 'Go-to-Market Strategy',
    description: 'Plan product launches and market entry strategies',
    fields: [
      { id: 'name', label: 'Launch Name', type: 'text', placeholder: 'e.g., Product X Market Launch', required: true },
      { id: 'productValue', label: 'Product Value Proposition', type: 'textarea', placeholder: 'What value does the product deliver?', required: true },
      { id: 'targetSegment', label: 'Initial Target Segment', type: 'text', placeholder: 'Who are you launching to first?' },
      { id: 'launchTimeline', label: 'Launch Timeline', type: 'select', options: ['4 weeks', '8 weeks', '12 weeks', '6 months'] },
      { id: 'successMetrics', label: 'Success Metrics', type: 'text', placeholder: 'How will you measure launch success?' },
    ],
    outputSections: [
      { id: 'launch-plan', title: 'Launch Plan', description: 'Phased launch plan with key activities' },
      { id: 'channel-strategy', title: 'Channel Strategy', description: 'Multi-channel go-to-market approach' },
      { id: 'timeline-milestones', title: 'Timeline & Milestones', description: 'Detailed timeline with critical milestones' },
      { id: 'risk-mitigation', title: 'Risk Mitigation', description: 'Identified risks and mitigation strategies' }
    ]
  },

  'social-media': {
    title: 'Social Media Strategy',
    description: 'Develop platform-specific social media strategies',
    fields: [
      { id: 'name', label: 'Strategy Name', type: 'text', placeholder: 'e.g., 2025 Social Media Strategy', required: true },
      { id: 'platforms', label: 'Priority Platforms', type: 'text', placeholder: 'e.g., LinkedIn, Instagram, Twitter', required: true },
      { id: 'socialGoals', label: 'Social Media Goals', type: 'textarea', placeholder: 'What do you want to achieve?' },
      { id: 'contentPillars', label: 'Content Pillars (3-5)', type: 'textarea', placeholder: 'Main content themes for social' },
      { id: 'postingFrequency', label: 'Posting Frequency', type: 'text', placeholder: 'How often will you post per platform?' },
    ],
    outputSections: [
      { id: 'platform-strategy', title: 'Platform Strategy', description: 'Platform-specific strategies and best practices' },
      { id: 'content-calendar', title: 'Content Calendar', description: 'Social media posting schedule' },
      { id: 'engagement-tactics', title: 'Engagement Tactics', description: 'Recommended tactics to drive engagement' },
      { id: 'performance-metrics', title: 'Performance Metrics', description: 'KPIs and measurement framework' }
    ]
  },

  'thought-leadership': {
    title: 'Thought Leadership Plan',
    description: 'Build authority through strategic content and engagement',
    fields: [
      { id: 'name', label: 'Plan Name', type: 'text', placeholder: 'e.g., 2025 Thought Leadership Plan', required: true },
      { id: 'expertiseAreas', label: 'Areas of Expertise', type: 'textarea', placeholder: 'What topics can you lead on?' },
      { id: 'targetAudience', label: 'Target Audience', type: 'text', placeholder: 'Who are you trying to influence?' },
      { id: 'contentFormats', label: 'Content Formats', type: 'text', placeholder: 'e.g., Articles, Webinars, Podcasts' },
      { id: 'distributionChannels', label: 'Distribution Channels', type: 'text', placeholder: 'Where will you publish?' },
    ],
    outputSections: [
      { id: 'topic-strategy', title: 'Topic Strategy', description: 'Strategic topics that position you as a thought leader' },
      { id: 'content-plan', title: 'Content Plan', description: 'Planned content pieces across formats' },
      { id: 'distribution-strategy', title: 'Distribution Strategy', description: 'Multi-channel distribution approach' },
      { id: 'authority-metrics', title: 'Authority Metrics', description: 'How to measure thought leadership impact' }
    ]
  }
};
