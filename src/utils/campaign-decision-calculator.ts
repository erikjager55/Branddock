import { BrandAsset } from '../types/brand-asset';
import { Persona } from '../types/persona';
/**
 * UTILITY: Campaign Decision Calculator
 *
 * Calculates the overall decision status for a campaign based on
 * all linked brand assets and personas.
 *
 * DECISION LOGIC:
 * - All items < 50% coverage → DO NOT DECIDE
 * - All items >= 50% but one or more < 80% → DECISION AT RISK
 * - All items >= 80% and top 2 methods → SAFE TO DECIDE
 */

import { calculateDecisionStatus } from './decision-status-calculator';

export interface CampaignDecisionResult {
  /** Overall status for the campaign */
  status: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';

  /** Reason in 1 sentence (max 120 chars) */
  reason: string;

  /** Concrete consequences */
  consequences: string;

  /** Primary action */
  primaryAction: string;

  /** Details for expansion */
  details: {
    totalAssets: number;
    safeAssets: number;
    atRiskAssets: number;
    blockedAssets: number;
    avgCoverage: number;
    affectedAssets: Array<{ name: string; coverage: number; status: string }>;
    missingResearch: string[];
  };

  /** For output summary */
  rootCauses: string[];
  risks: string[];
  improvements: string[];
}

