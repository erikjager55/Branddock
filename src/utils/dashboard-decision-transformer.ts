/**
 * UTILITY: Dashboard Decision Transformer
 * 
 * Transformeert platform data naar Dashboard formaten
 */

import { calculateDecisionStatus } from './decision-status-calculator';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { mockPersonas } from '../data/mock-personas';

export interface SimpleDashboardStatus {
  status: 'safe-to-decide' | 'decision-at-risk' | 'blocked';
  safeCount: number;
  atRiskCount: number;
  blockedCount: number;
  recommendation: string; // Added for user guidance
}

export interface StrategicRisk {
  id: string;
  title: string;
  description: string;
  impact: 'critical' | 'high';
  category: string;
  targetSection: string; // Added for navigation
}

export interface NextBestActionData {
  title: string;
  reason: string;
  unlocksDecision: string;
  riskReduction: string;
  estimatedTime: string;
  impact: 'critical' | 'high';
  targetType: 'asset' | 'persona' | 'research';
}

/**
 * Calculate simple dashboard status
 */
export function calculateSimpleDashboardStatus(): SimpleDashboardStatus {
  const allItems = [
    ...mockBrandAssets.map(a => ({ ...a, itemType: 'asset' as const })),
    ...mockPersonas.map(p => ({ ...p, itemType: 'persona' as const }))
  ];

  const withStatus = allItems.map(item => ({
    item,
    status: calculateDecisionStatus(item)
  }));

  const safeCount = withStatus.filter(w => w.status.status === 'safe-to-decide').length;
  const atRiskCount = withStatus.filter(w => w.status.status === 'decision-at-risk').length;
  const blockedCount = withStatus.filter(w => w.status.status === 'blocked').length;

  // Determine overall status
  let status: 'safe-to-decide' | 'decision-at-risk' | 'blocked';
  if (blockedCount > 0) {
    status = 'blocked';
  } else if (atRiskCount > allItems.length / 2) {
    status = 'decision-at-risk';
  } else {
    status = 'safe-to-decide';
  }

  // Add recommendation based on status
  let recommendation: string;
  if (status === 'blocked') {
    recommendation = 'Valideer onvoldoende gevalideerde items om strategische beslissingen te vergemakkelijken.';
  } else if (status === 'decision-at-risk') {
    recommendation = 'Verbeter items met beperkte validatie om het risico op sub-optimale ROI te verminderen.';
  } else {
    recommendation = 'Basis merkdata is compleet gevalideerd. Verken markt trends voor nieuwe strategische kansen.';
  }

  return {
    status,
    safeCount,
    atRiskCount,
    blockedCount,
    recommendation
  };
}

/**
 * Generate top strategic risks (max 2)
 */
export function generateTopStrategicRisks(): StrategicRisk[] {
  const allItems = [
    ...mockBrandAssets.map(a => ({ ...a, itemType: 'asset' as const })),
    ...mockPersonas.map(p => ({ ...p, itemType: 'persona' as const }))
  ];

  const withStatus = allItems.map(item => ({
    item,
    status: calculateDecisionStatus(item)
  }));

  const risks: StrategicRisk[] = [];

  // Risk 1: Blocked items (critical)
  const blocked = withStatus.filter(w => w.status.status === 'blocked');
  if (blocked.length > 0) {
    const item = blocked[0];
    risks.push({
      id: `risk-blocked-${item.item.id}`,
      title: `${item.item.type} is niet bruikbaar voor strategische beslissingen`,
      description: `Coverage is ${Math.round(item.status.coverage)}% (<50% threshold). Beslissingen gebaseerd op dit ${item.item.itemType} dragen onaanvaardbaar hoog risico.`,
      impact: 'critical',
      category: item.item.itemType === 'asset' ? 'Brand Asset' : 'Persona',
      targetSection: 'blocked'
    });
  }

  // Risk 2: At risk items (high)
  const atRisk = withStatus.filter(w => w.status.status === 'decision-at-risk');
  if (atRisk.length > 0) {
    const item = atRisk[0];
    risks.push({
      id: `risk-atrisk-${item.item.id}`,
      title: `${item.item.type} heeft beperkte validatie`,
      description: `Coverage is ${Math.round(item.status.coverage)}% (50-79% threshold). Strategische keuzes kunnen sub-optimaal zijn zonder verdere validatie.`,
      impact: 'high',
      category: item.item.itemType === 'asset' ? 'Brand Asset' : 'Persona',
      targetSection: 'at-risk'
    });
  }

  return risks.slice(0, 2); // MAX 2
}

