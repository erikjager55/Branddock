/**
 * DECISION LAYER INTEGRATION EXAMPLE
 * 
 * This file demonstrates how to integrate the Decision Quality Layer
 * into strategic tools like the Campaign Strategy Generator.
 * 
 * Copy relevant sections to implement in your actual components.
 */

import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { DecisionWarningModal } from '../components/decision-status/DecisionWarningModal';
import { calculateDecisionStatus } from '../utils/decision-status-calculator';
import { mockBrandAssets } from '../data/mock-brand-assets';

/**
 * EXAMPLE 1: Campaign Strategy Generator Integration
 * 
 * Shows how to check decision quality before generating a campaign
 */
export function CampaignGeneratorWithDecisionCheck() {
  const [showWarning, setShowWarning] = useState(false);
  const [pendingGeneration, setPendingGeneration] = useState(false);
  
  // Example: User has selected specific brand assets for the campaign
  const selectedAssetIds = ['brand-purpose', 'core-values', 'positioning'];
  
  const handleGenerateCampaign = () => {
    // Check decision quality for all selected assets
    const assetStatuses = selectedAssetIds.map(assetId => {
      const asset = mockBrandAssets.find(a => a.id === assetId);
      if (!asset) return null;
      
      return {
        asset,
        statusInfo: calculateDecisionStatus(asset)
      };
    }).filter(Boolean);
    
    // Find the worst status (most risky)
    const worstStatus = assetStatuses.reduce((worst, current) => {
      const statusPriority = { 'blocked': 0, 'decision-at-risk': 1, 'safe-to-decide': 2 };
      const currentPriority = statusPriority[current!.statusInfo.status];
      const worstPriority = statusPriority[worst!.statusInfo.status];
      return currentPriority < worstPriority ? current : worst;
    });
    
    // If any asset is blocked or at-risk, show warning
    if (worstStatus && worstStatus.statusInfo.status !== 'safe-to-decide') {
      setShowWarning(true);
      setPendingGeneration(true);
      return;
    }
    
    // All clear - proceed with generation
    proceedWithGeneration();
  };
  
  const proceedWithGeneration = () => {
    // Actual campaign generation logic here
    console.log('Generating campaign...');
    setPendingGeneration(false);
  };
  
  const handleProceedAnyway = () => {
    setShowWarning(false);
    proceedWithGeneration();
  };
  
  // Get worst asset for warning modal
  const worstAsset = mockBrandAssets.find(a => a.id === selectedAssetIds[0]);
  const worstStatusInfo = worstAsset ? calculateDecisionStatus(worstAsset) : null;
  
  return (
    <>
      <Button onClick={handleGenerateCampaign}>
        Generate Campaign Strategy
      </Button>
      
      {worstStatusInfo && (
        <DecisionWarningModal
          isOpen={showWarning}
          onClose={() => {
            setShowWarning(false);
            setPendingGeneration(false);
          }}
          onProceed={handleProceedAnyway}
          statusInfo={worstStatusInfo}
          actionName="generate campaign for"
          itemName="selected brand assets"
        />
      )}
    </>
  );
}

/**
 * EXAMPLE 2: Simple Asset Detail Page Integration
 * 
 * Shows how to display decision quality on an asset detail page
 */
import { DecisionStatusPanel } from '../components/decision-status/DecisionStatusPanel';

export function AssetDetailPageWithDecisionPanel() {
  const asset = mockBrandAssets[0]; // Example asset
  const statusInfo = calculateDecisionStatus(asset);
  
  const handleStartResearch = () => {
    // Navigate to research hub or specific research method
    console.log('Starting research for', asset.id);
  };
  
  return (
    <div className="space-y-6">
      {/* Asset header, content, etc. */}
      
      {/* Decision Quality Panel */}
      <DecisionStatusPanel
        statusInfo={statusInfo}
        onStartResearch={handleStartResearch}
        compact={false}
      />
      
      {/* Rest of asset details */}
    </div>
  );
}

/**
 * EXAMPLE 3: Dashboard Overview Integration
 * 
 * Shows how to calculate overall decision quality metrics
 */
