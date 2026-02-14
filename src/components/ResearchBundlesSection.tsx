import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Crown,
  Target,
  Package,
  ArrowRight,
  Clock,
  CheckCircle,
  Sparkles,
  TrendingUp,
  Star,
  Filter,
  X,
  LayoutGrid,
  Table2,
  Users,
  MessageSquare,
  ClipboardList,
  Bot,
  Briefcase,
  Heart,
  Globe,
  Palette,
  BookOpen,
  Search,
  Layers,
  Database,
  Zap,
  Award,
  Play,
  ChevronRight,
  Lock,
  Unlock,
  TrendingDown,
  Activity,
  Lightbulb,
  Rocket
} from 'lucide-react';
import {
  getFoundationBundles,
  getSpecializedBundles,
  getStrategyToolsUnlockedByBundle,
  ResearchBundle
} from '../data/research-bundles';
import { strategyTools } from '../data/strategy-tools';
import { useResearchBundles } from '../contexts/ResearchBundleContext';
import { UnifiedResearchCard } from './UnifiedResearchCard';
import { ResearchFoundationMatrix } from './ResearchFoundationMatrix';
import { Input } from './ui/input';

interface ResearchBundlesSectionProps {
  onSelectBundle: (bundle: ResearchBundle) => void;
}

type ViewMode = 'grid' | 'matrix';
type BundleTypeFilter = 'all' | 'foundation' | 'specialized' | 'legacy';
type TargetCategoryFilter = 'all' | 'brand' | 'persona' | 'trends' | 'products-services' | 'knowledge';
type ResearchMethodFilter = 'all' | 'workshop' | 'interviews' | 'questionnaire' | 'ai-agent';

