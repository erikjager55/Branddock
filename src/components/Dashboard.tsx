import React, { useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  Layers,
  Users,
  Package,
  Megaphone,
  TrendingUp,
  BookOpen,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { WelcomeModal, useShouldShowWelcome } from './WelcomeModal';
import { generateNextBestAction } from '../utils/dashboard-decision-transformer';
import {
  useBrandAssets,
  usePersonas,
  useProducts,
  useTrendsContext,
  useKnowledgeContext,
  useCampaignsContext,
} from '../contexts';
import { PageHeader } from './shared/PageHeader';
import { StatsCard, StatsCardGrid } from './shared/StatsCard';
import { PAGE_ICONS } from '../lib/constants/design-tokens';

// ─── Types ────────────────────────────────────────────────

interface DashboardProps {
  onStartResearch?: () => void;
  onNavigateToRelationships?: () => void;
  onNavigate?: (url: string) => void;
}

// ─── Module Card ──────────────────────────────────────────

interface ModuleCardProps {
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  title: string;
  count: number;
  countLabel: string;
  breakdownItems: { label: string; count: number }[];
  sectionId: string;
  onNavigate: (section: string) => void;
}

function ModuleCard({
  icon: Icon,
  iconBgColor,
  iconColor,
  title,
  count,
  countLabel,
  breakdownItems,
  sectionId,
  onNavigate,
}: ModuleCardProps) {
  return (
    <Card
      className="group cursor-pointer hover:border-emerald-200 transition-all"
      onClick={() => onNavigate(sectionId)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBgColor}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500">
                {count} {countLabel}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors mt-1" />
        </div>

        {breakdownItems.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {breakdownItems.map((item) => (
              <span key={item.label} className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">{item.count}</span>{' '}
                {item.label}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Dashboard Component ──────────────────────────────────

export function Dashboard({ onStartResearch, onNavigateToRelationships, onNavigate }: DashboardProps) {
  const [showWelcome, setShowWelcome] = React.useState(false);
  const shouldShowWelcome = useShouldShowWelcome();

  // All 6 context hooks
  const { brandAssets } = useBrandAssets();
  const { personas } = usePersonas();
  const { products } = useProducts();
  const { trends } = useTrendsContext();
  const { knowledge } = useKnowledgeContext();
  const { campaigns } = useCampaignsContext();

  React.useEffect(() => {
    setShowWelcome(shouldShowWelcome);
  }, [shouldShowWelcome]);

  // Next best action (keep existing logic)
  const nextBestAction = useMemo(() => {
    const action = generateNextBestAction(brandAssets, personas);
    if (!action) {
      return {
        title: 'Continue Building',
        description: 'Your strategic foundation is strong. Keep validating and refining.',
        actionLabel: 'View Research Hub',
        targetSection: 'research',
        estimatedTime: '',
      };
    }
    return {
      title: action.title,
      description: action.reason,
      actionLabel: 'Take Action',
      targetSection:
        action.targetType === 'asset' ? 'brand' : action.targetType === 'persona' ? 'personas' : 'research',
      estimatedTime: action.estimatedTime,
    };
  }, [brandAssets, personas]);

  // ─── Status breakdowns ──────────────────────────────────

  const brandAssetBreakdown = useMemo(() => {
    const validated = brandAssets.filter((a) => a.status === 'validated').length;
    const readyToValidate = brandAssets.filter((a) => a.status === 'ready-to-validate').length;
    const inDevelopment = brandAssets.filter((a) => a.status === 'in-development').length;
    const awaiting = brandAssets.filter((a) => a.status === 'awaiting-research').length;
    return [
      { label: 'validated', count: validated },
      { label: 'ready to validate', count: readyToValidate },
      { label: 'in development', count: inDevelopment },
      { label: 'awaiting research', count: awaiting },
    ].filter((i) => i.count > 0);
  }, [brandAssets]);

  const personaBreakdown = useMemo(() => {
    const validated = personas.filter((p) => (p as any).validationPercentage ?? (p as any).validationScore ?? 0 >= 80).length;
    const inResearch = personas.filter((p) => (p as any).validationPercentage ?? (p as any).validationScore ?? 0 >= 30 && (p as any).validationPercentage ?? (p as any).validationScore ?? 0 < 80).length;
    const draft = personas.filter((p) => (p as any).validationPercentage ?? (p as any).validationScore ?? 0 < 30).length;
    return [
      { label: 'validated', count: validated },
      { label: 'in research', count: inResearch },
      { label: 'draft', count: draft },
    ].filter((i) => i.count > 0);
  }, [personas]);

  const productBreakdown = useMemo(() => {
    const byCategory: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    return Object.entries(byCategory).map(([label, count]) => ({ label, count }));
  }, [products]);

  const campaignBreakdown = useMemo(() => {
    const ready = campaigns.filter((c) => c.status === 'ready').length;
    const draft = campaigns.filter((c) => c.status === 'draft').length;
    const generating = campaigns.filter((c) => c.status === 'generating').length;
    return [
      { label: 'ready', count: ready },
      { label: 'draft', count: draft },
      { label: 'generating', count: generating },
    ].filter((i) => i.count > 0);
  }, [campaigns]);

  const trendBreakdown = useMemo(() => {
    const high = trends.filter((t) => t.impact === 'high').length;
    const medium = trends.filter((t) => t.impact === 'medium').length;
    const low = trends.filter((t) => t.impact === 'low').length;
    return [
      { label: 'high impact', count: high },
      { label: 'medium', count: medium },
      { label: 'low', count: low },
    ].filter((i) => i.count > 0);
  }, [trends]);

  const knowledgeBreakdown = useMemo(() => {
    const byCategory: Record<string, number> = {};
    knowledge.forEach((k) => {
      const cat = k.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    return Object.entries(byCategory).map(([label, count]) => ({ label: label.replace(/-/g, ' '), count }));
  }, [knowledge]);

  const handleNavigate = (section: string) => {
    if (onNavigate) {
      onNavigate(section);
    }
  };

  // Icon colors from design tokens
  const icons = {
    brand: PAGE_ICONS['brand-foundation'] || { bgColor: 'bg-emerald-50', iconColor: 'text-emerald-500' },
    personas: PAGE_ICONS['personas'] || { bgColor: 'bg-violet-50', iconColor: 'text-violet-500' },
    products: PAGE_ICONS['products'] || { bgColor: 'bg-orange-50', iconColor: 'text-orange-500' },
    campaigns: PAGE_ICONS['campaigns'] || { bgColor: 'bg-purple-50', iconColor: 'text-purple-500' },
    trends: PAGE_ICONS['market-insights'] || { bgColor: 'bg-cyan-50', iconColor: 'text-cyan-500' },
    knowledge: PAGE_ICONS['knowledge-library'] || { bgColor: 'bg-amber-50', iconColor: 'text-amber-500' },
  };

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Page Header */}
      <PageHeader moduleKey="overview" />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Stats Cards — 3x2 grid */}
        <StatsCardGrid columns={3}>
          <StatsCard
            label="Brand Assets"
            value={brandAssets.length}
            icon="Layers"
            iconBgColor={icons.brand.bgColor}
            iconColor={icons.brand.iconColor}
          />
          <StatsCard
            label="Personas"
            value={personas.length}
            icon="Users"
            iconBgColor={icons.personas.bgColor}
            iconColor={icons.personas.iconColor}
          />
          <StatsCard
            label="Products"
            value={products.length}
            icon="Package"
            iconBgColor={icons.products.bgColor}
            iconColor={icons.products.iconColor}
          />
          <StatsCard
            label="Campaigns"
            value={campaigns.length}
            icon="Megaphone"
            iconBgColor={icons.campaigns.bgColor}
            iconColor={icons.campaigns.iconColor}
          />
          <StatsCard
            label="Market Insights"
            value={trends.length}
            icon="TrendingUp"
            iconBgColor={icons.trends.bgColor}
            iconColor={icons.trends.iconColor}
          />
          <StatsCard
            label="Knowledge"
            value={knowledge.length}
            icon="BookOpen"
            iconBgColor={icons.knowledge.bgColor}
            iconColor={icons.knowledge.iconColor}
          />
        </StatsCardGrid>

        {/* Module Overview Cards — 2 column grid */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4 px-1">
            Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModuleCard
              icon={Layers}
              iconBgColor={icons.brand.bgColor}
              iconColor={icons.brand.iconColor}
              title="Brand Assets"
              count={brandAssets.length}
              countLabel="assets"
              breakdownItems={brandAssetBreakdown}
              sectionId="brand"
              onNavigate={handleNavigate}
            />
            <ModuleCard
              icon={Users}
              iconBgColor={icons.personas.bgColor}
              iconColor={icons.personas.iconColor}
              title="Personas"
              count={personas.length}
              countLabel="personas"
              breakdownItems={personaBreakdown}
              sectionId="personas"
              onNavigate={handleNavigate}
            />
            <ModuleCard
              icon={Package}
              iconBgColor={icons.products.bgColor}
              iconColor={icons.products.iconColor}
              title="Products & Services"
              count={products.length}
              countLabel="items"
              breakdownItems={productBreakdown}
              sectionId="products"
              onNavigate={handleNavigate}
            />
            <ModuleCard
              icon={Megaphone}
              iconBgColor={icons.campaigns.bgColor}
              iconColor={icons.campaigns.iconColor}
              title="Campaigns"
              count={campaigns.length}
              countLabel="campaigns"
              breakdownItems={campaignBreakdown}
              sectionId="active-campaigns"
              onNavigate={handleNavigate}
            />
            <ModuleCard
              icon={TrendingUp}
              iconBgColor={icons.trends.bgColor}
              iconColor={icons.trends.iconColor}
              title="Market Insights"
              count={trends.length}
              countLabel="trends"
              breakdownItems={trendBreakdown}
              sectionId="trends"
              onNavigate={handleNavigate}
            />
            <ModuleCard
              icon={BookOpen}
              iconBgColor={icons.knowledge.bgColor}
              iconColor={icons.knowledge.iconColor}
              title="Knowledge Library"
              count={knowledge.length}
              countLabel="items"
              breakdownItems={knowledgeBreakdown}
              sectionId="knowledge"
              onNavigate={handleNavigate}
            />
          </div>
        </div>

        {/* Recommended Next Step — CTA card */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-1">{nextBestAction.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{nextBestAction.description}</p>
                <div className="flex items-center gap-3">
                  <Button onClick={() => handleNavigate(nextBestAction.targetSection)} className="gap-2">
                    {nextBestAction.actionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {nextBestAction.estimatedTime && (
                    <span className="text-xs text-muted-foreground">{nextBestAction.estimatedTime}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Modal */}
      <WelcomeModal isOpen={showWelcome} onClose={() => setShowWelcome(false)} />
    </div>
  );
}
