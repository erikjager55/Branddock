import React, { useState, useEffect } from 'react';

// ─── Shell components (always rendered, not lazy) ──────────
import { WorkflowEnhancer } from './components/WorkflowEnhancer';
import { TopNavigationBar } from './components/TopNavigationBar';
import { EnhancedSidebarSimple } from './components/EnhancedSidebarSimple';
import { ActivityFeed } from './components/ActivityFeed';
import { FloatingChatWidget } from './features/help/components/FloatingChatWidget';
import { ClawOverlay } from './features/claw/components/ClawOverlay';
import { useClawStore } from './stores/useClawStore';
import { openClawWithPrompt } from './features/claw/lib/open-with-prompt';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TooltipProvider } from './components/ui/tooltip';
import { WorkspaceSwitchGuard } from './components/shared/WorkspaceSwitchGuard';
import { LazyWrapper } from './components/shared';

// ─── Contexts, stores, hooks, utils ────────────────────────
import { AppProviders, useBrandAssets, useResearchPlan, useUIState } from './contexts';
import type { ResearchPlanConfiguration } from './contexts/ResearchPlanContext';
import { useProductsStore } from './features/products/stores/useProductsStore';
import { useCompetitorsStore } from './features/competitors/stores/useCompetitorsStore';
import { useTrendRadarStore } from './features/trend-radar/stores/useTrendRadarStore';
import { useBusinessStrategyStore } from './features/business-strategy/stores/useBusinessStrategyStore';
import { usePersonaDetailStore } from './features/personas/stores/usePersonaDetailStore';
import { useResearchStore } from './features/research/stores/useResearchStore';
import { useCampaignStore } from './features/campaigns/stores/useCampaignStore';
import { useCampaignWizardStore } from './features/campaigns/stores/useCampaignWizardStore';
import { useContentLibraryStore } from './features/campaigns/stores/useContentLibraryStore';
import { useConsistentModelStore } from './features/consistent-models/stores/useConsistentModelStore';
import { useAgentsStore } from './features/agents/stores/useAgentsStore';
import { useShellStore } from './stores/useShellStore';
import { getResearchOptionId, ResearchMethodType } from './utils/research-method-helpers';
import { logger } from './utils/logger';
import { recentItems } from './services/RecentItemsService';
import { useBreadcrumbs } from './hooks/useBreadcrumbs';

// ─── Lazy-loaded page components ───────────────────────────
import {
  DashboardPage,
  BrandFoundationPage,
  BrandAssetDetailPage,
  TransformativeGoalsDashboard,
  BrandstyleAnalyzerPage,
  BrandStyleguidePage,
  BrandVoiceguidePage,
  BrandVoiceAnalyzerPage,
  WorkshopPurchasePage,
  WorkshopSessionPage,
  WorkshopCompletePage,
  InterviewsPage,
  BusinessStrategyPage,
  StrategyDetailPage,
  PersonasPage,
  CreatePersonaPage,
  PersonaDetailPage,
  AIPersonaAnalysisPage,
  AIBrandAssetExplorationPage,
  ProductsOverviewPage,
  ProductAnalyzerPage,
  ProductDetailPage,
  CompetitorsOverviewPage,
  CompetitorAnalyzerPage,
  CompetitorDetailPage,
  TrendRadarPage,
  TrendDetailPage,
  WebsiteScannerPage,
  KnowledgeLibraryPage,
  AgentsCatalogPage,
  AgentDetailPage,
  AgentsInboxPage,
  MediaLibraryPage,
  AiTrainerPage,
  AiStudioPage,
  ModelDetailPage,
  ModelShowcasePage,
  ResearchHubPage,
  ResearchBundlesPage,
  BundleDetailPage,
  CustomValidationPage,
  ResearchDashboard,
  StrategicResearchPlanner,
  ResearchValidationPage,
  ActiveCampaignsPage,
  CanvasPage,
  ContentLibraryPage,
  CampaignWizardPage,
  BrandAlignmentPage,
  SettingsPage,
  AgencySettingsPage,
  ClientManagementPage,
  TeamManagementPage,
  HelpPage,
  HelpArticlePage,
  NewStrategyPage,
  CommercialDemoPage,
  ValidationMethodDemo,
} from './lib/lazy-imports';
// TIJDELIJK: Research Hub uitgeschakeld — fallback-surface + toggle.
import { ComingSoonPage } from './components/shared/ComingSoonPage';
import { RESEARCH_HUB_ENABLED } from './lib/constants/design-tokens';

