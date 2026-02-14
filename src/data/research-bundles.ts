import { Award, Target, ShieldCheck, Users, Palette, Package, TrendingUp, BookOpen, Megaphone, Lightbulb, Rocket, Map, Heart, Globe, ArrowUpRight, MessageSquare, Calendar, Radio, Layers, Sparkles, Zap, Crown, Star, Bot, ClipboardList } from 'lucide-react';
import { ResearchTargetCategory } from '../types/research-target';

export interface ResearchBundle {
  id: string;
  name: string;
  description: string;
  targetCategory: ResearchTargetCategory;
  primaryTool: string;
  secondaryTool: string | null;
  items: string[]; // IDs of items to research (brand assets, personas, etc.)
  itemType: 'brand' | 'persona' | 'trend' | 'knowledge';
  outcome: string;
  timeline: string;
  basePrice: number;
  bundlePrice: number;
  savings: number;
  badge?: string;
  icon: any;
  color: string;
  strategyToolUnlocked?: string | string[]; // Which strategy tool(s) this research enables
  bundleType?: 'foundation' | 'specialized' | 'legacy'; // New: bundle classification
  tier?: 'starter' | 'professional' | 'enterprise'; // New: pricing tier
  
  // NEW: Detailed activities (what happens during research)
  activities?: {
    icon: any;
    name: string;
    description: string;
    duration: string;
  }[];
  
  // NEW: Optional brand score impact (for plans that boost brand strength)
  scoreBoost?: { min: number; max: number };
}

