import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PageCard } from './ui/page-card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Zap,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Target,
  FileText,
  Users,
  Calendar,
  MessageSquare,
  Palette,
  BarChart3,
  Brain,
  Megaphone,
  Globe,
  Heart,
  Share2,
  BookOpen,
  Lightbulb,
  Rocket,
  Map,
  CheckCircle2,
  Search,
  Filter,
  X
} from 'lucide-react';
import { CampaignStrategyGeneratorDetail } from './strategy-tools/CampaignStrategyGeneratorDetail';
import { UniversalAIExploration } from './strategy-tools/UniversalAIExploration';
import { UniversalStrategyGenerator } from './strategy-tools/UniversalStrategyGenerator';
import { FrameworkWorkspace } from './strategy-tools/FrameworkWorkspace';
import { frameworkConfigs } from './strategy-tools/framework-configs';
import { CampaignWorkspace } from './CampaignWorkspace';

interface StrategyFramework {
  id: string;
  title: string;
  description: string;
  tag?: {
    label: string;
    variant: 'popular' | 'new' | 'value' | 'ai';
  };
  icon: React.ComponentType<{ className?: string }>;
  features?: string[];
  estimatedTime?: string;
}

const frameworks: StrategyFramework[] = [
  {
    id: 'campaign-strategy',
    title: 'Campaign Strategy Generator',
    description: 'Generate comprehensive campaign plans based on brand positioning and personas.',
    tag: { label: 'Most Popular', variant: 'popular' },
    icon: Rocket,
    features: ['Multi-channel planning', 'Audience targeting', 'Budget allocation'],
    estimatedTime: '15-20 min'
  },
  {
    id: 'content-strategy',
    title: 'Content Strategy Planner',
    description: 'Plan your content ecosystem aligned with brand voice.',
    tag: { label: 'High Value', variant: 'value' },
    icon: FileText,
    features: ['Content calendar', 'Channel strategy', 'Voice alignment'],
    estimatedTime: '10-15 min'
  },
  {
    id: 'brand-positioning',
    title: 'Brand Positioning Framework',
    description: 'Define your unique market position and value proposition.',
    tag: { label: 'AI Assisted', variant: 'ai' },
    icon: Target,
    features: ['Competitive analysis', 'Value mapping', 'Positioning statement'],
    estimatedTime: '20-25 min'
  },
  {
    id: 'messaging-framework',
    title: 'Messaging & Communication',
    description: 'Create consistent messaging across all touchpoints.',
    icon: MessageSquare,
    features: ['Key messages', 'Tone of voice', 'Messaging hierarchy'],
    estimatedTime: '15-20 min'
  },
  {
    id: 'persona-journey',
    title: 'Persona Journey Mapping',
    description: 'Map customer journeys and identify key touchpoints.',
    tag: { label: 'AI Assisted', variant: 'ai' },
    icon: Users,
    features: ['Journey stages', 'Touchpoint mapping', 'Pain point analysis'],
    estimatedTime: '25-30 min'
  },
  {
    id: 'content-calendar',
    title: 'Content Calendar Builder',
    description: 'Plan and schedule content across channels.',
    icon: Calendar,
    features: ['Multi-channel scheduling', 'Theme planning', 'Campaign alignment'],
    estimatedTime: '10-15 min'
  },
  {
    id: 'brand-voice',
    title: 'Brand Voice & Tone Guide',
    description: 'Establish consistent brand communication style.',
    icon: Palette,
    features: ['Voice attributes', 'Tone guidelines', 'Example library'],
    estimatedTime: '15-20 min'
  },
  {
    id: 'competitive-analysis',
    title: 'Competitive Intelligence',
    description: 'Analyze competitors and identify market opportunities.',
    tag: { label: 'New', variant: 'new' },
    icon: BarChart3,
    features: ['SWOT analysis', 'Market positioning', 'Opportunity mapping'],
    estimatedTime: '20-25 min'
  },
  {
    id: 'creative-brief',
    title: 'Creative Brief Generator',
    description: 'Create detailed briefs for creative projects.',
    icon: Lightbulb,
    features: ['Objectives definition', 'Target audience', 'Creative requirements'],
    estimatedTime: '10-15 min'
  },
  {
    id: 'go-to-market',
    title: 'Go-to-Market Strategy',
    description: 'Plan product launches and market entry strategies.',
    tag: { label: 'High Value', variant: 'value' },
    icon: Megaphone,
    features: ['Launch planning', 'Channel strategy', 'Timeline mapping'],
    estimatedTime: '30-35 min'
  },
  {
    id: 'social-media',
    title: 'Social Media Strategy',
    description: 'Develop platform-specific social media strategies.',
    icon: Share2,
    features: ['Platform selection', 'Content pillars', 'Engagement tactics'],
    estimatedTime: '15-20 min'
  },
  {
    id: 'thought-leadership',
    title: 'Thought Leadership Plan',
    description: 'Build authority through strategic content and engagement.',
    icon: BookOpen,
    features: ['Topic selection', 'Content formats', 'Distribution strategy'],
    estimatedTime: '20-25 min'
  }
];

const tagStyles = {
  popular: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  value: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  ai: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800'
};

