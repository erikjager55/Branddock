// =============================================================
// ResearchBundle types — Product catalog definitions
// =============================================================

import type { ResearchTargetCategory } from './research-target';

export interface ResearchBundle {
  id: string;
  name: string;
  description: string;
  targetCategory: ResearchTargetCategory;
  primaryTool: string;
  secondaryTool: string | null;
  items: string[];
  itemType: 'brand' | 'persona' | 'trend' | 'knowledge';
  outcome: string;
  timeline: string;
  basePrice: number;
  bundlePrice: number;
  savings: number;
  badge?: string;
  icon: any;
  color: string;
  strategyToolUnlocked?: string | string[];
  bundleType?: 'foundation' | 'specialized' | 'legacy';
  tier?: 'starter' | 'professional' | 'enterprise';
  activities?: {
    icon: any;
    name: string;
    description: string;
    duration: string;
  }[];
  scoreBoost?: { min: number; max: number };
}
