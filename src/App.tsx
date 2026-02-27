import React, { useState, useEffect } from 'react';

// ─── Shell components (always rendered, not lazy) ──────────
import { WorkflowEnhancer } from './components/WorkflowEnhancer';
import { TopNavigationBar } from './components/TopNavigationBar';
import { EnhancedSidebarSimple } from './components/EnhancedSidebarSimple';
import { ActivityFeed } from './components/ActivityFeed';
import { FloatingChatWidget } from './features/help/components/FloatingChatWidget';
import { QuickContentModal } from './features/campaigns/components';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TooltipProvider } from './components/ui/tooltip';
import { LazyWrapper } from './components/shared';

// ─── Contexts, stores, hooks, utils ────────────────────────
import { AppProviders, useBrandAssets, useResearchPlan, useUIState } from './contexts';
import { useProductsStore } from './features/products/stores/useProductsStore';
import { useMarketInsightsStore } from './features/market-insights/stores/useMarketInsightsStore';
import { useBusinessStrategyStore } from './features/business-strategy/stores/useBusinessStrategyStore';
import { usePersonaDetailStore } from './features/personas/stores/usePersonaDetailStore';
import { useResearchStore } from './features/research/stores/useResearchStore';
import { useCampaignStore } from './features/campaigns/stores/useCampaignStore';
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
  AIBrandAnalysisPage,
  BrandstyleAnalyzerPage,
  BrandStyleguidePage,
  WorkshopPurchasePage,
  WorkshopSessionPage,
  WorkshopCompletePage,
  InterviewsPage,
  GoldenCirclePage,
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
  MarketInsightsPage,
  InsightDetailPage,
  KnowledgeLibraryPage,
  ResearchHubPage,
  ResearchBundlesPage,
  BundleDetailPage,
  CustomValidationPage,
  ResearchDashboard,
  StrategicResearchPlanner,
  ResearchValidationPage,
  ActiveCampaignsPage,
  CampaignDetailPage,
  QuickContentDetailPage,
  ContentStudioPage,
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
  RelationshipsPage,
} from './lib/lazy-imports';

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
          title: asset.title,
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
        'trends': { title: 'Trend Library', subtitle: 'Market Insights' },
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
    setActiveSectionRaw(section);
    
    // If navigating away from brand assets, reset asset-related states
    const isAssetRelated = section.startsWith('brand-')
      || section === 'brand'
      || section === 'ai-exploration-brand-asset'
      || section === 'interviews'
      || section === 'workshop-purchase'
      || section === 'golden-circle';
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
    configuration: any;
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
      const methodId = methods[assetId];
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
    } else if (activeSection === 'campaign-detail' && !useCampaignStore.getState().selectedCampaignId) {
      redirectTo = 'active-campaigns';
    } else if (activeSection === 'quick-content-detail' && !useCampaignStore.getState().selectedCampaignId) {
      redirectTo = 'active-campaigns';
    } else if (activeSection === 'ai-exploration-brand-asset' && !selectedAssetId) {
      redirectTo = 'brand';
    } else if (activeSection === 'content-studio') {
      const cs = useCampaignStore.getState();
      if (!cs.selectedCampaignId || !cs.selectedDeliverableId) {
        redirectTo = 'active-campaigns';
      }
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
          onNavigateToInterviews={(assetId) => {
            setSelectedAssetId(assetId);
            handleSetActiveSection('interviews');
          }}
          onNavigateToWorkshop={(assetId) => {
            setSelectedAssetId(assetId);
            handleSetActiveSection('workshop-purchase');
          }}
          onNavigateToGoldenCircle={(assetId) => {
            setSelectedAssetId(assetId);
            handleSetActiveSection('golden-circle');
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
      const isMethodCompleted = asset?.researchMethods?.some(
        m => m.type === selectedResearchOption && m.status === 'completed'
      );

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
          onNavigateToInterviews={(assetId) => {
            setSelectedAssetId(assetId);
            handleSetActiveSection('interviews');
          }}
          onNavigateToWorkshop={(assetId) => {
            setSelectedAssetId(assetId);
            handleSetActiveSection('workshop-purchase');
          }}
          onNavigateToGoldenCircle={(assetId) => {
            setSelectedAssetId(assetId);
            handleSetActiveSection('golden-circle');
          }}
        />
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleSetActiveSection} />;
      case 'research':
      case 'research-hub':
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
            onNavigateToInterviews={(assetId) => {
              setSelectedAssetId(assetId);
              handleSetActiveSection('interviews');
            }}
            onNavigateToWorkshop={(assetId) => {
              setSelectedAssetId(assetId);
              handleSetActiveSection('workshop-purchase');
            }}
            onNavigateToGoldenCircle={(assetId) => {
              setSelectedAssetId(assetId);
              handleSetActiveSection('golden-circle');
            }}
          />
        );
      
      // 🎨 Brandstyle Analyzer + Styleguide
      case 'brandstyle':
        return (
          <BrandstyleAnalyzerPage
            onNavigateToGuide={() => handleSetActiveSection('brandstyle-guide')}
          />
        );
      case 'brandstyle-guide':
        return (
          <BrandStyleguidePage
            onNavigateToAnalyzer={() => handleSetActiveSection('brandstyle')}
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
            onNavigateToQuickDetail={(campaignId) => {
              useCampaignStore.getState().setSelectedCampaignId(campaignId);
              handleSetActiveSection('quick-content-detail');
            }}
            onNavigateToWizard={() => handleSetActiveSection('campaign-wizard')}
          />
        );
      case 'campaign-detail': {
        const cdCampaignId = useCampaignStore.getState().selectedCampaignId;
        if (!cdCampaignId) {
          return null; // useEffect redirect handles navigation
        }
        return (
          <CampaignDetailPage
            campaignId={cdCampaignId}
            onBack={() => {
              useCampaignStore.getState().setSelectedCampaignId(null);
              handleSetActiveSection('active-campaigns');
            }}
            onOpenInStudio={(campaignId, deliverableId) => {
              useCampaignStore.getState().setSelectedCampaignId(campaignId);
              useCampaignStore.getState().setSelectedDeliverableId(deliverableId);
              handleSetActiveSection('content-studio');
            }}
          />
        );
      }
      case 'quick-content-detail': {
        const qcCampaignId = useCampaignStore.getState().selectedCampaignId;
        if (!qcCampaignId) {
          return null; // useEffect redirect handles navigation
        }
        return (
          <QuickContentDetailPage
            campaignId={qcCampaignId}
            onBack={() => {
              useCampaignStore.getState().setSelectedCampaignId(null);
              handleSetActiveSection('active-campaigns');
            }}
            onConverted={(campaignId) => {
              useCampaignStore.getState().setSelectedCampaignId(campaignId);
              handleSetActiveSection('campaign-detail');
            }}
          />
        );
      }
      case 'trends':
        return (
          <MarketInsightsPage
            onNavigateToDetail={(id: string) => {
              useMarketInsightsStore.getState().setSelectedInsightId(id);
              handleSetActiveSection('insight-detail');
            }}
          />
        );
      case 'insight-detail': {
        const selectedInsightId = useMarketInsightsStore.getState().selectedInsightId;
        if (!selectedInsightId) return <MarketInsightsPage onNavigateToDetail={(id: string) => {
          useMarketInsightsStore.getState().setSelectedInsightId(id);
          handleSetActiveSection('insight-detail');
        }} />;
        return (
          <InsightDetailPage
            insightId={selectedInsightId}
            onBack={() => handleSetActiveSection('trends')}
          />
        );
      }
      case 'knowledge':
        return <KnowledgeLibraryPage />;
      case 'research-validation':
        return <ResearchValidationPage />;
      
      // 🆕 NEW: Relationships & Insights (Decision Status)
      case 'relationships':
        return <RelationshipsPage onNavigate={handleSetActiveSection} />;
      
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

      case 'ai-brand-analysis':
        return (
          <AIBrandAnalysisPage
            assetId={selectedAssetId ?? ''}
            assetName={selectedAssetId ? getBrandAsset(selectedAssetId)?.title : undefined}
            onBack={() => {
              if (selectedAssetId) {
                handleNavigateAssetDetail(selectedAssetId);
              } else {
                handleSetActiveSection('brand');
              }
            }}
          />
        );

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
            onOpenInGoldenCircle={selectedAssetId ? () => {
              handleSetActiveSection('golden-circle');
            } : undefined}
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

      case 'golden-circle':
        return (
          <GoldenCirclePage
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

      case 'content-studio': {
        const csCampaignId = useCampaignStore.getState().selectedCampaignId;
        const csDeliverableId = useCampaignStore.getState().selectedDeliverableId;
        if (!csCampaignId || !csDeliverableId) {
          return null; // useEffect redirect handles navigation
        }
        return (
          <ContentStudioPage
            deliverableId={csDeliverableId}
            campaignId={csCampaignId}
            onBack={() => {
              useCampaignStore.getState().setSelectedDeliverableId(null);
              handleSetActiveSection('campaign-detail');
            }}
          />
        );
      }

      case 'content-library':
        return <ContentLibraryPage onNavigate={handleSetActiveSection} />;

      case 'campaign-wizard':
        return <CampaignWizardPage onNavigate={handleSetActiveSection} />;

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
          onQuickContent={() => useCampaignStore.getState().openQuickModal()}
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
              {renderContent()}
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

      {/* Quick Content Modal (global — opened from header) */}
      <QuickContentModal
        onCreated={(campaignId) => {
          useCampaignStore.getState().setSelectedCampaignId(campaignId);
          handleSetActiveSection('quick-content-detail');
        }}
      />
      <FloatingChatWidget />
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
          </TooltipProvider>
        </ErrorBoundary>
      </AppProviders>
    </ErrorBoundary>
  );
}