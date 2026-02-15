/**
 * UTILITY: Dashboard Decision Transformer
 * 
 * Transformeert platform data naar Dashboard formaten.
 * Alle functies ontvangen data als parameter (geen mock imports).
 */

import { calculateDecisionStatus } from './decision-status-calculator';

export interface SimpleDashboardStatus {
  status: 'safe-to-decide' | 'decision-at-risk' | 'blocked';
  safeCount: number;
  atRiskCount: number;
  blockedCount: number;
  recommendation: string;
}

export interface StrategicRisk {
  id: string;
  title: string;
  description: string;
  impact: 'critical' | 'high' | 'medium';
  category: string;
  targetSection?: string;
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

export interface DecisionCockpitData {
  safe: Array<{ id: string; name: string; type: 'asset' | 'persona'; coverage: number; reason: string }>;
  atRisk: Array<{ id: string; name: string; type: 'asset' | 'persona'; coverage: number; reason: string }>;
  blocked: Array<{ id: string; name: string; type: 'asset' | 'persona'; coverage: number; reason: string }>;
  safeCount: number;
  atRiskCount: number;
  blockedCount: number;
  avgCoverage: number;
  readyToDecide: number;
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

// Helper: merge assets + personas into tagged items
function mergeItems(brandAssets: any[], personas: any[]) {
  return [
    ...brandAssets.map(a => ({ ...a, itemType: 'asset' as const })),
    ...personas.map(p => ({ ...p, itemType: 'persona' as const })),
  ];
}

function itemsWithStatus(brandAssets: any[], personas: any[]) {
  return mergeItems(brandAssets, personas).map(item => ({
    item,
    status: calculateDecisionStatus(item),
  }));
}

/**
 * Calculate simple dashboard status
 */
export function calculateSimpleDashboardStatus(brandAssets: any[], personas: any[]): SimpleDashboardStatus {
  const withStatus = itemsWithStatus(brandAssets, personas);
  const total = withStatus.length;

  const safeCount = withStatus.filter(w => w.status.status === 'safe-to-decide').length;
  const atRiskCount = withStatus.filter(w => w.status.status === 'decision-at-risk').length;
  const blockedCount = withStatus.filter(w => w.status.status === 'blocked').length;

  let status: SimpleDashboardStatus['status'];
  if (blockedCount > 0) status = 'blocked';
  else if (atRiskCount > total / 2) status = 'decision-at-risk';
  else status = 'safe-to-decide';

  let recommendation: string;
  if (status === 'blocked') recommendation = 'Valideer onvoldoende gevalideerde items om strategische beslissingen te vergemakkelijken.';
  else if (status === 'decision-at-risk') recommendation = 'Verbeter items met beperkte validatie om het risico op sub-optimale ROI te verminderen.';
  else recommendation = 'Basis merkdata is compleet gevalideerd. Verken markt trends voor nieuwe strategische kansen.';

  return { status, safeCount, atRiskCount, blockedCount, recommendation };
}

/**
 * Generate top strategic risks (max 2)
 */
export function generateTopStrategicRisks(brandAssets: any[], personas: any[]): StrategicRisk[] {
  const withStatus = itemsWithStatus(brandAssets, personas);
  const risks: StrategicRisk[] = [];

  const blocked = withStatus.filter(w => w.status.status === 'blocked');
  if (blocked.length > 0) {
    const item = blocked[0];
    risks.push({
      id: `risk-blocked-${item.item.id}`,
      title: `${item.item.type} is niet bruikbaar voor strategische beslissingen`,
      description: `Coverage is ${Math.round(item.status.coverage)}% (<50% threshold). Beslissingen gebaseerd op dit ${item.item.itemType} dragen onaanvaardbaar hoog risico.`,
      impact: 'critical',
      category: item.item.itemType === 'asset' ? 'Brand Asset' : 'Persona',
      targetSection: 'blocked',
    });
  }

  const atRisk = withStatus.filter(w => w.status.status === 'decision-at-risk');
  if (atRisk.length > 0) {
    const item = atRisk[0];
    risks.push({
      id: `risk-atrisk-${item.item.id}`,
      title: `${item.item.type} heeft beperkte validatie`,
      description: `Coverage is ${Math.round(item.status.coverage)}% (50-79% threshold). Strategische keuzes kunnen sub-optimaal zijn zonder verdere validatie.`,
      impact: 'high',
      category: item.item.itemType === 'asset' ? 'Brand Asset' : 'Persona',
      targetSection: 'at-risk',
    });
  }

  return risks.slice(0, 2);
}

/**
 * Generate next best action (SINGLE)
 */
export function generateNextBestAction(brandAssets: any[], personas: any[]): NextBestActionData | null {
  const withStatus = itemsWithStatus(brandAssets, personas);

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
      targetType: item.item.itemType,
    };
  }

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
      targetType: item.item.itemType,
    };
  }

  return null;
}

/**
 * Transform assets + personas naar Decision Cockpit formaat
 */