function AppContent() {
  const { isNotificationPanelOpen, closeNotifications } = useShellStore();
  // selectedCampaignId now in useCampaignStore
  // selectedProductId now in useProductsStore
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null);
  const [isNewPersona, setIsNewPersona] = useState(false);
  
  // ✨ Use Context Hooks instead of local state
  const {
    activeSection,
    selectedAssetId,
    selectedResearchOption,
    viewingAssetResults,
    sidebarCollapsed,
    showApproachSelection,
    setActiveSection: setActiveSectionRaw,
    setSelectedAssetId,
    setSelectedResearchOption,
    setViewingAssetResults,
    setSidebarCollapsed,
    setShowApproachSelection,
    navigateToAsset,
    resetAssetStates,
  } = useUIState();

  const {
    activeResearchPlan,
    setActiveResearchPlan,
    sharedSelectedAssets,
    setSharedSelectedAssets,
    updateSharedAssets,
    isMethodUnlocked,
    isAssetUnlocked,
  } = useResearchPlan();

  const { brandAssets, getBrandAsset } = useBrandAssets();

  // Generate breadcrumbs
  const breadcrumbs = useBreadcrumbs(activeSection, selectedAssetId ?? undefined);

  // Sync activeSection to Claw store for /bug command
  useEffect(() => {
    useClawStore.getState().setCurrentPage(activeSection);
  }, [activeSection]);

  // Consume pending navigation requests from the Brand Assistant (e.g. the
  // "View →" action on a create-persona toast). Sets the relevant detail store
  // selectedId, switches activeSection, then clears the intent.
  const pendingNavigation = useClawStore((s) => s.pendingNavigation);
  useEffect(() => {
    if (!pendingNavigation) return;
    const { section, entityId } = pendingNavigation;
    switch (section) {
      case 'persona-detail':
        if (entityId) usePersonaDetailStore.getState().setSelectedPersonaId(entityId);
        break;
      case 'trend-detail':
        if (entityId) useTrendRadarStore.getState().setSelectedTrendId(entityId);
        break;
      case 'product-detail':
        if (entityId) useProductsStore.getState().setSelectedProductId(entityId);
        break;
      case 'competitor-detail':
        if (entityId) useCompetitorsStore.getState().setSelectedCompetitorId(entityId);
        break;
      // Other detail sections don't have create flows yet — falls through to
      // plain setActiveSection below.
    }
    setActiveSectionRaw(section);
    useClawStore.getState().clearPendingNavigation();
  }, [pendingNavigation, setActiveSectionRaw]);

  // Track recent items when navigating
  useEffect(() => {
    if (activeSection === 'dashboard') {
      // Don't track dashboard visits
      return;
    }

    // Track brand asset visits
    if (selectedAssetId) {
      const asset = brandAssets.find(a => a.id === selectedAssetId);
      if (asset) {
        recentItems.addItem({
          id: asset.id,
          type: 'brand-asset',
          title: asset.name,
          subtitle: asset.category,
          route: `brand-${asset.id}`,
          metadata: {
            status: asset.status,
            category: asset.category
          }
        });
      }
    }
    // Track page visits
    else if (activeSection) {
      const pageMap: Record<string, { title: string; subtitle: string }> = {
        'brand': { title: 'Brand Assets', subtitle: 'Prioritized by Strategic Risk' },
        'research': { title: 'Research Hub', subtitle: 'Plan & Execute' },
        'personas': { title: 'Personas', subtitle: 'Strategic Decision Instruments' },
        'strategy': { title: 'Strategy & Goals', subtitle: 'Strategic Planning' },
        'products': { title: 'Products & Services', subtitle: 'Catalog' },
        'trends': { title: 'Trend Radar', subtitle: 'Monitor Market Trends' },
        'knowledge': { title: 'Knowledge Library', subtitle: 'Resources' }
      };

      const pageInfo = pageMap[activeSection];
      if (pageInfo) {
        recentItems.addItem({
          id: activeSection,
          type: 'page',
          title: pageInfo.title,
          subtitle: pageInfo.subtitle,
          route: activeSection
        });
      }
    }
  }, [activeSection, selectedAssetId, brandAssets]);

  // Expose navigation helpers for E2E testing (development only)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as Record<string, unknown>).__testNavigation = {
        setActiveSection: (section: string) => setActiveSectionRaw(section),
        setSelectedWorkshopId,
        setSelectedAssetId,
      };
    }
    return () => {
      if (process.env.NODE_ENV !== 'production') {
        delete (window as unknown as Record<string, unknown>).__testNavigation;
      }
    };
  }, [setActiveSectionRaw, setSelectedAssetId]);

  // Wrapper for setActiveSection to reset asset states when needed
  const handleSetActiveSection = (section: string) => {
    // Mode-aware wizard shortcuts — callers that can't import the store
    // directly use these section names to open the wizard in the right mode.
    if (section === 'create-content') {
      const ws = useCampaignWizardStore.getState();
      ws.resetWizard();
      ws.setWizardMode('content');
      setActiveSectionRaw('campaign-wizard');
      return;
    }
    if (section === 'new-campaign') {
      const ws = useCampaignWizardStore.getState();
      ws.resetWizard();
      ws.setWizardMode('campaign');
      setActiveSectionRaw('campaign-wizard');
      return;
    }

    setActiveSectionRaw(section);

    // If navigating away from brand assets, reset asset-related states
    const isAssetRelated = section.startsWith('brand-')
      || section === 'brand'
      || section === 'ai-exploration-brand-asset'
      || section === 'interviews'
      || section === 'workshop-purchase'
;
    if (!isAssetRelated) {
      resetAssetStates();
    }
  };

  const handleEditAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setSelectedResearchOption(null); // Reset research option when switching assets
    setViewingAssetResults(true); // Show asset results by default
    setActiveSectionRaw(`brand-${assetId}`);
  };

  const handleNavigateAssetDetail = (assetId: string) => {
    setSelectedAssetId(assetId);
    handleSetActiveSection('brand-asset-detail');
  };

  const handleNavigateAssetResults = (assetId: string) => {
    setSelectedAssetId(assetId);
    setSelectedResearchOption(null);
    setViewingAssetResults(true);
    setActiveSectionRaw(`brand-${assetId}`);
  };

  const handleNavigateResearchOption = (optionId: string) => {
    setSelectedResearchOption(optionId);
    setViewingAssetResults(false);
  };

  const handleNavigateResearchOptionFromSidebar = (assetId: string, optionId: string) => {
    setSelectedAssetId(assetId);
    setSelectedResearchOption(optionId);
    setViewingAssetResults(false);
    setActiveSectionRaw(`brand-${assetId}`);
  };

  const handleBackToBrand = () => {
    resetAssetStates();
    setActiveSectionRaw('brand');
  };
  
  // Handler for navigating to validation method from BrandAssetsView
  const handleNavigateToResearchMethod = (assetId: string, methodType: ResearchMethodType, mode: 'work' | 'results') => {
    const optionId = getResearchOptionId(methodType);
    logger.navigation('Navigating to validation method', { assetId, methodType, optionId, mode });
    setSelectedAssetId(assetId);
    
    if (mode === 'results') {
      // Navigating to results view - show the BrandAssetDetailPage
      setSelectedResearchOption(null);
      setViewingAssetResults(true);
    } else {
      // Navigating to work/research mode - show ResearchDashboard
      setSelectedResearchOption(optionId);
      setViewingAssetResults(false);
    }
    
    setActiveSectionRaw(`brand-${assetId}`);
  };

  const handlePlanCreated = (config: {
    approachId: string;
    selectedAssets: string[];
    configuration: ResearchPlanConfiguration;
    entryMode: string;
    rationale?: Record<string, string>;
  }) => {
    // Create new research plan and unlock methods/assets
    const methods = config.configuration?.methods || {};
    const allMethods = Object.values(methods) as string[];
    const uniqueMethods = [...new Set([...allMethods, 'ai-agent'])]; // Always unlock AI (ai-agent is the correct optionId)
    
    const newPlan = {
      id: `plan-${Date.now()}`,
      method: config.approachId,
      unlockedMethods: uniqueMethods,
      unlockedAssets: config.selectedAssets,
      entryMode: config.entryMode as 'asset' | 'bundle' | 'questionnaire',
      rationale: config.rationale,
      configuration: config.configuration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveResearchPlan(newPlan);
    
    // Update shared assets for each method
    const updatedSharedAssets = { ...sharedSelectedAssets };
    config.selectedAssets.forEach(assetId => {
      // methods can be Record<string,string> (tool-flow) or string[] (bundle-flow);
      // string-indexing only yields hits in tool-flow — bundle-flow returns undefined harmlessly
      const methodId = (methods as Record<string, string>)[assetId];
      if (methodId && updatedSharedAssets[methodId as keyof typeof updatedSharedAssets]) {
        const existing = updatedSharedAssets[methodId as keyof typeof updatedSharedAssets];
        if (!existing.includes(assetId)) {
          updatedSharedAssets[methodId as keyof typeof updatedSharedAssets] = [...existing, assetId];
        }
      }
    });
    setSharedSelectedAssets(updatedSharedAssets);
    
    // Close the planner and navigate to dashboard
    setShowApproachSelection(false);
    setActiveSectionRaw('dashboard');
  };

  // ─── Redirect guards ──────────────────────────────────────
  // Redirect when required IDs are missing (outside render cycle)
  useEffect(() => {
    let redirectTo: string | null = null;

    if (activeSection === 'research-bundle-detail' && !useResearchStore.getState().selectedBundleId) {
      redirectTo = 'research-bundles';
    } else if (activeSection === 'product-detail' && !useProductsStore.getState().selectedProductId) {
      redirectTo = 'products';
    } else if (activeSection === 'persona-detail' && !usePersonaDetailStore.getState().selectedPersonaId) {
      redirectTo = 'personas';
    } else if (activeSection === 'persona-ai-analysis' && !usePersonaDetailStore.getState().selectedPersonaId) {
      redirectTo = 'personas';
    } else if (activeSection === 'campaign-detail') {
      const campaignId = useCampaignStore.getState().selectedCampaignId;
      if (!campaignId) {
        redirectTo = 'active-campaigns';
      } else {
        // Campaign Detail is now merged into Content Library — pre-fill the
        // campaign filter and redirect so the library's campaign-mode renders.
        useContentLibraryStore.getState().setFilter('campaigns', [campaignId]);
        redirectTo = 'content-library';
      }
    } else if (activeSection === 'ai-exploration-brand-asset' && !selectedAssetId) {
      redirectTo = 'brand';
    } else if (activeSection === 'consistent-model-detail' && !useConsistentModelStore.getState().selectedModelId) {
      redirectTo = 'ai-trainer';
    } else if (activeSection === 'consistent-model-showcase' && !useConsistentModelStore.getState().selectedModelId) {
      redirectTo = 'ai-trainer';
    } else if (activeSection === 'content-canvas') {
      const cc = useCampaignStore.getState();
      if (!cc.selectedCampaignId || !cc.selectedDeliverableId) {
        redirectTo = 'active-campaigns';
      }
    } else if (activeSection === 'agent-detail' && !useAgentsStore.getState().selectedAgentId) {
      redirectTo = 'agents';
    }

    if (redirectTo) {
      setActiveSectionRaw(redirectTo);
      if (!redirectTo.startsWith('brand-') && redirectTo !== 'brand') {
        resetAssetStates();
      }
    }
  }, [activeSection, selectedAssetId, setActiveSectionRaw, resetAssetStates]);

  const renderContent = () => {
    // Show research approach selection if requested
    if (showApproachSelection) {
      return (
        <StrategicResearchPlanner
          onPlanCreated={handlePlanCreated}
          onCancel={() => setShowApproachSelection(false)}
        />
      );
    }

    // Check if we're viewing asset results page (canonical asset view)
    if (activeSection.startsWith('brand-') && selectedAssetId && viewingAssetResults) {
      return (
        <BrandAssetDetailPage
          assetId={selectedAssetId}
          onNavigateBack={handleBackToBrand}
          onNavigateToAnalysis={(assetId) => {
            setSelectedAssetId(assetId);
            handleSetActiveSection('ai-exploration-brand-asset');
          }}
        />
      );
    }

    // Check if we're viewing a specific validation method
    if (activeSection.startsWith('brand-') && selectedAssetId && selectedResearchOption) {
      // AI Exploration is always accessible (free method, no unlock needed)
      if (selectedResearchOption === 'ai-agent' || selectedResearchOption === 'ai-exploration') {
        return (
          <AIBrandAssetExplorationPage
            assetId={selectedAssetId}
            onBack={() => {
              setSelectedResearchOption(null);
              setViewingAssetResults(true);
            }}
          />
        );
      }

      // Check if this method is completed for this asset (using context)
      const asset = getBrandAsset(selectedAssetId);
      const methodCompletionMap: Record<string, boolean> = {
        'ai-exploration': asset?.validationMethods.ai ?? false,
        'canvas-workshop': asset?.validationMethods.workshop ?? false,
        'interviews': asset?.validationMethods.interview ?? false,
        'questionnaire': asset?.validationMethods.questionnaire ?? false,
      };
      const isMethodCompleted = methodCompletionMap[selectedResearchOption] ?? false;

      const methodUnlocked = isMethodUnlocked(selectedResearchOption);

      // Allow access if method is unlocked OR if it's already completed (for viewing)
      if (!methodUnlocked && !isMethodCompleted) {
        // Method not unlocked and not completed - redirect to research planner
        return (
          <StrategicResearchPlanner
            onPlanCreated={handlePlanCreated}
            onCancel={() => {
              setSelectedResearchOption(null);
              setViewingAssetResults(true);
            }}
          />
        );
      } else {
        // Method is unlocked or completed - show research dashboard
        return (
          <ResearchDashboard 
            assetId={selectedAssetId}
            optionId={selectedResearchOption}
            onBack={() => {
              setSelectedResearchOption(null);
              setViewingAssetResults(true);
            }}
            sharedSelectedAssets={sharedSelectedAssets}
            onAssetsChange={(tool, assets) => {
              setSharedSelectedAssets(prev => ({ ...prev, [tool]: assets }));
            }}
            researchPlanConfig={activeResearchPlan}
          />
        );
      }
    }

    // Fallback: brand-{id} pattern with no research option selected
    if (activeSection.startsWith('brand-') && selectedAssetId) {
      return (
        <BrandAssetDetailPage
          assetId={selectedAssetId}
          onNavigateBack={handleBackToBrand}
          onNavigateToAnalysis={(assetId) => {
            setSelectedAssetId(assetId);
            handleSetActiveSection('ai-exploration-brand-asset');
          }}
        />
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleSetActiveSection} />;
      case 'research':
      case 'research-hub':
        if (!RESEARCH_HUB_ENABLED)
          return <ComingSoonPage sectionId="research" onBack={() => handleSetActiveSection('dashboard')} />;
        return (
          <ResearchHubPage
            onNavigate={handleSetActiveSection}
          />
        );
      case 'brand':
        return <BrandFoundationPage
          onAssetClick={handleNavigateAssetDetail}
          onNavigateToResearchMethod={handleNavigateToResearchMethod}
          onNavigate={handleSetActiveSection}
        />;

      case 'brand-asset-detail':
        return (
          <BrandAssetDetailPage
            assetId={selectedAssetId}
            onNavigateBack={() => handleSetActiveSection('brand')}
            onNavigateToAnalysis={(assetId) => {
              setSelectedAssetId(assetId);
              handleSetActiveSection('ai-exploration-brand-asset');
            }}
          />
        );

      // 🎨 Brandstyle Analyzer + Styleguide
      case 'brandstyle':
      case 'brandstyle-guide':
        return (
          <BrandStyleguidePage
            onNavigateToAnalyzer={() => handleSetActiveSection('brandstyle-analyze')}
          />
        );
      case 'brandstyle-analyze':
        return (
          <BrandstyleAnalyzerPage
            onNavigateToGuide={() => handleSetActiveSection('brandstyle')}
          />
        );

      // 🎙️ Brand Voice (Voiceguide + Analyzer)
      case 'brandvoice':
      case 'brandvoice-guide':
        return (
          <BrandVoiceguidePage
            onNavigateToAnalyzer={() => handleSetActiveSection('brandvoice-analyze')}
          />
        );
      case 'brandvoice-analyze':
        return (
          <BrandVoiceAnalyzerPage
            onNavigateToGuide={() => handleSetActiveSection('brandvoice')}
          />
        );


      // 🆕 NEW: Asset Unlock Detail View (Design Demo)
      case 'asset-unlock-demo':
        return <TransformativeGoalsDashboard 
          onBack={() => handleSetActiveSection('brand')}
          onStartResearch={(methodId) => {
            logger.navigation('Starting research from Transformative Goals', { methodId });
            handleNavigateToResearchMethod('6', methodId as ResearchMethodType, 'work'); // '6' is Transformative Goals asset ID
          }}
        />;
      
      case 'research-bundles':
        if (!RESEARCH_HUB_ENABLED)
          return <ComingSoonPage sectionId="research-bundles" onBack={() => handleSetActiveSection('dashboard')} />;
        return (
          <ResearchBundlesPage
            onNavigate={handleSetActiveSection}
            onNavigateToDetail={(bundleId) => {
              useResearchStore.getState().setSelectedBundleId(bundleId);
              handleSetActiveSection('research-bundle-detail');
            }}
          />
        );
      case 'research-bundle-detail': {
        if (!RESEARCH_HUB_ENABLED)
          return <ComingSoonPage sectionId="research-bundles" onBack={() => handleSetActiveSection('dashboard')} />;
        const selectedBundleId = useResearchStore.getState().selectedBundleId;
        if (!selectedBundleId) {
          return null; // useEffect redirect handles navigation
        }
        return (
          <BundleDetailPage
            bundleId={selectedBundleId}
            onBack={() => handleSetActiveSection('research-bundles')}
            onNavigate={handleSetActiveSection}
          />
        );
      }
      case 'research-custom':
      case 'custom-validation':
        if (!RESEARCH_HUB_ENABLED)
          return <ComingSoonPage sectionId="custom-validation" onBack={() => handleSetActiveSection('dashboard')} />;
        return (
          <CustomValidationPage
            onBack={() => handleSetActiveSection('research-hub')}
            onNavigate={handleSetActiveSection}
          />
        );
      case 'products':
        return (
          <ProductsOverviewPage
            onNavigateToAnalyzer={() => handleSetActiveSection('product-analyzer')}
            onNavigateToDetail={(id) => {
              useProductsStore.getState().setSelectedProductId(id);
              handleSetActiveSection('product-detail');
            }}
          />
        );
      case 'product-analyzer':
        return (
          <ProductAnalyzerPage
            onBack={() => handleSetActiveSection('products')}
            onNavigateToDetail={(id) => {
              useProductsStore.getState().setSelectedProductId(id);
              handleSetActiveSection('product-detail');
            }}
          />
        );
      case 'product-detail': {
        const pdProductId = useProductsStore.getState().selectedProductId;
        if (!pdProductId) {
          return null; // useEffect redirect handles navigation
        }
        return (
          <ProductDetailPage
            productId={pdProductId}
            onBack={() => handleSetActiveSection('products')}
            onNavigate={handleSetActiveSection}
          />
        );
      }
      case 'competitors':
        return (
          <CompetitorsOverviewPage
            onNavigateToAnalyzer={() => handleSetActiveSection('competitor-analyzer')}
            onNavigateToDetail={(id) => {
              useCompetitorsStore.getState().setSelectedCompetitorId(id);
              handleSetActiveSection('competitor-detail');
            }}
          />
        );
      case 'competitor-analyzer':
        return (
          <CompetitorAnalyzerPage
            onBack={() => handleSetActiveSection('competitors')}
            onNavigateToDetail={(id) => {
              useCompetitorsStore.getState().setSelectedCompetitorId(id);
              handleSetActiveSection('competitor-detail');
            }}
          />
        );
      case 'competitor-detail': {
        const cdCompetitorId = useCompetitorsStore.getState().selectedCompetitorId;
        if (!cdCompetitorId) {
          return null;
        }
        return (
          <CompetitorDetailPage
            competitorId={cdCompetitorId}
            onBack={() => handleSetActiveSection('competitors')}
            onNavigate={handleSetActiveSection}
          />
        );
      }
      case 'personas':
        return (
          <PersonasPage
            onNavigateToDetail={(personaId) => {
              usePersonaDetailStore.getState().setSelectedPersonaId(personaId);
              handleSetActiveSection('persona-detail');
            }}
            onNavigateToCreate={() => handleSetActiveSection('persona-create')}
            onOpenChat={(persona) => {
              usePersonaDetailStore.getState().setSelectedPersonaId(persona.id);
              usePersonaDetailStore.getState().setChatModalOpen(true);
              handleSetActiveSection('persona-detail');
            }}
          />
        );
      case 'persona-create':
        return (
          <CreatePersonaPage
            onBack={() => handleSetActiveSection('personas')}
            onCreated={(personaId) => {
              usePersonaDetailStore.getState().setSelectedPersonaId(personaId);
              setIsNewPersona(true);
              handleSetActiveSection('persona-detail');
            }}
          />
        );
      case 'persona-detail': {
        const pdPersonaId = usePersonaDetailStore.getState().selectedPersonaId;
        if (!pdPersonaId) {
          return null; // useEffect redirect handles navigation
        }
        return (
          <PersonaDetailPage
            personaId={pdPersonaId}
            onBack={() => {
              setIsNewPersona(false);
              handleSetActiveSection('personas');
            }}
            onNavigateToAnalysis={() => handleSetActiveSection('persona-ai-analysis')}
            initialEditing={isNewPersona}
          />
        );
      }
      case 'persona-ai-analysis': {
        const paPersonaId = usePersonaDetailStore.getState().selectedPersonaId;
        if (!paPersonaId) {
          return null; // useEffect redirect handles navigation
        }
        return (
          <AIPersonaAnalysisPage
            personaId={paPersonaId}
            onBack={() => handleSetActiveSection('persona-detail')}
          />
        );
      }
      case 'strategy':
      case 'new-strategy':
        return <NewStrategyPage />;
      case 'active-campaigns':
        return (
          <ActiveCampaignsPage
            onNavigateToCampaign={(campaignId) => {
              useCampaignStore.getState().setSelectedCampaignId(campaignId);
              handleSetActiveSection('campaign-detail');
            }}
            onNavigateToWizard={() => {
              const ws = useCampaignWizardStore.getState();
              ws.resetWizard();
              ws.setWizardMode('campaign');
              handleSetActiveSection('campaign-wizard');
            }}
            onNavigateToContentWizard={() => {
              const ws = useCampaignWizardStore.getState();
              ws.resetWizard();
              ws.setWizardMode('content');
              handleSetActiveSection('campaign-wizard');
            }}
            onResumeWizard={() => handleSetActiveSection('campaign-wizard')}
          />
        );
      case 'campaign-detail':
        // Handled by redirect useEffect — pre-fills campaign filter and
        // swaps to `content-library`. Returning null until the effect runs.
        return null;
      case 'trends':
        return <TrendRadarPage onNavigate={handleSetActiveSection} />;
      case 'trend-detail': {
        const selectedTrendId = useTrendRadarStore.getState().selectedTrendId;
        if (!selectedTrendId) return <TrendRadarPage onNavigate={handleSetActiveSection} />;
        return <TrendDetailPage onNavigate={handleSetActiveSection} />;
      }
      case 'knowledge':
        return <KnowledgeLibraryPage />;
      case 'agents':
        return <AgentsCatalogPage onNavigate={handleSetActiveSection} />;
      case 'agent-detail': {
        const adAgentId = useAgentsStore.getState().selectedAgentId;
        if (!adAgentId) {
          return null; // useEffect redirect handles navigation
        }
        return (
          <AgentDetailPage
            agentId={adAgentId}
            onBack={() => handleSetActiveSection('agents')}
            onNavigate={handleSetActiveSection}
          />
        );
      }
      case 'agents-inbox':
        return <AgentsInboxPage onNavigate={handleSetActiveSection} />;
      case 'media-library':
        return <MediaLibraryPage />;
      case 'ai-trainer':
        return (
          <AiTrainerPage
            onNavigateToModelDetail={(id, status) => {
              useConsistentModelStore.getState().setSelectedModel(id);
              useConsistentModelStore.getState().resetWizardStep();
              handleSetActiveSection(
                status === 'READY' ? 'consistent-model-showcase' : 'consistent-model-detail'
              );
            }}
          />
        );
      case 'ai-studio':
        return <AiStudioPage />;
      case 'consistent-model-detail': {
        const cmModelId = useConsistentModelStore.getState().selectedModelId;
        if (!cmModelId) return null;
        return (
          <ModelDetailPage
            modelId={cmModelId}
            onNavigateBack={() => handleSetActiveSection('ai-trainer')}
            onViewShowcase={() => handleSetActiveSection('consistent-model-showcase')}
            onNavigateToStudio={() => handleSetActiveSection('ai-studio')}
          />
        );
      }
      case 'consistent-model-showcase': {
        const showcaseModelId = useConsistentModelStore.getState().selectedModelId;
        if (!showcaseModelId) return null;
        return (
          <ModelShowcasePage
            modelId={showcaseModelId}
            onNavigateBack={() => handleSetActiveSection('ai-trainer')}
            onNavigateToDetail={() => handleSetActiveSection('consistent-model-detail')}
            onNavigateToStudio={() => handleSetActiveSection('ai-studio')}
          />
        );
      }
      case 'research-validation':
        if (!RESEARCH_HUB_ENABLED)
          return <ComingSoonPage sectionId="research" onBack={() => handleSetActiveSection('dashboard')} />;
        return <ResearchValidationPage />;
      
      // 🆕 NEW: Agency Settings (White Label)
      case 'agency':
        return <AgencySettingsPage />;
      
      // 🆕 NEW: Client Management
      case 'clients':
        return <ClientManagementPage />;
      
      // 🆕 NEW: Team Management
      case 'team':
        return <TeamManagementPage />;
      
      // ⚙️ Settings — unified SettingsPage with tab routing
      case 'settings-account':
        return <SettingsPage initialTab="account" />;
      case 'settings-team':
        return <SettingsPage initialTab="team" />;
      case 'settings-billing':
        return <SettingsPage initialTab="billing" />;
      case 'settings-notifications':
        return <SettingsPage initialTab="notifications" />;
      case 'settings-appearance':
        return <SettingsPage initialTab="appearance" />;

      case 'settings-agency':
        return <AgencySettingsPage />;

      case 'settings-clients':
        return <ClientManagementPage />;
      
      // 🆕 NEW: Commercial Demo
      case 'commercial-demo':
      case 'settings-commercial-demo':
        return <CommercialDemoPage />;
      
      // 🎨 DEMO: ValidationMethodButton Demo
      case 'validation-demo':
        return <ValidationMethodDemo />;
      
      // Coming Soon pages
      case 'help':
        return <HelpPage />;

      case 'help-article':
        return <HelpArticlePage onNavigate={handleSetActiveSection} />;

      case 'business-strategy':
        return (
          <BusinessStrategyPage
            onNavigateToDetail={(strategyId) => {
              useBusinessStrategyStore.getState().setSelectedStrategyId(strategyId);
              handleSetActiveSection('strategy-detail');
            }}
          />
        );

      case 'strategy-detail': {
        const { selectedStrategyId } = useBusinessStrategyStore.getState();
        return (
          <StrategyDetailPage
            strategyId={selectedStrategyId ?? ''}
            onNavigateBack={() => handleSetActiveSection('business-strategy')}
          />
        );
      }

      case 'brand-alignment':
        return <BrandAlignmentPage />;

      case 'ai-exploration-brand-asset': {
        const aeAssetId = selectedAssetId;
        if (!aeAssetId) {
          return null; // useEffect redirect handles navigation
        }
        return (
          <AIBrandAssetExplorationPage
            assetId={aeAssetId}
            onBack={() => handleNavigateAssetDetail(aeAssetId)}
          />
        );
      }

      case 'workshop-purchase':
        return (
          <WorkshopPurchasePage
            assetId={selectedAssetId ?? ''}
            onNavigateBack={() => {
              if (selectedAssetId) {
                handleNavigateAssetDetail(selectedAssetId);
              } else {
                handleSetActiveSection('brand');
              }
            }}
            onPurchased={(workshopId) => {
              setSelectedWorkshopId(workshopId);
              handleSetActiveSection('workshop-session');
            }}
          />
        );

      case 'workshop-session':
        return (
          <WorkshopSessionPage
            workshopId={selectedWorkshopId ?? ''}
            onBack={() => {
              if (selectedAssetId) {
                handleNavigateAssetDetail(selectedAssetId);
              } else {
                handleSetActiveSection('brand');
              }
            }}
            onComplete={(workshopId) => {
              setSelectedWorkshopId(workshopId);
              handleSetActiveSection('workshop-results');
            }}
          />
        );

      case 'workshop-results':
        return (
          <WorkshopCompletePage
            workshopId={selectedWorkshopId ?? ''}
            onBack={() => {
              if (selectedAssetId) {
                handleNavigateAssetDetail(selectedAssetId);
              } else {
                handleSetActiveSection('brand');
              }
            }}
          />
        );

      case 'interviews':
        return (
          <InterviewsPage
            assetId={selectedAssetId ?? ''}
            onBack={() => {
              if (selectedAssetId) {
                handleNavigateAssetDetail(selectedAssetId);
              } else {
                handleSetActiveSection('brand');
              }
            }}
          />
        );

      case 'content-canvas': {
        const ccCampaignId = useCampaignStore.getState().selectedCampaignId;
        const ccDeliverableId = useCampaignStore.getState().selectedDeliverableId;
        if (!ccCampaignId || !ccDeliverableId) {
          return null;
        }
        return (
          <CanvasPage
            deliverableId={ccDeliverableId}
            campaignId={ccCampaignId}
            onNavigate={handleSetActiveSection}
          />
        );
      }

      case 'content-library':
        return <ContentLibraryPage onNavigate={handleSetActiveSection} />;

      case 'campaign-wizard':
        return <CampaignWizardPage onNavigate={handleSetActiveSection} />;

      case 'website-scanner':
        return <WebsiteScannerPage onNavigate={handleSetActiveSection} />;

      default:
        return <DashboardPage onNavigate={handleSetActiveSection} />;
    }
  };

  return (
    <WorkflowEnhancer
      onNavigate={handleSetActiveSection}
      onAction={(actionId) => {
        logger.interaction('Quick action executed', { actionId });
      }}
    >
      <div className="flex flex-col h-screen bg-background">
        {/* Top Navigation */}
        <TopNavigationBar
          breadcrumbs={breadcrumbs}
          onNavigate={handleSetActiveSection}
          onQuickContent={() => {
            // Open Claw + the structured Quick Content form. Same UX as the
            // `/quick` slash command in the chat input — the form handles
            // type / campaign / briefing in explicit fields, no AI
            // mini-interview required.
            const claw = useClawStore.getState();
            claw.openClaw();
            claw.openQuickContentForm();
          }}
        />

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
          <EnhancedSidebarSimple
            activeSection={activeSection}
            setActiveSection={handleSetActiveSection}
            onAssetClick={handleNavigateAssetDetail}
            onMethodClick={(assetId, methodType) => handleNavigateToResearchMethod(assetId, methodType, 'work')}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          <main className="flex-1 overflow-y-auto bg-background">
            <LazyWrapper>
              {/* Per-page ErrorBoundary: a crash inside one module should not
                  unmount the sidebar/top-nav. resetKeys tied to activeSection
                  so navigating to another page recovers automatically. */}
              <ErrorBoundary resetKeys={[activeSection]}>
                {renderContent()}
              </ErrorBoundary>
            </LazyWrapper>
          </main>
        </div>
      </div>

      {/* Activity Feed Modal */}
      <ActivityFeed
        isOpen={isNotificationPanelOpen}
        onClose={() => closeNotifications()}
        onNavigate={(route: string) => {
          handleSetActiveSection(route);
          closeNotifications();
        }}
      />

      <FloatingChatWidget />
      <ClawOverlay />
    </WorkflowEnhancer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <ErrorBoundary>
          <TooltipProvider>
            <AppContent />
            <WorkspaceSwitchGuard />
          </TooltipProvider>
        </ErrorBoundary>
      </AppProviders>
    </ErrorBoundary>
  );
}