export function ResearchBundlesSection({ onSelectBundle }: ResearchBundlesSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [bundleTypeFilter, setBundleTypeFilter] = useState<BundleTypeFilter>('all');
  const [targetCategoryFilter, setTargetCategoryFilter] = useState<TargetCategoryFilter>('all');
  const [methodFilter, setMethodFilter] = useState<ResearchMethodFilter>('all');
  
  const { purchaseBundle, isBundlePurchased } = useResearchBundles();

  const foundationBundles = getFoundationBundles();
  const specializedBundles = getSpecializedBundles();
  const allBundles = [...foundationBundles, ...specializedBundles];

  // Filter bundles
  const filteredBundles = useMemo(() => {
    let filtered = allBundles;

    // Filter by bundle type
    if (bundleTypeFilter !== 'all') {
      filtered = filtered.filter(b => b.bundleType === bundleTypeFilter);
    }

    // Filter by target category
    if (targetCategoryFilter !== 'all') {
      filtered = filtered.filter(b => b.targetCategory === targetCategoryFilter);
    }

    // Filter by research method
    if (methodFilter !== 'all') {
      filtered = filtered.filter(b => 
        b.primaryTool.toLowerCase() === methodFilter || 
        b.secondaryTool?.toLowerCase() === methodFilter
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(query) ||
        b.description.toLowerCase().includes(query) ||
        b.outcome.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allBundles, bundleTypeFilter, targetCategoryFilter, methodFilter, searchQuery]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (bundleTypeFilter !== 'all') count++;
    if (targetCategoryFilter !== 'all') count++;
    if (methodFilter !== 'all') count++;
    return count;
  }, [bundleTypeFilter, targetCategoryFilter, methodFilter]);

  // Clear all filters
  const clearFilters = () => {
    setBundleTypeFilter('all');
    setTargetCategoryFilter('all');
    setMethodFilter('all');
    setSearchQuery('');
  };

  const renderBundleCard = (bundle: ResearchBundle) => {
    const strategyToolsUnlocked = getStrategyToolsUnlockedByBundle(bundle.id);
    const strategyToolNames = strategyToolsUnlocked
      .map(id => strategyTools.find(t => t.id === id)?.name)
      .filter(Boolean) as string[];

    return (
      <UnifiedResearchCard
        key={bundle.id}
        id={bundle.id}
        name={bundle.name}
        description={bundle.description}
        icon={bundle.icon}
        color={bundle.color}
        badge={bundle.badge}
        tier={bundle.tier}
        strategyTools={strategyToolNames}
        scoreBoost={bundle.scoreBoost}
        activities={bundle.activities || []}
        timeline={bundle.timeline}
        methods={[bundle.primaryTool, bundle.secondaryTool].filter(Boolean) as string[]}
        basePrice={bundle.basePrice}
        bundlePrice={bundle.bundlePrice}
        savings={bundle.savings}
        outcome={bundle.outcome}
        onSelect={() => {
          setSelectedBundle(bundle.id);
          onSelectBundle(bundle);
        }}
        isSelected={selectedBundle === bundle.id}
        buttonText="Select Bundle"
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and View Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search bundles by name, description, or outcome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={viewMode === 'matrix' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('matrix')}
          >
            <Database className="w-4 h-4 mr-2" />
            Foundation Matrix
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Filter Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="default" className="text-xs">
                    {activeFiltersCount} active
                  </Badge>
                )}
              </div>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-3 h-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>

            {/* Filter Options */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Bundle Type Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">BUNDLE TYPE</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={bundleTypeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBundleTypeFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={bundleTypeFilter === 'foundation' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBundleTypeFilter('foundation')}
                  >
                    <Crown className="w-4 h-4 mr-1" />
                    Foundation
                  </Button>
                  <Button
                    variant={bundleTypeFilter === 'specialized' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBundleTypeFilter('specialized')}
                  >
                    <Target className="w-4 h-4 mr-1" />
                    Specialized
                  </Button>
                </div>
              </div>

              {/* Target Category Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">TARGET CATEGORY</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={targetCategoryFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTargetCategoryFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={targetCategoryFilter === 'brand' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTargetCategoryFilter('brand')}
                  >
                    <Palette className="w-3 h-3 mr-1" />
                    Brand
                  </Button>
                  <Button
                    variant={targetCategoryFilter === 'persona' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTargetCategoryFilter('persona')}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Personas
                  </Button>
                  <Button
                    variant={targetCategoryFilter === 'trends' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTargetCategoryFilter('trends')}
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Trends
                  </Button>
                </div>
              </div>

              {/* Research Method Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">RESEARCH METHOD</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={methodFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMethodFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={methodFilter === 'workshop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMethodFilter('workshop')}
                  >
                    <Briefcase className="w-3 h-3 mr-1" />
                    Workshop
                  </Button>
                  <Button
                    variant={methodFilter === 'interviews' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMethodFilter('interviews')}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Interviews
                  </Button>
                  <Button
                    variant={methodFilter === 'questionnaire' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMethodFilter('questionnaire')}
                  >
                    <ClipboardList className="w-3 h-3 mr-1" />
                    Survey
                  </Button>
                  <Button
                    variant={methodFilter === 'ai-agent' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMethodFilter('ai-agent')}
                  >
                    <Bot className="w-3 h-3 mr-1" />
                    AI Agent
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredBundles.length}</span> of{' '}
          <span className="font-medium text-foreground">{allBundles.length}</span> bundles
        </p>
      </div>

      {/* Content Views */}
      {viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBundles.map(renderBundleCard)}
        </div>
      ) : (
        <ResearchFoundationMatrix 
          bundles={filteredBundles}
          onSelectBundle={(bundle) => {
            if (bundle && bundle.id) {
              setSelectedBundle(bundle.id);
              onSelectBundle(bundle);
            }
          }}
        />
      )}

      {/* Empty State */}
      {filteredBundles.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-lg font-semibold mb-2">No bundles found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your filters or search query to see more results
            </p>
            {activeFiltersCount > 0 && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear all filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Star className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2">Why Choose Research Bundles?</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Unlock Strategy Tools:</strong> Each bundle unlocks specific strategy generation capabilities</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Better Value:</strong> Bundles save 15-25% compared to individual research methods</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Complete Research:</strong> Combines multiple research methods for comprehensive insights</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}