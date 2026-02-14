/**
 * UTILITY: Platform Decision Aggregator
 * 
 * Berekent overall decision status voor verschillende pagina's:
 * - Dashboard (alle assets + personas)
 * - Research Hub (research impact)
 * - Asset Detail (dit specifieke asset)
 * - Persona Detail (deze specifieke persona)
 * - Campaign Output (deze campagne)
 * - Relationships (insight quality)
 */

import { calculateDecisionStatus } from './decision-status-calculator';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { mockPersonas } from '../data/mock-personas';

export interface PlatformDecisionResult {
  status: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
  topCauses: string[];
  primaryAction: string;
  contextText?: string;
  stats: {
    safe: number;
    atRisk: number;
    blocked: number;
    total: number;
    avgCoverage: number;
  };
}

/**
 * Dashboard - Overall platform status
 */
export function calculateDashboardDecision(): PlatformDecisionResult {
  // Alle assets + personas
  const allItems = [
    ...mockBrandAssets.map(a => ({ ...a, itemType: 'asset' as const })),
    ...mockPersonas.map(p => ({ ...p, itemType: 'persona' as const }))
  ];

  const statuses = allItems.map(item => ({
    item,
    status: calculateDecisionStatus(item)
  }));

  const safeCount = statuses.filter(s => s.status.status === 'safe-to-decide').length;
  const atRiskCount = statuses.filter(s => s.status.status === 'decision-at-risk').length;
  const blockedCount = statuses.filter(s => s.status.status === 'blocked').length;
  const avgCoverage = Math.round(
    statuses.reduce((sum, s) => sum + s.status.coverage, 0) / statuses.length
  );

  // Find most urgent (blocked first, then lowest coverage)
  const urgent = statuses
    .filter(s => s.status.status !== 'safe-to-decide')
    .sort((a, b) => {
      if (a.status.status !== b.status.status) {
        return a.status.status === 'blocked' ? -1 : 1;
      }
      return a.status.coverage - b.status.coverage;
    })
    .slice(0, 2);

  // Determine overall status
  let overallStatus: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
  let topCauses: string[];
  let primaryAction: string;
  let contextText: string | undefined;

  if (blockedCount > 0) {
    overallStatus = 'do-not-decide';
    topCauses = urgent.map(u => 
      `${u.item.type}: ${u.status.coverage}% research coverage`
    );
    primaryAction = `Valideer ${urgent[0].item.type}`;
    contextText = `${blockedCount} ${blockedCount === 1 ? 'item heeft' : 'items hebben'} onvoldoende research validatie voor strategische beslissingen.`;
  } else if (atRiskCount > 0) {
    overallStatus = 'decision-at-risk';
    topCauses = urgent.map(u => 
      `${u.item.type}: ${u.status.coverage}% research coverage`
    );
    primaryAction = `Verbeter ${urgent[0].item.type}`;
    contextText = `${atRiskCount} ${atRiskCount === 1 ? 'item heeft' : 'items hebben'} beperkte validatie. Strategieën zijn bruikbaar maar niet optimaal.`;
  } else {
    overallStatus = 'safe-to-decide';
    topCauses = [];
    primaryAction = 'Bekijk strategieën';
    contextText = 'Alle merkdata is voldoende gevalideerd voor strategische beslissingen.';
  }

  return {
    status: overallStatus,
    topCauses,
    primaryAction,
    contextText,
    stats: {
      safe: safeCount,
      atRisk: atRiskCount,
      blocked: blockedCount,
      total: allItems.length,
      avgCoverage
    }
  };
}

/**
 * Research Hub - Research impact on decisions
 */
