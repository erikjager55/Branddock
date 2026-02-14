/**
 * UTILITY: Campaign Decision Calculator
 * 
 * Berekent overall decision status voor een campaign op basis van
 * alle gekoppelde brand assets en personas.
 * 
 * BESLISLOGICA:
 * - Alle items < 50% coverage → DO NOT DECIDE
 * - Alle items ≥ 50% maar één of meer < 80% → DECISION AT RISK
 * - Alle items ≥ 80% en top 2 methods → SAFE TO DECIDE
 */

import { calculateDecisionStatus } from './decision-status-calculator';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { mockPersonas } from '../data/mock-personas';

export interface CampaignDecisionResult {
  /** Overall status voor de campagne */
  status: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
  
  /** Reden in 1 zin (max 120 chars) */
  reason: string;
  
  /** Concrete gevolgen */
  consequences: string;
  
  /** Primaire actie */
  primaryAction: string;
  
  /** Details voor expansion */
  details: {
    totalAssets: number;
    safeAssets: number;
    atRiskAssets: number;
    blockedAssets: number;
    avgCoverage: number;
    affectedAssets: Array<{ name: string; coverage: number; status: string }>;
    missingResearch: string[];
  };
  
  /** Voor output summary */
  rootCauses: string[];
  risks: string[];
  improvements: string[];
}