// Comprehensive bundles across all target categories
// Each bundle is designed to gather data for specific strategy tools
export const researchBundles: ResearchBundle[] = [
  // ===== FOUNDATION BUNDLES (Multi-Strategy Enablers) =====
  {
    id: 'brand-essentials-foundation',
    name: 'Brand Essentials Foundation',
    description: 'Complete brand research package unlocking all core marketing and brand strategy tools',
    targetCategory: 'brand',
    primaryTool: 'workshop',
    secondaryTool: 'questionnaire',
    items: ['1', '2', '3', '4', '5', '6'], // All core brand assets
    itemType: 'brand',
    outcome: 'Comprehensive brand foundation enabling campaign, messaging, GTM, and positioning strategies',
    timeline: '5-6 weeks',
    basePrice: 8500,
    bundlePrice: 6900,
    savings: 1600,
    badge: 'Foundation',
    icon: Crown,
    color: 'purple',
    strategyToolUnlocked: [
      'campaign-strategy-generator',
      'messaging-framework-builder',
      'go-to-market-strategy',
      'competitive-positioning-framework',
      'brand-extension-opportunities',
      'brand-architecture-framework'
    ],
    bundleType: 'foundation',
    tier: 'professional',
    activities: [
      { icon: Award, name: 'Brand Workshop', description: 'Co-create brand foundation with team', duration: '2 weeks' },
      { icon: Target, name: 'Brand Validation Survey', description: 'Validate brand positioning at scale', duration: '1 week' },
      { icon: ShieldCheck, name: 'Brand Complete Research', description: 'Workshop creation + survey validation for all brand assets', duration: '3 weeks' }
    ],
    scoreBoost: { min: 10, max: 20 }
  },

  {
    id: 'customer-intelligence-foundation',
    name: 'Customer Intelligence Foundation',
    description: 'Deep customer research across all personas enabling CX, product, and growth strategies',
    targetCategory: 'persona',
    primaryTool: 'interviews',
    secondaryTool: 'questionnaire',
    items: ['sarah-product-manager', 'marcus-entrepreneur', 'lisa-creative-director', 'david-operations'],
    itemType: 'persona',
    outcome: 'Complete customer intelligence enabling journey mapping, product innovation, and retention strategies',
    timeline: '5-6 weeks',
    basePrice: 7500,
    bundlePrice: 5900,
    savings: 1600,
    badge: 'Foundation',
    icon: Crown,
    color: 'pink',
    strategyToolUnlocked: [
      'customer-journey-mapping',
      'touchpoint-strategy',
      'loyalty-retention-strategy',
      'product-concept-generator',
      'content-strategy-planner',
      'channel-strategy-advisor'
    ],
    bundleType: 'foundation',
    tier: 'professional',
    activities: [
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' }
    ],
    scoreBoost: { min: 15, max: 25 }
  },

  {
    id: 'growth-accelerator-foundation',
    name: 'Growth Accelerator Foundation',
    description: 'Combined brand and customer research designed to unlock all growth and marketing strategies',
    targetCategory: 'brand',
    primaryTool: 'questionnaire',
    secondaryTool: 'interviews',
    items: ['1', '2', '4', '5'], // Core brand + personas implied
    itemType: 'brand',
    outcome: 'Growth-focused research enabling campaign, channel, content, and GTM strategies',
    timeline: '4-5 weeks',
    basePrice: 6500,
    bundlePrice: 5200,
    savings: 1300,
    badge: 'Foundation',
    icon: Zap,
    color: 'blue',
    strategyToolUnlocked: [
      'campaign-strategy-generator',
      'content-strategy-planner',
      'channel-strategy-advisor',
      'go-to-market-strategy',
      'growth-strategy-roadmap'
    ],
    bundleType: 'foundation',
    tier: 'professional',
    activities: [
      { icon: Award, name: 'Brand Workshop', description: 'Co-create brand foundation with team', duration: '2 weeks' },
      { icon: Target, name: 'Brand Validation Survey', description: 'Validate brand positioning at scale', duration: '1 week' },
      { icon: ShieldCheck, name: 'Brand Complete Research', description: 'Workshop creation + survey validation for all brand assets', duration: '3 weeks' },
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' }
    ],
    scoreBoost: { min: 20, max: 30 }
  },

  {
    id: 'innovation-lab-foundation',
    name: 'Innovation Lab Foundation',
    description: 'Customer needs and market trend research unlocking all product and innovation strategies',
    targetCategory: 'persona',
    primaryTool: 'interviews',
    secondaryTool: 'ai-agent',
    items: ['sarah-product-manager', 'marcus-entrepreneur', 'lisa-creative-director'],
    itemType: 'persona',
    outcome: 'Innovation-ready insights enabling product concepts, feature prioritization, and opportunity scanning',
    timeline: '4-5 weeks',
    basePrice: 6000,
    bundlePrice: 4800,
    savings: 1200,
    badge: 'Foundation',
    icon: Lightbulb,
    color: 'purple',
    strategyToolUnlocked: [
      'product-concept-generator',
      'feature-prioritization-matrix',
      'service-design-blueprint',
      'innovation-opportunity-scanner'
    ],
    bundleType: 'foundation',
    tier: 'professional',
    activities: [
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' },
      { icon: Lightbulb, name: 'Innovation Scanning Research', description: 'Identify market white spaces by analyzing trends, competitor gaps, and customer needs', duration: '2 weeks' }
    ],
    scoreBoost: { min: 25, max: 35 }
  },

  {
    id: 'market-expansion-foundation',
    name: 'Market Expansion Foundation',
    description: 'Comprehensive brand, market, and competitive research for expansion and scaling strategies',
    targetCategory: 'trends',
    primaryTool: 'ai-agent',
    secondaryTool: 'interviews',
    items: [],
    itemType: 'trend',
    outcome: 'Expansion-ready intelligence enabling market entry, partnerships, and brand extension strategies',
    timeline: '5-6 weeks',
    basePrice: 7000,
    bundlePrice: 5600,
    savings: 1400,
    badge: 'Foundation',
    icon: Globe,
    color: 'amber',
    strategyToolUnlocked: [
      'market-entry-strategy',
      'brand-extension-opportunities',
      'partnership-strategy',
      'competitive-positioning-framework',
      'growth-strategy-roadmap'
    ],
    bundleType: 'foundation',
    tier: 'enterprise',
    activities: [
      { icon: TrendingUp, name: 'Market Trends Analysis', description: 'Explore emerging trends and their impact on your business', duration: '2 weeks' },
      { icon: Target, name: 'Competitive Intelligence', description: 'Understand competitor moves and market shifts', duration: '2 weeks' },
      { icon: Award, name: 'Brand Workshop', description: 'Co-create brand foundation with team', duration: '2 weeks' },
      { icon: Target, name: 'Brand Validation Survey', description: 'Validate brand positioning at scale', duration: '1 week' },
      { icon: ShieldCheck, name: 'Brand Complete Research', description: 'Workshop creation + survey validation for all brand assets', duration: '3 weeks' }
    ],
    scoreBoost: { min: 30, max: 40 }
  },

  {
    id: 'complete-strategy-foundation',
    name: 'Complete Strategy Foundation',
    description: 'Ultimate research package: brand + customers + market. Unlocks ALL 21 strategy tools',
    targetCategory: 'brand',
    primaryTool: 'workshop',
    secondaryTool: 'questionnaire',
    items: ['1', '2', '3', '4', '5', '6'],
    itemType: 'brand',
    outcome: 'Enterprise-grade research foundation enabling your entire strategic toolkit',
    timeline: '8-10 weeks',
    basePrice: 15000,
    bundlePrice: 11900,
    savings: 3100,
    badge: 'Ultimate',
    icon: Star,
    color: 'purple',
    strategyToolUnlocked: [
      'campaign-strategy-generator',
      'content-strategy-planner',
      'channel-strategy-advisor',
      'messaging-framework-builder',
      'product-concept-generator',
      'feature-prioritization-matrix',
      'service-design-blueprint',
      'innovation-opportunity-scanner',
      'go-to-market-strategy',
      'competitive-positioning-framework',
      'growth-strategy-roadmap',
      'partnership-strategy',
      'customer-journey-mapping',
      'touchpoint-strategy',
      'loyalty-retention-strategy',
      'brand-extension-opportunities',
      'brand-architecture-framework',
      'market-entry-strategy'
    ],
    bundleType: 'foundation',
    tier: 'enterprise',
    activities: [
      { icon: Award, name: 'Brand Workshop', description: 'Co-create brand foundation with team', duration: '2 weeks' },
      { icon: Target, name: 'Brand Validation Survey', description: 'Validate brand positioning at scale', duration: '1 week' },
      { icon: ShieldCheck, name: 'Brand Complete Research', description: 'Workshop creation + survey validation for all brand assets', duration: '3 weeks' },
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' },
      { icon: Lightbulb, name: 'Innovation Scanning Research', description: 'Identify market white spaces by analyzing trends, competitor gaps, and customer needs', duration: '2 weeks' },
      { icon: TrendingUp, name: 'Market Trends Analysis', description: 'Explore emerging trends and their impact on your business', duration: '2 weeks' },
      { icon: Target, name: 'Competitive Intelligence', description: 'Understand competitor moves and market shifts', duration: '2 weeks' }
    ],
    scoreBoost: { min: 40, max: 50 }
  },

  // ===== SPECIALIZED BUNDLES (Single-Strategy Focused) =====
  {
    id: 'campaign-launch-research',
    name: 'Campaign Launch Research',
    description: 'Comprehensive research to power your campaign strategy with brand positioning, target personas, and market insights',
    targetCategory: 'brand',
    primaryTool: 'questionnaire',
    secondaryTool: 'interviews',
    items: ['4', '5', '6'], // Positioning, Voice & Tone, Messaging
    itemType: 'brand',
    outcome: 'Campaign-ready brand positioning and validated messaging framework',
    timeline: '3-4 weeks',
    basePrice: 3500,
    bundlePrice: 2900,
    savings: 600,
    badge: 'Most Popular',
    icon: Megaphone,
    color: 'blue',
    strategyToolUnlocked: 'campaign-strategy-generator',
    bundleType: 'specialized',
    tier: 'starter',
    activities: [
      { icon: Target, name: 'Brand Validation Survey', description: 'Validate brand positioning at scale', duration: '1 week' },
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' }
    ],
    scoreBoost: { min: 5, max: 10 }
  },
  
  {
    id: 'content-ecosystem-research',
    name: 'Content Ecosystem Research',
    description: 'Deep dive into brand voice, audience preferences, and content consumption patterns',
    targetCategory: 'persona',
    primaryTool: 'interviews',
    secondaryTool: 'questionnaire',
    items: ['sarah-product-manager', 'marcus-entrepreneur', 'lisa-creative-director'],
    itemType: 'persona',
    outcome: 'Content strategy foundation with persona content preferences and consumption habits',
    timeline: '3-4 weeks',
    basePrice: 3200,
    bundlePrice: 2700,
    savings: 500,
    badge: 'Content Ready',
    icon: Calendar,
    color: 'blue',
    strategyToolUnlocked: 'content-strategy-planner',
    bundleType: 'specialized',
    tier: 'starter',
    activities: [
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' }
    ],
    scoreBoost: { min: 5, max: 10 }
  },

  {
    id: 'channel-optimization-research',
    name: 'Channel Optimization Research',
    description: 'Discover where your audience spends time and which channels drive the best engagement',
    targetCategory: 'persona',
    primaryTool: 'questionnaire',
    secondaryTool: null,
    items: ['sarah-product-manager', 'marcus-entrepreneur'],
    itemType: 'persona',
    outcome: 'Data-driven channel preferences and media consumption patterns',
    timeline: '2-3 weeks',
    basePrice: 2000,
    bundlePrice: 1700,
    savings: 300,
    badge: 'Fast Track',
    icon: Radio,
    color: 'blue',
    strategyToolUnlocked: 'channel-strategy-advisor',
    bundleType: 'specialized',
    tier: 'starter',
    activities: [
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' }
    ],
    scoreBoost: { min: 5, max: 10 }
  },

  {
    id: 'messaging-hierarchy-research',
    name: 'Messaging Hierarchy Research',
    description: 'Validate brand positioning and create persona-specific messaging frameworks',
    targetCategory: 'brand',
    primaryTool: 'workshop',
    secondaryTool: 'questionnaire',
    items: ['1', '2', '3', '4', '5'], // Purpose, Value Prop, Story, Positioning, Voice
    itemType: 'brand',
    outcome: 'Validated messaging architecture for all brand touchpoints',
    timeline: '4-5 weeks',
    basePrice: 4500,
    bundlePrice: 3800,
    savings: 700,
    badge: 'Strategic',
    icon: MessageSquare,
    color: 'blue',
    strategyToolUnlocked: 'messaging-framework-builder',
    bundleType: 'specialized',
    tier: 'professional',
    activities: [
      { icon: Award, name: 'Brand Workshop', description: 'Co-create brand foundation with team', duration: '2 weeks' },
      { icon: Target, name: 'Brand Validation Survey', description: 'Validate brand positioning at scale', duration: '1 week' },
      { icon: ShieldCheck, name: 'Brand Complete Research', description: 'Workshop creation + survey validation for all brand assets', duration: '3 weeks' },
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' }
    ],
    scoreBoost: { min: 10, max: 20 }
  },

  // ===== PRODUCT & INNOVATION STRATEGY BUNDLES =====
  {
    id: 'product-innovation-discovery',
    name: 'Product Innovation Discovery',
    description: 'Uncover unmet customer needs, pain points, and emerging opportunities for new products',
    targetCategory: 'persona',
    primaryTool: 'interviews',
    secondaryTool: 'questionnaire',
    items: ['sarah-product-manager', 'marcus-entrepreneur', 'lisa-creative-director', 'david-operations'],
    itemType: 'persona',
    outcome: 'Innovation opportunity map with validated customer needs and pain points',
    timeline: '4-5 weeks',
    basePrice: 4200,
    bundlePrice: 3600,
    savings: 600,
    badge: 'Innovation',
    icon: Lightbulb,
    color: 'purple',
    strategyToolUnlocked: 'product-concept-generator',
    bundleType: 'specialized',
    tier: 'professional',
    activities: [
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' },
      { icon: Lightbulb, name: 'Innovation Scanning Research', description: 'Identify market white spaces by analyzing trends, competitor gaps, and customer needs', duration: '2 weeks' }
    ],
    scoreBoost: { min: 15, max: 25 }
  },

  {
    id: 'feature-validation-research',
    name: 'Feature Validation Research',
    description: 'Test and prioritize product features based on real user feedback and business value',
    targetCategory: 'persona',
    primaryTool: 'interviews',
    secondaryTool: 'questionnaire',
    items: ['sarah-product-manager', 'marcus-entrepreneur'],
    itemType: 'persona',
    outcome: 'Feature prioritization data with user value scores and implementation insights',
    timeline: '3-4 weeks',
    basePrice: 3200,
    bundlePrice: 2800,
    savings: 400,
    badge: 'Data-Driven',
    icon: Layers,
    color: 'purple',
    strategyToolUnlocked: 'feature-prioritization-matrix',
    bundleType: 'specialized',
    tier: 'starter',
    activities: [
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' }
    ],
    scoreBoost: { min: 5, max: 10 }
  },

  {
    id: 'service-experience-research',
    name: 'Service Experience Research',
    description: 'Map the complete service journey from customer and internal stakeholder perspectives',
    targetCategory: 'persona',
    primaryTool: 'workshop',
    secondaryTool: 'interviews',
    items: ['sarah-product-manager', 'lisa-creative-director'],
    itemType: 'persona',
    outcome: 'Service blueprint foundation with touchpoint analysis and process insights',
    timeline: '3-4 weeks',
    basePrice: 3500,
    bundlePrice: 3000,
    savings: 500,
    badge: 'Experience',
    icon: Map,
    color: 'purple',
    strategyToolUnlocked: 'service-design-blueprint',
    bundleType: 'specialized',
    tier: 'professional',
    activities: [
      { icon: Award, name: 'Brand Workshop', description: 'Co-create brand foundation with team', duration: '2 weeks' },
      { icon: Target, name: 'Brand Validation Survey', description: 'Validate brand positioning at scale', duration: '1 week' },
      { icon: ShieldCheck, name: 'Brand Complete Research', description: 'Workshop creation + survey validation for all brand assets', duration: '3 weeks' },
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' }
    ],
    scoreBoost: { min: 10, max: 20 }
  },

  {
    id: 'innovation-scanning-research',
    name: 'Innovation Scanning Research',
    description: 'Identify market white spaces by analyzing trends, competitor gaps, and customer needs',
    targetCategory: 'trends',
    primaryTool: 'ai-agent',
    secondaryTool: 'interviews',
    items: [],
    itemType: 'trend',
    outcome: 'Innovation opportunity report with trend analysis and market gap identification',
    timeline: '2-3 weeks',
    basePrice: 2500,
    bundlePrice: 2100,
    savings: 400,
    badge: 'High Impact',
    icon: Sparkles,
    color: 'purple',
    strategyToolUnlocked: 'innovation-opportunity-scanner',
    bundleType: 'specialized',
    tier: 'professional',
    activities: [
      { icon: Lightbulb, name: 'Innovation Scanning Research', description: 'Identify market white spaces by analyzing trends, competitor gaps, and customer needs', duration: '2 weeks' }
    ],
    scoreBoost: { min: 15, max: 25 }
  },

  // ===== BUSINESS STRATEGY BUNDLES =====
  {
    id: 'go-to-market-validation',
    name: 'Go-to-Market Validation',
    description: 'Validate market positioning, pricing, and distribution strategy before launch',
    targetCategory: 'brand',
    primaryTool: 'interviews',
    secondaryTool: 'questionnaire',
    items: ['1', '2', '4', '5'], // Purpose, Value Prop, Positioning, Voice
    itemType: 'brand',
    outcome: 'GTM-ready validation data with market positioning and launch strategy insights',
    timeline: '4-5 weeks',
    basePrice: 4500,
    bundlePrice: 3900,
    savings: 600,
    badge: 'Launch Ready',
    icon: Rocket,
    color: 'green',
    strategyToolUnlocked: 'go-to-market-strategy',
    bundleType: 'specialized',
    tier: 'professional',
    activities: [
      { icon: Award, name: 'Brand Workshop', description: 'Co-create brand foundation with team', duration: '2 weeks' },
      { icon: Target, name: 'Brand Validation Survey', description: 'Validate brand positioning at scale', duration: '1 week' },
      { icon: ShieldCheck, name: 'Brand Complete Research', description: 'Workshop creation + survey validation for all brand assets', duration: '3 weeks' }
    ],
    scoreBoost: { min: 10, max: 20 }
  },

  {
    id: 'competitive-positioning-research',
    name: 'Competitive Positioning Research',
    description: 'Analyze competitive landscape and validate your unique positioning in the market',
    targetCategory: 'trends',
    primaryTool: 'ai-agent',
    secondaryTool: 'interviews',
    items: [],
    itemType: 'trend',
    outcome: 'Competitive intelligence report with positioning recommendations',
    timeline: '2-3 weeks',
    basePrice: 2200,
    bundlePrice: 1900,
    savings: 300,
    badge: 'Strategic',
    icon: Target,
    color: 'green',
    strategyToolUnlocked: 'competitive-positioning-framework',
    bundleType: 'specialized',
    tier: 'starter',
    activities: [
      { icon: Target, name: 'Competitive Intelligence', description: 'Understand competitor moves and market shifts', duration: '2 weeks' }
    ],
    scoreBoost: { min: 5, max: 10 }
  },

  {
    id: 'growth-opportunity-research',
    name: 'Growth Opportunity Research',
    description: 'Identify and validate growth opportunities across markets, segments, and channels',
    targetCategory: 'persona',
    primaryTool: 'interviews',
    secondaryTool: 'questionnaire',
    items: ['sarah-product-manager', 'marcus-entrepreneur', 'david-operations'],
    itemType: 'persona',
    outcome: 'Growth roadmap foundation with validated opportunities and expansion paths',
    timeline: '4-5 weeks',
    basePrice: 3800,
    bundlePrice: 3200,
    savings: 600,
    badge: 'Growth',
    icon: TrendingUp,
    color: 'green',
    strategyToolUnlocked: 'growth-strategy-roadmap',
    bundleType: 'specialized',
    tier: 'professional',
    activities: [
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' },
      { icon: TrendingUp, name: 'Market Trends Analysis', description: 'Explore emerging trends and their impact on your business', duration: '2 weeks' }
    ],
    scoreBoost: { min: 15, max: 25 }
  },

  {
    id: 'partnership-ecosystem-research',
    name: 'Partnership Ecosystem Research',
    description: 'Map potential partners and ecosystem players that align with your strategic goals',
    targetCategory: 'trends',
    primaryTool: 'ai-agent',
    secondaryTool: 'workshop',
    items: [],
    itemType: 'trend',
    outcome: 'Partnership opportunity map with ecosystem analysis and fit assessment',
    timeline: '2-3 weeks',
    basePrice: 2000,
    bundlePrice: 1700,
    savings: 300,
    badge: 'Strategic',
    icon: Globe,
    color: 'green',
    strategyToolUnlocked: 'partnership-strategy',
    bundleType: 'specialized',
    tier: 'starter',
    activities: [
      { icon: Target, name: 'Competitive Intelligence', description: 'Understand competitor moves and market shifts', duration: '2 weeks' },
      { icon: Award, name: 'Brand Workshop', description: 'Co-create brand foundation with team', duration: '2 weeks' },
      { icon: Target, name: 'Brand Validation Survey', description: 'Validate brand positioning at scale', duration: '1 week' },
      { icon: ShieldCheck, name: 'Brand Complete Research', description: 'Workshop creation + survey validation for all brand assets', duration: '3 weeks' }
    ],
    scoreBoost: { min: 10, max: 20 }
  },

  // ===== CUSTOMER EXPERIENCE STRATEGY BUNDLES =====
  {
    id: 'customer-journey-research',
    name: 'Customer Journey Research',
    description: 'Deep dive into customer touchpoints, emotions, and pain points throughout their journey',
    targetCategory: 'persona',
    primaryTool: 'interviews',
    secondaryTool: 'questionnaire',
    items: ['sarah-product-manager', 'marcus-entrepreneur'],
    itemType: 'persona',
    outcome: 'Journey mapping foundation with touchpoint analysis and emotional insights',
    timeline: '3-4 weeks',
    basePrice: 3500,
    bundlePrice: 3000,
    savings: 500,
    badge: 'Experience',
    icon: Map,
    color: 'pink',
    strategyToolUnlocked: 'customer-journey-mapping',
    bundleType: 'specialized',
    tier: 'professional',
    activities: [
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' }
    ],
    scoreBoost: { min: 10, max: 20 }
  },

  {
    id: 'touchpoint-optimization-research',
    name: 'Touchpoint Optimization Research',
    description: 'Evaluate and optimize every customer interaction across channels and journey stages',
    targetCategory: 'persona',
    primaryTool: 'interviews',
    secondaryTool: 'questionnaire',
    items: ['sarah-product-manager', 'lisa-creative-director'],
    itemType: 'persona',
    outcome: 'Touchpoint audit with optimization recommendations and priority matrix',
    timeline: '3-4 weeks',
    basePrice: 3000,
    bundlePrice: 2600,
    savings: 400,
    badge: 'CX Ready',
    icon: Users,
    color: 'pink',
    strategyToolUnlocked: 'touchpoint-strategy',
    bundleType: 'specialized',
    tier: 'starter',
    activities: [
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' }
    ],
    scoreBoost: { min: 5, max: 10 }
  },

  {
    id: 'loyalty-retention-research',
    name: 'Loyalty & Retention Research',
    description: 'Understand what drives customer loyalty and identify retention opportunities',
    targetCategory: 'persona',
    primaryTool: 'interviews',
    secondaryTool: 'questionnaire',
    items: ['sarah-product-manager', 'marcus-entrepreneur', 'david-operations'],
    itemType: 'persona',
    outcome: 'Retention strategy foundation with loyalty drivers and churn prevention insights',
    timeline: '3-4 weeks',
    basePrice: 3200,
    bundlePrice: 2800,
    savings: 400,
    badge: 'Retention',
    icon: Heart,
    color: 'pink',
    strategyToolUnlocked: 'loyalty-retention-strategy',
    bundleType: 'specialized',
    tier: 'starter',
    activities: [
      { icon: Users, name: 'Persona Deep Dive', description: 'Comprehensive research across all your personas', duration: '4 weeks' },
      { icon: Target, name: 'Persona Validation Survey', description: 'Validate persona assumptions at scale', duration: '1 week' },
      { icon: Award, name: 'Empathy Research Pack', description: 'Interviews + observation for deep empathy', duration: '3 weeks' }
    ],
    scoreBoost: { min: 5, max: 10 }
  },

  // ===== BRAND EXPANSION STRATEGY BUNDLES =====
  {
    id: 'brand-extension-research',
    name: 'Brand Extension Research',
    description: 'Validate brand extension opportunities and assess brand equity transferability',
    targetCategory: 'brand',
    primaryTool: 'workshop',
    secondaryTool: 'questionnaire',
    items: ['1', '2', '3', '4'], // Purpose, Value Prop, Story, Positioning
    itemType: 'brand',
    outcome: 'Brand extension framework with equity assessment and opportunity validation',
    timeline: '4-5 weeks',
    basePrice: 4000,
    bundlePrice: 3400,
    savings: 600,
    badge: 'Expansion',
    icon: ArrowUpRight,
    color: 'amber',
    strategyToolUnlocked: 'brand-extension-opportunities',
    bundleType: 'specialized',
    tier: 'professional',
    activities: [
      { icon: Award, name: 'Brand Workshop', description: 'Co-create brand foundation with team', duration: '2 weeks' },
      { icon: Target, name: 'Brand Validation Survey', description: 'Validate brand positioning at scale', duration: '1 week' },
      { icon: ShieldCheck, name: 'Brand Complete Research', description: 'Workshop creation + survey validation for all brand assets', duration: '3 weeks' }
    ],
    scoreBoost: { min: 10, max: 20 }
  },

  {
    id: 'brand-architecture-research',
    name: 'Brand Architecture Research',
    description: 'Define optimal brand portfolio structure and sub-brand relationships',
    targetCategory: 'brand',
    primaryTool: 'workshop',
    secondaryTool: null,
    items: ['1', '2', '4'], // Purpose, Value Prop, Positioning
    itemType: 'brand',
    outcome: 'Brand architecture blueprint with portfolio structure and relationship mapping',
    timeline: '3-4 weeks',
    basePrice: 3500,
    bundlePrice: 3000,
    savings: 500,
    badge: 'Advanced',
    icon: Palette,
    color: 'amber',
    strategyToolUnlocked: 'brand-architecture-framework',
    bundleType: 'specialized',
    tier: 'professional',
    activities: [
      { icon: Award, name: 'Brand Workshop', description: 'Co-create brand foundation with team', duration: '2 weeks' },
      { icon: Target, name: 'Brand Validation Survey', description: 'Validate brand positioning at scale', duration: '1 week' },
      { icon: ShieldCheck, name: 'Brand Complete Research', description: 'Workshop creation + survey validation for all brand assets', duration: '3 weeks' }
    ],
    scoreBoost: { min: 10, max: 20 }
  },

  {
    id: 'market-entry-research',
    name: 'Market Entry Research',
    description: 'Comprehensive research for entering new geographic or demographic markets',
    targetCategory: 'trends',
    primaryTool: 'ai-agent',
    secondaryTool: 'interviews',
    items: [],
    itemType: 'trend',
    outcome: 'Market entry blueprint with localization insights and go-to-market recommendations',
    timeline: '4-5 weeks',
    basePrice: 4500,
    bundlePrice: 3900,
    savings: 600,
    badge: 'Enterprise',
    icon: Globe,
    color: 'amber',
    strategyToolUnlocked: 'market-entry-strategy',
    bundleType: 'specialized',
    tier: 'enterprise',
    activities: [
      { icon: TrendingUp, name: 'Market Trends Analysis', description: 'Explore emerging trends and their impact on your business', duration: '2 weeks' },
      { icon: Target, name: 'Competitive Intelligence', description: 'Understand competitor moves and market shifts', duration: '2 weeks' },
      { icon: Award, name: 'Brand Workshop', description: 'Co-create brand foundation with team', duration: '2 weeks' },
      { icon: Target, name: 'Brand Validation Survey', description: 'Validate brand positioning at scale', duration: '1 week' },
      { icon: ShieldCheck, name: 'Brand Complete Research', description: 'Workshop creation + survey validation for all brand assets', duration: '3 weeks' }
    ],
    scoreBoost: { min: 20, max: 30 }
  },

  // ===== LEGACY/GENERAL BUNDLES (Backwards compatibility) =====
  {
    id: 'brand-foundation-workshop',
    name: 'Brand Foundation Workshop',
    description: 'Build your complete brand foundation with your team',
    targetCategory: 'brand',
    primaryTool: 'workshop',
    secondaryTool: null,
    items: ['1', '2', '3'], // Brand Purpose, Value Proposition, Brand Story
    itemType: 'brand',
    outcome: 'Co-created brand foundation with team alignment',
    timeline: '2-3 weeks',
    basePrice: 3600,
    bundlePrice: 3200,
    savings: 400,
    icon: Award,
    color: 'purple',
    bundleType: 'legacy',
    tier: 'starter'
  },
  {
    id: 'brand-validation-survey',
    name: 'Brand Validation Survey',
    description: 'Validate your brand positioning at scale',
    targetCategory: 'brand',
    primaryTool: 'questionnaire',
    secondaryTool: null,
    items: ['4', '5', '6'], // Positioning, Voice & Tone, Messaging
    itemType: 'brand',
    outcome: 'Data-backed validation of brand positioning',
    timeline: '2-3 weeks',
    basePrice: 1500,
    bundlePrice: 1300,
    savings: 200,
    badge: 'Best Value',
    icon: Target,
    color: 'purple',
    bundleType: 'legacy',
    tier: 'starter'
  },
  {
    id: 'brand-complete',
    name: 'Complete Brand Research',
    description: 'Workshop creation + survey validation for all brand assets',
    targetCategory: 'brand',
    primaryTool: 'workshop',
    secondaryTool: 'questionnaire',
    items: ['1', '2', '3', '4', '5'], // All main brand assets
    itemType: 'brand',
    outcome: 'Fully researched and validated brand system',
    timeline: '4-6 weeks',
    basePrice: 6500,
    bundlePrice: 5500,
    savings: 1000,
    badge: 'Most Comprehensive',
    icon: ShieldCheck,
    color: 'purple',
    bundleType: 'legacy',
    tier: 'professional'
  },

  {
    id: 'persona-deep-dive',
    name: 'Persona Deep Dive',
    description: 'Comprehensive research across all your personas',
    targetCategory: 'persona',
    primaryTool: 'interviews',
    secondaryTool: 'questionnaire',
    items: ['sarah-product-manager', 'marcus-entrepreneur', 'lisa-creative-director'], // Top 3 personas
    itemType: 'persona',
    outcome: 'Rich persona profiles with qualitative and quantitative insights',
    timeline: '4-5 weeks',
    basePrice: 4800,
    bundlePrice: 4200,
    savings: 600,
    icon: Users,
    color: 'pink',
    bundleType: 'legacy',
    tier: 'professional'
  },
  {
    id: 'persona-validation',
    name: 'Persona Validation Survey',
    description: 'Validate persona assumptions at scale',
    targetCategory: 'persona',
    primaryTool: 'questionnaire',
    secondaryTool: null,
    items: ['sarah-product-manager', 'marcus-entrepreneur', 'lisa-creative-director', 'david-operations'],
    itemType: 'persona',
    outcome: 'Statistically validated persona attributes and behaviors',
    timeline: '2-3 weeks',
    basePrice: 2000,
    bundlePrice: 1700,
    savings: 300,
    icon: Target,
    color: 'pink',
    bundleType: 'legacy',
    tier: 'starter'
  },
  {
    id: 'persona-empathy-pack',
    name: 'Empathy Research Pack',
    description: 'Interviews + observation for deep empathy',
    targetCategory: 'persona',
    primaryTool: 'interviews',
    secondaryTool: null,
    items: ['sarah-product-manager', 'marcus-entrepreneur'],
    itemType: 'persona',
    outcome: 'Deep empathy maps with real user stories',
    timeline: '3-4 weeks',
    basePrice: 3200,
    bundlePrice: 2800,
    savings: 400,
    badge: 'High Quality',
    icon: Award,
    color: 'pink',
    bundleType: 'legacy',
    tier: 'starter'
  },

  {
    id: 'product-market-fit',
    name: 'Product-Market Fit Research',
    description: 'Validate your offerings with target customers',
    targetCategory: 'products-services',
    primaryTool: 'interviews',
    secondaryTool: 'questionnaire',
    items: [], // Will be populated when products are added
    itemType: 'brand',
    outcome: 'Product-market fit validation with improvement roadmap',
    timeline: '3-4 weeks',
    basePrice: 3500,
    bundlePrice: 3000,
    savings: 500,
    badge: 'Recommended',
    icon: Package,
    color: 'blue',
    bundleType: 'legacy',
    tier: 'professional'
  },
  {
    id: 'service-design-workshop',
    name: 'Service Design Workshop',
    description: 'Co-create service improvements with stakeholders',
    targetCategory: 'products-services',
    primaryTool: 'workshop',
    secondaryTool: null,
    items: [],
    itemType: 'brand',
    outcome: 'Refined service design with customer journey maps',
    timeline: '2-3 weeks',
    basePrice: 2800,
    bundlePrice: 2400,
    savings: 400,
    icon: Award,
    color: 'blue',
    bundleType: 'legacy',
    tier: 'starter'
  },

  {
    id: 'market-trends-research',
    name: 'Market Trends Analysis',
    description: 'Explore emerging trends and their impact on your business',
    targetCategory: 'trends',
    primaryTool: 'ai-agent',
    secondaryTool: 'questionnaire',
    items: [],
    itemType: 'trend',
    outcome: 'Trend report with strategic implications',
    timeline: '2-3 weeks',
    basePrice: 1500,
    bundlePrice: 1200,
    savings: 300,
    badge: 'Fast Track',
    icon: TrendingUp,
    color: 'green',
    bundleType: 'legacy',
    tier: 'starter'
  },
  {
    id: 'competitive-intelligence',
    name: 'Competitive Intelligence',
    description: 'Understand competitor moves and market shifts',
    targetCategory: 'trends',
    primaryTool: 'ai-agent',
    secondaryTool: 'interviews',
    items: [],
    itemType: 'trend',
    outcome: 'Competitive landscape report with insights',
    timeline: '2-3 weeks',
    basePrice: 2000,
    bundlePrice: 1700,
    savings: 300,
    icon: Target,
    color: 'green',
    bundleType: 'legacy',
    tier: 'starter'
  },

  {
    id: 'knowledge-gap-analysis',
    name: 'Knowledge Gap Analysis',
    description: 'Identify and fill strategic knowledge gaps',
    targetCategory: 'knowledge',
    primaryTool: 'workshop',
    secondaryTool: 'questionnaire',
    items: [],
    itemType: 'knowledge',
    outcome: 'Knowledge gap report with learning roadmap',
    timeline: '2-3 weeks',
    basePrice: 2500,
    bundlePrice: 2100,
    savings: 400,
    badge: 'Strategic',
    icon: BookOpen,
    color: 'amber',
    bundleType: 'legacy',
    tier: 'professional'
  },
  {
    id: 'best-practices-research',
    name: 'Best Practices Research',
    description: 'Learn from industry leaders and apply insights',
    targetCategory: 'knowledge',
    primaryTool: 'ai-agent',
    secondaryTool: 'interviews',
    items: [],
    itemType: 'knowledge',
    outcome: 'Best practices library with implementation guide',
    timeline: '3-4 weeks',
    basePrice: 2200,
    bundlePrice: 1900,
    savings: 300,
    icon: Award,
    color: 'amber',
    bundleType: 'legacy',
    tier: 'starter'
  }
];

