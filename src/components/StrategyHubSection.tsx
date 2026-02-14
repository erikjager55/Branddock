import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import {
  Zap,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Info,
  Lock,
  Star,
  Filter,
  Grid3x3,
  List,
  Search,
  ArrowLeft,
  CheckCircle,
  FileText,
  Play,
  ChevronRight,
  Heart,
  ChevronDown,
  Clock,
  BarChart3
} from 'lucide-react';
import { StrategyTool, StrategyCategory } from '../types/strategy';
import { 
  strategyTools, 
  strategyCategories, 
  getToolsByCategory,
  getPopularTools,
  getToolsRequiringResearch
} from '../data/strategy-tools';
import { Input } from './ui/input';
import { CampaignStrategyGeneratorDetail } from './strategy-tools/CampaignStrategyGeneratorDetail';
import { UniversalAIExploration } from './strategy-tools/UniversalAIExploration';
import { useResearchBundles } from '../contexts/ResearchBundleContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type ViewMode = 'grid' | 'list';
type TabMode = 'all' | 'favorites' | 'recent';
type SortMode = 'popular' | 'alphabetical' | 'recent';
type StatusFilter = 'all' | 'locked' | 'unlocked';

export function StrategyHubSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<StrategyTool | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabMode>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchExpanded, setSearchExpanded] = useState(false);
  
  // Get bundle context
  const { isToolUnlocked, unlockedStrategyTools } = useResearchBundles();

  // Favorites state (in real app, would persist to localStorage or backend)
  const [favoriteToolIds, setFavoriteToolIds] = useState<string[]>(['campaign-strategy-generator', 'brand-positioning', 'content-calendar']);
  const [recentToolIds] = useState<string[]>(['campaign-strategy-generator', 'brand-voice', 'messaging-framework', 'creative-brief']);

  // Toggle favorite function
  const toggleFavorite = (toolId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent opening the tool when clicking the heart
    }
    setFavoriteToolIds(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  // Filter and sort tools
  const getFilteredTools = () => {
    let filtered = strategyTools.filter(t => t.status === 'available');

    // Tab filter
    if (activeTab === 'favorites') {
      filtered = filtered.filter(t => favoriteToolIds.includes(t.id));
    } else if (activeTab === 'recent') {
      filtered = filtered.filter(t => recentToolIds.includes(t.id));
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Status filter
    if (statusFilter === 'locked') {
      filtered = filtered.filter(t => !isToolUnlocked(t.id));
    } else if (statusFilter === 'unlocked') {
      filtered = filtered.filter(t => isToolUnlocked(t.id));
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tagline.toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortMode === 'alphabetical') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'recent') {
      // Sort by recent first (based on recentToolIds order)
      filtered.sort((a, b) => {
        const aIndex = recentToolIds.indexOf(a.id);
        const bIndex = recentToolIds.indexOf(b.id);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }
    // 'popular' is default order from data

    return filtered;
  };

  const filteredTools = getFilteredTools();

  if (selectedTool) {
    // Use custom detail component for Campaign Strategy Generator
    if (selectedTool.id === 'campaign-strategy-generator') {
      return (
        <CampaignStrategyGeneratorDetail 
          tool={selectedTool} 
          onBack={() => setSelectedTool(null)} 
        />
      );
    }
    
    // Default detail view for other tools
    return <StrategyToolDetail tool={selectedTool} onBack={() => setSelectedTool(null)} />;
  }

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Compact Sticky Header - CLEAN */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Strategy Hub</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'} available
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        {/* Filter Controls - Moved to Content */}
        <div className="flex items-center gap-2 mb-6">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSortMode('popular')}>
                <Star className="h-4 w-4 mr-2" />
                Most Popular
                {sortMode === 'popular' && <CheckCircle className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode('alphabetical')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                A-Z
                {sortMode === 'alphabetical' && <CheckCircle className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode('recent')}>
                <Clock className="h-4 w-4 mr-2" />
                Recently Used
                {sortMode === 'recent' && <CheckCircle className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                All Tools
                {statusFilter === 'all' && <CheckCircle className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('unlocked')}>
                Unlocked Only
                {statusFilter === 'unlocked' && <CheckCircle className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('locked')}>
                Locked Only
                {statusFilter === 'locked' && <CheckCircle className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          {searchExpanded ? (
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
                autoFocus
                onBlur={() => {
                  if (!searchQuery) setSearchExpanded(false);
                }}
              />
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchExpanded(true)}
              className="h-9 w-9 p-0"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>

        {filteredTools.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tools found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Try adjusting your filters or search query
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(null);
                setStatusFilter('all');
                setActiveTab('all');
              }}
            >
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
              : 'space-y-4'
          }>
            {filteredTools.map(tool => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onClick={() => setSelectedTool(tool)}
                viewMode={viewMode}
                isFavorite={favoriteToolIds.includes(tool.id)}
                isRecent={recentToolIds.includes(tool.id)}
                toggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Tool Card Component
interface ToolCardProps {
  tool: StrategyTool;
  onClick: () => void;
  compact?: boolean;
  viewMode?: ViewMode;
  isFavorite?: boolean;
  isRecent?: boolean;
  toggleFavorite?: (toolId: string, e?: React.MouseEvent) => void;
}

function ToolCard({ tool, onClick, compact, viewMode, isFavorite, isRecent, toggleFavorite }: ToolCardProps) {
  const ToolIcon = tool.icon;
  const { isToolUnlocked } = useResearchBundles();
  const isLocked = !isToolUnlocked(tool.id);

  // List view rendering
  if (viewMode === 'list') {
    return (
      <Card
        className={`cursor-pointer transition-all hover:shadow-md hover:border-primary group relative ${
          isLocked ? 'opacity-60' : ''
        }`}
        onClick={isLocked ? undefined : onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className={`h-14 w-14 rounded-xl flex items-center justify-center shrink-0 ${
              tool.color === 'blue' ? 'bg-blue-500/10' :
              tool.color === 'green' ? 'bg-green-500/10' :
              tool.color === 'purple' ? 'bg-purple-500/10' :
              tool.color === 'pink' ? 'bg-pink-500/10' :
              tool.color === 'amber' ? 'bg-amber-500/10' :
              'bg-orange-500/10'
            }`}>
              <ToolIcon className={`h-7 w-7 ${
                tool.color === 'blue' ? 'text-blue-600' :
                tool.color === 'green' ? 'text-green-600' :
                tool.color === 'purple' ? 'text-purple-600' :
                tool.color === 'pink' ? 'text-pink-600' :
                tool.color === 'amber' ? 'text-amber-600' :
                'text-orange-600'
              }`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{tool.name}</CardTitle>
                {/* Favorite heart button - inline with title */}
                {toggleFavorite && (
                  <button
                    onClick={(e) => toggleFavorite(tool.id, e)}
                    className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart 
                      className={`h-4 w-4 transition-all ${
                        isFavorite 
                          ? 'text-red-500 fill-red-500' 
                          : 'text-muted-foreground hover:text-red-500'
                      }`} 
                    />
                  </button>
                )}
                {isRecent && !isFavorite && (
                  <Badge variant="secondary" className="text-xs">Recent</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">{tool.tagline}</p>
              
              {/* Metadata */}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="capitalize">{tool.aiLevel.replace('-', ' ')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="capitalize">{tool.businessValue}</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2">
              {tool.badge && !isLocked && (
                <Badge className={
                  tool.color === 'blue' ? 'bg-blue-500' :
                  tool.color === 'green' ? 'bg-green-500' :
                  tool.color === 'purple' ? 'bg-purple-500' :
                  tool.color === 'pink' ? 'bg-pink-500' :
                  tool.color === 'amber' ? 'bg-amber-500' :
                  'bg-orange-500'
                }>
                  {tool.badge}
                </Badge>
              )}
              {isLocked && (
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
            </div>

            {/* Arrow */}
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view rendering (original)
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg hover:border-primary group relative ${
        isLocked ? 'opacity-60' : ''
      }`}
      onClick={isLocked ? undefined : onClick}
    >
      {/* Favorite heart - top left corner */}
      {toggleFavorite && (
        <button
          onClick={(e) => toggleFavorite(tool.id, e)}
          className={`absolute top-3 left-3 z-10 p-2 rounded-full transition-all ${
            isFavorite 
              ? 'bg-red-500/10 opacity-100' 
              : 'bg-background/80 opacity-0 group-hover:opacity-100'
          } backdrop-blur-sm hover:scale-110`}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart 
            className={`h-4 w-4 transition-all ${
              isFavorite 
                ? 'text-red-500 fill-red-500' 
                : 'text-muted-foreground'
            }`} 
          />
        </button>
      )}

      {/* Top badges */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {tool.badge && !isLocked && (
          <Badge className={
            tool.color === 'blue' ? 'bg-blue-500' :
            tool.color === 'green' ? 'bg-green-500' :
            tool.color === 'purple' ? 'bg-purple-500' :
            tool.color === 'pink' ? 'bg-pink-500' :
            tool.color === 'amber' ? 'bg-amber-500' :
            'bg-orange-500'
          }>
            {tool.badge}
          </Badge>
        )}
        {isLocked && (
          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
            <Lock className="h-3 w-3 mr-1" />
            Locked
          </Badge>
        )}
      </div>

      <CardHeader>
        <div className={`flex items-start gap-4 ${compact ? '' : 'mb-2'} ${tool.badge || isLocked ? 'pr-12' : ''}`}>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
            tool.color === 'blue' ? 'bg-blue-500/10' :
            tool.color === 'green' ? 'bg-green-500/10' :
            tool.color === 'purple' ? 'bg-purple-500/10' :
            tool.color === 'pink' ? 'bg-pink-500/10' :
            tool.color === 'amber' ? 'bg-amber-500/10' :
            'bg-orange-500/10'
          }`}>
            <ToolIcon className={`h-6 w-6 ${
              tool.color === 'blue' ? 'text-blue-600' :
              tool.color === 'green' ? 'text-green-600' :
              tool.color === 'purple' ? 'text-purple-600' :
              tool.color === 'pink' ? 'text-pink-600' :
              tool.color === 'amber' ? 'text-amber-600' :
              'text-orange-600'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{tool.name}</CardTitle>
              {isRecent && !isFavorite && (
                <Badge variant="secondary" className="text-xs">Recent</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{tool.tagline}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {tool.description}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="capitalize">{tool.aiLevel.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="capitalize">{tool.businessValue}</span>
          </div>
        </div>

        <div className="pt-3 border-t">
          <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
            Use this tool
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Tool Detail View (Placeholder)
interface StrategyToolDetailProps {
  tool: StrategyTool;
  onBack: () => void;
}

function StrategyToolDetail({ tool, onBack }: StrategyToolDetailProps) {
  const [showAIExploration, setShowAIExploration] = useState(false);
  const ToolIcon = tool.icon;

  if (showAIExploration) {
    return (
      <UniversalAIExploration
        tool={tool}
        onBack={() => setShowAIExploration(false)}
        onComplete={(results) => {
          console.log('AI Exploration completed:', results);
          setShowAIExploration(false);
        }}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-6 space-y-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Strategy Hub
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className={`h-16 w-16 rounded-xl flex items-center justify-center ${
                tool.color === 'blue' ? 'bg-blue-500/10' :
                tool.color === 'purple' ? 'bg-purple-500/10' :
                tool.color === 'green' ? 'bg-green-500/10' :
                tool.color === 'pink' ? 'bg-pink-500/10' :
                tool.color === 'amber' ? 'bg-amber-500/10' :
                'bg-orange-500/10'
              }`}>
                <ToolIcon className={`h-8 w-8 ${
                  tool.color === 'blue' ? 'text-blue-600' :
                  tool.color === 'purple' ? 'text-purple-600' :
                  tool.color === 'green' ? 'text-green-600' :
                  tool.color === 'pink' ? 'text-pink-600' :
                  tool.color === 'amber' ? 'text-amber-600' :
                  'text-orange-600'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-2xl">{tool.name}</CardTitle>
                  {tool.badge && (
                    <Badge className={
                      tool.color === 'blue' ? 'bg-blue-500' :
                      tool.color === 'green' ? 'bg-green-500' :
                      tool.color === 'purple' ? 'bg-purple-500' :
                      tool.color === 'pink' ? 'bg-pink-500' :
                      tool.color === 'amber' ? 'bg-amber-500' :
                      'bg-orange-500'
                    }>
                      {tool.badge}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-base">{tool.tagline}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              {tool.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">AI Level</span>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {tool.aiLevel.replace('-', ' ')}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Business Value</span>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {tool.businessValue}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Complexity</span>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {tool.complexity}
                </p>
              </div>
            </div>

            <Separator />

            {/* Use Cases */}
            {tool.useCases && tool.useCases.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Use Cases</h3>
                <ul className="space-y-2">
                  {tool.useCases.map((useCase, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{useCase}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Separator />

            {/* AI-Powered Generation */}
            <div className="p-6 rounded-lg bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-100 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-fuchsia-950/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">AI-Powered Generation</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Let AI guide you through creating your {tool.name.toLowerCase()}. Answer strategic questions and receive intelligent, tailored recommendations.
                  </p>
                  <Button 
                    size="lg" 
                    onClick={() => setShowAIExploration(true)}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Start AI-Powered Generation
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Outputs */}
            <div>
              <h3 className="font-semibold mb-3">What You'll Get</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{tool.outputs.primary}</p>
                    <p className="text-xs text-muted-foreground">
                      Estimated time: {tool.outputs.estimatedTime}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}