export function calculateCampaignDecision(
  selectedBrandAssets: string[],
  selectedPersonas: string[]
): CampaignDecisionResult {
  
  // Verzamel alle items
  const allItems = [
    ...selectedBrandAssets.map(id => {
      const asset = mockBrandAssets.find(a => a.id === id);
      return asset ? { ...asset, itemType: 'Brand Asset' } : null;
    }).filter(Boolean),
    ...selectedPersonas.map(id => {
      const persona = mockPersonas.find(p => p.id === id);
      return persona ? { ...persona, itemType: 'Persona', type: persona.name } : null;
    }).filter(Boolean)
  ];

  // Als geen items geselecteerd, return safe (geen risk)
  if (allItems.length === 0) {
    return {
      status: 'safe-to-decide',
      reason: 'Geen specifieke merkdata gekoppeld aan deze campagne.',
      consequences: 'Campagne zal generiek zijn zonder merkcontext. Dit is acceptabel voor pure awareness of test-campagnes.',
      primaryAction: 'Koppel merkdata voor meer relevantie',
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

  // Bereken status voor elk item
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

  // Affected assets (niet-safe items)
  const affectedAssets = itemsWithStatus
    .filter(i => i.statusInfo.status !== 'safe-to-decide')
    .map(i => ({
      name: i.item.type,
      coverage: i.statusInfo.coverage,
      status: i.statusInfo.status
    }));

  // Verzamel alle missing research methods (uniek)
  const allMissingMethods = new Set<string>();
  itemsWithStatus.forEach(i => {
    i.statusInfo.missingTopMethods.forEach(method => allMissingMethods.add(method));
  });

  // Bepaal overall status
  let overallStatus: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
  let reason: string;
  let consequences: string;
  let primaryAction: string;
  let rootCauses: string[];
  let risks: string[];
  let improvements: string[];

  if (blockedCount > 0) {
    // DO NOT DECIDE: een of meer items < 50%
    overallStatus = 'do-not-decide';
    
    const blockedNames = affectedAssets
      .filter(a => a.coverage < 50)
      .map(a => a.name)
      .slice(0, 2)
      .join(' en ');
    
    reason = `${blockedNames} ${blockedCount > 1 ? 'zijn' : 'is'} onvoldoende gevalideerd voor deze campagne (< 50% coverage).`;
    
    consequences = 'Strategische beslissingen zijn speculatief. Hoog risico op inconsistente merkboodschap, verspilling van mediabudget en teleurstellende campagne-resultaten.';
    
    primaryAction = `Valideer ${blockedNames} eerst`;
    
    rootCauses = [
      `${blockedCount} ${blockedCount === 1 ? 'asset heeft' : 'assets hebben'} minder dan 50% research coverage`,
      'Kritieke merkfundamenten ontbreken in strategische basis',
      affectedAssets.length > 2 ? `In totaal ${affectedAssets.length} items met validatieproblemen` : ''
    ].filter(Boolean);
    
    risks = [
      'Campagne positionering kan conflicteren met werkelijke merkidentiteit',
      'Budget wordt ingezet op ongevalideerde aannames en hypotheses',
      'Target audience messaging kan volledig mis zijn',
      'Kans op brand damage door inconsistente communicatie'
    ];
    
    improvements = [
      `Complete minimaal Workshop en 1-on-1 Interviews voor ${blockedNames}`,
      'Breng alle assets naar minimaal 50% coverage voordat campagne wordt uitgevoerd',
      'Overweeg pilot test met kleine budget om aannames te valideren'
    ];

  } else if (atRiskCount > 0) {
    // DECISION AT RISK: alle ≥ 50% maar sommige < 80%
    overallStatus = 'decision-at-risk';
    
    const atRiskNames = affectedAssets
      .map(a => a.name)
      .slice(0, 2)
      .join(' en ');
    
    reason = `${atRiskNames} ${atRiskCount > 1 ? 'hebben' : 'heeft'} beperkte validatie (50-79% coverage of missende top research methods).`;
    
    consequences = 'Verhoogd risico op sub-optimale positionering, beperkte target audience fit en gemiste kansen door onvolledige inzichten.';
    
    primaryAction = `Verhoog coverage van ${atRiskNames}`;
    
    rootCauses = [
      `${atRiskCount} ${atRiskCount === 1 ? 'asset heeft' : 'assets hebben'} coverage tussen 50-79%`,
      Array.from(allMissingMethods).length > 0 
        ? `Kritieke research methods ontbreken: ${Array.from(allMissingMethods).slice(0, 2).join(', ')}`
        : '',
      'Strategische basis is bruikbaar maar niet optimaal'
    ].filter(Boolean);
    
    risks = [
      'Campagne messaging kan naast doelgroep schieten',
      'Concurrenten met betere research kunnen marktaandeel afpakken',
      'ROI zal waarschijnlijk onder potentieel blijven',
      'Iteraties tijdens campagne nodig om bij te sturen'
    ];
    
    improvements = [
      `Complete top 2 research methods (Workshop + 1-on-1 Interviews) voor ${atRiskNames}`,
      'Breng alle assets naar 80%+ coverage voor optimale besluitvorming',
      'Start campagne met pilot fase om hypotheses te testen voordat full-scale'
    ];

  } else {
    // SAFE TO DECIDE: alle ≥ 80% en top methods
    overallStatus = 'safe-to-decide';
    
    reason = 'Alle gekoppelde merkdata is voldoende gevalideerd (≥ 80% coverage + top research methods).';
    
    consequences = 'Campagne is gebaseerd op sterke research fundamenten. Strategische beslissingen kunnen met vertrouwen genomen worden.';
    
    primaryAction = 'Ga door met campagne generatie';
    
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
 * Bereken section-level decision status
 */
export function calculateSectionDecision(
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
          problematicInputs: ['Geen brand assets geselecteerd'],
          requiredActions: ['Koppel minimaal 1 brand asset voor merkcontext']
        };
      }

      const assetStatuses = selectedBrandAssets.map(id => {
        const asset = mockBrandAssets.find(a => a.id === id);
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
            const asset = mockBrandAssets.find(a => a.id === id);
            return `${asset?.type}: ${calculateDecisionStatus(asset!).coverage}% coverage`;
          }),
          requiredActions: ['Breng alle assets naar minimaal 50% coverage']
        };
      }

      if (hasAtRisk) {
        return {
          status: 'risk',
          problematicInputs: ['Sommige assets hebben beperkte validatie (50-79%)'],
          requiredActions: ['Verhoog coverage naar 80%+ voor optimale resultaten']
        };
      }

      return { status: 'safe', problematicInputs: [], requiredActions: [] };
    }

    case 'personas': {
      if (selectedPersonas.length === 0) {
        return {
          status: 'risk',
          problematicInputs: ['Geen personas geselecteerd'],
          requiredActions: ['Koppel minimaal 1 persona voor doelgroep targeting']
        };
      }

      const personaStatuses = selectedPersonas.map(id => {
        const persona = mockPersonas.find(p => p.id === id);
        return persona ? calculateDecisionStatus(persona) : null;
      }).filter(Boolean);

      const hasBlocked = personaStatuses.some(s => s!.status === 'blocked');
      const hasAtRisk = personaStatuses.some(s => s!.status === 'decision-at-risk');

      if (hasBlocked) {
        return {
          status: 'blocked',
          problematicInputs: ['Een of meer personas hebben < 50% coverage'],
          requiredActions: ['Valideer personas met Workshop en Interviews']
        };
      }

      if (hasAtRisk) {
        return {
          status: 'risk',
          problematicInputs: ['Sommige personas hebben beperkte validatie'],
          requiredActions: ['Verhoog persona research voor betere targeting']
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
            !hasName ? 'Campaign naam ontbreekt' : '',
            !hasObjective ? 'Campaign objective ontbreekt' : '',
            !hasMessage ? 'Key message ontbreekt' : ''
          ].filter(Boolean),
          requiredActions: ['Vul alle verplichte campagne details in']
        };
      }

      return { status: 'safe', problematicInputs: [], requiredActions: [] };
    }

    case 'channels': {
      if (selectedChannels.length === 0) {
        return {
          status: 'risk',
          problematicInputs: ['Geen kanalen geselecteerd'],
          requiredActions: ['Selecteer minimaal 1 campagne kanaal']
        };
      }

      return { status: 'safe', problematicInputs: [], requiredActions: [] };
    }

    default:
      return { status: 'safe', problematicInputs: [], requiredActions: [] };
  }
}