// Get bundles for a specific target category
export function getBundlesForTarget(targetCategory: ResearchTargetCategory): ResearchBundle[] {
  return researchBundles.filter(bundle => bundle.targetCategory === targetCategory);
}

// Get bundles by type
export function getBundlesByType(bundleType: 'foundation' | 'specialized' | 'legacy'): ResearchBundle[] {
  return researchBundles.filter(bundle => bundle.bundleType === bundleType);
}

// Get foundation bundles (multi-strategy enablers)
export function getFoundationBundles(): ResearchBundle[] {
  return getBundlesByType('foundation');
}

// Get specialized bundles (single-strategy focused)
export function getSpecializedBundles(): ResearchBundle[] {
  return getBundlesByType('specialized');
}

// Get bundles by tier
export function getBundlesByTier(tier: 'starter' | 'professional' | 'enterprise'): ResearchBundle[] {
  return researchBundles.filter(bundle => bundle.tier === tier);
}

// Get strategy tools unlocked by a bundle
export function getStrategyToolsUnlockedByBundle(bundleId: string): string[] {
  const bundle = researchBundles.find(b => b.id === bundleId);
  if (!bundle || !bundle.strategyToolUnlocked) return [];
  
  return Array.isArray(bundle.strategyToolUnlocked) 
    ? bundle.strategyToolUnlocked 
    : [bundle.strategyToolUnlocked];
}