export function DashboardWithDecisionMetrics() {
  // Calculate decision quality for all assets
  const decisionMetrics = mockBrandAssets.map(asset => ({
    asset,
    statusInfo: calculateDecisionStatus(asset)
  }));
  
  // Count by status
  const safeCount = decisionMetrics.filter(m => m.statusInfo.status === 'safe-to-decide').length;
  const atRiskCount = decisionMetrics.filter(m => m.statusInfo.status === 'decision-at-risk').length;
  const blockedCount = decisionMetrics.filter(m => m.statusInfo.status === 'blocked').length;
  
  // Calculate average coverage
  const avgCoverage = decisionMetrics.reduce((sum, m) => sum + m.statusInfo.coverage, 0) / decisionMetrics.length;
  
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="text-2xl font-bold text-green-700">{safeCount}</div>
        <div className="text-sm text-green-600">Safe to Decide</div>
      </div>
      
      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="text-2xl font-bold text-amber-700">{atRiskCount}</div>
        <div className="text-sm text-amber-600">Decision at Risk</div>
      </div>
      
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="text-2xl font-bold text-red-700">{blockedCount}</div>
        <div className="text-sm text-red-600">Blocked</div>
      </div>
      
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-2xl font-bold text-blue-700">{Math.round(avgCoverage)}%</div>
        <div className="text-sm text-blue-600">Average Coverage</div>
      </div>
    </div>
  );
}

/**
 * EXAMPLE 4: Persona Selection with Decision Check
 * 
 * Shows how to validate persona quality before targeting decisions
 */
export function PersonaTargetingWithDecisionCheck() {
  const [showWarning, setShowWarning] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<any>(null);
  
  const handleSelectPersonaForCampaign = (persona: any) => {
    const statusInfo = calculateDecisionStatus(persona);
    
    if (statusInfo.status !== 'safe-to-decide') {
      setSelectedPersona(persona);
      setShowWarning(true);
      return;
    }
    
    // Proceed with persona selection
    proceedWithPersona(persona);
  };
  
  const proceedWithPersona = (persona: any) => {
    console.log('Using persona for campaign:', persona.id);
  };
  
  const handleProceedAnyway = () => {
    setShowWarning(false);
    if (selectedPersona) {
      proceedWithPersona(selectedPersona);
    }
  };
  
  return (
    <>
      {/* Persona selection UI */}
      
      {selectedPersona && (
        <DecisionWarningModal
          isOpen={showWarning}
          onClose={() => {
            setShowWarning(false);
            setSelectedPersona(null);
          }}
          onProceed={handleProceedAnyway}
          statusInfo={calculateDecisionStatus(selectedPersona)}
          actionName="target campaign to"
          itemName={selectedPersona.name || 'this persona'}
        />
      )}
    </>
  );
}

/**
 * EXAMPLE 5: Research Hub Integration
 * 
 * Shows priority research recommendations based on decision quality
 */
export function ResearchHubWithDecisionPriorities() {
  // Find assets that need the most urgent research
  const urgentAssets = mockBrandAssets
    .map(asset => ({
      asset,
      statusInfo: calculateDecisionStatus(asset)
    }))
    .filter(m => m.statusInfo.status === 'blocked' || m.statusInfo.status === 'decision-at-risk')
    .sort((a, b) => {
      // Sort by status (blocked first) then by coverage (lowest first)
      if (a.statusInfo.status !== b.statusInfo.status) {
        return a.statusInfo.status === 'blocked' ? -1 : 1;
      }
      return a.statusInfo.coverage - b.statusInfo.coverage;
    })
    .slice(0, 5); // Top 5 most urgent
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Priority Research Needed</h3>
      {urgentAssets.map(({ asset, statusInfo }) => (
        <div key={asset.id} className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{asset.type}</h4>
            <DecisionStatusBadge status={statusInfo.status} size="sm" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {statusInfo.recommendation}
          </p>
          <div className="flex gap-2">
            {statusInfo.missingTopMethods.map(method => (
              <Button key={method} size="sm" variant="outline">
                Start {method}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * INTEGRATION CHECKLIST
 * 
 * When integrating the Decision Layer into a new component:
 * 
 * 1. Import required components:
 *    - DecisionStatusBadge (for cards/lists)
 *    - DecisionStatusPanel (for detail pages)
 *    - DecisionWarningModal (for action flows)
 * 
 * 2. Import utility:
 *    - calculateDecisionStatus
 * 
 * 3. Identify decision points:
 *    - Where does user make strategic choices?
 *    - What actions require validated research?
 * 
 * 4. Add pre-flight checks:
 *    - Calculate status before critical actions
 *    - Show warning modal if not "safe-to-decide"
 *    - Allow override for "decision-at-risk" (optional)
 *    - Block "blocked" status (required)
 * 
 * 5. Add visual indicators:
 *    - Badge on cards for quick scanning
 *    - Panel on detail pages for education
 *    - Modal before risky actions for prevention
 * 
 * 6. Test user flow:
 *    - Can user complete action with good research? ✓
 *    - Does warning appear with partial research? ✓
 *    - Is action blocked with insufficient research? ✓
 *    - Are next steps clear and actionable? ✓
 */

import { DecisionStatusBadge } from '../components/decision-status/DecisionStatusBadge';