export function calculateCampaignDecision(
  brandAssets: BrandAsset[],
  personas: Persona[],
  selectedBrandAssets: string[],
  selectedPersonas: string[]
): CampaignDecisionResult {

  // Collect all items
  const allItems = [
    ...selectedBrandAssets.map(id => {
      const asset = brandAssets.find(a => a.id === id);
      return asset ? { ...asset, itemType: 'Brand Asset' } : null;
    }).filter(Boolean),
    ...selectedPersonas.map(id => {
      const persona = personas.find(p => p.id === id);
      return persona ? { ...persona, itemType: 'Persona', type: persona.name } : null;
    }).filter(Boolean)
  ];

  // If no items selected, return safe (no risk)
  if (allItems.length === 0) {
    return {
      status: 'safe-to-decide',
      reason: 'No specific brand data linked to this campaign.',
      consequences: 'Campaign will be generic without brand context. This is acceptable for pure awareness or test campaigns.',
      primaryAction: 'Link brand data for more relevance',
      details: {
        totalAssets: 0,
        safeAssets: 0,
        atRiskAssets: 0,
        blockedAssets: 0,
        avgCoverage: 0,
        affectedAssets: [],
        missingResearch: []
      },
      rootCauses: [],
      risks: [],
      improvements: []
    };
  }

  // Calculate status for each item
  const itemsWithStatus = allItems.map(item => ({
    item: item!,
    statusInfo: calculateDecisionStatus(item!)
  }));

  // Counts
  const safeCount = itemsWithStatus.filter(i => i.statusInfo.status === 'safe-to-decide').length;
  const atRiskCount = itemsWithStatus.filter(i => i.statusInfo.status === 'decision-at-risk').length;
  const blockedCount = itemsWithStatus.filter(i => i.statusInfo.status === 'blocked').length;
  const avgCoverage = Math.round(
    itemsWithStatus.reduce((sum, i) => sum + i.statusInfo.coverage, 0) / itemsWithStatus.length
  );

  // Affected assets (non-safe items)
  const affectedAssets = itemsWithStatus
    .filter(i => i.statusInfo.status !== 'safe-to-decide')
    .map(i => ({
      name: i.item.type,
      coverage: i.statusInfo.coverage,
      status: i.statusInfo.status
    }));

  // Collect all missing research methods (unique)
  const allMissingMethods = new Set<string>();
  itemsWithStatus.forEach(i => {
    i.statusInfo.missingTopMethods.forEach(method => allMissingMethods.add(method));
  });

  // Determine overall status
  let overallStatus: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
  let reason: string;
  let consequences: string;
  let primaryAction: string;
  let rootCauses: string[];
  let risks: string[];
  let improvements: string[];

  if (blockedCount > 0) {
    // DO NOT DECIDE: one or more items < 50%
    overallStatus = 'do-not-decide';

    const blockedNames = affectedAssets
      .filter(a => a.coverage < 50)
      .map(a => a.name)
      .slice(0, 2)
      .join(' and ');

    reason = `${blockedNames} ${blockedCount > 1 ? 'are' : 'is'} insufficiently validated for this campaign (< 50% coverage).`;

    consequences = 'Strategic decisions are speculative. High risk of inconsistent brand messaging, wasted media budget, and disappointing campaign results.';

    primaryAction = `Validate ${blockedNames} first`;

    rootCauses = [
      `${blockedCount} ${blockedCount === 1 ? 'asset has' : 'assets have'} less than 50% research coverage`,
      'Critical brand foundations are missing from the strategic basis',
      affectedAssets.length > 2 ? `In total ${affectedAssets.length} items with validation issues` : ''
    ].filter(Boolean);

    risks = [
      'Campaign positioning may conflict with actual brand identity',
      'Budget is being spent on unvalidated assumptions and hypotheses',
      'Target audience messaging may be completely off',
      'Risk of brand damage due to inconsistent communication'
    ];

    improvements = [
      `Complete at least Workshop and 1-on-1 Interviews for ${blockedNames}`,
      'Bring all assets to at least 50% coverage before executing the campaign',
      'Consider a pilot test with a small budget to validate assumptions'
    ];

  } else if (atRiskCount > 0) {
    // DECISION AT RISK: all >= 50% but some < 80%
    overallStatus = 'decision-at-risk';

    const atRiskNames = affectedAssets
      .map(a => a.name)
      .slice(0, 2)
      .join(' and ');

    reason = `${atRiskNames} ${atRiskCount > 1 ? 'have' : 'has'} limited validation (50-79% coverage or missing top research methods).`;

    consequences = 'Increased risk of sub-optimal positioning, limited target audience fit, and missed opportunities due to incomplete insights.';

    primaryAction = `Increase coverage of ${atRiskNames}`;

    rootCauses = [
      `${atRiskCount} ${atRiskCount === 1 ? 'asset has' : 'assets have'} coverage between 50-79%`,
      Array.from(allMissingMethods).length > 0
        ? `Critical research methods are missing: ${Array.from(allMissingMethods).slice(0, 2).join(', ')}`
        : '',
      'Strategic basis is usable but not optimal'
    ].filter(Boolean);

    risks = [
      'Campaign messaging may miss the target audience',
      'Competitors with better research can capture market share',
      'ROI will likely remain below potential',
      'Iterations during the campaign needed to course-correct'
    ];

    improvements = [
      `Complete top 2 research methods (Workshop + 1-on-1 Interviews) for ${atRiskNames}`,
      'Bring all assets to 80%+ coverage for optimal decision-making',
      'Start campaign with a pilot phase to test hypotheses before going full-scale'
    ];

  } else {
    // SAFE TO DECIDE: all >= 80% and top methods
    overallStatus = 'safe-to-decide';

    reason = 'All linked brand data is sufficiently validated (>= 80% coverage + top research methods).';

    consequences = 'Campaign is based on strong research foundations. Strategic decisions can be made with confidence.';

    primaryAction = 'Proceed with campaign generation';

    rootCauses = [];
    risks = [];
    improvements = [];
  }

  return {
    status: overallStatus,
    reason,
    consequences,
    primaryAction,
    details: {
      totalAssets: itemsWithStatus.length,
      safeAssets: safeCount,
      atRiskAssets: atRiskCount,
      blockedAssets: blockedCount,
      avgCoverage,
      affectedAssets,
      missingResearch: Array.from(allMissingMethods)
    },
    rootCauses,
    risks,
    improvements
  };
}

/**
 * Calculate section-level decision status
 */
