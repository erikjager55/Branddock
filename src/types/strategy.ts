// Strategy Hub Type Definitions

export type StrategyCategory = 
  | 'marketing-growth'
  | 'product-innovation'
  | 'business-strategy'
  | 'customer-experience'
  | 'brand-expansion';

export type StrategyToolStatus = 'available' | 'locked' | 'coming-soon';

export type OutputFormat = 'brief' | 'roadmap' | 'canvas' | 'framework' | 'action-plan';

// Required inputs for a strategy tool
export interface StrategyInputRequirement {
  type: 'research-plan' | 'brand-asset' | 'persona' | 'trend' | 'custom';
  category?: string;
  count: number; // minimum required
  optional?: boolean;
  description: string;
}

// Strategy Tool Definition
export interface StrategyTool {
  id: string;
  name: string;
  category: StrategyCategory;
  tagline: string;
  description: string;
  icon: any;
  color: string;
  status: StrategyToolStatus;
  
  // What does this tool produce?
  outputs: {
    primary: string; // e.g., "Campaign Strategy Brief"
    formats: OutputFormat[];
    estimatedTime: string; // e.g., "5-10 minutes"
  };
  
  // What inputs are needed?
  inputs: {
    required: StrategyInputRequirement[];
    optional?: StrategyInputRequirement[];
  };
  
  // Intelligence level
  aiLevel: 'template' | 'guided' | 'ai-assisted' | 'fully-generated';
  
  // Use cases and examples
  useCases: string[];
  exampleOutput?: string;
  
  // Complexity and value indicators
  complexity: 'low' | 'medium' | 'high';
  businessValue: 'tactical' | 'strategic' | 'transformational';
  
  // Prerequisites
  requiresResearch?: boolean;
  minimumResearchPlans?: number;
  
  // Metadata
  estimatedImpact?: string;
  popularityScore?: number;
  badge?: string;
}

// Strategy Generation Session
export interface StrategySession {
  id: string;
  toolId: string;
  toolName: string;
  category: StrategyCategory;
  
  // Inputs used
  selectedInputs: {
    researchPlans?: string[];
    brandAssets?: string[];
    personas?: string[];
    trends?: string[];
    customInputs?: Record<string, any>;
  };
  
  // Generation metadata
  createdAt: Date;
  status: 'draft' | 'generating' | 'completed' | 'archived';
  
  // Generated output
  output?: {
    format: OutputFormat;
    content: any; // Structured based on format
    summary: string;
    keyInsights: string[];
    recommendations: string[];
    nextSteps: string[];
  };
  
  // User customization
  userNotes?: string;
  customizations?: Record<string, any>;
}

// Strategy Hub Statistics
export interface StrategyHubStats {
  totalStrategiesCreated: number;
  categoriesUsed: StrategyCategory[];
  mostUsedTools: string[];
  averageInputsPerStrategy: number;
  implementationRate?: number; // percentage of strategies acted upon
}

// Input Selector State
export interface StrategyInputSelection {
  researchPlans: string[];
  brandAssets: string[];
  personas: string[];
  trends: string[];
  customData: Record<string, any>;
}

// Strategy Output Types
export interface CampaignStrategyOutput {
  objective: string;
  targetAudience: string[];
  keyMessages: string[];
  channels: Array<{
    name: string;
    rationale: string;
    tactics: string[];
  }>;
  timeline: string;
  successMetrics: string[];
}

export interface ProductConceptOutput {
  productName: string;
  productDescription: string;
  targetPersonas: string[];
  coreFeatures: Array<{
    feature: string;
    benefit: string;
    priority: 'must-have' | 'nice-to-have' | 'future';
  }>;
  uniqueValueProposition: string;
  competitiveAdvantage: string;
  marketOpportunity: string;
  developmentRoadmap?: string[];
}

export interface GoToMarketStrategyOutput {
  marketSegment: string;
  positioningStatement: string;
  pricingStrategy: string;
  distributionChannels: string[];
  launchPhases: Array<{
    phase: string;
    duration: string;
    objectives: string[];
    tactics: string[];
  }>;
  successCriteria: string[];
  risks: string[];
}

export interface CustomerJourneyOutput {
  personaName: string;
  stages: Array<{
    stage: string;
    touchpoints: string[];
    emotions: string[];
    painPoints: string[];
    opportunities: string[];
  }>;
  criticalMoments: string[];
  improvements: string[];
}