export function NewStrategyPage() {
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all');

  // Mock tool data for Campaign Strategy Generator
  const campaignStrategyTool = {
    id: 'campaign-strategy',
    name: 'Campaign Strategy Generator',
    description: 'Generate comprehensive campaign plans based on brand positioning and personas',
    category: 'strategic-planning',
    icon: 'Rocket',
    status: 'available' as const,
    requiresResearch: false,
    popularity: 95,
    estimatedTime: '15-20 min'
  };

  // Filter frameworks based on search and selected filters
  const filteredFrameworks = frameworks.filter(framework => {
    // Search filter
    const matchesSearch = 
      searchQuery === '' ||
      framework.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      framework.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      framework.features?.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));

    // Tag filter
    const matchesTag = 
      selectedTag === 'all' ||
      (framework.tag && framework.tag.label === selectedTag);

    // Time range filter
    const matchesTime = 
      selectedTimeRange === 'all' ||
      (framework.estimatedTime && (() => {
        const minutes = parseInt(framework.estimatedTime.split('-')[0]);
        if (selectedTimeRange === 'quick') return minutes <= 15;
        if (selectedTimeRange === 'medium') return minutes > 15 && minutes <= 25;
        if (selectedTimeRange === 'extended') return minutes > 25;
        return false;
      })());

    return matchesSearch && matchesTag && matchesTime;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(frameworks.filter(f => f.tag).map(f => f.tag!.label)));

  // Reset all filters
  const handleReset = () => {
    setSearchQuery('');
    setSelectedTag('all');
    setSelectedTimeRange('all');
  };

  const hasActiveFilters = searchQuery !== '' || selectedTag !== 'all' || selectedTimeRange !== 'all';

  // Show CampaignWorkspace for Campaign Strategy Generator
  if (selectedFramework === 'campaign-strategy') {
    return <CampaignWorkspace campaignId="1" onBack={() => setSelectedFramework(null)} />;
  }

  // Show FrameworkWorkspace for all other strategy frameworks
  if (selectedFramework) {
    const framework = frameworks.find(f => f.id === selectedFramework);
    const config = frameworkConfigs[selectedFramework];
    
    if (framework && config) {
      return (
        <FrameworkWorkspace
          frameworkId={framework.id}
          config={config}
          onBack={() => setSelectedFramework(null)}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
              <Rocket className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold mb-1">New Strategy</h1>
              <p className="text-muted-foreground">
                Choose a strategy type to begin
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Search and Filter Bar */}
        <div className="mt-6 flex gap-3">
          {/* Search Input */}
          <Input
            placeholder="Search strategies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          
          {/* Tag Filter */}
          <Select
            value={selectedTag}
            onValueChange={(value) => setSelectedTag(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tag">
                {selectedTag === 'all' ? 'All Tags' : selectedTag}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Time Range Filter */}
          <Select
            value={selectedTimeRange}
            onValueChange={(value) => setSelectedTimeRange(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Duration">
                {selectedTimeRange === 'all' && 'All Durations'}
                {selectedTimeRange === 'quick' && 'Quick (≤15 min)'}
                {selectedTimeRange === 'medium' && 'Medium (15-25 min)'}
                {selectedTimeRange === 'extended' && 'Extended (>25 min)'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Durations</SelectItem>
              <SelectItem value="quick">Quick (≤15 min)</SelectItem>
              <SelectItem value="medium">Medium (15-25 min)</SelectItem>
              <SelectItem value="extended">Extended (&gt;25 min)</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0"
              onClick={handleReset}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results Count */}
        {hasActiveFilters && (
          <div className="mt-3 text-sm text-muted-foreground">
            Showing {filteredFrameworks.length} of {frameworks.length} {filteredFrameworks.length === 1 ? 'strategy' : 'strategies'}
          </div>
        )}

        {/* Framework Grid */}
        {filteredFrameworks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredFrameworks.map((framework) => {
              const Icon = framework.icon;
              
              return (
                <Card
                  key={framework.id}
                  className="group relative bg-card hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer overflow-hidden"
                  onClick={() => setSelectedFramework(framework.id)}
                >
                  <CardContent className="p-6">
                    {/* Header: Badge + Icon */}
                    <div className="flex items-start justify-between mb-4">
                      {/* Tag Badge */}
                      {framework.tag && (
                        <Badge
                          variant="outline"
                          className={`${tagStyles[framework.tag.variant]} border font-medium px-3 py-1`}
                        >
                          {framework.tag.label}
                        </Badge>
                      )}

                      {/* Icon */}
                      <div className="inline-flex p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                      {framework.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {framework.description}
                    </p>

                    {/* Features */}
                    {framework.features && framework.features.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {framework.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      {framework.estimatedTime && (
                        <span className="text-xs text-muted-foreground">
                          ~{framework.estimatedTime}
                        </span>
                      )}
                      <Button
                        size="sm"
                        className="ml-auto group-hover:gap-2 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFramework(framework.id);
                        }}
                      >
                        Start Draft
                        <ArrowRight className="h-4 w-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      </Button>
                    </div>

                    {/* Hover Effect Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No strategies found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or search query
            </p>
            <Button variant="outline" onClick={handleReset}>
              Clear all filters
            </Button>
          </div>
        )}

        {/* Info Alert */}
        <div className="mt-10 max-w-2xl">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">AI-Powered Strategy Generation</h4>
                  <p className="text-sm text-muted-foreground">
                    All frameworks leverage your knowledge hub assets—brand positioning, personas, 
                    market insights—to generate contextual, data-driven strategies tailored to your goals.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}