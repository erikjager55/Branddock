/**
 * UTILITY: Campaign Decision Gate
 * 
 * Bepaalt of campaign generation safe is op basis van selected items.
 * Blokkeert generatie bij blocked items (<50% coverage).
 * 
 * DOEL: Voorkom campagnes gebouwd op onbetrouwbare data
 */

import { calculateDecisionStatus } from './decision-status-calculator';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { mockPersonas } from '../data/mock-personas';

export interface DecisionGateResult {
  status: 'safe' | 'at-risk' | 'blocked';
  canProceed: boolean;
  failedItems: Array<{
    id: string;
    name: string;
    type: 'persona' | 'asset';
    coverage: number;
    status: 'blocked' | 'decision-at-risk';
    missingTopMethod?: string;
  }>;
  message: string;
}

/**
 * Calculate decision gate status for campaign generation
 */
export function calculateDecisionGate(
  selectedAssetIds: string[],
  selectedPersonaIds: string[]
): DecisionGateResult {
  const failedItems: DecisionGateResult['failedItems'] = [];

  // Check selected assets
  selectedAssetIds.forEach(assetId => {
    const asset = mockBrandAssets.find(a => a.id === assetId);
    if (!asset) return;

    const decisionStatus = calculateDecisionStatus(asset);
    
    if (decisionStatus.status === 'blocked') {
      failedItems.push({
        id: asset.id,
        name: asset.type,
        type: 'asset',
        coverage: Math.round(decisionStatus.coverage),
        status: 'blocked',
        missingTopMethod: decisionStatus.missingTopMethods[0]
      });
    } else if (decisionStatus.status === 'decision-at-risk') {
      failedItems.push({
        id: asset.id,
        name: asset.type,
        type: 'asset',
        coverage: Math.round(decisionStatus.coverage),
        status: 'decision-at-risk',
        missingTopMethod: decisionStatus.missingTopMethods[0]
      });
    }
  });

  // Check selected personas
  selectedPersonaIds.forEach(personaId => {
    const persona = mockPersonas.find(p => p.id === personaId);
    if (!persona) return;

    const decisionStatus = calculateDecisionStatus(persona);
    
    if (decisionStatus.status === 'blocked') {
      failedItems.push({
        id: persona.id,
        name: persona.type,
        type: 'persona',
        coverage: Math.round(decisionStatus.coverage),
        status: 'blocked',
        missingTopMethod: decisionStatus.missingTopMethods[0]
      });
    } else if (decisionStatus.status === 'decision-at-risk') {
      failedItems.push({
        id: persona.id,
        name: persona.type,
        type: 'persona',
        coverage: Math.round(decisionStatus.coverage),
        status: 'decision-at-risk',
        missingTopMethod: decisionStatus.missingTopMethods[0]
      });
    }
  });

  // Determine overall status
  const hasBlocked = failedItems.some(item => item.status === 'blocked');
  const hasAtRisk = failedItems.some(item => item.status === 'decision-at-risk');

  if (hasBlocked) {
    return {
      status: 'blocked',
      canProceed: false,
      failedItems,
      message: 'Campaign generation is blocked. Fix critical validation issues first.'
    };
  }

  if (hasAtRisk) {
    return {
      status: 'at-risk',
      canProceed: true, // Can proceed but with warning
      failedItems,
      message: 'You can proceed, but some elements have limited validation.'
    };
  }

  return {
    status: 'safe',
    canProceed: true,
    failedItems: [],
    message: 'All selected data is properly validated. Safe to generate.'
  };
}

/**
 * BUSINESS LOGIC:
 * 
 * 1. BLOCKED STATE (canProceed: false)
 *    - ≥1 item met <50% coverage
 *    - Generate button disabled
 *    - Rode waarschuwing
 *    - Moet eerst gefixed worden
 * 
 * 2. AT-RISK STATE (canProceed: true)
 *    - ≥1 item met 50-79% coverage (maar geen blocked)
 *    - Generate button enabled
 *    - Amber waarschuwing
 *    - Kan doorgaan maar niet aanbevolen
 * 
 * 3. SAFE STATE (canProceed: true)
 *    - Alle items ≥80% coverage
 *    - Generate button enabled
 *    - Groene bevestiging
 *    - Veilig om door te gaan
 * 
 * WAAROM DEZE THRESHOLDS:
 * - <50%: Te weinig data voor betrouwbare beslissingen
 * - 50-79%: Bruikbaar maar sub-optimaal
 * - ≥80%: Optimale betrouwbaarheid
 */