/**
 * Generate next best action (SINGLE)
 */
export function generateNextBestAction(): NextBestActionData | null {
  const allItems = [
    ...mockBrandAssets.map(a => ({ ...a, itemType: 'asset' as const })),
    ...mockPersonas.map(p => ({ ...p, itemType: 'persona' as const }))
  ];

  const withStatus = allItems.map(item => ({
    item,
    status: calculateDecisionStatus(item)
  }));

  // Priority 1: Blocked items (critical)
  const blocked = withStatus.filter(w => w.status.status === 'blocked');
  if (blocked.length > 0) {
    const item = blocked[0];
    return {
      title: `Valideer ${item.item.type}`,
      reason: `Dit ${item.item.itemType} blokkeert strategische beslissingen (<50% coverage)`,
      unlocksDecision: `${item.item.type} wordt bruikbaar in campagnes en strategische tools`,
      riskReduction: 'Elimineert kritiek risico op misleidende beslissingen',
      estimatedTime: item.status.missingTopMethods.includes('Workshop') ? '2-4 uur' : '1-2 uur',
      impact: 'critical',
      targetType: item.item.itemType
    };
  }

  // Priority 2: At risk items (high)
  const atRisk = withStatus.filter(w => w.status.status === 'decision-at-risk');
  if (atRisk.length > 0) {
    const item = atRisk[0];
    return {
      title: `Verbeter ${item.item.type}`,
      reason: `Dit ${item.item.itemType} heeft beperkte validatie (50-79% coverage)`,
      unlocksDecision: `${item.item.type} bereikt optimale betrouwbaarheid (≥80%)`,
      riskReduction: 'Verkleint risico op sub-optimale ROI met 40-60%',
      estimatedTime: '1-2 uur',
      impact: 'high',
      targetType: item.item.itemType
    };
  }

  // No urgent actions
  return null;
}

export interface DecisionCockpitData {
  safe: Array<{
    id: string;
    name: string;
    type: 'asset' | 'persona';
    coverage: number;
    reason: string;
  }>;
  atRisk: Array<{
    id: string;
    name: string;
    type: 'asset' | 'persona';
    coverage: number;
    reason: string;
  }>;
  blocked: Array<{
    id: string;
    name: string;
    type: 'asset' | 'persona';
    coverage: number;
    reason: string;
  }>;
  // Helper stats
  safeCount: number;
  atRiskCount: number;
  blockedCount: number;
  avgCoverage: number;
  readyToDecide: number; // Alias for safeCount for better naming in UI
}

export interface PrimaryNextStep {
  action: string;
  reason: string;
  unlocks: string;
  riskReduction: string;
  estimatedTime?: string;
  targetId?: string;
  targetType?: 'asset' | 'persona' | 'research';
}

/**
 * Transform assets + personas naar Decision Cockpit formaat
 */
