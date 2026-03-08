/**
 * COMPONENT: Commercial Demo Page
 * 
 * Demo page to test all commercial features.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Package,
  Users,
  Zap,
  Shield,
  FileText,
  Star,
  Lock,
  Unlock,
  RotateCcw,
  CheckCircle
} from 'lucide-react';
import { DecisionScanOnboarding } from './DecisionScanOnboarding';
import { TierComparison } from './TierComparison';
import { AdvisoryServices } from './AdvisoryServices';
import { UpgradePrompt } from './UpgradePrompt';
import { useProductTier } from '../../contexts/ProductTierContext';
import { ProductTier } from '../../types/product-tier';
import { UnlockService } from '../../services/UnlockService';

export function CommercialDemoPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showDecisionScan, setShowDecisionScan] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { currentTier, upgradeTier } = useProductTier();
  
  // Track unlock state for real-time updates
  const [unlockState, setUnlockState] = useState(UnlockService.getState());
  
  // Subscribe to unlock service changes
  React.useEffect(() => {
    const unsubscribe = UnlockService.subscribe(() => {
      setUnlockState(UnlockService.getState());
    });
    return unsubscribe;
  }, []);

  const handleUpgrade = (tier?: ProductTier) => {
    if (tier) {
      upgradeTier(tier);
      setShowUpgradePrompt(false);
    }
    alert(`Upgrade to ${tier || 'strategic-control'} - Demo mode`);
  };

  if (showDecisionScan) {
    return (
      <DecisionScanOnboarding
        onComplete={() => setShowDecisionScan(false)}
        onUpgrade={() => {
          setShowDecisionScan(false);
          handleUpgrade('strategic-control');
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Commercial Features Demo</h1>
        <p className="text-muted-foreground">
          Test all commercial functionality and product tiers
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="scan">Decision Scan</TabsTrigger>
          <TabsTrigger value="advisory">Advisory</TabsTrigger>
          <TabsTrigger value="gating">Feature Gating</TabsTrigger>
          <TabsTrigger value="unlock">Unlock Demo</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-3">
                  <Shield className="h-6 w-6 text-blue-700 dark:text-blue-400" />
                </div>
                <CardTitle>Decision Scan</CardTitle>
                <CardDescription>Entry product - basic level</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setShowDecisionScan(true)}>
                  Start Demo Scan
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mb-3">
                  <Package className="h-6 w-6 text-purple-700 dark:text-purple-400" />
                </div>
                <CardTitle>Strategic Control</CardTitle>
                <CardDescription>Core product - control level</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => handleUpgrade('strategic-control')}
                  disabled={currentTier === 'strategic-control' || currentTier === 'advisory-services'}
                >
                  {currentTier === 'strategic-control' || currentTier === 'advisory-services' 
                    ? 'Active'
                    : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-3">
                  <Star className="h-6 w-6 text-amber-700 dark:text-amber-400" />
                </div>
                <CardTitle>Advisory & Services</CardTitle>
                <CardDescription>Premium - confidence level</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => handleUpgrade('advisory-services')}
                  disabled={currentTier === 'advisory-services'}
                >
                  {currentTier === 'advisory-services' ? 'Active' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Test various commercial flows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setActiveTab('tiers')}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Tier Comparison
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowUpgradePrompt(true)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Test Upgrade Prompt
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setActiveTab('advisory')}
              >
                <Users className="h-4 w-4 mr-2" />
                View Advisory Dashboard
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tier Comparison */}
        <TabsContent value="tiers" className="mt-6">
          <TierComparison
            onSelectTier={handleUpgrade}
            currentTier={currentTier}
          />
        </TabsContent>

        {/* Decision Scan */}
        <TabsContent value="scan" className="mt-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-16 w-16 mx-auto mb-4 text-blue-700 dark:text-blue-400" />
              <h3 className="text-2xl font-bold mb-4">Decision Scan Flow</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                A complete onboarding flow that ends in decision status, top 3 risks,
                action plan, and example campaign.
              </p>
              <Button size="lg" onClick={() => setShowDecisionScan(true)}>
                Start Decision Scan Demo
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advisory */}
        <TabsContent value="advisory" className="mt-6">
          <AdvisoryServices
            currentTier={currentTier}
            onScheduleConsultation={() => alert('Schedule consultation - Demo mode')}
          />
        </TabsContent>

        {/* Feature Gating */}
        <TabsContent value="gating" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Gating Examples</CardTitle>
              <CardDescription>
                Test how gated features are presented to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Inline Prompt */}
              <div>
                <p className="text-sm font-medium mb-3">Inline Upgrade Prompt</p>
                <UpgradePrompt
                  feature="Unlimited Campaign Generation"
                  featureDescription="Generate as many campaigns as you want with full decision quality tracking"
                  requiredTier="strategic-control"
                  onUpgrade={() => handleUpgrade('strategic-control')}
                  inline
                />
              </div>

              {/* Modal Trigger */}
              <div>
                <p className="text-sm font-medium mb-3">Modal Upgrade Prompt</p>
                <Button onClick={() => setShowUpgradePrompt(true)}>
                  Test Modal Prompt
                </Button>
              </div>

              {/* Advisory Upsell */}
              <div>
                <p className="text-sm font-medium mb-3">Advisory Services Upsell</p>
                <UpgradePrompt
                  feature="Expert Strategic Reviews"
                  featureDescription="Quarterly reviews with a dedicated strategy advisor for maximum decision certainty"
                  requiredTier="advisory-services"
                  onUpgrade={() => handleUpgrade('advisory-services')}
                  inline
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unlock Demo */}
        <TabsContent value="unlock" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Assets & Research Methods Unlock</CardTitle>
              <CardDescription>
                Manage which brand assets and validation methods are available to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Initialize Demo State */}
              <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                    <Unlock className="h-6 w-6 text-purple-700 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Initialize Demo State</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Unlock all 13 brand assets, but lock a selection of validation methods to demonstrate the unlock flow.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          UnlockService.initializeDemoState();
                          alert('✅ Demo state initialized!\n\n• All 13 brand assets are unlocked\n• AI Exploration: unlocked for all assets\n• Workshop & Interviews: locked for 6 assets\n• Questionnaire: locked for 10 assets\n\nGo to "Your Brand" to see the locked methods!');
                        }}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Initialize Demo State
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          UnlockService.reset();
                          alert('🔄 Reset complete! All brand assets and methods are now locked.');
                        }}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset All
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current State Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Unlock className="h-5 w-5 text-green-600" />
                      Unlocked Assets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.keys(unlockState.unlockedAssets).length > 0 ? (
                        <p className="text-2xl font-bold">
                          {Object.keys(unlockState.unlockedAssets).filter(id => UnlockService.isAssetUnlocked(id)).length}
                        </p>
                      ) : (
                        <p className="text-2xl font-bold text-muted-foreground">0</p>
                      )}
                      <p className="text-sm text-muted-foreground">of 13 brand assets</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lock className="h-5 w-5 text-amber-600" />
                      Research Methods Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(() => {
                        const allAssets = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
                        const methods = ['ai-exploration', 'workshop', 'interviews', 'questionnaire'];
                        
                        let totalMethods = allAssets.length * methods.length;
                        let unlockedMethods = 0;
                        
                        allAssets.forEach(assetId => {
                          methods.forEach(method => {
                            if (UnlockService.isToolUnlocked(assetId, method)) {
                              unlockedMethods++;
                            }
                          });
                        });
                        
                        const lockedMethods = totalMethods - unlockedMethods;
                        
                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Unlocked:</span>
                              <span className="text-sm font-semibold text-green-600">{unlockedMethods}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Locked:</span>
                              <span className="text-sm font-semibold text-red-600">{lockedMethods}</span>
                            </div>
                            <div className="pt-2 border-t">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Total methods:</span>
                                <span className="text-xs font-medium">{totalMethods}</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Per-Asset Status */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">Research Methods Status per Asset</CardTitle>
                  <CardDescription>
                    Real-time overview of which methods are unlocked/locked per brand asset
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const allAssets = [
                        { id: '1', name: 'Golden Circle' },
                        { id: '3', name: 'Mission & Vision' },
                        { id: '4', name: 'Brand Archetype' },
                        { id: '5', name: 'Core Values' },
                        { id: '6', name: 'Transformative Goals' },
                        { id: '7', name: 'Social Relevancy' },
                        { id: '8', name: 'Brand Tone & Voice' },
                        { id: '9', name: 'Brand Promise' },
                        { id: '10', name: 'Brand Story' },
                        { id: '11', name: 'Brand Essence' },
                        { id: '12', name: 'Brand Personality' },
                        { id: '13', name: 'Brand Positioning' }
                      ];

                      const methods = [
                        { id: 'ai-exploration', label: 'AI', color: 'blue' },
                        { id: 'workshop', label: 'Workshop', color: 'purple' },
                        { id: 'interviews', label: 'Interviews', color: 'indigo' },
                        { id: 'questionnaire', label: 'Survey', color: 'pink' }
                      ];

                      return allAssets.map(asset => {
                        const isAssetUnlocked = UnlockService.isAssetUnlocked(asset.id);
                        const unlockedTools = UnlockService.getUnlockedTools(asset.id);
                        
                        return (
                          <div 
                            key={asset.id} 
                            className={`p-3 rounded-lg border ${
                              isAssetUnlocked 
                                ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900' 
                                : 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isAssetUnlocked ? (
                                  <Unlock className="h-4 w-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                )}
                                <span className={`text-sm font-medium truncate ${
                                  isAssetUnlocked ? 'text-foreground' : 'text-muted-foreground'
                                }`}>
                                  #{asset.id} {asset.name}
                                </span>
                              </div>
                              
                              <div className="flex gap-1 flex-shrink-0">
                                {methods.map(method => {
                                  const isUnlocked = unlockedTools.includes(method.id);
                                  
                                  return (
                                    <div
                                      key={method.id}
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        isUnlocked
                                          ? `bg-${method.color}-100 dark:bg-${method.color}-950/30 text-${method.color}-700 dark:text-${method.color}-400 border border-${method.color}-300 dark:border-${method.color}-800`
                                          : 'bg-gray-100 dark:bg-gray-900 text-gray-400 border border-gray-200 dark:border-gray-800 line-through'
                                      }`}
                                      title={`${method.label}: ${isUnlocked ? 'Unlocked' : 'Locked'}`}
                                    >
                                      {isUnlocked ? '✓' : '×'} {method.label}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              <div className="text-xs text-muted-foreground flex-shrink-0">
                                {unlockedTools.length}/{methods.length}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Demo Scenario
                </h4>
                <ol className="text-sm text-muted-foreground space-y-1 ml-5 list-decimal">
                  <li>Click "Initialize Demo State" to unlock all brand assets</li>
                  <li>Go to the "Your Brand" section in the sidebar</li>
                  <li>Open a brand asset (e.g. "Golden Circle" or "Brand Archetype")</li>
                  <li>Try to start a locked research method (Workshop or Interviews)</li>
                  <li>You will now see the "Unlock" modal with pricing options</li>
                  <li>After purchase, the method is unlocked and you can start it</li>
                </ol>
              </div>

              {/* Method Lock Status */}
              <div>
                <h4 className="font-semibold mb-3">Demo Lock Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                      ✅ AI Exploration
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Unlocked for all assets (free tier)
                    </p>
                  </div>
                  
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                      🔒 Workshop & Interviews
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Locked for 6 assets (#1, #4, #6, #8, #9, #11)
                    </p>
                  </div>
                  
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                      🔒 Strategic Survey
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      Locked for 10 assets (only #2, #3, #13 unlocked)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Upgrade Prompt */}
      {showUpgradePrompt && (
        <UpgradePrompt
          feature="Advanced Research Planning"
          featureDescription="Use the full research planning tools for structured validation of your strategic decisions"
          requiredTier="strategic-control"
          onUpgrade={() => handleUpgrade('strategic-control')}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}