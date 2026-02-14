/**
 * UTILITY: Campaign Decision Calculator v2 (CONSISTENTIE CORRECTIE)
 * 
 * Berekent overall decision status voor een campaign op basis van
 * alle gekoppelde brand assets en personas.
 * 
 * WIJZIGINGEN v2.1 (CONSISTENTIE):
 * - Microcopy: ALLEEN percentage OF status label (nooit beide)
 * - Format: "<naam>: <percentage>% research coverage"
 * - Of: "<naam>: research status: insufficient/partial/validated"
 * - Formulierstatus ("draft", "in-progress") VERWIJDERD uit decision feedback
 */

import { calculateDecisionStatus } from './decision-status-calculator';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { mockPersonas } from '../data/mock-personas';

export interface CampaignDecisionResult {
  /** Overall status voor de campagne */
  status: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
  
  /** Primaire actie */
  primaryAction: string;
  
  /** Details voor expansion */
  details: {
    totalAssets: number;
    safeAssets: number;
    atRiskAssets: number;
    blockedAssets: number;
    avgCoverage: number;
    affectedAssets: Array<{ 
      name: string; 
      coverage: number;
      // GEEN status field meer - voorkomt tegenstrijdigheden
    }>;
    missingResearch: string[];
  };
  
  /** Voor output summary */
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
  // CONSISTENTIE: Alleen naam + coverage, GEEN status field
  const affectedAssets = itemsWithStatus
    .filter(i => i.statusInfo.status !== 'safe-to-decide')
    .map(i => ({
      name: i.item.type,
      coverage: i.statusInfo.coverage
      // REMOVED: status field (voorkomt "status = draft, 50%" tegenstrijdigheid)
    }));

  // Verzamel alle missing research methods (uniek)
  const allMissingMethods = new Set<string>();
  itemsWithStatus.forEach(i => {
    i.statusInfo.missingTopMethods.forEach(method => allMissingMethods.add(method));
  });

  // Bepaal overall status
  let overallStatus: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
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
    
    primaryAction = `Valideer ${blockedNames}`;
    
    rootCauses = [
      `${blockedCount} ${blockedCount === 1 ? 'asset heeft' : 'assets hebben'} onvoldoende research validatie`,
      'Kritieke merkfundamenten missen strategische basis'
    ];
    
    risks = [
      'Campagne positionering kan conflicteren met werkelijke merkidentiteit',
      'Budget wordt ingezet op ongevalideerde aannames',
      'Kans op brand damage door inconsistente communicatie'
    ];
    
