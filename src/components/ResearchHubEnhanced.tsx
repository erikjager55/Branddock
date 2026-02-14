import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import {
  Target,
  Palette,
  Users,
  Package,
  TrendingUp,
  BookOpen,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Award,
  Activity,
  PlayCircle,
  Zap,
  ChevronRight,
  Sparkles,
  BarChart3,
  Calendar,
  Lightbulb,
  TrendingDown,
  Rocket,
  Star,
  Brain,
  FileText,
  Layers,
  MessageSquare,
  Briefcase,
  ClipboardList,
  Bot,
  ShieldAlert,
  XCircle
} from 'lucide-react';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { mockPersonas } from '../data/mock-personas';
import { ResearchTargetCategory } from '../types/research-target';
import { DecisionStatusBadge } from './decision-status/DecisionStatusBadge';
import { calculateDecisionStatus } from '../utils/decision-status-calculator';
import { getMethodLabel } from '../utils/decision-status-calculator';

interface ResearchHubEnhancedProps {
  onNavigate?: (section: string) => void;
  onCreatePlan?: () => void;
}

const categoryConfig = {
  'brand': {
    icon: Palette,
    label: 'Your Brand',
    description: 'Brand assets and identity elements',
    color: 'purple',
    colorClasses: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20',
    hoverClasses: 'hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/20',
    getItems: () => mockBrandAssets,
    getProgress: (items: any[]) => {
      const validated = items.filter((i: any) => i.status === 'validated').length;
      return (validated / items.length) * 100;
    }
  },
  'persona': {
    icon: Users,
    label: 'Personas',
    description: 'Target audience personas',
    color: 'pink',
    colorClasses: 'bg-pink-500/10 text-pink-600 dark:bg-pink-500/20',
    hoverClasses: 'hover:border-pink-300 hover:bg-pink-50/50 dark:hover:bg-pink-950/20',
    getItems: () => mockPersonas,
    getProgress: (items: any[]) => {
      const validated = items.filter((i: any) => i.status === 'validated').length;
      return (validated / items.length) * 100;
    }
  },
  'products': {
    icon: Package,
    label: 'Products & Services',
    description: 'Product and service portfolio',
    color: 'blue',
    colorClasses: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20',
    hoverClasses: 'hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
    getItems: () => [],
    getProgress: () => 0
  },
  'trends': {
    icon: TrendingUp,
    label: 'Market Trends',
    description: 'Industry and market insights',
    color: 'green',
    colorClasses: 'bg-green-500/10 text-green-600 dark:bg-green-500/20',
    hoverClasses: 'hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-950/20',
    getItems: () => [],
    getProgress: () => 0
  },
  'knowledge': {
    icon: BookOpen,
    label: 'Knowledge Library',
    description: 'Research and documentation',
    color: 'amber',
    colorClasses: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20',
    hoverClasses: 'hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
    getItems: () => [],
    getProgress: () => 0
  }
};

