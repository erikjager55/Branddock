#!/bin/bash
# =============================================================
# Branddock — Fix ResearchItem (clean rewrite, geen sed)
# =============================================================

set -e
echo "🔧 Fix: ResearchItem compatible met BrandAsset + Persona"
echo "========================================================="

# ----- Schrijf decision-status-calculator.ts volledig opnieuw -----
echo ""
echo "📝 decision-status-calculator.ts herschrijven..."

cat > src/utils/decision-status-calculator.ts << 'ENDOFFILE'
import { DecisionStatus, DecisionStatusInfo, RESEARCH_METHOD_RANKING } from '../types/decision-status';

export interface ResearchItem {
  researchMethods: Array<{ status: string; type?: string; method?: string; [key: string]: unknown }>;
}

/**
 * Calculates the decision status for a research item (brand asset, persona, etc.)
 * 
 * Logic:
 * - Safe to Decide: coverage >= 80% AND top 2 ranked methods completed
 * - Decision at Risk: coverage 50-79% OR top 2 methods not completed
 * - Blocked: coverage < 50%
 */
export function calculateDecisionStatus(item: ResearchItem): DecisionStatusInfo {
  const methods = item.researchMethods || [];
  
  // Calculate coverage
  const totalMethods = methods.length;
  const completedMethods = methods.filter(m => m.status === 'completed');
  const completedCount = completedMethods.length;
  const coverage = totalMethods > 0 ? (completedCount / totalMethods) * 100 : 0;
  
  // Get completed method types (BrandAsset uses 'type', Persona uses 'method')
  const completedTypes = completedMethods.map(m => (m.type || m.method || 'unknown') as string);
  
  // Check if top 2 ranked methods are completed
  const methodsWithRanking = methods.map(m => ({
    type: (m.type || m.method || 'unknown') as string,
    status: m.status,
    ranking: RESEARCH_METHOD_RANKING[(m.type || m.method || 'unknown') as string] || 999
  }));
  
  // Sort by ranking (lower = higher priority)
  const sortedMethods = methodsWithRanking.sort((a, b) => a.ranking - b.ranking);
  const topTwoMethods = sortedMethods.slice(0, 2);
  const topMethodsCompleted = topTwoMethods.every(m => m.status === 'completed');
  const missingTopMethods = topTwoMethods
    .filter(m => m.status !== 'completed')
    .map(m => m.type);
  
  // Determine status
  let status: DecisionStatus;
  let recommendation: string;
  let risk: string;
  let nextSteps: string[];
  
  if (coverage >= 80 && topMethodsCompleted) {
    status = 'safe-to-decide';
    recommendation = 'You have sufficient validated research to make confident strategic decisions.';
    risk = 'Minimal risk - your decisions are backed by comprehensive research.';
    nextSteps = [
      'Proceed with confidence to strategy tools',
      'Consider additional validation if needed',
      'Document key insights before strategizing'
    ];
  } else if (coverage >= 50) {
    status = 'decision-at-risk';
    if (!topMethodsCompleted) {
      recommendation = `Complete the highest-ranked research methods (${missingTopMethods.join(', ')}) for better decision quality.`;
      risk = 'Moderate risk - missing critical strategic research methods.';
    } else {
      recommendation = 'Increase research coverage to 80% for fully validated decisions.';
      risk = 'Moderate risk - decisions may lack depth without additional research.';
    }
    nextSteps = [
      `Complete ${missingTopMethods.length > 0 ? missingTopMethods.join(' and ') : 'remaining research methods'}`,
      'Reach 80% coverage for safe decision-making',
      'Consider the strategic importance of missing methods'
    ];
  } else {
    status = 'blocked';
    recommendation = 'Critical: Complete core research before making strategic decisions.';
    risk = 'High risk - decisions would be speculative without proper validation.';
    nextSteps = [
      'Start with Workshop and 1-on-1 Interviews (highest strategic value)',
      'Reach minimum 50% research coverage',
      'Validate core assumptions before proceeding'
    ];
  }
  
  return {
    status,
    coverage: Math.round(coverage),
    completedMethods: completedTypes,
    topMethodsCompleted,
    missingTopMethods,
    recommendation,
    risk,
    nextSteps
  };
}

/**
 * Get human-readable method names
 */
export function getMethodLabel(methodType: string): string {
  const labels: Record<string, string> = {
    'workshop': 'Workshop',
    'interviews': '1-on-1 Interviews',
    'questionnaire': 'Strategic Survey',
    'ai-exploration': 'AI Exploration'
  };
  return labels[methodType] || methodType;
}
ENDOFFILE

echo "   ✅ decision-status-calculator.ts herschreven"

# ----- Verificatie -----
echo ""
echo "🔍 Verificatie..."
RESEARCH_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "ResearchItem" || true)
echo "   ResearchItem errors: $RESEARCH_ERRORS"

if [ "$RESEARCH_ERRORS" -gt "0" ]; then
  npx tsc --noEmit 2>&1 | grep "ResearchItem" | head -15
fi

echo ""
TOTAL=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
echo "📊 Totaal: $TOTAL errors (was 713)"
echo ""
echo "✅ Klaar. Commit:"
echo "   git add -A && git commit -m 'fix: flexible ResearchItem for BrandAsset + Persona'"