export function calculateResearchHubDecision(): PlatformDecisionResult {
  const dashboardDecision = calculateDashboardDecision();

  // Determine wat research de grootste impact heeft
  const allItems = [
    ...mockBrandAssets.map(a => ({ ...a, itemType: 'asset' as const })),
    ...mockPersonas.map(p => ({ ...p, itemType: 'persona' as const }))
  ];

  const needsResearch = allItems
    .map(item => ({
      item,
      status: calculateDecisionStatus(item)
    }))
    .filter(s => s.status.status !== 'safe-to-decide')
    .sort((a, b) => a.status.coverage - b.status.coverage)
    .slice(0, 2);

  if (dashboardDecision.status === 'do-not-decide') {
    return {
      status: 'do-not-decide',
      topCauses: needsResearch.map(n => 
        `${n.item.type} heeft ${n.status.missingTopMethods[0] || 'Workshop'} nodig`
      ),
      primaryAction: 'Plan research',
      contextText: 'Kritieke items missen fundamentele validatie. Start met Workshop of Interviews.',
      stats: dashboardDecision.stats
    };
  } else if (dashboardDecision.status === 'decision-at-risk') {
    return {
      status: 'decision-at-risk',
      topCauses: needsResearch.map(n => 
        `${n.item.type} kan worden verbeterd met ${n.status.missingTopMethods[0] || 'diepere research'}`
      ),
      primaryAction: 'Verdiep research',
      contextText: 'Extra research verhoogt besluitzekerheid en ROI van strategieën.',
      stats: dashboardDecision.stats
    };
  } else {
    return {
      status: 'safe-to-decide',
      topCauses: [],
      primaryAction: 'Onderzoek trends',
      contextText: 'Basis research is compleet. Focus op trends en markt ontwikkelingen.',
      stats: dashboardDecision.stats
    };
  }
}

/**
 * Asset Detail - Status van specifiek asset
 */
export function calculateAssetDetailDecision(assetId: string): PlatformDecisionResult {
  const asset = mockBrandAssets.find(a => a.id === assetId);
  
  if (!asset) {
    return {
      status: 'do-not-decide',
      topCauses: ['Asset niet gevonden'],
      primaryAction: 'Ga terug',
      stats: { safe: 0, atRisk: 0, blocked: 1, total: 1, avgCoverage: 0 }
    };
  }

  const status = calculateDecisionStatus(asset);

  let topCauses: string[];
  let primaryAction: string;
  let contextText: string;

  if (status.status === 'blocked') {
    topCauses = [
      `${status.coverage}% research coverage (minimum: 50%)`,
      `Ontbrekend: ${status.missingTopMethods.slice(0, 2).join(', ')}`
    ];
    primaryAction = 'Voeg research toe';
    contextText = 'Dit asset kan niet veilig worden gebruikt in strategieën zonder fundamentele validatie.';
  } else if (status.status === 'decision-at-risk') {
    topCauses = [
      `${status.coverage}% research coverage (optimaal: 80%+)`,
      status.missingTopMethods.length > 0 
        ? `Aanbevolen: ${status.missingTopMethods[0]}` 
        : 'Basis validatie aanwezig, diepere research verhoogt zekerheid'
    ];
    primaryAction = 'Verbeter coverage';
    contextText = 'Dit asset is bruikbaar maar extra research verkleint strategische risico\'s.';
  } else {
    topCauses = [];
    primaryAction = 'Gebruik in strategie';
    contextText = `Dit asset is voldoende gevalideerd (${status.coverage}% coverage) voor strategische beslissingen.`;
  }

  return {
    status: status.status,
    topCauses,
    primaryAction,
    contextText,
    stats: {
      safe: status.status === 'safe-to-decide' ? 1 : 0,
      atRisk: status.status === 'decision-at-risk' ? 1 : 0,
      blocked: status.status === 'blocked' ? 1 : 0,
      total: 1,
      avgCoverage: status.coverage
    }
  };
}

/**
 * Persona Detail - Status van specifieke persona
 */
