// Research Target Types - What are you researching?

export type ResearchTargetCategory = 
  | 'brand' 
  | 'persona' 
  | 'products-services' 
  | 'trends' 
  | 'knowledge';

export interface ResearchTarget {
  category: ResearchTargetCategory;
  targetId?: string; // Specific item within category (e.g., specific persona ID)
  targetName?: string; // Display name
}

export interface ResearchTargetOption {
  category: ResearchTargetCategory;
  label: string;
  description: string;
  icon: any;
  color: string;
  examples: string[];
  availableItems?: number; // How many items can be researched
}

export interface ExtendedResearchPlan {
  id: string;
  target: ResearchTarget;
  method: string;
  unlockedMethods: string[];
  unlockedAssets: string[];
  entryMode: 'asset' | 'bundle' | 'questionnaire';
  rationale?: Record<string, string>;
  createdAt?: string;
  status?: 'active' | 'completed' | 'paused';
}
