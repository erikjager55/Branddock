/**
 * Campaign type display classification.
 *
 * Three visual categories:
 * - Creative: STRATEGIC campaign with confidence (has strategy + creative concept)
 * - Strategic: STRATEGIC campaign without confidence (strategy only, no creative hook)
 * - Format: CONTENT type campaign (reusable content format)
 *
 * QUICK campaigns map to their own style but are rarely shown.
 */

import { Sparkles, Target, Megaphone, Zap } from 'lucide-react';

export type CampaignDisplayType = 'creative' | 'strategic' | 'format' | 'quick';

export interface CampaignDisplayConfig {
  label: string;
  icon: typeof Sparkles;
  /** Inline styles for Tailwind 4 purge safety */
  pillBg: string;
  pillText: string;
  pillBorder: string;
}

const DISPLAY_CONFIG: Record<CampaignDisplayType, CampaignDisplayConfig> = {
  creative: {
    label: 'Creative',
    icon: Sparkles,
    pillBg: '#f5f3ff',
    pillText: '#7c3aed',
    pillBorder: '#ddd6fe',
  },
  strategic: {
    label: 'Strategic',
    icon: Target,
    pillBg: '#f0fdfa',
    pillText: '#0d9488',
    pillBorder: '#99f6e4',
  },
  format: {
    label: 'Format',
    icon: Megaphone,
    pillBg: '#eff6ff',
    pillText: '#2563eb',
    pillBorder: '#bfdbfe',
  },
  quick: {
    label: 'Quick',
    icon: Zap,
    pillBg: '#fefce8',
    pillText: '#ca8a04',
    pillBorder: '#fef08a',
  },
};

/**
 * Classify a campaign into a display type based on its DB fields.
 */
export function classifyCampaign(
  type: string,
  confidence: number | null | undefined,
): CampaignDisplayType {
  if ((type as string) === 'CONTENT') return 'format';
  if (type === 'QUICK') return 'quick';
  // STRATEGIC: creative if it has gone through the creative pipeline (confidence > 0)
  if (type === 'STRATEGIC' && confidence != null && confidence > 0) return 'creative';
  return 'strategic';
}

/**
 * Get display config for a campaign.
 */
export function getCampaignDisplayConfig(
  type: string,
  confidence: number | null | undefined,
): CampaignDisplayConfig {
  return DISPLAY_CONFIG[classifyCampaign(type, confidence)];
}

export { DISPLAY_CONFIG as CAMPAIGN_DISPLAY_CONFIG };