export function calculatePersonaDetailDecision(personaId: string): PlatformDecisionResult {
  const persona = mockPersonas.find(p => p.id === personaId);
  
  if (!persona) {
    return {
      status: 'do-not-decide',
      topCauses: ['Persona niet gevonden'],
      primaryAction: 'Ga terug',
      stats: { safe: 0, atRisk: 0, blocked: 1, total: 1, avgCoverage: 0 }
    };
  }

  const status = calculateDecisionStatus(persona);

  let topCauses: string[];
  let primaryAction: string;
  let contextText: string;

  if (status.status === 'blocked') {
    topCauses = [
      `${status.coverage}% research coverage (minimum: 50%)`,
      `Ontbrekend: ${status.missingTopMethods.slice(0, 2).join(', ')}`
    ];
    primaryAction = 'Voeg research toe';
    contextText = 'Deze persona kan niet veilig worden gebruikt in campagnes zonder fundamentele validatie.';
  } else if (status.status === 'decision-at-risk') {
    topCauses = [
      `${status.coverage}% research coverage (optimaal: 80%+)`,
      status.missingTopMethods.length > 0 
        ? `Aanbevolen: ${status.missingTopMethods[0]}` 
        : 'Basis persona aanwezig, diepere inzichten verbeteren targeting'
    ];
    primaryAction = 'Verbeter coverage';
    contextText = 'Deze persona is bruikbaar maar extra research verfijnt targeting en messaging.';
  } else {
    topCauses = [];
    primaryAction = 'Gebruik in campagne';
    contextText = `Deze persona is voldoende gevalideerd (${status.coverage}% coverage) voor campagne targeting.`;
  }

  return {
    status: status.status,
    topCauses,
    primaryAction,
    contextText,
    stats: {
      safe: status.status === 'safe-to-decide' ? 1 : 0,
      atRisk: status.status === 'decision-at-risk' ? 1 : 0,
      blocked: status.status === 'blocked' ? 1 : 0,
      total: 1,
      avgCoverage: status.coverage
    }
  };
}

/**
 * Campaign Output - Decision quality van gegenereerde campagne
 * (Deze gebruikt bestaande campaign decision calculator)
 */
export function calculateCampaignOutputDecision(
  selectedAssets: string[],
  selectedPersonas: string[]
): PlatformDecisionResult {
  // Import from campaign calculator
  const { calculateCampaignDecision } = require('./campaign-decision-calculator-v2');
  const campaignDecision = calculateCampaignDecision(selectedAssets, selectedPersonas);

  let topCauses: string[];
  let contextText: string;

  if (campaignDecision.status === 'do-not-decide') {
    topCauses = campaignDecision.details.affectedAssets
      .slice(0, 2)
      .map(a => `${a.name}: ${a.coverage}% research coverage`);
    contextText = 'Deze campagne is gebaseerd op onvoldoende gevalideerde data. Behandel als hypotheses.';
  } else if (campaignDecision.status === 'decision-at-risk') {
    topCauses = campaignDecision.details.affectedAssets
      .slice(0, 2)
      .map(a => `${a.name}: ${a.coverage}% research coverage`);
    contextText = 'Deze campagne bevat elementen met beperkte validatie. Test hypotheses in pilot.';
  } else {
    topCauses = [];
    contextText = 'Deze campagne is gebaseerd op goed gevalideerde merkdata. Strategieën zijn betrouwbaar.';
  }

  return {
    status: campaignDecision.status,
    topCauses,
    primaryAction: campaignDecision.primaryAction,
    contextText,
    stats: {
      safe: campaignDecision.details.safeAssets,
      atRisk: campaignDecision.details.atRiskAssets,
      blocked: campaignDecision.details.blockedAssets,
      total: campaignDecision.details.totalAssets,
      avgCoverage: campaignDecision.details.avgCoverage
    }
  };
}

/**
 * Relationships & Insights - Betrouwbaarheid van relaties en insights
 */
export function calculateRelationshipsDecision(): PlatformDecisionResult {
  const dashboardDecision = calculateDashboardDecision();

  // Relationships zijn safe als basis data safe is
  if (dashboardDecision.status === 'do-not-decide') {
    return {
      status: 'do-not-decide',
      topCauses: [
        'Basis merkdata onvoldoende gevalideerd',
        'Relaties zijn speculatief zonder fundamentele research'
      ],
      primaryAction: 'Valideer basis data',
      contextText: 'Insights kunnen misleidend zijn. Start met valideren van brand assets en personas.',
      stats: dashboardDecision.stats
    };
  } else if (dashboardDecision.status === 'decision-at-risk') {
    return {
      status: 'decision-at-risk',
      topCauses: [
        'Sommige relaties gebaseerd op beperkte data',
        'Insights zijn indicatief, niet definitief'
      ],
      primaryAction: 'Verdiep onderzoek',
      contextText: 'Relaties zijn bruikbaar voor hypotheses. Valideer kritieke inzichten met extra research.',
      stats: dashboardDecision.stats
    };
  } else {
    return {
      status: 'safe-to-decide',
      topCauses: [],
      primaryAction: 'Verken patterns',
      contextText: 'Relaties en insights zijn gebaseerd op goed gevalideerde data. Betrouwbaar voor strategische beslissingen.',
      stats: dashboardDecision.stats
    };
  }
}