export function transformToDecisionCockpit(): DecisionCockpitData {
  const allItems = [
    ...mockBrandAssets.map(a => ({ ...a, itemType: 'asset' as const })),
    ...mockPersonas.map(p => ({ ...p, itemType: 'persona' as const }))
  ];

  const withStatus = allItems.map(item => ({
    item,
    status: calculateDecisionStatus(item)
  }));

  const safe = withStatus
    .filter(w => w.status.status === 'safe-to-decide')
    .map(w => ({
      id: w.item.id,
      name: w.item.type,
      type: w.item.itemType,
      coverage: w.status.coverage,
      reason: `${w.status.completedMethods.length} research methods compleet`
    }))
    .sort((a, b) => b.coverage - a.coverage);

  const atRisk = withStatus
    .filter(w => w.status.status === 'decision-at-risk')
    .map(w => ({
      id: w.item.id,
      name: w.item.type,
      type: w.item.itemType,
      coverage: w.status.coverage,
      reason: w.status.missingTopMethods.length > 0
        ? `Ontbrekend: ${w.status.missingTopMethods[0]}`
        : 'Beperkte research diepte'
    }))
    .sort((a, b) => a.coverage - b.coverage); // Lowest first (most urgent)

  const blocked = withStatus
    .filter(w => w.status.status === 'blocked')
    .map(w => ({
      id: w.item.id,
      name: w.item.type,
      type: w.item.itemType,
      coverage: w.status.coverage,
      reason: w.status.missingTopMethods.length > 0
        ? `Kritiek: ${w.status.missingTopMethods.slice(0, 2).join(', ')}`
        : 'Fundamentele research ontbreekt'
    }))
    .sort((a, b) => a.coverage - b.coverage); // Lowest first (most urgent)

  // Helper stats
  const safeCount = safe.length;
  const atRiskCount = atRisk.length;
  const blockedCount = blocked.length;
  const totalCount = safeCount + atRiskCount + blockedCount;
  const avgCoverage = totalCount > 0
    ? Math.round(
        (safe.reduce((acc, s) => acc + s.coverage, 0) + 
         atRisk.reduce((acc, r) => acc + r.coverage, 0) + 
         blocked.reduce((acc, b) => acc + b.coverage, 0)) / totalCount
      )
    : 0;

  return { safe, atRisk, blocked, safeCount, atRiskCount, blockedCount, avgCoverage, readyToDecide: safeCount };
}

/**
 * Bepaal primary next step (grootste impact)
 */
export function calculatePrimaryNextStep(): PrimaryNextStep {
  const cockpitData = transformToDecisionCockpit();

  // Priority 1: Blocked items (kritiek)
  if (cockpitData.blocked.length > 0) {
    const mostUrgent = cockpitData.blocked[0];
    const item = [...mockBrandAssets, ...mockPersonas].find(i => i.id === mostUrgent.id);
    const status = item ? calculateDecisionStatus(item) : null;
    
    return {
      action: `Valideer ${mostUrgent.name}`,
      reason: `Dit ${mostUrgent.type === 'asset' ? 'asset' : 'persona'} blokkeert strategische beslissingen`,
      unlocks: `${mostUrgent.name} wordt bruikbaar in campagnes en strategieën`,
      riskReduction: `Elimineert kritiek risico op misleidende beslissingen`,
      estimatedTime: status?.missingTopMethods.includes('Workshop') ? '2-4 uur' : '1-2 uur',
      targetId: mostUrgent.id,
      targetType: mostUrgent.type
    };
  }

  // Priority 2: At Risk items (verhoogd risico)
  if (cockpitData.atRisk.length > 0) {
    const mostUrgent = cockpitData.atRisk[0];
    const item = [...mockBrandAssets, ...mockPersonas].find(i => i.id === mostUrgent.id);
    const status = item ? calculateDecisionStatus(item) : null;
    
    return {
      action: `Verbeter ${mostUrgent.name}`,
      reason: `Dit ${mostUrgent.type === 'asset' ? 'asset' : 'persona'} heeft beperkte validatie`,
      unlocks: `${mostUrgent.name} bereikt optimale betrouwbaarheid (80%+)`,
      riskReduction: `Verkleint risico op sub-optimale ROI met 40-60%`,
      estimatedTime: status?.missingTopMethods[0] === 'Workshop' ? '2-4 uur' : '1-2 uur',
      targetId: mostUrgent.id,
      targetType: mostUrgent.type
    };
  }

  // Priority 3: Alles safe - focus op nieuwe inzichten
  return {
    action: 'Verken markt trends',
    reason: 'Basis merkdata is compleet gevalideerd',
    unlocks: 'Nieuwe strategische kansen en positionering',
    riskReduction: 'Proactief risicomanagement op marktveranderingen',
    estimatedTime: '30-60 min',
    targetType: 'research'
  };
}

