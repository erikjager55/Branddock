import { BrandAsset } from '../types/brand-asset';
/**
 * UTILITY: Campaign Decision Calculator v2 (CONSISTENCY CORRECTION)
 *
 * Calculates the overall decision status for a campaign based on
 * all linked brand assets and personas.
 *
 * CHANGES v2.1 (CONSISTENCY):
 * - Microcopy: ONLY percentage OR status label (never both)
 * - Format: "<name>: <percentage>% research coverage"
 * - Or: "<name>: research status: insufficient/partial/validated"
 * - Form status ("draft", "in-progress") REMOVED from decision feedback
 */

import { calculateDecisionStatus, ResearchItem } from './decision-status-calculator';

/**
 * Minimal persona shape needed by the decision calculator.
 * Accepts both Persona (types/persona.ts) and MockPersona (persona-adapter.ts).
 */
interface DecisionPersona extends ResearchItem {
  id: string;
  name: string;
  type?: string;
}

export interface CampaignDecisionResult {
  /** Overall status for the campaign */
  status: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';

  /** Primary action */
  primaryAction: string;

  /** Details for expansion */
  details: {
    totalAssets: number;
    safeAssets: number;
    atRiskAssets: number;
    blockedAssets: number;
    avgCoverage: number;
    affectedAssets: Array<{
      name: string;
      coverage: number;
      // NO status field anymore — prevents contradictions
    }>;
    missingResearch: string[];
  };

  /** For output summary */
  rootCauses: string[];
  risks: string[];
  improvements: string[];
}

/**
 * Helper: Format research status label
 */
function getResearchStatusLabel(coverage: number): string {
  if (coverage < 50) return 'insufficient';
  if (coverage < 80) return 'partial';
  return 'validated';
}