export function transformToDecisionCockpit(brandAssets: any[], personas: any[]): DecisionCockpitData {
  const withStatus = itemsWithStatus(brandAssets, personas);

  const safe = withStatus
    .filter(w => w.status.status === 'safe-to-decide')
    .map(w => ({ id: w.item.id, name: w.item.type, type: w.item.itemType, coverage: w.status.coverage, reason: `${w.status.completedMethods.length} research methods compleet` }))
    .sort((a, b) => b.coverage - a.coverage);

  const atRisk = withStatus
    .filter(w => w.status.status === 'decision-at-risk')
    .map(w => ({ id: w.item.id, name: w.item.type, type: w.item.itemType, coverage: w.status.coverage, reason: w.status.missingTopMethods.length > 0 ? `Ontbrekend: ${w.status.missingTopMethods[0]}` : 'Beperkte research diepte' }))
    .sort((a, b) => a.coverage - b.coverage);

  const blocked = withStatus
    .filter(w => w.status.status === 'blocked')
    .map(w => ({ id: w.item.id, name: w.item.type, type: w.item.itemType, coverage: w.status.coverage, reason: w.status.missingTopMethods.length > 0 ? `Kritiek: ${w.status.missingTopMethods.slice(0, 2).join(', ')}` : 'Fundamentele research ontbreekt' }))
    .sort((a, b) => a.coverage - b.coverage);

  const safeCount = safe.length;
  const atRiskCount = atRisk.length;
  const blockedCount = blocked.length;
  const totalCount = safeCount + atRiskCount + blockedCount;
  const avgCoverage = totalCount > 0
    ? Math.round((safe.reduce((s, i) => s + i.coverage, 0) + atRisk.reduce((s, i) => s + i.coverage, 0) + blocked.reduce((s, i) => s + i.coverage, 0)) / totalCount)
    : 0;

  return { safe, atRisk, blocked, safeCount, atRiskCount, blockedCount, avgCoverage, readyToDecide: safeCount };
}

/**
 * Bepaal primary next step (grootste impact)
 */
export function calculatePrimaryNextStep(brandAssets: any[], personas: any[]): PrimaryNextStep {
  const cockpitData = transformToDecisionCockpit(brandAssets, personas);
  const allItems = mergeItems(brandAssets, personas);

  if (cockpitData.blocked.length > 0) {
    const mostUrgent = cockpitData.blocked[0];
    const item = allItems.find(i => i.id === mostUrgent.id);
    const status = item ? calculateDecisionStatus(item) : null;
    return {
      action: `Valideer ${mostUrgent.name}`,
      reason: `Dit ${mostUrgent.type === 'asset' ? 'asset' : 'persona'} blokkeert strategische beslissingen`,
      unlocks: `${mostUrgent.name} wordt bruikbaar in campagnes en strategieën`,
      riskReduction: 'Elimineert kritiek risico op misleidende beslissingen',
      estimatedTime: status?.missingTopMethods.includes('Workshop') ? '2-4 uur' : '1-2 uur',
      targetId: mostUrgent.id,
      targetType: mostUrgent.type,
    };
  }

  if (cockpitData.atRisk.length > 0) {
    const mostUrgent = cockpitData.atRisk[0];
    const item = allItems.find(i => i.id === mostUrgent.id);
    const status = item ? calculateDecisionStatus(item) : null;
    return {
      action: `Verbeter ${mostUrgent.name}`,
      reason: `Dit ${mostUrgent.type === 'asset' ? 'asset' : 'persona'} heeft beperkte validatie`,
      unlocks: `${mostUrgent.name} bereikt optimale betrouwbaarheid (80%+)`,
      riskReduction: 'Verkleint risico op sub-optimale ROI met 40-60%',
      estimatedTime: status?.missingTopMethods[0] === 'Workshop' ? '2-4 uur' : '1-2 uur',
      targetId: mostUrgent.id,
      targetType: mostUrgent.type,
    };
  }

  return {
    action: 'Verken markt trends',
    reason: 'Basis merkdata is compleet gevalideerd',
    unlocks: 'Nieuwe strategische kansen en positionering',
    riskReduction: 'Proactief risicomanagement op marktveranderingen',
    estimatedTime: '30-60 min',
    targetType: 'research',
  };
}

/**
 * Genereer top 3 strategische risico's
 */
export function generateStrategicRisks(brandAssets: any[], personas: any[]): StrategicRisk[] {
  const cockpitData = transformToDecisionCockpit(brandAssets, personas);
  const risks: StrategicRisk[] = [];

  if (cockpitData.blocked.length > 0) {
    const count = cockpitData.blocked.length;
    const names = cockpitData.blocked.slice(0, 2).map(b => b.name).join(' en ');
    risks.push({ id: 'blocked-assets', title: `${count} ${count === 1 ? 'item' : 'items'} onvoldoende gevalideerd`, description: `${names} ${count === 1 ? 'heeft' : 'hebben'} < 50% research coverage`, impact: 'critical', category: 'Brand Asset', targetSection: 'blocked' });
  }

  if (cockpitData.atRisk.length > 0) {
    const count = cockpitData.atRisk.length;
    const names = cockpitData.atRisk.slice(0, 2).map(r => r.name).join(' en ');
    risks.push({ id: 'at-risk-assets', title: `${count} ${count === 1 ? 'item heeft' : 'items hebben'} beperkte validatie`, description: `${names} ${count === 1 ? 'mist' : 'missen'} top research methods`, impact: 'high', category: 'Brand Asset', targetSection: 'at-risk' });
  }

  const justAbove = [...cockpitData.safe.filter(s => s.coverage < 85), ...cockpitData.atRisk.filter(r => r.coverage >= 65)];
  if (justAbove.length > 0) {
    risks.push({ id: 'coverage-gaps', title: `${justAbove.length} items hebben verbeterpotentieel`, description: 'Coverage tussen 65-85% (bruikbaar maar niet optimaal)', impact: 'medium', category: 'Brand Asset' });
  }

  if (personas.length < 3) {
    risks.push({ id: 'persona-gaps', title: 'Beperkte persona coverage', description: `Slechts ${personas.length} ${personas.length === 1 ? 'persona' : 'personas'} gedefinieerd`, impact: 'medium', category: 'Persona' });
  }

  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
  return risks.sort((a, b) => (severityOrder[a.impact] ?? 3) - (severityOrder[b.impact] ?? 3)).slice(0, 3);
}