    improvements = [
      `Complete minimaal Workshop en 1-on-1 Interviews voor ${blockedNames}`,
      'Breng alle assets naar minimaal 50% research coverage',
      'Overweeg pilot test met kleine budget om aannames te valideren'
    ];

  } else if (atRiskCount > 0) {
    // DECISION AT RISK: alle ≥ 50% maar sommige < 80%
    overallStatus = 'decision-at-risk';
    
    const atRiskNames = affectedAssets
      .map(a => a.name)
      .slice(0, 2)
      .join(' en ');
    
    primaryAction = `Verhoog coverage van ${atRiskNames}`;
    
    rootCauses = [
      `${atRiskCount} ${atRiskCount === 1 ? 'asset heeft' : 'assets hebben'} beperkte research validatie`,
      Array.from(allMissingMethods).length > 0 
        ? `Kritieke research methods ontbreken`
        : 'Strategische basis is bruikbaar maar niet optimaal'
    ];
    
    risks = [
      'Campagne messaging kan naast doelgroep schieten',
      'ROI zal waarschijnlijk onder potentieel blijven'
    ];
    
    improvements = [
      `Complete top 2 research methods voor ${atRiskNames}`,
      'Breng alle assets naar 80%+ research coverage voor optimale resultaten',
      'Start met pilot fase om hypotheses te testen'
    ];

  } else {
    // SAFE TO DECIDE: alle ≥ 80% en top methods
    overallStatus = 'safe-to-decide';
    primaryAction = 'Genereer campagne';
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
 * Bereken section-level decision status (VERFIJND v2.1)
 * 
 * CONSISTENTIE CORRECTIE:
 * - causes gebruikt consistente formatting
 * - ALLEEN research coverage percentage (geen formulier status)
 * - Erf-logica correct geïmplementeerd
 */
export function calculateSectionDecision(
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
      // Template sectie is altijd safe (geen data dependency)
      return {
        status: 'safe',
        causes: [],
        requiredActions: []
      };
    }

    case 'campaign-details': {
      // FORMULIER STATUS CHECK (niet decision status)
      // Dit controleert alleen of formulier compleet is
      const hasName = campaignConfig.name && campaignConfig.name.length > 0;
      const hasObjective = campaignConfig.objective && campaignConfig.objective.length > 0;
      const hasMessage = campaignConfig.keyMessage && campaignConfig.keyMessage.length > 0;

      const missingFields = [
        !hasName ? 'Campaign naam' : '',
        !hasObjective ? 'Campaign objective' : '',
        !hasMessage ? 'Key message' : ''
      ].filter(Boolean);

      if (missingFields.length > 0) {
        return {
          status: 'blocked',
          causes: missingFields.map(f => `${f} ontbreekt`),
          requiredActions: ['Vul alle verplichte campagne details in']
        };
      }

      // DECISION STATUS CHECK
      // Zelfs als formulier compleet is, controleer gekoppelde data
      if (selectedBrandAssets.length === 0 && selectedPersonas.length === 0) {
        return {
          status: 'risk',
          causes: ['Geen merkdata gekoppeld aan campagne'],
          requiredActions: ['Koppel brand assets of personas voor strategische context']
        };
      }

      return { status: 'safe', causes: [], requiredActions: [] };
    }

    case 'brand-assets': {
      // INHERITANCE: erft status van gekoppelde brand assets en personas
      if (selectedBrandAssets.length === 0 && selectedPersonas.length === 0) {
        return {
          status: 'risk',
          causes: ['Geen merkdata gekoppeld'],
          requiredActions: ['Koppel minimaal 1 brand asset of persona voor merkcontext']
        };
      }

      // Bereken status van alle gekoppelde items
      const allItems = [
        ...selectedBrandAssets.map(id => {
          const asset = mockBrandAssets.find(a => a.id === id);
          return asset ? { item: asset, status: calculateDecisionStatus(asset) } : null;
        }).filter(Boolean),
        ...selectedPersonas.map(id => {
          const persona = mockPersonas.find(p => p.id === id);
          return persona ? { item: persona, status: calculateDecisionStatus(persona) } : null;
        }).filter(Boolean)
      ];

      const hasBlocked = allItems.some(i => i!.status.status === 'blocked');
      const hasAtRisk = allItems.some(i => i!.status.status === 'decision-at-risk');

      if (hasBlocked) {
        const blockedItems = allItems.filter(i => i!.status.status === 'blocked');
        return {
          status: 'blocked',
          // CONSISTENTE FORMATTING: alleen naam + percentage + "research coverage"
          causes: blockedItems.map(i => 
            `${i!.item.type}: ${i!.status.coverage}% research coverage`
          ),
          requiredActions: ['Breng alle items naar minimaal 50% research coverage']
        };
      }

      if (hasAtRisk) {
        const atRiskItems = allItems.filter(i => i!.status.status === 'decision-at-risk');
        return {
          status: 'risk',
          // CONSISTENTE FORMATTING: alleen naam + percentage + "research coverage"
          causes: atRiskItems.map(i => 
            `${i!.item.type}: ${i!.status.coverage}% research coverage`
          ),
          requiredActions: ['Verhoog research coverage naar 80%+ voor optimale resultaten']
        };
      }

      return { status: 'safe', causes: [], requiredActions: [] };
    }

    case 'advanced': {
      // Advanced settings zijn optioneel, MAAR beïnvloeden decision quality
      const hasTimeline = campaignConfig.timeline && campaignConfig.timeline.length > 0;
      const hasBudget = campaignConfig.budget && campaignConfig.budget.length > 0;

      if (!hasTimeline && !hasBudget) {
        return {
          status: 'risk',
          causes: ['Timeline en budget niet ingevuld'],
          requiredActions: ['Vul timeline en budget in voor betere strategische planning']
        };
      }

      return { status: 'safe', causes: [], requiredActions: [] };
    }

    case 'channels': {
      if (selectedChannels.length === 0) {
        return {
          status: 'risk',
          causes: ['Geen kanalen geselecteerd'],
          requiredActions: ['Selecteer minimaal 1 campagne kanaal']
        };
      }

      return { status: 'safe', causes: [], requiredActions: [] };
    }

    default:
      return { status: 'safe', causes: [], requiredActions: [] };
  }
}

/**
 * MOTIVATIE CONSISTENTIE CORRECTIE:
 * 
 * 1. VERWIJDERD: status field in affectedAssets
 *    - Voorkomt: "Core Values: status = draft, 50% coverage" (tegenstrijdig)
 *    - Nu: "Core Values: 50% research coverage" (consistent)
 * 
 * 2. CONSISTENTE FORMATTING:
 *    - Altijd: "<naam>: <percentage>% research coverage"
 *    - Nooit: mix van formulier status (draft, in-progress) en research percentage
 * 
 * 3. FORMULIER vs DECISION gescheiden:
 *    - campaign-details sectie: eerst formulier check, dan decision check
 *    - Formulier kan 100% compleet zijn, maar decision toch risk (geen data gekoppeld)
 * 
 * 4. INHERITANCE CORRECT:
 *    - brand-assets sectie erft status van ALLE gekoppelde items
 *    - Causes tonen concrete percentages (50%, 75%, etc)
 *    - Consistent format: altijd "research coverage"
 * 
 * 5. MICROCOPY VERBETERD:
 *    - "onvoldoende research validatie" (niet "low coverage")
 *    - "beperkte research validatie" (niet "insufficient validation")
 *    - "research coverage" overal (consistent term)
 */