export function calculateCampaignDecision(
  brandAssets: BrandAsset[],
  personas: DecisionPersona[],
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
  // CONSISTENCY: Only name + coverage, NO status field
  const affectedAssets = itemsWithStatus
    .filter(i => i.statusInfo.status !== 'safe-to-decide')
    .map(i => ({
      name: i.item.type,
      coverage: i.statusInfo.coverage
      // REMOVED: status field (prevents "status = draft, 50%" contradiction)
    }));

  // Collect all missing research methods (unique)
  const allMissingMethods = new Set<string>();
  itemsWithStatus.forEach(i => {
    i.statusInfo.missingTopMethods.forEach(method => allMissingMethods.add(method));
  });

  // Determine overall status
  let overallStatus: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
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

    primaryAction = `Validate ${blockedNames}`;

    rootCauses = [
      `${blockedCount} ${blockedCount === 1 ? 'asset has' : 'assets have'} insufficient research validation`,
      'Critical brand foundations lack a strategic basis'
    ];

    risks = [
      'Campaign positioning may conflict with actual brand identity',
      'Budget is being spent on unvalidated assumptions',
      'Risk of brand damage due to inconsistent communication'
    ];

    improvements = [
      `Complete at least Workshop and 1-on-1 Interviews for ${blockedNames}`,
      'Bring all assets to at least 50% research coverage',
      'Consider a pilot test with a small budget to validate assumptions'
    ];

  } else if (atRiskCount > 0) {
    // DECISION AT RISK: all >= 50% but some < 80%
    overallStatus = 'decision-at-risk';

    const atRiskNames = affectedAssets
      .map(a => a.name)
      .slice(0, 2)
      .join(' and ');

    primaryAction = `Increase coverage of ${atRiskNames}`;

    rootCauses = [
      `${atRiskCount} ${atRiskCount === 1 ? 'asset has' : 'assets have'} limited research validation`,
      Array.from(allMissingMethods).length > 0
        ? `Critical research methods are missing`
        : 'Strategic basis is usable but not optimal'
    ];

    risks = [
      'Campaign messaging may miss the target audience',
      'ROI will likely remain below potential'
    ];

    improvements = [
      `Complete top 2 research methods for ${atRiskNames}`,
      'Bring all assets to 80%+ research coverage for optimal results',
      'Start with a pilot phase to test hypotheses'
    ];

  } else {
    // SAFE TO DECIDE: all >= 80% and top methods
    overallStatus = 'safe-to-decide';
    primaryAction = 'Generate campaign';
    rootCauses = [];
    risks = [];
    improvements = [];
  }

  return {
    status: overallStatus,
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
 * Calculate section-level decision status (REFINED v2.1)
 *
 * CONSISTENCY CORRECTION:
 * - causes uses consistent formatting
 * - ONLY research coverage percentage (no form status)
 * - Inheritance logic correctly implemented
 */
export function calculateSectionDecision(
  brandAssets: BrandAsset[],
  personas: DecisionPersona[],
  sectionType: 'template' | 'campaign-details' | 'brand-assets' | 'advanced' | 'channels',
  selectedBrandAssets: string[],
  selectedPersonas: string[],
  campaignConfig: any,
  selectedChannels: string[]
): {
  status: 'safe' | 'risk' | 'blocked';
  causes: string[];
  requiredActions: string[];
} {

  switch (sectionType) {
    case 'template': {
      // Template section is always safe (no data dependency)
      return {
        status: 'safe',
        causes: [],
        requiredActions: []
      };
    }

    case 'campaign-details': {
      // FORM STATUS CHECK (not decision status)
      // This only checks whether the form is complete
      const hasName = campaignConfig.name && campaignConfig.name.length > 0;
      const hasObjective = campaignConfig.objective && campaignConfig.objective.length > 0;
      const hasMessage = campaignConfig.keyMessage && campaignConfig.keyMessage.length > 0;

      const missingFields = [
        !hasName ? 'Campaign name' : '',
        !hasObjective ? 'Campaign objective' : '',
        !hasMessage ? 'Key message' : ''
      ].filter(Boolean);

      if (missingFields.length > 0) {
        return {
          status: 'blocked',
          causes: missingFields.map(f => `${f} is missing`),
          requiredActions: ['Fill in all required campaign details']
        };
      }

      // DECISION STATUS CHECK
      // Even if the form is complete, check linked data
      if (selectedBrandAssets.length === 0 && selectedPersonas.length === 0) {
        return {
          status: 'risk',
          causes: ['No brand data linked to campaign'],
          requiredActions: ['Link brand assets or personas for strategic context']
        };
      }

      return { status: 'safe', causes: [], requiredActions: [] };
    }

    case 'brand-assets': {
      // INHERITANCE: inherits status from linked brand assets and personas
      if (selectedBrandAssets.length === 0 && selectedPersonas.length === 0) {
        return {
          status: 'risk',
          causes: ['No brand data linked'],
          requiredActions: ['Link at least 1 brand asset or persona for brand context']
        };
      }

      // Calculate status of all linked items
      const allItems: Array<{ item: { type?: string; name?: string }; status: ReturnType<typeof calculateDecisionStatus> }> = [
        ...selectedBrandAssets.map(id => {
          const asset = brandAssets.find(a => a.id === id);
          return asset ? { item: asset as { type?: string; name?: string }, status: calculateDecisionStatus(asset) } : null;
        }).filter((x): x is NonNullable<typeof x> => x !== null),
        ...selectedPersonas.map(id => {
          const persona = personas.find(p => p.id === id);
          return persona ? { item: persona as { type?: string; name?: string }, status: calculateDecisionStatus(persona) } : null;
        }).filter((x): x is NonNullable<typeof x> => x !== null)
      ];

      const hasBlocked = allItems.some(i => i.status.status === 'blocked');
      const hasAtRisk = allItems.some(i => i.status.status === 'decision-at-risk');

      if (hasBlocked) {
        const blockedItems = allItems.filter(i => i.status.status === 'blocked');
        return {
          status: 'blocked',
          // CONSISTENT FORMATTING: only name + percentage + "research coverage"
          causes: blockedItems.map(i =>
            `${i.item.type || i.item.name}: ${i.status.coverage}% research coverage`
          ),
          requiredActions: ['Bring all items to at least 50% research coverage']
        };
      }

      if (hasAtRisk) {
        const atRiskItems = allItems.filter(i => i.status.status === 'decision-at-risk');
        return {
          status: 'risk',
          // CONSISTENT FORMATTING: only name + percentage + "research coverage"
          causes: atRiskItems.map(i =>
            `${i.item.type || i.item.name}: ${i.status.coverage}% research coverage`
          ),
          requiredActions: ['Increase research coverage to 80%+ for optimal results']
        };
      }

      return { status: 'safe', causes: [], requiredActions: [] };
    }

    case 'advanced': {
      // Advanced settings are optional, BUT affect decision quality
      const hasTimeline = campaignConfig.timeline && campaignConfig.timeline.length > 0;
      const hasBudget = campaignConfig.budget && campaignConfig.budget.length > 0;

      if (!hasTimeline && !hasBudget) {
        return {
          status: 'risk',
          causes: ['Timeline and budget not filled in'],
          requiredActions: ['Fill in timeline and budget for better strategic planning']
        };
      }

      return { status: 'safe', causes: [], requiredActions: [] };
    }

    case 'channels': {
      if (selectedChannels.length === 0) {
        return {
          status: 'risk',
          causes: ['No channels selected'],
          requiredActions: ['Select at least 1 campaign channel']
        };
      }

      return { status: 'safe', causes: [], requiredActions: [] };
    }

    default:
      return { status: 'safe', causes: [], requiredActions: [] };
  }
}

/**
 * MOTIVATION CONSISTENCY CORRECTION:
 *
 * 1. REMOVED: status field in affectedAssets
 *    - Prevents: "Core Values: status = draft, 50% coverage" (contradictory)
 *    - Now: "Core Values: 50% research coverage" (consistent)
 *
 * 2. CONSISTENT FORMATTING:
 *    - Always: "<name>: <percentage>% research coverage"
 *    - Never: mix of form status (draft, in-progress) and research percentage
 *
 * 3. FORM vs DECISION separated:
 *    - campaign-details section: first form check, then decision check
 *    - Form can be 100% complete, but decision still risk (no data linked)
 *
 * 4. INHERITANCE CORRECT:
 *    - brand-assets section inherits status from ALL linked items
 *    - Causes show concrete percentages (50%, 75%, etc.)
 *    - Consistent format: always "research coverage"
 *
 * 5. MICROCOPY IMPROVED:
 *    - "insufficient research validation" (not "low coverage")
 *    - "limited research validation" (not "insufficient validation")
 *    - "research coverage" everywhere (consistent term)
 */