export function ResearchHubEnhanced({ onNavigate, onCreatePlan }: ResearchHubEnhancedProps) {
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Calculate research methods statistics dynamically
  const researchMethods = useMemo(() => {
    const methodStats: Record<string, { 
      id: string; 
      name: string; 
      icon: any; 
      color: string; 
      activeCount: number; 
      completedCount: number;
      unlockedCount: number;
    }> = {
      workshop: { id: 'workshop', name: 'Workshop', icon: Briefcase, color: 'blue', activeCount: 0, completedCount: 0, unlockedCount: 0 },
      interviews: { id: 'interviews', name: '1-on-1 Interviews', icon: MessageSquare, color: 'purple', activeCount: 0, completedCount: 0, unlockedCount: 0 },
      questionnaire: { id: 'questionnaire', name: 'Strategic Survey', icon: ClipboardList, color: 'green', activeCount: 0, completedCount: 0, unlockedCount: 0 },
      'ai-exploration': { id: 'ai-exploration', name: 'AI Exploration', icon: Bot, color: 'pink', activeCount: 0, completedCount: 0, unlockedCount: 0 },
    };

    // Count items with each method from brand assets
    mockBrandAssets.forEach(asset => {
      const methods = asset.researchMethods || [];
      methods.forEach(method => {
        const methodId = method.type;
        if (methodStats[methodId]) {
          methodStats[methodId].unlockedCount++;
          if (method.status === 'in-progress') {
            methodStats[methodId].activeCount++;
          } else if (method.status === 'completed') {
            methodStats[methodId].completedCount++;
          }
        }
      });
    });

    // Count items with each method from personas
    mockPersonas.forEach(persona => {
      const methods = persona.researchMethods || [];
      methods.forEach(method => {
        const methodId = method.type;
        if (methodStats[methodId]) {
          methodStats[methodId].unlockedCount++;
          if (method.status === 'in-progress') {
            methodStats[methodId].activeCount++;
          } else if (method.status === 'completed') {
            methodStats[methodId].completedCount++;
          }
        }
      });
    });

    return Object.values(methodStats);
  }, []);

  // Calculate overall stats
  const stats = useMemo(() => {
    const brandValidated = mockBrandAssets.filter(a => a.status === 'validated').length;
    const personaValidated = mockPersonas.filter(p => p.status === 'validated').length;
    const totalValidated = brandValidated + personaValidated;
    
    const brandTotal = mockBrandAssets.length;
    const personaTotal = mockPersonas.length;
    const totalItems = brandTotal + personaTotal;
    
    // Count active research (in-progress methods)
    let activeCount = 0;
    let completedCount = 0;
    mockBrandAssets.forEach(asset => {
      const inProgress = asset.researchMethods?.filter(m => m.status === 'in-progress') || [];
      const completed = asset.researchMethods?.filter(m => m.status === 'completed') || [];
      activeCount += inProgress.length;
      completedCount += completed.length;
    });
    mockPersonas.forEach(persona => {
      const inProgress = persona.researchMethods.filter(m => m.status === 'in-progress');
      const completed = persona.researchMethods.filter(m => m.status === 'completed');
      activeCount += inProgress.length;
      completedCount += completed.length;
    });
    
    return {
      validated: totalValidated,
      total: totalItems,
      active: activeCount,
      completed: completedCount,
      totalResearch: activeCount + completedCount,
      progress: totalItems > 0 ? Math.round((totalValidated / totalItems) * 100) : 0
    };
  }, []);

  // Get active research items (max 3)
  const activeResearchItems = useMemo(() => {
    const items: any[] = [];
    
    // Brand items
    mockBrandAssets.forEach(asset => {
      const inProgressMethods = asset.researchMethods?.filter(m => m.status === 'in-progress') || [];
      inProgressMethods.forEach(method => {
        items.push({
          category: 'brand',
          id: asset.id,
          name: asset.type,
          methodType: method.type,
          progress: method.progress || 0,
          icon: Palette,
          lastActivity: '2 hours ago'
        });
      });
    });

    // Persona items
    mockPersonas.forEach(persona => {
      const inProgressMethods = persona.researchMethods.filter(m => m.status === 'in-progress');
      inProgressMethods.forEach(method => {
        items.push({
          category: 'persona',
          id: persona.id,
          name: persona.name,
          methodType: method.type,
          progress: method.progress || 0,
          icon: Users,
          lastActivity: '1 day ago'
        });
      });
    });

    return items.slice(0, 3);
  }, []);

  // Get items needing validation (max 3)
  const validationNeeded = useMemo(() => {
    const items: any[] = [];

    // Brand assets ready to validate
    mockBrandAssets.forEach(asset => {
      if (asset.status === 'ready-to-validate') {
        items.push({
          category: 'brand',
          id: asset.id,
          name: asset.type,
          type: 'brand-asset',
          icon: Palette,
          completedDate: '3 days ago'
        });
      }
    });

    // Personas ready to validate
    mockPersonas.forEach(persona => {
      if (persona.status === 'ready-to-validate') {
        items.push({
          category: 'persona',
          id: persona.id,
          name: persona.name,
          type: 'persona',
          icon: Users,
          completedDate: '1 week ago'
        });
      }
    });

    return items.slice(0, 3);
  }, []);

  // Recent activity timeline
  const recentActivity = [
    { id: 1, type: 'completed', title: 'Brand Positioning Workshop completed', timestamp: '2 hours ago', icon: CheckCircle, color: 'green' },
    { id: 2, type: 'started', title: 'Customer Interviews started for "Tech Savvy Millennial"', timestamp: '1 day ago', icon: PlayCircle, color: 'blue' },
    { id: 3, type: 'validated', title: 'Brand Values validated', timestamp: '3 days ago', icon: Award, color: 'purple' },
    { id: 4, type: 'completed', title: 'AI Exploration completed for Brand Voice', timestamp: '1 week ago', icon: CheckCircle, color: 'green' },
  ];

  // Calculate priority research recommendations based on decision quality
  const priorityResearch = useMemo(() => {
    const allItems = [
      ...mockBrandAssets.map(asset => ({
        ...asset,
        category: 'brand' as const,
        categoryLabel: 'Brand Asset',
        icon: Palette
      })),
      ...mockPersonas.map(persona => ({
        ...persona,
        category: 'persona' as const,
        categoryLabel: 'Persona',
        icon: Users,
        type: persona.name // For personas, use name as type
      }))
    ];

    const withStatus = allItems.map(item => ({
      item,
      statusInfo: calculateDecisionStatus(item)
    }));

    // Filter to only show items that are NOT safe to decide
    const needsResearch = withStatus.filter(
      ({ statusInfo }) => statusInfo.status !== 'safe-to-decide'
    );

    // Sort by urgency: blocked first, then by lowest coverage
    needsResearch.sort((a, b) => {
      if (a.statusInfo.status !== b.statusInfo.status) {
        return a.statusInfo.status === 'blocked' ? -1 : 1;
      }
      return a.statusInfo.coverage - b.statusInfo.coverage;
    });

    return needsResearch.slice(0, 5); // Top 5 most urgent
  }, []);

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold mb-1">Research Hub</h1>
                <p className="text-muted-foreground">
                  Orchestrate validation across all knowledge assets
                </p>
              </div>
            </div>
            <Button size="lg" onClick={onCreatePlan} className="gap-2">
              <Plus className="h-5 w-5" />
              Create Plan
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Stats Dashboard - Enhanced */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 hover:border-green-300 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{stats.validated}</p>
                <p className="text-sm text-muted-foreground">Validated Assets</p>
                <p className="text-xs text-green-600">of {stats.total} total</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <Badge className="text-xs bg-blue-500">{stats.active}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active Research</p>
                <p className="text-xs text-blue-600">In progress now</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-purple-300 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm font-semibold text-purple-600">{stats.progress}%</span>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
                <Progress value={stats.progress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-amber-300 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Zap className="w-5 h-5 text-amber-600" />
                </div>
                <BarChart3 className="w-4 h-4 text-amber-600" />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{stats.totalResearch}</p>
                <p className="text-sm text-muted-foreground">Total Research</p>
                <p className="text-xs text-amber-600">All time</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Validation Methods Overview */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <CardTitle>Validation Methods Status</CardTitle>
              </div>
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <CardDescription>
              Track usage and performance across all research methodologies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {researchMethods.map((method) => {
                const MethodIcon = method.icon;
                return (
                  <Card key={method.id} className="border-2 hover:border-primary/40 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`p-2 rounded-lg bg-${method.color}-500/10`}>
                          <MethodIcon className={`w-4 h-4 text-${method.color}-600`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{method.name}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-xl font-bold">{method.activeCount}</p>
                          <p className="text-xs text-muted-foreground">Active</p>
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div>
                          <p className="text-xl font-bold">{method.completedCount}</p>
                          <p className="text-xs text-muted-foreground">Done</p>
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div>
                          <p className="text-xl font-bold">{method.unlockedCount}</p>
                          <p className="text-xs text-muted-foreground">Unlocked</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="overview" className="gap-2">
              <Target className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Layers className="w-4 h-4" />
              By Category
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Calendar className="w-4 h-4" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Active & Urgent Section */}
            {(activeResearchItems.length > 0 || validationNeeded.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Research */}
                {activeResearchItems.length > 0 && (
                  <Card className="border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-600" />
                            Active Research
                          </CardTitle>
                          <CardDescription>Continue where you left off</CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                          {activeResearchItems.length} active
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {activeResearchItems.map((item, idx) => {
                        const Icon = item.icon;
                        
                        return (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between p-4 rounded-lg border-2 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                <Icon className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {getMethodLabel(item.methodType)} • {item.progress}% complete
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Last activity: {item.lastActivity}
                                </p>
                              </div>
                              <div className="text-right mr-3">
                                <Progress value={item.progress} className="h-2 w-24 mb-1" />
                              </div>
                            </div>
                            <Button size="sm" className="gap-2 shrink-0">
                              <PlayCircle className="h-4 w-4" />
                              Resume
                            </Button>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Validation Needed */}
                {validationNeeded.length > 0 && (
                  <Card className="border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                            Validation Needed
                          </CardTitle>
                          <CardDescription>Review and approve completed research</CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                          {validationNeeded.length} ready
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {validationNeeded.map((item, idx) => {
                        const Icon = item.icon;
                        
                        return (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between p-4 rounded-lg border-2 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                <Icon className="h-5 w-5 text-orange-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.name}</p>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {item.category} • Ready for validation
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Completed: {item.completedDate}
                                </p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="gap-2 shrink-0 ml-3">
                              <CheckCircle className="h-4 w-4" />
                              Validate
                            </Button>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Insights & Recommendations */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Insights */}
              <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-background">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <CardTitle>Quick Insights</CardTitle>
                  </div>
                  <CardDescription>
                    Key patterns from your research activity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Strong Brand Progress</p>
                      <p className="text-xs text-muted-foreground">Your brand assets are {stats.progress}% validated</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Activity className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Active Research Momentum</p>
                      <p className="text-xs text-muted-foreground">{stats.active} research activities in progress</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Zap className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Methodology Balance</p>
                      <p className="text-xs text-muted-foreground">Good mix across 4 research methods</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommended Actions */}
              <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-background">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                    <CardTitle>Recommended Actions</CardTitle>
                  </div>
                  <CardDescription>
                    Suggested next steps to maximize impact
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start gap-3" size="sm">
                    <div className="p-1.5 rounded bg-blue-500/10">
                      <Target className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">Complete Brand Validation</p>
                      <p className="text-xs text-muted-foreground">{stats.total - stats.validated} assets remaining</p>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-3" size="sm">
                    <div className="p-1.5 rounded bg-purple-500/10">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">Expand Persona Research</p>
                      <p className="text-xs text-muted-foreground">Add 2-3 more personas</p>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-3" size="sm">
                    <div className="p-1.5 rounded bg-green-500/10">
                      <Rocket className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">Start Strategy Planning</p>
                      <p className="text-xs text-muted-foreground">You have enough validated data</p>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categoryConfig).map(([key, config]) => {
                const Icon = config.icon;
                const items = config.getItems();
                const progress = items.length > 0 ? Math.round(config.getProgress(items)) : 0;
                const validated = items.filter((i: any) => i.status === 'validated').length;

                return (
                  <Card 
                    key={key} 
                    className={`cursor-pointer transition-all border-2 ${config.hoverClasses}`}
                    onClick={() => onNavigate?.(key === 'brand' ? 'brand' : key === 'persona' ? 'personas' : key)}
                  >
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Icon & Title */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-12 w-12 rounded-xl ${config.colorClasses} flex items-center justify-center`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{config.label}</h3>
                              <p className="text-sm text-muted-foreground">{config.description}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-2xl font-bold">{validated}</p>
                              <p className="text-xs text-muted-foreground">Validated</p>
                            </div>
                            <div className="h-8 w-px bg-border"></div>
                            <div>
                              <p className="text-2xl font-bold">{items.length}</p>
                              <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                          </div>
                          
                          {items.length > 0 && (
                            <div className="text-right">
                              <p className="text-lg font-semibold">{progress}%</p>
                              <p className="text-xs text-muted-foreground">Complete</p>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {items.length > 0 && (
                          <Progress value={progress} className="h-2" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <CardTitle>Recent Activity</CardTitle>
                </div>
                <CardDescription>
                  Your latest research milestones and updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity) => {
                  const ActivityIcon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg bg-${activity.color}-500/10 mt-1`}>
                        <ActivityIcon className={`w-4 h-4 text-${activity.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{activity.timestamp}</p>
                      </div>
                    </div>
                  );
                })}
                <Separator />
                <Button variant="outline" className="w-full">
                  View Full History
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}