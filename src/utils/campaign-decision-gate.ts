import { BrandAsset } from '../types/brand-asset';
/**
 * UTILITY: Campaign Decision Gate
 *
 * Determines whether campaign generation is safe based on selected items.
 * Blocks generation for blocked items (<50% coverage).
 *
 * PURPOSE: Prevent campaigns built on unreliable data
 */

import { calculateDecisionStatus, ResearchItem } from './decision-status-calculator';

/**
 * Minimal persona shape needed by the decision gate.
 * Accepts both Persona (types/persona.ts) and MockPersona (persona-adapter.ts).
 */
interface GatePersona extends ResearchItem {
  id: string;
  name: string;
}

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
  brandAssets: BrandAsset[],
  personas: GatePersona[],
  selectedAssetIds: string[],
  selectedPersonaIds: string[]
): DecisionGateResult {
  const failedItems: DecisionGateResult['failedItems'] = [];

  // Check selected assets
  selectedAssetIds.forEach(assetId => {
    const asset = brandAssets.find(a => a.id === assetId);
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
    const persona = personas.find(p => p.id === personaId);
    if (!persona) return;

    const decisionStatus = calculateDecisionStatus(persona);

    if (decisionStatus.status === 'blocked') {
      failedItems.push({
        id: persona.id,
        name: persona.name,
        type: 'persona',
        coverage: Math.round(decisionStatus.coverage),
        status: 'blocked',
        missingTopMethod: decisionStatus.missingTopMethods[0]
      });
    } else if (decisionStatus.status === 'decision-at-risk') {
      failedItems.push({
        id: persona.id,
        name: persona.name,
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
 *    - >= 1 item with <50% coverage
 *    - Generate button disabled
 *    - Red warning
 *    - Must be fixed first
 *
 * 2. AT-RISK STATE (canProceed: true)
 *    - >= 1 item with 50-79% coverage (but none blocked)
 *    - Generate button enabled
 *    - Amber warning
 *    - Can proceed but not recommended
 *
 * 3. SAFE STATE (canProceed: true)
 *    - All items >= 80% coverage
 *    - Generate button enabled
 *    - Green confirmation
 *    - Safe to proceed
 *
 * WHY THESE THRESHOLDS:
 * - <50%: Too little data for reliable decisions
 * - 50-79%: Usable but sub-optimal
 * - >= 80%: Optimal reliability
 */
