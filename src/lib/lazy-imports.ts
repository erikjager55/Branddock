import { lazy } from 'react';

// ─── Dashboard ─────────────────────────────────────────────
export const DashboardPage = lazy(() =>
  import('@/components/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage }))
);

// ─── Brand Foundation ──────────────────────────────────────
export const BrandFoundationPage = lazy(() =>
  import('@/components/brand-foundation/BrandFoundationPage').then(m => ({ default: m.BrandFoundationPage }))
);
export const BrandAssetDetailPage = lazy(() =>
  import('@/features/brand-asset-detail/components/BrandAssetDetailPage').then(m => ({ default: m.BrandAssetDetailPage }))
);
export const UniversalAssetDashboard = lazy(() =>
  import('@/components/UniversalAssetDashboard').then(m => ({ default: m.UniversalAssetDashboard }))
);
export const TransformativeGoalsDashboard = lazy(() =>
  import('@/components/TransformativeGoalsDashboard').then(m => ({ default: m.TransformativeGoalsDashboard }))
);

// ─── AI Brand Analysis ─────────────────────────────────────
export const AIBrandAnalysisPage = lazy(() =>
  import('@/features/ai-brand-analysis/components/AIBrandAnalysisPage').then(m => ({ default: m.AIBrandAnalysisPage }))
);

// ─── Brandstyle ────────────────────────────────────────────
export const BrandstyleAnalyzerPage = lazy(() =>
  import('@/features/brandstyle/components/BrandstyleAnalyzerPage').then(m => ({ default: m.BrandstyleAnalyzerPage }))
);
export const BrandStyleguidePage = lazy(() =>
  import('@/features/brandstyle/components/BrandStyleguidePage').then(m => ({ default: m.BrandStyleguidePage }))
);

// ─── Workshops ─────────────────────────────────────────────
export const WorkshopPurchasePage = lazy(() =>
  import('@/features/workshop/components/purchase/WorkshopPurchasePage').then(m => ({ default: m.WorkshopPurchasePage }))
);
export const WorkshopSessionPage = lazy(() =>
  import('@/features/workshop/components/session/WorkshopSessionPage').then(m => ({ default: m.WorkshopSessionPage }))
);
export const WorkshopCompletePage = lazy(() =>
  import('@/features/workshop/components/results/WorkshopCompletePage').then(m => ({ default: m.WorkshopCompletePage }))
);

// ─── Interviews + Golden Circle ────────────────────────────
export const InterviewsPage = lazy(() =>
  import('@/features/interviews/components/InterviewsPage').then(m => ({ default: m.InterviewsPage }))
);
export const GoldenCirclePage = lazy(() =>
  import('@/features/golden-circle/components/GoldenCirclePage').then(m => ({ default: m.GoldenCirclePage }))
);

// ─── Business Strategy ─────────────────────────────────────
export const BusinessStrategyPage = lazy(() =>
  import('@/features/business-strategy/components/BusinessStrategyPage').then(m => ({ default: m.BusinessStrategyPage }))
);
export const StrategyDetailPage = lazy(() =>
  import('@/features/business-strategy/components/detail/StrategyDetailPage').then(m => ({ default: m.StrategyDetailPage }))
);

// ─── Personas ──────────────────────────────────────────────
export const PersonasPage = lazy(() =>
  import('@/features/personas/components/PersonasPage').then(m => ({ default: m.PersonasPage }))
);
export const CreatePersonaPage = lazy(() =>
  import('@/features/personas/components/create/CreatePersonaPage').then(m => ({ default: m.CreatePersonaPage }))
);
export const PersonaDetailPage = lazy(() =>
  import('@/features/personas/components/detail/PersonaDetailPage').then(m => ({ default: m.PersonaDetailPage }))
);
export const AIPersonaAnalysisPage = lazy(() =>
  import('@/features/personas/components/ai-analysis/AIPersonaAnalysisPage').then(m => ({ default: m.AIPersonaAnalysisPage }))
);
export const AIBrandAssetExplorationPage = lazy(() =>
  import('@/features/brand-asset-detail/components/ai-exploration/AIBrandAssetExplorationPage').then(m => ({ default: m.AIBrandAssetExplorationPage }))
);

// ─── Products ──────────────────────────────────────────────
export const ProductsOverviewPage = lazy(() =>
  import('@/features/products/components/ProductsOverviewPage').then(m => ({ default: m.ProductsOverviewPage }))
);
export const ProductAnalyzerPage = lazy(() =>
  import('@/features/products/components/analyzer/ProductAnalyzerPage').then(m => ({ default: m.ProductAnalyzerPage }))
);
export const ProductDetailPage = lazy(() =>
  import('@/features/products/components/detail/ProductDetailPage').then(m => ({ default: m.ProductDetailPage }))
);

// ─── Market Insights ───────────────────────────────────────
export const MarketInsightsPage = lazy(() =>
  import('@/features/market-insights/components/MarketInsightsPage').then(m => ({ default: m.MarketInsightsPage }))
);
export const InsightDetailPage = lazy(() =>
  import('@/features/market-insights/components/detail/InsightDetailPage').then(m => ({ default: m.InsightDetailPage }))
);

// ─── Knowledge Library ─────────────────────────────────────
export const KnowledgeLibraryPage = lazy(() =>
  import('@/features/knowledge-library/components/KnowledgeLibraryPage').then(m => ({ default: m.KnowledgeLibraryPage }))
);

// ─── Research & Validation ─────────────────────────────────
export const ResearchHubPage = lazy(() =>
  import('@/features/research/components/hub/ResearchHubPage').then(m => ({ default: m.ResearchHubPage }))
);
export const ResearchBundlesPage = lazy(() =>
  import('@/features/research/components/bundles/ResearchBundlesPage').then(m => ({ default: m.ResearchBundlesPage }))
);
export const BundleDetailPage = lazy(() =>
  import('@/features/research/components/bundles/BundleDetailPage').then(m => ({ default: m.BundleDetailPage }))
);
export const CustomValidationPage = lazy(() =>
  import('@/features/research/components/custom/CustomValidationPage').then(m => ({ default: m.CustomValidationPage }))
);
export const ResearchDashboard = lazy(() =>
  import('@/components/ResearchDashboard').then(m => ({ default: m.ResearchDashboard }))
);
export const StrategicResearchPlanner = lazy(() =>
  import('@/components/StrategicResearchPlanner').then(m => ({ default: m.StrategicResearchPlanner }))
);
export const ResearchValidationPage = lazy(() =>
  import('@/components/ResearchValidationPage').then(m => ({ default: m.ResearchValidationPage }))
);

// ─── Campaigns + Content ───────────────────────────────────
export const ActiveCampaignsPage = lazy(() =>
  import('@/features/campaigns/components/overview/ActiveCampaignsPage').then(m => ({ default: m.ActiveCampaignsPage }))
);
export const CampaignDetailPage = lazy(() =>
  import('@/features/campaigns/components/detail/CampaignDetailPage').then(m => ({ default: m.CampaignDetailPage }))
);
export const QuickContentDetailPage = lazy(() =>
  import('@/features/campaigns/components/detail/QuickContentDetailPage').then(m => ({ default: m.QuickContentDetailPage }))
);
export const ContentStudioPage = lazy(() =>
  import('@/features/campaigns/components/studio/ContentStudioPage').then(m => ({ default: m.ContentStudioPage }))
);
export const ContentLibraryPage = lazy(() =>
  import('@/features/campaigns/components/content-library/ContentLibraryPage').then(m => ({ default: m.ContentLibraryPage }))
);
export const CampaignWizardPage = lazy(() =>
  import('@/features/campaigns/components/wizard/CampaignWizardPage').then(m => ({ default: m.CampaignWizardPage }))
);

// ─── Brand Alignment ───────────────────────────────────────
export const BrandAlignmentPage = lazy(() =>
  import('@/components/brand-alignment/BrandAlignmentPage').then(m => ({ default: m.BrandAlignmentPage }))
);

// ─── Settings ──────────────────────────────────────────────
export const SettingsPage = lazy(() =>
  import('@/features/settings/components/SettingsPage').then(m => ({ default: m.SettingsPage }))
);
export const AgencySettingsPage = lazy(() =>
  import('@/components/white-label/AgencySettingsPage').then(m => ({ default: m.AgencySettingsPage }))
);
export const ClientManagementPage = lazy(() =>
  import('@/components/white-label/ClientManagementPage').then(m => ({ default: m.ClientManagementPage }))
);
export const TeamManagementPage = lazy(() =>
  import('@/components/collaboration/TeamManagementPage').then(m => ({ default: m.TeamManagementPage }))
);

// ─── Help ──────────────────────────────────────────────────
export const HelpPage = lazy(() =>
  import('@/features/help/components/HelpPage').then(m => ({ default: m.HelpPage }))
);
export const HelpArticlePage = lazy(() =>
  import('@/components/help/HelpArticlePage').then(m => ({ default: m.HelpArticlePage }))
);

// ─── Misc / Legacy ─────────────────────────────────────────
export const NewStrategyPage = lazy(() =>
  import('@/components/NewStrategyPage').then(m => ({ default: m.NewStrategyPage }))
);
export const CommercialDemoPage = lazy(() =>
  import('@/components/commercial/CommercialDemoPage').then(m => ({ default: m.CommercialDemoPage }))
);
export const ValidationMethodDemo = lazy(() =>
  import('@/components/ValidationMethodDemo').then(m => ({ default: m.ValidationMethodDemo }))
);
export const RelationshipsPage = lazy(() =>
  import('@/components/RelationshipsPage').then(m => ({ default: m.RelationshipsPage }))
);

// ─── Preload ───────────────────────────────────────────────
// Call on sidebar hover to preload the module chunk before user clicks.

const moduleLoaders: Record<string, () => Promise<unknown>> = {
  // Main nav
  'dashboard': () => import('@/components/dashboard/DashboardPage'),
  'brand': () => import('@/components/brand-foundation/BrandFoundationPage'),
  'brandstyle': () => import('@/features/brandstyle/components/BrandstyleAnalyzerPage'),
  'personas': () => import('@/features/personas/components/PersonasPage'),
  'products': () => import('@/features/products/components/ProductsOverviewPage'),
  'trends': () => import('@/features/market-insights/components/MarketInsightsPage'),
  'knowledge': () => import('@/features/knowledge-library/components/KnowledgeLibraryPage'),
  'research': () => import('@/features/research/components/hub/ResearchHubPage'),
  'active-campaigns': () => import('@/features/campaigns/components/overview/ActiveCampaignsPage'),
  'business-strategy': () => import('@/features/business-strategy/components/BusinessStrategyPage'),
  'brand-alignment': () => import('@/components/brand-alignment/BrandAlignmentPage'),
  // Settings
  'settings-account': () => import('@/features/settings/components/SettingsPage'),
  'settings-team': () => import('@/features/settings/components/SettingsPage'),
  'settings-billing': () => import('@/features/settings/components/SettingsPage'),
  'settings-notifications': () => import('@/features/settings/components/SettingsPage'),
  'settings-appearance': () => import('@/features/settings/components/SettingsPage'),
  'settings-agency': () => import('@/components/white-label/AgencySettingsPage'),
  'settings-clients': () => import('@/components/white-label/ClientManagementPage'),
  // Help
  'help': () => import('@/features/help/components/HelpPage'),
};

/**
 * Trigger the dynamic import for a section so the chunk is cached by the
 * browser before the user actually navigates.  Safe to call multiple times —
 * the bundler deduplicates the import().
 */
export function preloadModule(sectionId: string): void {
  moduleLoaders[sectionId]?.();
}