export function calculateSectionDecision(
  brandAssets: BrandAsset[],
  personas: Persona[],
  sectionType: 'brand-assets' | 'personas' | 'campaign-details' | 'channels',
  selectedBrandAssets: string[],
  selectedPersonas: string[],
  campaignConfig: any,
  selectedChannels: string[]
): {
  status: 'safe' | 'risk' | 'blocked';
  problematicInputs: string[];
  requiredActions: string[];
} {

  switch (sectionType) {
    case 'brand-assets': {
      if (selectedBrandAssets.length === 0) {
        return {
          status: 'risk',
          problematicInputs: ['No brand assets selected'],
          requiredActions: ['Link at least 1 brand asset for brand context']
        };
      }

      const assetStatuses = selectedBrandAssets.map(id => {
        const asset = brandAssets.find(a => a.id === id);
        return asset ? calculateDecisionStatus(asset) : null;
      }).filter(Boolean);

      const hasBlocked = assetStatuses.some(s => s!.status === 'blocked');
      const hasAtRisk = assetStatuses.some(s => s!.status === 'decision-at-risk');

      if (hasBlocked) {
        const blockedAssets = assetStatuses
          .filter(s => s!.status === 'blocked')
          .map((s, i) => selectedBrandAssets[i]);

        return {
          status: 'blocked',
          problematicInputs: blockedAssets.map(id => {
            const asset = brandAssets.find(a => a.id === id);
            return `${asset?.type}: ${calculateDecisionStatus(asset!).coverage}% coverage`;
          }),
          requiredActions: ['Bring all assets to at least 50% coverage']
        };
      }

      if (hasAtRisk) {
        return {
          status: 'risk',
          problematicInputs: ['Some assets have limited validation (50-79%)'],
          requiredActions: ['Increase coverage to 80%+ for optimal results']
        };
      }

      return { status: 'safe', problematicInputs: [], requiredActions: [] };
    }

    case 'personas': {
      if (selectedPersonas.length === 0) {
        return {
          status: 'risk',
          problematicInputs: ['No personas selected'],
          requiredActions: ['Link at least 1 persona for target audience targeting']
        };
      }

      const personaStatuses = selectedPersonas.map(id => {
        const persona = personas.find(p => p.id === id);
        return persona ? calculateDecisionStatus(persona) : null;
      }).filter(Boolean);

      const hasBlocked = personaStatuses.some(s => s!.status === 'blocked');
      const hasAtRisk = personaStatuses.some(s => s!.status === 'decision-at-risk');

      if (hasBlocked) {
        return {
          status: 'blocked',
          problematicInputs: ['One or more personas have < 50% coverage'],
          requiredActions: ['Validate personas with Workshop and Interviews']
        };
      }

      if (hasAtRisk) {
        return {
          status: 'risk',
          problematicInputs: ['Some personas have limited validation'],
          requiredActions: ['Increase persona research for better targeting']
        };
      }

      return { status: 'safe', problematicInputs: [], requiredActions: [] };
    }

    case 'campaign-details': {
      // Check if basic campaign config is filled
      const hasName = campaignConfig.name && campaignConfig.name.length > 0;
      const hasObjective = campaignConfig.objective && campaignConfig.objective.length > 0;
      const hasMessage = campaignConfig.keyMessage && campaignConfig.keyMessage.length > 0;

      if (!hasName || !hasObjective || !hasMessage) {
        return {
          status: 'blocked',
          problematicInputs: [
            !hasName ? 'Campaign name is missing' : '',
            !hasObjective ? 'Campaign objective is missing' : '',
            !hasMessage ? 'Key message is missing' : ''
          ].filter(Boolean),
          requiredActions: ['Fill in all required campaign details']
        };
      }

      return { status: 'safe', problematicInputs: [], requiredActions: [] };
    }

    case 'channels': {
      if (selectedChannels.length === 0) {
        return {
          status: 'risk',
          problematicInputs: ['No channels selected'],
          requiredActions: ['Select at least 1 campaign channel']
        };
      }

      return { status: 'safe', problematicInputs: [], requiredActions: [] };
    }

    default:
      return { status: 'safe', problematicInputs: [], requiredActions: [] };
  }
}
