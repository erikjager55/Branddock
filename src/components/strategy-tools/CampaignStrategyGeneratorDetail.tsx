/**
 * COMPONENT: Campaign Strategy Generator Detail Page
 * 
 * Detailed view for the Campaign Strategy Generator tool - 3 tabs (Configure, Insights, Output)
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Checkbox } from '../ui/checkbox';
import { 
  ArrowRight,
  Megaphone,
  Target,
  Users,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Info,
  Lightbulb,
  ArrowUpRight,
  Sparkles,
  Shield,
  Download,
  Calendar,
  DollarSign,
  BarChart3,
  X,
  Package,
  BookOpen
} from 'lucide-react';
import { StrategyTool } from '../../types/strategy';
import { RelationshipService } from '../../services/RelationshipService';
import { EnhancedAssetPickerModal } from './EnhancedAssetPickerModal';
import { AddTrendModal } from './AddTrendModal';
import { SmartSuggestionsService } from '../../services/SmartSuggestionsService';
import { EntityType } from '../../types/relationship';
import { mockBrandAssets } from '../../data/mock-brand-assets';
import { mockPersonas } from '../../data/mock-personas';
import { mockProducts } from '../../data/mock-products';
import { mockTrends } from '../../data/mock-trends';
import { mockKnowledge } from '../../data/mock-knowledge';
import { StrategicReport } from './campaign-output/StrategicReport';
import { NextStepsSuggestions } from './campaign-output/NextStepsSuggestions';
import { ChatAssistant } from './campaign-output/ChatAssistant';
import { SavedStrategiesPanel, SavedStrategiesDropdown, SavedStrategy } from './campaign-output/SavedStrategiesPanel';
import { CampaignMetadataSections } from './campaign-output/CampaignMetadataSections';
import { DecisionWarningModal } from '../decision-status/DecisionWarningModal';
import { calculateDecisionStatus } from '../../utils/decision-status-calculator';
import type { DecisionStatusInfo } from '../../types/decision-status';
import { CampaignDecisionHeader } from '../decision-status/CampaignDecisionHeader';
import { SectionDecisionIndicator } from '../decision-status/SectionDecisionIndicator';
import { DecisionSummaryPanel } from '../decision-status/DecisionSummaryPanel';
import { calculateCampaignDecision, calculateSectionDecision } from '../../utils/campaign-decision-calculator-v2';
import { DecisionGateWarning } from '../campaign-strategy/DecisionGateWarning';
import { calculateDecisionGate } from '../../utils/campaign-decision-gate';
import { useChangeImpact } from '../../contexts';
import { CampaignImpactNotification } from '../impact/CampaignImpactNotification';

interface CampaignStrategyGeneratorDetailProps {
  tool: StrategyTool;
  onBack: () => void;
}

// Mock research data
const mockResearch = [
  { id: 'research-1', name: 'Q4 Market Analysis', type: 'Market Research' },
  { id: 'research-2', name: 'Competitor Study 2024', type: 'Competitive Analysis' },
  { id: 'research-3', name: 'Customer Insights Report', type: 'User Research' }
];

export function CampaignStrategyGeneratorDetail({ 
  tool, 
  onBack 
}: CampaignStrategyGeneratorDetailProps) {
  const [selectedTab, setSelectedTab] = useState('configure');
  const [selectedBrandAssets, setSelectedBrandAssets] = useState<string[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedTrends, setSelectedTrends] = useState<string[]>([]);
  const [selectedKnowledge, setSelectedKnowledge] = useState<string[]>([]);
  const [selectedResearch, setSelectedResearch] = useState<string[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [trends, setTrends] = useState(mockTrends); // Local trends list
  const [showChat, setShowChat] = useState(false);
  
  // Change Impact Tracking
  const { checkCampaignImpacts } = useChangeImpact();
  
  // Saved Strategies Management
  const [savedStrategies, setSavedStrategies] = useState<SavedStrategy[]>([
    // Mock saved strategy
    {
      id: 'strategy-mock-1',
      name: 'Summer Product Launch 2025',
      createdAt: new Date('2024-12-20'),
      updatedAt: new Date('2024-12-25'),
      status: 'generated',
      objective: 'product-launch',
      timeline: '8-weeks',
      budget: '50k-100k',
      config: {
        campaignConfig: {
          name: 'Summer Product Launch 2025',
          objective: 'product-launch',
          targetMarket: 'Young professionals aged 25-35 in urban areas',
          keyMessage: 'Innovation meets simplicity - your summer essential is here',
          timeline: '8-weeks',
          budget: '50k-100k',
          primaryKPI: 'sales',
          secondaryKPIs: ['awareness', 'engagement']
        },
        selectedBrandAssets: ['brand-1', 'brand-2'],
        selectedPersonas: ['persona-1'],
        selectedProducts: [],
        selectedTrends: ['trend-1'],
        selectedKnowledge: [],
        selectedResearch: ['research-1'],
        selectedChannels: ['paid-social', 'content', 'email'],
        channelBudgets: { 'paid-social': 50, 'content': 30, 'email': 20 }
      },
      generationMetadata: {
        generatedAt: '2024-12-25T10:30:00.000Z',
        usedBrandAssets: [
          { id: 'brand-1', title: 'Core Brand Values', version: '2.1' },
          { id: 'brand-2', title: 'Target Positioning Strategy', version: '1.0' }
        ],
        usedPersonas: [
          { id: 'persona-1', name: 'Sarah - Product Manager' }
        ],
        researchCoverageSnapshot: 85,
        decisionStatus: 'safe-to-decide',
        decisionRisks: [],
        totalAssets: 2,
        totalPersonas: 1
      }
    }
  ]);
  const [currentStrategyId, setCurrentStrategyId] = useState<string | null>(null);
  const [showStrategiesPanel, setShowStrategiesPanel] = useState(false);
  
  // Output View Toggle (Insights vs Next Steps)
  const [outputView, setOutputView] = useState<'insights' | 'next-steps'>('insights');

  const [campaignConfig, setCampaignConfig] = useState({
    name: '',
    objective: '',
    targetMarket: '',
    keyMessage: '',
    timeline: '',
    budget: '',
    primaryKPI: '',
    secondaryKPIs: [] as string[]
  });

  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showTrendPicker, setShowTrendPicker] = useState(false);
  const [showAddTrendModal, setShowAddTrendModal] = useState(false);
  const [showKnowledgePicker, setShowKnowledgePicker] = useState(false);
  const [showResearchPicker, setShowResearchPicker] = useState(false);

  // Channel strategy state
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [channelBudgets, setChannelBudgets] = useState<Record<string, number>>({});

  // Decision Quality Layer state
  const [showDecisionWarning, setShowDecisionWarning] = useState(false);
  const [warningStatusInfo, setWarningStatusInfo] = useState<DecisionStatusInfo | null>(null);
  const [pendingGeneration, setPendingGeneration] = useState(false);

  // Mock navigation functions
  const navigateToBrandAssets = () => {
    console.log('Navigate to Brand Assets');
  };

  const navigateToPersonas = () => {
    console.log('Navigate to Personas');
  };

  // Strategy Management Functions
  const saveCurrentStrategy = () => {
    const newStrategy: SavedStrategy = {
      id: currentStrategyId || `strategy-${Date.now()}`,
      name: campaignConfig.name || `Untitled Strategy ${savedStrategies.length + 1}`,
      createdAt: currentStrategyId 
        ? savedStrategies.find(s => s.id === currentStrategyId)?.createdAt || new Date()
        : new Date(),
      updatedAt: new Date(),
      status: hasGenerated ? 'generated' : 'draft',
      objective: campaignConfig.objective,
      timeline: campaignConfig.timeline,
      budget: campaignConfig.budget,
      config: {
        campaignConfig,
        selectedBrandAssets,
        selectedPersonas,
        selectedProducts,
        selectedTrends,
        selectedKnowledge,
        selectedResearch,
        selectedChannels,
        channelBudgets
      }
    };

    const isUpdate = savedStrategies.some(s => s.id === newStrategy.id);

    setSavedStrategies(prev => {
      const exists = prev.find(s => s.id === newStrategy.id);
      if (exists) {
        return prev.map(s => s.id === newStrategy.id ? newStrategy : s);
      }
      return [...prev, newStrategy];
    });

    setCurrentStrategyId(newStrategy.id);
    
    // Show feedback
    alert(isUpdate 
      ? `✓ Strategie "${newStrategy.name}" opgeslagen!`
      : `✓ Nieuwe strategie "${newStrategy.name}" aangemaakt!`
    );
  };

  const loadStrategy = (strategyId: string) => {
    const strategy = savedStrategies.find(s => s.id === strategyId);
    if (!strategy) return;

    setCurrentStrategyId(strategyId);
    setCampaignConfig(strategy.config.campaignConfig);
    setSelectedBrandAssets(strategy.config.selectedBrandAssets || []);
    setSelectedPersonas(strategy.config.selectedPersonas || []);
    setSelectedProducts(strategy.config.selectedProducts || []);
    setSelectedTrends(strategy.config.selectedTrends || []);
    setSelectedKnowledge(strategy.config.selectedKnowledge || []);
    setSelectedResearch(strategy.config.selectedResearch || []);
    setSelectedChannels(strategy.config.selectedChannels || []);
    setChannelBudgets(strategy.config.channelBudgets || {});
    setHasGenerated(strategy.status === 'generated' || strategy.status === 'approved');
    setShowChat(false);
  };

  const createNewStrategy = () => {
    // Save current if it has content
    if (campaignConfig.name || campaignConfig.objective) {
      saveCurrentStrategy();
    }

    // Reset to blank
    setCurrentStrategyId(null);
    setCampaignConfig({
      name: '',
      objective: '',
      targetMarket: '',
      keyMessage: '',
      timeline: '',
      budget: '',
      primaryKPI: '',
      secondaryKPIs: []
    });
    setSelectedBrandAssets([]);
    setSelectedPersonas([]);
    setSelectedProducts([]);
    setSelectedTrends([]);
    setSelectedKnowledge([]);
    setSelectedResearch([]);
    setSelectedChannels([]);
    setChannelBudgets({});
    setHasGenerated(false);
    setShowChat(false);
    setSelectedTab('configure');
  };

  const duplicateStrategy = (strategyId: string) => {
    const strategy = savedStrategies.find(s => s.id === strategyId);
    if (!strategy) return;

    const duplicated: SavedStrategy = {
      ...strategy,
      id: `strategy-${Date.now()}`,
      name: `${strategy.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft'
    };

    setSavedStrategies(prev => [...prev, duplicated]);
    loadStrategy(duplicated.id);
  };

  const renameStrategy = (strategyId: string, newName: string) => {
    setSavedStrategies(prev =>
      prev.map(s => s.id === strategyId ? { ...s, name: newName, updatedAt: new Date() } : s)
    );
  };

  const deleteStrategy = (strategyId: string) => {
    setSavedStrategies(prev => prev.filter(s => s.id !== strategyId));
    if (currentStrategyId === strategyId) {
      createNewStrategy();
    }
  };

  const exportStrategy = (strategyId: string) => {
    const strategy = savedStrategies.find(s => s.id === strategyId);
    if (!strategy) return;
    
    // In real app: trigger export
    console.log('Exporting strategy:', strategy);
    alert(`Exporting "${strategy.name}"... (Dit zou in de echte app een PDF/Word export triggeren)`);
  };

  // Recalculate campaign with current strategic inputs
  const recalculateCampaign = () => {
    if (!currentStrategyId) return;
    
    const currentStrategy = savedStrategies.find(s => s.id === currentStrategyId);
    if (!currentStrategy) return;

    // Create a NEW version without modifying the original
    const recalculatedStrategy: SavedStrategy = {
      ...currentStrategy,
      id: `strategy-${Date.now()}`, // New ID = new version
      name: `${currentStrategy.name} (Recalculated)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'generated',
      // Keep the same config (same inputs)
      // But generate NEW metadata with current state
      generationMetadata: {
        generatedAt: new Date().toISOString(),
        usedBrandAssets: selectedBrandAssets.map(id => {
          const asset = mockBrandAssets.find(a => a.id === id);
          return {
            id,
            title: asset?.title || 'Unknown Asset',
            version: asset?.version || '1.0'
          };
        }),
        usedPersonas: selectedPersonas.map(id => {
          const persona = mockPersonas.find(p => p.id === id);
          return {
            id,
            name: persona?.name || 'Unknown Persona'
          };
        }),
        researchCoverageSnapshot: calculateAverageResearchCoverage(),
        decisionStatus: campaignDecision.status,
        decisionRisks: campaignDecision.risks || [],
        totalAssets: selectedBrandAssets.length,
        totalPersonas: selectedPersonas.length
      }
    };

    // Add as new strategy
    setSavedStrategies(prev => [...prev, recalculatedStrategy]);
    
    // Switch to the new recalculated version
    setCurrentStrategyId(recalculatedStrategy.id);
    
    alert(`✓ Nieuwe versie "${recalculatedStrategy.name}" aangemaakt met huidige strategische input!`);
  };

  // CRITICAL: Decision Quality Pre-Flight Check
  const handleGenerate = () => {
    // Use campaign decision status (already calculated)
    const decision = campaignDecision;

    // If safe, proceed directly
    if (decision.status === 'safe-to-decide') {
      proceedWithGeneration();
      return;
    }

    // If do-not-decide, show strong warning with confirmation
    if (decision.status === 'do-not-decide') {
      const confirmed = window.confirm(
        `⚠️ DO NOT DECIDE - Strategisch Risico\n\n` +
        `${decision.reason}\n\n` +
        `GEVOLGEN:\n${decision.consequences}\n\n` +
        `Deze campagne is gebaseerd op onvoldoende gevalideerde merkdata. ` +
        `Strategische beslissingen zijn speculatief en hebben hoog risico op mislukken.\n\n` +
        `AANBEVELING: ${decision.primaryAction}\n\n` +
        `Wil je toch doorgaan? (Dit wordt sterk afgeraden)`
      );
      
      if (!confirmed) {
        return; // User chose to fix first
      }
    }

    // If decision-at-risk, show lighter warning with confirmation
    if (decision.status === 'decision-at-risk') {
      const confirmed = window.confirm(
        `⚠️ DECISION AT RISK - Verhoogd Risico\n\n` +
        `${decision.reason}\n\n` +
        `GEVOLGEN:\n${decision.consequences}\n\n` +
        `Deze campagne bevat elementen met beperkte validatie. ` +
        `Je kunt doorgaan, maar houd rekening met verhoogd risico.\n\n` +
        `AANBEVELING: ${decision.primaryAction}\n\n` +
        `Wil je doorgaan of eerst het risico verminderen?`
      );
      
      if (!confirmed) {
        return; // User chose to improve first
      }
    }

    // User confirmed despite risk - proceed
    proceedWithGeneration();
  };

  const proceedWithGeneration = () => {
    // Collect generation metadata
    const generationMetadata = {
      generatedAt: new Date().toISOString(),
      usedBrandAssets: selectedBrandAssets.map(id => {
        const asset = mockBrandAssets.find(a => a.id === id);
        return {
          id,
          title: asset?.title || 'Unknown Asset',
          version: asset?.version || '1.0'
        };
      }),
      usedPersonas: selectedPersonas.map(id => {
        const persona = mockPersonas.find(p => p.id === id);
        return {
          id,
          name: persona?.name || 'Unknown Persona'
        };
      }),
      researchCoverageSnapshot: calculateAverageResearchCoverage(),
      decisionStatus: campaignDecision.status,
      decisionRisks: campaignDecision.risks || [],
      totalAssets: selectedBrandAssets.length,
      totalPersonas: selectedPersonas.length
    };

    // Save strategy with metadata
    const newStrategy: SavedStrategy = {
      id: currentStrategyId || `strategy-${Date.now()}`,
      name: campaignConfig.name || `Untitled Strategy ${savedStrategies.length + 1}`,
      createdAt: currentStrategyId 
        ? savedStrategies.find(s => s.id === currentStrategyId)?.createdAt || new Date()
        : new Date(),
      updatedAt: new Date(),
      status: 'generated',
      objective: campaignConfig.objective,
      timeline: campaignConfig.timeline,
      budget: campaignConfig.budget,
      config: {
        campaignConfig,
        selectedBrandAssets,
        selectedPersonas,
        selectedProducts,
        selectedTrends,
        selectedKnowledge,
        selectedResearch,
        selectedChannels,
        channelBudgets
      },
      generationMetadata
    };

    const isUpdate = savedStrategies.some(s => s.id === newStrategy.id);

    setSavedStrategies(prev => {
      const exists = prev.find(s => s.id === newStrategy.id);
      if (exists) {
        return prev.map(s => s.id === newStrategy.id ? newStrategy : s);
      }
      return [...prev, newStrategy];
    });

    setCurrentStrategyId(newStrategy.id);
    
    setHasGenerated(true);
    setSelectedTab('output');
    setPendingGeneration(false);
  };

  // Helper function to calculate average research coverage
  const calculateAverageResearchCoverage = () => {
    const allAssets = selectedBrandAssets
      .map(id => mockBrandAssets.find(a => a.id === id))
      .filter(Boolean);
    
    if (allAssets.length === 0) return 0;
    
    const totalCoverage = allAssets.reduce((sum, asset) => {
      return sum + (asset?.researchCoverage || 0);
    }, 0);
    
    return Math.round(totalCoverage / allAssets.length);
  };

  const handleProceedAnywayFromWarning = () => {
    setShowDecisionWarning(false);
    proceedWithGeneration();
  };

  // Calculate overall campaign decision status
  const campaignDecision = React.useMemo(() => {
    return calculateCampaignDecision(selectedBrandAssets, selectedPersonas);
  }, [selectedBrandAssets, selectedPersonas]);

  // NEW: Decision Gate calculation (for blocking generation)
  const decisionGate = React.useMemo(() => {
    return calculateDecisionGate(selectedBrandAssets, selectedPersonas);
  }, [selectedBrandAssets, selectedPersonas]);

  // Check for campaign impacts (nieuwere strategische input)
  const campaignImpacts = React.useMemo(() => {
    const allSelectedAssets = [...selectedBrandAssets, ...selectedPersonas];
    return checkCampaignImpacts('current-campaign', allSelectedAssets);
  }, [selectedBrandAssets, selectedPersonas, checkCampaignImpacts]);

  // Calculate section-level decisions (VERFIJND v2)
  const templateDecision = React.useMemo(() => {
    return calculateSectionDecision('template', selectedBrandAssets, selectedPersonas, campaignConfig, selectedChannels);
  }, []);

  const campaignDetailsDecision = React.useMemo(() => {
    return calculateSectionDecision('campaign-details', selectedBrandAssets, selectedPersonas, campaignConfig, selectedChannels);
  }, [campaignConfig.name, campaignConfig.objective, campaignConfig.keyMessage]);

  const brandAssetsDecision = React.useMemo(() => {
    return calculateSectionDecision('brand-assets', selectedBrandAssets, selectedPersonas, campaignConfig, selectedChannels);
  }, [selectedBrandAssets, selectedPersonas]);

  const advancedDecision = React.useMemo(() => {
    return calculateSectionDecision('advanced', selectedBrandAssets, selectedPersonas, campaignConfig, selectedChannels);
  }, [campaignConfig.timeline, campaignConfig.budget]);

  const channelsDecision = React.useMemo(() => {
    return calculateSectionDecision('channels', selectedBrandAssets, selectedPersonas, campaignConfig, selectedChannels);
  }, [selectedChannels]);

  // Calculate readiness score
  const readinessScore = useMemo(() => {
    let score = 0;
    // Basic details (60%)
    if (campaignConfig.name) score += 10;
    if (campaignConfig.objective) score += 10;
    if (campaignConfig.targetMarket) score += 10;
    if (campaignConfig.keyMessage) score += 10;
    // Advanced settings (20%)
    if (campaignConfig.timeline) score += 5;
    if (campaignConfig.budget) score += 5;
    if (campaignConfig.primaryKPI) score += 5;
    if (selectedChannels.length > 0) score += 5;
    // Assets (20%)
    if (selectedBrandAssets.length > 0) score += 10;
    if (selectedPersonas.length > 0) score += 10;
    return score;
  }, [campaignConfig, selectedBrandAssets, selectedPersonas, selectedChannels]);

  // Mock required assets (assets that don't exist yet)
  const missingRequiredAssets = [
    { type: 'Golden Circle', route: '#/research/brand-assets' },
    { type: 'Mission', route: '#/research/brand-assets' }
  ];

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-6 py-6 pb-20">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
              ← Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl">{tool.name}</h1>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            </div>
          </div>

          {/* Saved Strategies Dropdown + Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <SavedStrategiesDropdown
              strategies={savedStrategies}
              currentStrategyId={currentStrategyId}
              onSelectStrategy={loadStrategy}
              onNewStrategy={createNewStrategy}
              onManageStrategies={() => setShowStrategiesPanel(!showStrategiesPanel)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStrategiesPanel(!showStrategiesPanel)}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {showStrategiesPanel ? 'Hide' : 'Manage'} ({savedStrategies.length})
            </Button>
          </div>
        </div>

        {/* Connection Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={selectedBrandAssets.length > 0 ? "default" : "outline"} className="gap-1">
            <Shield className="h-3 w-3" />
            {selectedBrandAssets.length} Brand Assets
          </Badge>
          <Badge variant={selectedPersonas.length > 0 ? "default" : "outline"} className="gap-1">
            <Users className="h-3 w-3" />
            {selectedPersonas.length} Personas
          </Badge>
          <Badge variant={selectedTrends.length > 0 ? "default" : "outline"} className="gap-1">
            <TrendingUp className="h-3 w-3" />
            {selectedTrends.length} Trends
          </Badge>
          <Badge variant={selectedResearch.length > 0 ? "default" : "outline"} className="gap-1">
            <FileText className="h-3 w-3" />
            {selectedResearch.length} Research
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className={`mt-6 ${showStrategiesPanel ? 'lg:grid lg:grid-cols-[300px_1fr] lg:gap-6' : ''}`}>
        {/* Saved Strategies Panel (conditional) */}
        {showStrategiesPanel && (
          <div className="hidden lg:block mb-6 lg:mb-0">
            <div className="sticky top-6">
              <SavedStrategiesPanel
                strategies={savedStrategies}
                currentStrategyId={currentStrategyId}
                onSelectStrategy={loadStrategy}
                onNewStrategy={createNewStrategy}
                onDuplicateStrategy={duplicateStrategy}
                onRenameStrategy={renameStrategy}
                onDeleteStrategy={deleteStrategy}
                onExportStrategy={exportStrategy}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="min-w-0">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="configure" className="gap-2">
                <Target className="h-4 w-4" />
                Configure
              </TabsTrigger>
              <TabsTrigger value="output" className="gap-2">
                <FileText className="h-4 w-4" />
                Output
              </TabsTrigger>
            </TabsList>

            {/* Configure Tab */}
            <TabsContent value="configure" className="mt-6">
              <div className="space-y-6">
                {/* DECISION GATE - Blocks generation if data unsafe (NIEUWE COMPONENT) */}
                <DecisionGateWarning
                  status={decisionGate.status}
                  failedItems={decisionGate.failedItems}
                  onFixItem={(itemId, itemType) => {
                    // Navigate to brand or personas section
                    console.log('Fix item:', itemId, itemType);
                    // In real app, this would navigate to the specific item's detail page
                    alert(`Navigeer naar ${itemType === 'asset' ? 'Brand Assets' : 'Personas'} sectie om ${itemId} te repareren`);
                  }}
                />

                {/* CAMPAIGN IMPACT NOTIFICATION - Nieuwere strategische input beschikbaar */}
                {campaignImpacts.length > 0 && (
                  <CampaignImpactNotification
                    impactAnalyses={campaignImpacts}
                    onRecalculate={() => {
                      // Trigger regeneration met nieuwere data
                      setHasGenerated(false);
                      alert('Campaign wordt herberekend met de nieuwste strategische input...');
                    }}
                    onDismiss={() => {
                      // User heeft gezien en kiest ervoor om later te bekijken
                      console.log('Campaign impact notification dismissed');
                    }}
                  />
                )}

                {/* Campaign Templates */}
                <Card className="border-l-4 border-l-indigo-500">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        Start with a Template
                        <SectionDecisionIndicator
                          status={templateDecision.status}
                          sectionName="Template"
                          causes={templateDecision.causes}
                          requiredActions={templateDecision.requiredActions}
                        />
                      </CardTitle>
                      <CardDescription>Choose a pre-configured campaign template to get started quickly</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 self-start sm:self-auto">
                      Optional
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      className="p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all text-left"
                      onClick={() => {
                        setCampaignConfig({
                          ...campaignConfig,
                          name: 'Q1 2025 Product Launch Campaign',
                          objective: 'product-launch',
                          targetMarket: 'Early adopters aged 25-40 who value innovation and are active on social media. Tech-savvy professionals looking for solutions that simplify their workflow.',
                          keyMessage: 'Introducing the future of [your industry] - built for the way you work today.'
                        });
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium mb-1">Product Launch</p>
                          <p className="text-xs text-muted-foreground">Perfect for introducing new products or features to the market</p>
                        </div>
                      </div>
                    </button>

                    <button
                      className="p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all text-left"
                      onClick={() => {
                        setCampaignConfig({
                          ...campaignConfig,
                          name: 'Brand Awareness Campaign 2025',
                          objective: 'brand-awareness',
                          targetMarket: 'Broad audience in key demographics (25-55) who are currently unaware of our brand. Focus on urban and suburban areas with high digital engagement.',
                          keyMessage: 'Discover why thousands are choosing [your brand] for [key benefit].'
                        });
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shrink-0">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium mb-1">Brand Awareness</p>
                          <p className="text-xs text-muted-foreground">Increase visibility and recognition in your target market</p>
                        </div>
                      </div>
                    </button>

                    <button
                      className="p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all text-left"
                      onClick={() => {
                        setCampaignConfig({
                          ...campaignConfig,
                          name: 'Lead Generation Campaign',
                          objective: 'lead-generation',
                          targetMarket: 'B2B decision-makers in mid-to-large companies (100+ employees). Focus on roles: Marketing Directors, CMOs, and Business Owners looking for [solution type].',
                          keyMessage: 'Transform your [business area] with proven strategies that deliver measurable results.'
                        });
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
                          <Target className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium mb-1">Lead Generation</p>
                          <p className="text-xs text-muted-foreground">Drive qualified leads and grow your sales pipeline</p>
                        </div>
                      </div>
                    </button>

                    <button
                      className="p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all text-left"
                      onClick={() => {
                        setCampaignConfig({
                          ...campaignConfig,
                          name: 'Customer Retention Campaign',
                          objective: 'customer-retention',
                          targetMarket: 'Existing customers who have been with us for 6+ months. Focus on active users who show engagement but may be at risk of churn.',
                          keyMessage: 'You\'re valued. Here\'s how we\'re making your experience even better.'
                        });
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium mb-1">Customer Retention</p>
                          <p className="text-xs text-muted-foreground">Strengthen loyalty and reduce churn among existing customers</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-white" />
                        </div>
                        Campaign Details
                        <SectionDecisionIndicator
                          status={campaignDetailsDecision.status}
                          sectionName="Campaign Details"
                          causes={campaignDetailsDecision.causes}
                          requiredActions={campaignDetailsDecision.requiredActions}
                        />
                      </CardTitle>
                      <CardDescription>Define your campaign objectives and parameters</CardDescription>
                    </div>
                    {(() => {
                      const total = 4;
                      const completed = [
                        campaignConfig.name,
                        campaignConfig.objective,
                        campaignConfig.targetMarket,
                        campaignConfig.keyMessage
                      ].filter(Boolean).length;
                      const percentage = Math.round((completed / total) * 100);
                      
                      return (
                        <div className="text-right self-start sm:self-auto">
                          <Badge 
                            variant={completed === total ? "default" : "outline"}
                            className={completed === total ? "bg-blue-600" : ""}
                          >
                            {completed === total ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Formulier Compleet</>
                            ) : (
                              <>{completed}/{total} Velden</>
                            )}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Formulier: {percentage}%
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Campaign Name */}
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Campaign Name
                      {campaignConfig.name && (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className={`w-full px-3 py-2.5 border-2 rounded-lg bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                          campaignConfig.name 
                            ? 'border-green-300 dark:border-green-800' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        value={campaignConfig.name}
                        onChange={(e) => setCampaignConfig({...campaignConfig, name: e.target.value})}
                        placeholder="e.g., Q1 2025 Product Launch"
                        maxLength={100}
                      />
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          {campaignConfig.name.length > 0 && campaignConfig.name.length < 10 && (
                            <span className="text-orange-600">💡 Consider adding more context (year, season, product)</span>
                          )}
                          {campaignConfig.name.length >= 10 && (
                            <span className="text-green-600">✓ Great! Clear and descriptive</span>
                          )}
                        </p>
                        <span className={`text-xs ${campaignConfig.name.length > 80 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                          {campaignConfig.name.length}/100
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Objective */}
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      Primary Objective
                      {campaignConfig.objective && (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                      )}
                    </label>
                    <select
                      className={`w-full px-3 py-2.5 border-2 rounded-lg bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        campaignConfig.objective 
                          ? 'border-green-300 dark:border-green-800' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      value={campaignConfig.objective}
                      onChange={(e) => setCampaignConfig({...campaignConfig, objective: e.target.value})}
                    >
                      <option value="">Select objective...</option>
                      <option value="brand-awareness">Build Brand Awareness</option>
                      <option value="lead-generation">Generate Qualified Leads</option>
                      <option value="product-launch">Launch New Product/Service</option>
                      <option value="customer-retention">Improve Customer Retention</option>
                    </select>
                    {campaignConfig.objective && (
                      <p className="text-xs text-green-600 mt-1">✓ Objective selected - see recommendations in Insights tab</p>
                    )}
                  </div>

                  {/* Target Market */}
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      Target Market
                      {campaignConfig.targetMarket && (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                      )}
                    </label>
                    <textarea
                      className={`w-full px-3 py-2.5 border-2 rounded-lg bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none ${
                        campaignConfig.targetMarket 
                          ? 'border-green-300 dark:border-green-800' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      value={campaignConfig.targetMarket}
                      onChange={(e) => setCampaignConfig({...campaignConfig, targetMarket: e.target.value})}
                      placeholder="Describe your target audience..."
                      rows={3}
                      maxLength={500}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        {campaignConfig.targetMarket.length === 0 && (
                          <span>💡 Include demographics, psychographics, and pain points</span>
                        )}
                        {campaignConfig.targetMarket.length > 0 && campaignConfig.targetMarket.length < 50 && (
                          <span className="text-orange-600">⚠️ Add more detail for better targeting</span>
                        )}
                        {campaignConfig.targetMarket.length >= 50 && (
                          <span className="text-green-600">✓ Good detail level</span>
                        )}
                      </p>
                      <span className={`text-xs ${campaignConfig.targetMarket.length > 450 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                        {campaignConfig.targetMarket.length}/500
                      </span>
                    </div>
                  </div>

                  {/* Core Message */}
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      Core Message
                      {campaignConfig.keyMessage && (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                      )}
                    </label>
                    <textarea
                      className={`w-full px-3 py-2.5 border-2 rounded-lg bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none ${
                        campaignConfig.keyMessage 
                          ? 'border-green-300 dark:border-green-800' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      value={campaignConfig.keyMessage}
                      onChange={(e) => setCampaignConfig({...campaignConfig, keyMessage: e.target.value})}
                      placeholder="What's your key campaign message?"
                      rows={3}
                      maxLength={300}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        {campaignConfig.keyMessage.length === 0 && (
                          <span>💡 Use emotional language aligned with your brand values</span>
                        )}
                        {campaignConfig.keyMessage.length > 0 && campaignConfig.keyMessage.length < 30 && (
                          <span className="text-orange-600">⚠️ Too brief - expand your core message</span>
                        )}
                        {campaignConfig.keyMessage.length >= 30 && (
                          <span className="text-green-600">✓ Strong messaging</span>
                        )}
                      </p>
                      <span className={`text-xs ${campaignConfig.keyMessage.length > 270 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                        {campaignConfig.keyMessage.length}/300
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                          <Shield className="h-4 w-4 text-white" />
                        </div>
                        Connect Brand Assets
                      </CardTitle>
                      <CardDescription>Link existing brand assets to inform your strategy</CardDescription>
                    </div>
                    {(() => {
                      const totalConnected = selectedBrandAssets.length + selectedPersonas.length + selectedResearch.length;
                      const hasCritical = selectedBrandAssets.length > 0 && selectedPersonas.length > 0;
                      
                      return (
                        <div className="text-right self-start sm:self-auto">
                          <Badge 
                            variant={hasCritical ? "default" : "outline"}
                            className={hasCritical ? "bg-green-600" : ""}
                          >
                            {hasCritical ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Core Assets</>
                            ) : (
                              <>{totalConnected} Connected</>
                            )}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {totalConnected > 0 ? `${totalConnected} total` : 'None yet'}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Brand Assets */}
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between"
                      onClick={() => setShowAssetPicker(true)}
                    >
                      <span>Brand Assets ({selectedBrandAssets.length})</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    {selectedBrandAssets.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {mockBrandAssets.filter(a => selectedBrandAssets.includes(a.id)).map(asset => (
                          <div key={asset.id} className="group flex items-center gap-2 p-2.5 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/30 hover:border-primary/50 transition-all">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                              <Shield className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{asset.title}</p>
                              <p className="text-xs text-muted-foreground">{asset.category}</p>
                            </div>
                            <Badge variant="outline" className={`text-xs shrink-0 ${asset.status === 'validated' ? 'bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-300' : ''}`}>
                              {asset.status === 'validated' ? '✓ Validated' : '○ Draft'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setSelectedBrandAssets(prev => prev.filter(id => id !== asset.id))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedBrandAssets.length === 0 && (
                      <div className="mt-3 p-3 rounded-lg border-2 border-dashed bg-muted/30">
                        <p className="text-xs text-muted-foreground">
                          <Lightbulb className="h-3.5 w-3.5 inline mr-1 text-orange-500" />
                          Add brand assets to strengthen your strategy with brand identity foundations
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Personas */}
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between"
                      onClick={() => setShowPersonaPicker(true)}
                    >
                      <span>Personas ({selectedPersonas.length})</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    {selectedPersonas.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {mockPersonas.filter(p => selectedPersonas.includes(p.id)).map(persona => (
                          <div key={persona.id} className="group flex items-center gap-2 p-2.5 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 border border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-sm">
                              {persona.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{persona.name}</p>
                              <p className="text-xs text-muted-foreground">{persona.demographics.occupation}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setSelectedPersonas(prev => prev.filter(id => id !== persona.id))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedPersonas.length === 0 && (
                      <div className="mt-3 p-3 rounded-lg border-2 border-dashed bg-muted/30">
                        <p className="text-xs text-muted-foreground">
                          <Lightbulb className="h-3.5 w-3.5 inline mr-1 text-orange-500" />
                          Add personas to target your campaign to the right audience
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Research */}
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between"
                      onClick={() => setShowResearchPicker(true)}
                    >
                      <span>Research ({selectedResearch.length})</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    {selectedResearch.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {mockResearch.filter(r => selectedResearch.includes(r.id)).map(research => (
                          <div key={research.id} className="group flex items-center gap-2 p-2.5 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                            <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{research.name}</p>
                              <p className="text-xs text-muted-foreground">{research.type}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setSelectedResearch(prev => prev.filter(id => id !== research.id))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedResearch.length === 0 && (
                      <div className="mt-3 p-3 rounded-lg border-2 border-dashed bg-muted/30">
                        <p className="text-xs text-muted-foreground">
                          <Lightbulb className="h-3.5 w-3.5 inline mr-1 text-orange-500" />
                          Add research insights to inform your campaign with data-driven decisions
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Trends */}
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between"
                      onClick={() => setShowTrendPicker(true)}
                    >
                      <span>Trends ({selectedTrends.length})</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    {selectedTrends.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {trends.filter(t => selectedTrends.includes(t.id)).map(trend => (
                          <div key={trend.id} className="group flex items-center gap-2 p-2.5 rounded-lg bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-900/10 dark:to-pink-900/10 border border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700 transition-all">
                            <div className="h-8 w-8 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                              <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{trend.title}</p>
                              <p className="text-xs text-muted-foreground capitalize">{trend.category} • {trend.impact} impact</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setSelectedTrends(prev => prev.filter(id => id !== trend.id))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedTrends.length === 0 && (
                      <div className="mt-3 p-3 rounded-lg border-2 border-dashed bg-muted/30">
                        <p className="text-xs text-muted-foreground">
                          <Lightbulb className="h-3.5 w-3.5 inline mr-1 text-orange-500" />
                          Add market trends to align your campaign with emerging opportunities
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Campaign Settings */}
              <Card className="border-l-4 border-l-emerald-500">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                          <BarChart3 className="h-4 w-4 text-white" />
                        </div>
                        Advanced Campaign Settings
                        <SectionDecisionIndicator
                          status={advancedDecision.status}
                          sectionName="Advanced Settings"
                          causes={advancedDecision.causes}
                          requiredActions={advancedDecision.requiredActions}
                        />
                      </CardTitle>
                      <CardDescription>Timeline, budget, and success metrics</CardDescription>
                    </div>
                    {(() => {
                      const total = 4;
                      const completed = [
                        campaignConfig.timeline,
                        campaignConfig.budget,
                        campaignConfig.primaryKPI,
                        campaignConfig.secondaryKPIs.length > 0
                      ].filter(Boolean).length;
                      const percentage = Math.round((completed / total) * 100);
                      
                      return (
                        <div className="text-right self-start sm:self-auto">
                          <Badge 
                            variant={completed === total ? "default" : "outline"}
                            className={completed === total ? "bg-blue-600" : ""}
                          >
                            {completed === total ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Formulier Compleet</>
                            ) : (
                              <>{completed}/{total} Velden</>
                            )}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Formulier: {percentage}%
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Campaign Duration */}
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                      Campaign Duration
                      {campaignConfig.timeline && (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                      )}
                    </label>
                    <select
                      className={`w-full px-3 py-2.5 border-2 rounded-lg bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        campaignConfig.timeline 
                          ? 'border-green-300 dark:border-green-800' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      value={campaignConfig.timeline}
                      onChange={(e) => setCampaignConfig({...campaignConfig, timeline: e.target.value})}
                    >
                      <option value="">Select duration...</option>
                      <option value="2-weeks">2 Weeks (Sprint Campaign)</option>
                      <option value="4-weeks">4 Weeks (Short Campaign)</option>
                      <option value="8-weeks">8 Weeks (Standard Campaign)</option>
                      <option value="12-weeks">12 Weeks (Extended Campaign)</option>
                      <option value="6-months">6 Months (Long-term Campaign)</option>
                      <option value="ongoing">Ongoing (Always-On)</option>
                    </select>
                    {campaignConfig.timeline && (
                      <p className="text-xs mt-1">
                        {campaignConfig.timeline === '2-weeks' && (
                          <span className="text-orange-600">⚠️ Very short - limited time for optimization and momentum</span>
                        )}
                        {campaignConfig.timeline === '4-weeks' && (
                          <span className="text-orange-600">⚠️ Short timeline - ensure all assets are ready before launch</span>
                        )}
                        {(campaignConfig.timeline === '8-weeks' || campaignConfig.timeline === '12-weeks') && (
                          <span className="text-green-600">✓ Good duration for testing and optimization</span>
                        )}
                        {(campaignConfig.timeline === '6-months' || campaignConfig.timeline === 'ongoing') && (
                          <span className="text-green-600">✓ Excellent for sustained growth and brand building</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Budget Range */}
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      Total Budget
                      {campaignConfig.budget && (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                      )}
                    </label>
                    <select
                      className={`w-full px-3 py-2.5 border-2 rounded-lg bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        campaignConfig.budget 
                          ? 'border-green-300 dark:border-green-800' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      value={campaignConfig.budget}
                      onChange={(e) => setCampaignConfig({...campaignConfig, budget: e.target.value})}
                    >
                      <option value="">Select budget range...</option>
                      <option value="0-5k">$0 - $5,000 (Micro Budget)</option>
                      <option value="5k-15k">$5,000 - $15,000 (Small Budget)</option>
                      <option value="15k-30k">$15,000 - $30,000 (Medium Budget)</option>
                      <option value="30k-50k">$30,000 - $50,000 (Standard Budget)</option>
                      <option value="50k-100k">$50,000 - $100,000 (Large Budget)</option>
                      <option value="100k+">$100,000+ (Enterprise Budget)</option>
                    </select>
                    {campaignConfig.budget && campaignConfig.objective && (
                      <p className="text-xs mt-1">
                        {(() => {
                          const budgetLevel = campaignConfig.budget;
                          const objective = campaignConfig.objective;
                          
                          // Budget recommendations per objective
                          if (objective === 'brand-awareness') {
                            if (budgetLevel === '0-5k' || budgetLevel === '5k-15k') {
                              return <span className="text-orange-600">⚠️ Brand awareness campaigns typically need $30K+ for meaningful reach</span>;
                            }
                            return <span className="text-green-600">✓ Good budget for brand awareness objectives</span>;
                          }
                          
                          if (objective === 'lead-generation') {
                            if (budgetLevel === '0-5k') {
                              return <span className="text-red-600">⚠️ Too low for B2B lead generation - expect very limited results</span>;
                            }
                            if (budgetLevel === '5k-15k') {
                              return <span className="text-orange-600">⚠️ Below recommended budget ($30K+) - consider focusing on fewer channels</span>;
                            }
                            return <span className="text-green-600">✓ Solid budget for qualified lead generation</span>;
                          }
                          
                          if (objective === 'product-launch') {
                            if (budgetLevel === '0-5k' || budgetLevel === '5k-15k') {
                              return <span className="text-orange-600">⚠️ Product launches typically require $50K+ for market impact</span>;
                            }
                            return <span className="text-green-600">✓ Strong budget for product launch momentum</span>;
                          }
                          
                          if (objective === 'customer-retention') {
                            return <span className="text-green-600">✓ Retention campaigns can be effective across budget levels</span>;
                          }
                          
                          return <span className="text-green-600">✓ Budget selected</span>;
                        })()}
                      </p>
                    )}
                  </div>

                  {/* Primary KPI */}
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-emerald-600" />
                      Primary KPI
                      {campaignConfig.primaryKPI && (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                      )}
                    </label>
                    <select
                      className={`w-full px-3 py-2.5 border-2 rounded-lg bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        campaignConfig.primaryKPI 
                          ? 'border-green-300 dark:border-green-800' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      value={campaignConfig.primaryKPI}
                      onChange={(e) => setCampaignConfig({...campaignConfig, primaryKPI: e.target.value})}
                    >
                      <option value="">Select primary KPI...</option>
                      <option value="leads">Lead Generation (MQLs)</option>
                      <option value="sales">Sales Revenue</option>
                      <option value="awareness">Brand Awareness (Reach/Impressions)</option>
                      <option value="engagement">Engagement Rate</option>
                      <option value="traffic">Website Traffic</option>
                      <option value="conversions">Conversion Rate</option>
                      <option value="retention">Customer Retention Rate</option>
                    </select>
                    {campaignConfig.primaryKPI && campaignConfig.objective && (
                      <p className="text-xs mt-1">
                        {(() => {
                          const kpi = campaignConfig.primaryKPI;
                          const objective = campaignConfig.objective;
                          
                          // KPI alignment warnings
                          if (objective === 'brand-awareness' && kpi !== 'awareness') {
                            return <span className="text-orange-600">💡 Consider "Brand Awareness" as primary KPI for this objective</span>;
                          }
                          if (objective === 'lead-generation' && kpi !== 'leads') {
                            return <span className="text-orange-600">💡 Consider "Lead Generation" as primary KPI for this objective</span>;
                          }
                          if (objective === 'customer-retention' && kpi !== 'retention') {
                            return <span className="text-orange-600">💡 Consider "Customer Retention Rate" as primary KPI for this objective</span>;
                          }
                          return <span className="text-green-600">✓ Well-aligned with your campaign objective</span>;
                        })()}
                      </p>
                    )}
                  </div>

                  {/* Secondary KPIs */}
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-emerald-600" />
                      Secondary KPIs (Optional)
                      {campaignConfig.secondaryKPIs.length > 0 && (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                      )}
                    </label>
                    <div className="space-y-2">
                      {['engagement', 'traffic', 'social-followers', 'email-subscribers', 'content-downloads'].map((kpi) => {
                        const labels: Record<string, string> = {
                          'engagement': 'Engagement Rate (Likes, Comments, Shares)',
                          'traffic': 'Website Traffic',
                          'social-followers': 'Social Media Followers',
                          'email-subscribers': 'Email List Growth',
                          'content-downloads': 'Content Downloads'
                        };
                        
                        return (
                          <label key={kpi} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                            <Checkbox
                              checked={campaignConfig.secondaryKPIs.includes(kpi)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCampaignConfig({
                                    ...campaignConfig,
                                    secondaryKPIs: [...campaignConfig.secondaryKPIs, kpi]
                                  });
                                } else {
                                  setCampaignConfig({
                                    ...campaignConfig,
                                    secondaryKPIs: campaignConfig.secondaryKPIs.filter(k => k !== kpi)
                                  });
                                }
                              }}
                            />
                            <span className="text-sm">{labels[kpi]}</span>
                          </label>
                        );
                      })}
                    </div>
                    {campaignConfig.secondaryKPIs.length > 0 && (
                      <p className="text-xs text-green-600 mt-2">
                        ✓ {campaignConfig.secondaryKPIs.length} secondary metric{campaignConfig.secondaryKPIs.length > 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Channel Strategy */}
              <Card className="border-l-4 border-l-cyan-500">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                        Channel Strategy
                        <SectionDecisionIndicator
                          status={channelsDecision.status}
                          sectionName="Channel Strategy"
                          causes={channelsDecision.causes}
                          requiredActions={channelsDecision.requiredActions}
                        />
                      </CardTitle>
                      <CardDescription>Select channels and allocate budget</CardDescription>
                    </div>
                    <div className="text-right self-start sm:self-auto">
                      <Badge 
                        variant={selectedChannels.length > 0 ? "default" : "outline"}
                        className={selectedChannels.length > 0 ? "bg-green-600" : ""}
                      >
                        {selectedChannels.length > 0 ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> {selectedChannels.length} Channels</>
                        ) : (
                          <>None Selected</>
                        )}
                      </Badge>
                      {selectedChannels.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {Object.values(channelBudgets).reduce((a, b) => a + b, 0)}% allocated
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {[
                      { id: 'social-media', name: 'Social Media', description: 'LinkedIn, Instagram, Facebook, Twitter', icon: Users, recommended: ['brand-awareness', 'customer-retention'] },
                      { id: 'email', name: 'Email Marketing', description: 'Newsletters, drip campaigns, automation', icon: FileText, recommended: ['lead-generation', 'customer-retention'] },
                      { id: 'paid-search', name: 'Paid Search', description: 'Google Ads, Bing Ads', icon: Target, recommended: ['lead-generation', 'product-launch'] },
                      { id: 'content', name: 'Content Marketing', description: 'Blog posts, whitepapers, case studies', icon: BookOpen, recommended: ['lead-generation', 'brand-awareness'] },
                      { id: 'paid-social', name: 'Paid Social', description: 'Facebook Ads, LinkedIn Ads, Instagram Ads', icon: TrendingUp, recommended: ['brand-awareness', 'product-launch'] },
                      { id: 'events', name: 'Events & Webinars', description: 'Virtual or in-person events', icon: Calendar, recommended: ['lead-generation', 'product-launch'] }
                    ].map((channel) => {
                      const Icon = channel.icon;
                      const isSelected = selectedChannels.includes(channel.id);
                      const isRecommended = campaignConfig.objective && channel.recommended.includes(campaignConfig.objective);
                      
                      return (
                        <div key={channel.id} className={`p-3 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'border-cyan-300 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/10' 
                            : 'border-border hover:border-cyan-200 dark:hover:border-cyan-900'
                        }`}>
                          <label className="flex items-start gap-3 cursor-pointer">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedChannels([...selectedChannels, channel.id]);
                                  // Initialize budget at 0%
                                  setChannelBudgets({...channelBudgets, [channel.id]: 0});
                                } else {
                                  setSelectedChannels(selectedChannels.filter(c => c !== channel.id));
                                  const newBudgets = {...channelBudgets};
                                  delete newBudgets[channel.id];
                                  setChannelBudgets(newBudgets);
                                }
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className="h-4 w-4 text-cyan-600" />
                                <span className="font-medium text-sm">{channel.name}</span>
                                {isRecommended && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-300">
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">{channel.description}</p>
                              
                              {isSelected && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">Budget Allocation</span>
                                    <span className="font-medium">{channelBudgets[channel.id] || 0}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={channelBudgets[channel.id] || 0}
                                    onChange={(e) => {
                                      setChannelBudgets({
                                        ...channelBudgets,
                                        [channel.id]: parseInt(e.target.value)
                                      });
                                    }}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-cyan-600"
                                  />
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>

                  {selectedChannels.length === 0 && (
                    <div className="mt-3 p-3 rounded-lg border-2 border-dashed bg-muted/30">
                      <p className="text-xs text-muted-foreground">
                        <Lightbulb className="h-3.5 w-3.5 inline mr-1 text-orange-500" />
                        Select at least one channel to reach your target audience
                      </p>
                    </div>
                  )}

                  {selectedChannels.length > 0 && (
                    <>
                      {/* Budget allocation summary */}
                      <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-200 dark:border-cyan-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Total Allocation</span>
                          <span className={`text-sm font-semibold ${
                            Object.values(channelBudgets).reduce((a, b) => a + b, 0) === 100 
                              ? 'text-green-600' 
                              : Object.values(channelBudgets).reduce((a, b) => a + b, 0) > 100
                              ? 'text-red-600'
                              : 'text-orange-600'
                          }`}>
                            {Object.values(channelBudgets).reduce((a, b) => a + b, 0)}%
                          </span>
                        </div>
                        <Progress 
                          value={Object.values(channelBudgets).reduce((a, b) => a + b, 0)} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          {Object.values(channelBudgets).reduce((a, b) => a + b, 0) === 100 ? (
                            <span className="text-green-600">✓ Perfect! Budget fully allocated</span>
                          ) : Object.values(channelBudgets).reduce((a, b) => a + b, 0) > 100 ? (
                            <span className="text-red-600">⚠️ Over-allocated - reduce some channels</span>
                          ) : Object.values(channelBudgets).reduce((a, b) => a + b, 0) === 0 ? (
                            <span className="text-orange-600">💡 Allocate budget percentages to your selected channels</span>
                          ) : (
                            <span className="text-orange-600">💡 Allocate remaining {100 - Object.values(channelBudgets).reduce((a, b) => a + b, 0)}%</span>
                          )}
                        </p>
                      </div>

                      {/* Smart recommendations based on personas */}
                      {selectedPersonas.length > 0 && campaignConfig.objective && (
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                                Channel Recommendations
                              </p>
                              <p className="text-xs text-blue-700 dark:text-blue-300">
                                {campaignConfig.objective === 'brand-awareness' && (
                                  'For brand awareness, allocate 40-50% to Paid Social for maximum reach'
                                )}
                                {campaignConfig.objective === 'lead-generation' && (
                                  'For B2B lead gen, prioritize Content Marketing (30%) and Email (25%)'
                                )}
                                {campaignConfig.objective === 'product-launch' && (
                                  'For product launches, balance Paid Search (35%) and Events (25%)'
                                )}
                                {campaignConfig.objective === 'customer-retention' && (
                                  'For retention, focus on Email (50%) and Social Media (30%)'
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Generate Strategy Button */}
              <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        {decisionGate.status === 'blocked' ? 'Generatie Geblokkeerd' : 'Ready to Generate'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {decisionGate.status === 'blocked' 
                          ? 'Repareer eerst de geblokkeerde items hierboven om te kunnen genereren.'
                          : `Formulier is ${readinessScore}% ingevuld. ${
                              readinessScore < 60 
                                ? ' Vul meer velden in om generatie te ontgrendelen.' 
                                : ' Klik om je campagne strategie te genereren.'
                            }`
                        }
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        className="gap-2 sm:flex-1"
                        onClick={handleGenerate}
                        disabled={readinessScore < 60 || decisionGate.status === 'blocked'}
                        size="lg"
                      >
                        <Sparkles className="h-4 w-4" />
                        {decisionGate.status === 'blocked' ? 'Generatie Geblokkeerd' : 'Generate Strategy'}
                      </Button>
                      {(campaignConfig.name || campaignConfig.objective) && (
                        <Button 
                          variant="outline" 
                          className="gap-2 sm:flex-1"
                          onClick={saveCurrentStrategy}
                          size="lg"
                        >
                          <Download className="h-4 w-4" />
                          {currentStrategyId ? 'Save Changes' : 'Save Strategy'}
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Blocked notification */}
                  {decisionGate.status === 'blocked' && (
                    <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-200">
                      <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                        🚫 Generate button is uitgeschakeld
                      </p>
                      <p className="text-xs text-red-800 dark:text-red-200">
                        {decisionGate.failedItems.length} {decisionGate.failedItems.length === 1 ? 'item heeft' : 'items hebben'} onvoldoende validatie. Scroll naar boven om te repareren.
                      </p>
                    </div>
                  )}
                  {readinessScore < 100 && readinessScore >= 60 && decisionGate.status !== 'blocked' && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Formulier Voortgang</span>
                        <span className="text-xs font-semibold">{readinessScore}%</span>
                      </div>
                      <Progress value={readinessScore} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            </TabsContent>

            {/* Output Tab */}
            <TabsContent value="output" className="mt-6">
              <div className="space-y-6">
                {hasGenerated ? (
                  <>
                    {/* CAMPAIGN METADATA SECTIONS - Strategy Snapshot, Decision Quality, Change Awareness */}
                    {(() => {
                      const currentStrategy = savedStrategies.find(s => s.id === currentStrategyId);
                      if (!currentStrategy?.generationMetadata) return null;

                      // Calculate change impact
                      const changeImpact = {
                        hasAssetChanges: campaignImpacts.some(impact => 
                          impact.decisionImpact.decisionStatusChanged || 
                          impact.change.changeType === 'content-update'
                        ),
                        hasNewResearch: campaignImpacts.some(impact => impact.change.researchAdded),
                        recommendsRecalculation: campaignImpacts.length > 0,
                        changedAssets: campaignImpacts.map(impact => ({
                          id: impact.change.assetId,
                          title: impact.change.assetTitle,
                          changeDescription: impact.change.description
                        })),
                        newResearchCount: campaignImpacts.filter(impact => impact.change.researchAdded).length
                      };

                      return (
                        <CampaignMetadataSections
                          metadata={currentStrategy.generationMetadata}
                          changeImpact={changeImpact}
                          onRecalculate={recalculateCampaign}
                        />
                      );
                    })()}

                    {/* DECISION SUMMARY PANEL - Shows quality of generated campaign */}
                    <DecisionSummaryPanel
                      status={campaignDecision.status}
                      rootCauses={campaignDecision.rootCauses}
                      risks={campaignDecision.risks}
                      improvements={campaignDecision.improvements}
                      onImproveClick={() => {
                        // Switch to configure tab
                        setSelectedTab('configure');
                        // Scroll to top
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      metadata={{
                        generatedAt: new Date(),
                        avgCoverage: campaignDecision.details.avgCoverage,
                        totalAssets: campaignDecision.details.totalAssets,
                        safeAssets: campaignDecision.details.safeAssets
                      }}
                    />

                    {/* Output View Toggle */}
                    <Card className="border-2">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">Campaign Strategy Output</h3>
                          <p className="text-sm text-muted-foreground">
                            View the strategic report or generate actionable outputs
                          </p>
                        </div>
                        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                          <button
                            onClick={() => {
                              setOutputView('insights');
                              setShowChat(false);
                            }}
                            className={`
                              px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                              ${outputView === 'insights' 
                                ? 'bg-background shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground'
                              }
                            `}
                          >
                            <Lightbulb className="h-4 w-4" />
                            Insights
                          </button>
                          <button
                            onClick={() => {
                              setOutputView('next-steps');
                              setShowChat(false);
                            }}
                            className={`
                              px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                              ${outputView === 'next-steps' 
                                ? 'bg-background shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground'
                              }
                            `}
                          >
                            <ArrowRight className="h-4 w-4" />
                            Next Steps
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Strategic Insights View */}
                  {outputView === 'insights' && (
                    <StrategicReport
                      campaignConfig={campaignConfig}
                      selectedBrandAssets={selectedBrandAssets}
                      selectedPersonas={selectedPersonas}
                      selectedProducts={selectedProducts}
                      selectedTrends={selectedTrends}
                      selectedKnowledge={selectedKnowledge}
                      selectedResearch={selectedResearch}
                      selectedChannels={selectedChannels}
                      channelBudgets={channelBudgets}
                    />
                  )}

                  {/* Next Steps View */}
                  {outputView === 'next-steps' && (
                    <>
                      {!showChat ? (
                        <NextStepsSuggestions
                          campaignConfig={campaignConfig}
                          selectedChannels={selectedChannels}
                          selectedPersonas={selectedPersonas}
                          hasAgency={false}
                          onOpenChat={() => setShowChat(true)}
                        />
                      ) : (
                        <ChatAssistant
                          campaignConfig={campaignConfig}
                          onClose={() => setShowChat(false)}
                        />
                      )}
                    </>
                  )}
                </>
                ) : (
                  <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {readinessScore < 100 
                      ? 'Complete all required inputs and click "Generate Campaign Strategy" to see your output'
                      : 'Click the "Generate Campaign Strategy" button to create your brief'
                    }
                  </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Picker Modals */}
      {showAssetPicker && (
        <EnhancedAssetPickerModal
          title="Select Brand Assets"
          description="Choose brand assets to ensure your campaign aligns with your brand identity and values"
          type="brand-assets"
          items={mockBrandAssets.map(a => ({ 
            id: a.id, 
            name: a.title, 
            subtitle: a.category,
            description: a.category === 'Foundation' 
              ? 'Core brand identity elements that define who you are' 
              : a.category === 'Personality' 
              ? 'Brand voice, tone, and character attributes' 
              : 'Brand narrative, story, and positioning',
            isCritical: a.isCritical,
            status: a.status
          }))}
          selected={selectedBrandAssets}
          onSelect={setSelectedBrandAssets}
          onClose={() => setShowAssetPicker(false)}
        />
      )}

      {showPersonaPicker && (
        <EnhancedAssetPickerModal
          title="Select Target Personas"
          description="Choose personas to target your campaign messaging and channels effectively"
          type="personas"
          items={mockPersonas.map(p => ({ 
            id: p.id, 
            name: p.name, 
            subtitle: p.demographics.occupation,
            description: `${p.demographics.age} • ${p.interests?.slice(0, 2).join(', ') || 'No interests defined'}`
          }))}
          selected={selectedPersonas}
          onSelect={setSelectedPersonas}
          onClose={() => setShowPersonaPicker(false)}
          onAddNew={() => {
            setShowPersonaPicker(false);
            // Navigate to persona creation
            window.location.hash = '#/personas?action=create';
          }}
        />
      )}

      {showResearchPicker && (
        <EnhancedAssetPickerModal
          title="Select Research Insights"
          description="Connect research findings to inform your campaign with data-driven insights"
          type="research"
          items={mockResearch.map(r => ({ 
            id: r.id, 
            name: r.name, 
            subtitle: r.type,
            description: r.type === 'Market Analysis' 
              ? 'Competitive landscape and market opportunity insights'
              : r.type === 'Customer Insights'
              ? 'Customer behavior patterns and preferences'
              : 'Product performance and feedback data'
          }))}
          selected={selectedResearch}
          onSelect={setSelectedResearch}
          onClose={() => setShowResearchPicker(false)}
        />
      )}

      {showTrendPicker && (
        <EnhancedAssetPickerModal
          title="Select Market Trends"
          description="Choose relevant trends to align your campaign with market opportunities"
          type="research"
          items={trends.map(t => ({ 
            id: t.id, 
            name: t.title, 
            subtitle: `${t.category} • ${t.impact} impact`,
            description: t.description
          }))}
          selected={selectedTrends}
          onSelect={setSelectedTrends}
          onClose={() => setShowTrendPicker(false)}
          onAddNew={() => {
            setShowTrendPicker(false);
            setShowAddTrendModal(true);
          }}
        />
      )}

      {showAddTrendModal && (
        <AddTrendModal
          onClose={() => setShowAddTrendModal(false)}
          onAddTrend={(newTrend) => {
            setTrends(prev => [...prev, newTrend]);
            setSelectedTrends(prev => [...prev, newTrend.id]);
            setShowAddTrendModal(false);
          }}
        />
      )}

      {/* DECISION QUALITY WARNING MODAL - CRITICAL VALIDATION POINT */}
      {warningStatusInfo && (
        <DecisionWarningModal
          isOpen={showDecisionWarning}
          onClose={() => {
            setShowDecisionWarning(false);
            setPendingGeneration(false);
          }}
          onProceed={handleProceedAnywayFromWarning}
          statusInfo={warningStatusInfo}
          actionName="generate strategic campaign for"
          itemName="selected brand assets and personas"
        />
      )}
      </div>
    </div>
  );
}