/**
 * Genereer top 3 strategische risico's
 */
export function generateStrategicRisks(): StrategicRisk[] {
  const cockpitData = transformToDecisionCockpit();
  const risks: StrategicRisk[] = [];

  // Risk 1: Blocked items (critical)
  if (cockpitData.blocked.length > 0) {
    const blockedCount = cockpitData.blocked.length;
    const names = cockpitData.blocked.slice(0, 2).map(b => b.name).join(' en ');
    
    risks.push({
      id: 'blocked-assets',
      title: `${blockedCount} ${blockedCount === 1 ? 'item' : 'items'} onvoldoende gevalideerd`,
      description: `${names} ${blockedCount === 1 ? 'heeft' : 'hebben'} < 50% research coverage`,
      impact: 'critical',
      category: 'Brand Asset',
      targetSection: 'blocked'
    });
  }

  // Risk 2: At Risk items (high)
  if (cockpitData.atRisk.length > 0) {
    const riskCount = cockpitData.atRisk.length;
    const names = cockpitData.atRisk.slice(0, 2).map(r => r.name).join(' en ');
    
    risks.push({
      id: 'at-risk-assets',
      title: `${riskCount} ${riskCount === 1 ? 'item heeft' : 'items hebben'} beperkte validatie`,
      description: `${names} ${riskCount === 1 ? 'mist' : 'missen'} top research methods`,
      impact: 'high',
      category: 'Brand Asset',
      targetSection: 'at-risk'
    });
  }

  // Risk 3: Coverage gaps (medium) - items net boven threshold maar niet optimaal
  const justAboveThreshold = [
    ...cockpitData.safe.filter(s => s.coverage < 85),
    ...cockpitData.atRisk.filter(r => r.coverage >= 65)
  ];

  if (justAboveThreshold.length > 0) {
    risks.push({
      id: 'coverage-gaps',
      title: `${justAboveThreshold.length} items hebben verbeterpotentieel`,
      description: 'Coverage tussen 65-85% (bruikbaar maar niet optimaal)',
      impact: 'medium',
      category: 'Brand Asset'
    });
  }

  // Risk 4: Persona gaps (indien < 3 personas)
  const personaCount = mockPersonas.length;
  if (personaCount < 3) {
    risks.push({
      id: 'persona-gaps',
      title: 'Beperkte persona coverage',
      description: `Slechts ${personaCount} ${personaCount === 1 ? 'persona' : 'personas'} gedefinieerd`,
      impact: 'medium',
      category: 'Persona'
    });
  }

  // Return top 3 (sorted by severity)
  const severityOrder = { critical: 0, high: 1, medium: 2 };
  return risks
    .sort((a, b) => severityOrder[a.impact] - severityOrder[b.impact])
    .slice(0, 3);
}

/**
 * MOTIVATIE:
 * 
 * 1. DECISION-FIRST TRANSFORMATIE
 *    - Raw data → decision categorieën (safe/risk/blocked)
 *    - Sorteer op urgentie (lowest coverage first)
 *    - Reason per item (waarom in deze categorie)
 * 
 * 2. IMPACT-BASED PRIORITIZATION
 *    - Primary next step = grootste risico reductie
 *    - Blocked items eerst (kritiek)
 *    - At risk items tweede (hoog)
 *    - Safe items laatste (optimalisatie)
 * 
 * 3. CONCRETE FIXES
 *    - Niet "improve quality" maar "Start Workshop"
 *    - Geschatte tijd voor commitment
 *    - Unlocks + risk reduction voor motivatie
 * 
 * 4. STRATEGIC RISK FRAMING
 *    - Business impact (niet technische metrics)
 *    - "ROI 40-60% onder potentieel" (niet "coverage laag")
 *    - Concrete fix (actionable)
 * 
 * 5. TOP 3 DISCIPLINE
 *    - Overal max 3 items
 *    - Focus over completeness
 *    - Prioriteer op severity/impact
 */