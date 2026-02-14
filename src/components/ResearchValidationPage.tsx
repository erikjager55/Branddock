import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  MessageSquare,
  FileText,
  Users,
  ArrowRight,
  Tag,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  UserCheck,
  Calendar,
  Target,
  TrendingUp,
  Package,
  Shield,
  ChevronRight,
  FlaskConical
} from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  type: 'brand' | 'persona' | 'product' | 'trend';
}

interface ResearchProject {
  id: string;
  name: string;
  method: {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
  };
  scope: Asset[];
  progress: number;
  statusLabel: string;
  statusType: 'in-progress' | 'recruiting' | 'drafting' | 'analyzing';
  startDate: string;
  participants?: number;
  targetParticipants?: number;
}

const researchMethods = [
  {
    id: 'interview',
    name: 'In-Depth Interviews',
    shortName: 'Interview',
    icon: MessageSquare,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    description: 'Deep qualitative insights through 1-on-1 conversations'
  },
  {
    id: 'survey',
    name: 'Market Survey',
    shortName: 'Survey',
    icon: BarChart3,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-200 dark:border-purple-800',
    description: 'Quantitative data collection at scale'
  },
  {
    id: 'workshop',
    name: 'Stakeholder Workshop',
    shortName: 'Workshop',
    icon: Users,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    description: 'Collaborative ideation and validation sessions'
  }
];

const assetTypeConfig = {
  brand: {
    icon: Shield,
    label: 'Brand',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30'
  },
  persona: {
    icon: UserCheck,
    label: 'Persona',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30'
  },
  product: {
    icon: Tag,
    label: 'Product',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30'
  },
  trend: {
    icon: TrendingUp,
    label: 'Trend',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30'
  }
};

const statusConfig = {
  'in-progress': {
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30'
  },
  'recruiting': {
    icon: UserCheck,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30'
  },
  'drafting': {
    icon: FileText,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30'
  },
  'analyzing': {
    icon: TrendingUp,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30'
  }
};

const mockProjects: ResearchProject[] = [
  {
    id: '1',
    name: 'Q1 Customer Deep-Dive',
    method: {
      id: 'interview',
      name: 'In-Depth Interviews',
      icon: MessageSquare,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30'
    },
    scope: [
      { id: 'brand-1', name: 'Brand Core', type: 'brand' },
      { id: 'persona-1', name: 'Gen-Z Early Adopter', type: 'persona' },
      { id: 'product-1', name: 'Sneakers', type: 'product' }
    ],
    progress: 60,
    statusLabel: 'Recruiting Finished',
    statusType: 'recruiting',
    startDate: 'Dec 15, 2025',
    participants: 12,
    targetParticipants: 20
  },
  {
    id: '2',
    name: 'Pricing Validation',
    method: {
      id: 'survey',
      name: 'Market Survey',
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30'
    },
    scope: [
      { id: 'product-2', name: 'Socks', type: 'product' }
    ],
    progress: 15,
    statusLabel: 'Drafting Questions',
    statusType: 'drafting',
    startDate: 'Jan 2, 2026'
  },
  {
    id: '3',
    name: 'Brand Perception Study',
    method: {
      id: 'survey',
      name: 'Market Survey',
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30'
    },
    scope: [
      { id: 'brand-1', name: 'TechNova Brand', type: 'brand' },
      { id: 'persona-2', name: 'Enterprise Decision Maker', type: 'persona' }
    ],
    progress: 85,
    statusLabel: 'Analyzing Results',
    statusType: 'analyzing',
    startDate: 'Nov 20, 2025',
    participants: 342,
    targetParticipants: 300
  },
  {
    id: '4',
    name: 'Product Innovation Workshop',
    method: {
      id: 'workshop',
      name: 'Stakeholder Workshop',
      icon: Users,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30'
    },
    scope: [
      { id: 'product-3', name: 'Smart Home Hub', type: 'product' },
      { id: 'trend-1', name: 'IoT Integration', type: 'trend' },
      { id: 'persona-3', name: 'Tech Enthusiast', type: 'persona' }
    ],
    progress: 40,
    statusLabel: 'Sessions In Progress',
    statusType: 'in-progress',
    startDate: 'Dec 28, 2025',
    participants: 8,
    targetParticipants: 15
  }
];

export function ResearchValidationPage() {
  const [projects] = useState<ResearchProject[]>(mockProjects);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <FlaskConical className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold mb-1">Validation Research</h1>
              <p className="text-muted-foreground">
                Test your strategies with market validation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Top Section: Methods Selector */}
        <div className="mb-12">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Start Validation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {researchMethods.map((method) => {
              const Icon = method.icon;
              
              return (
                <Card
                  key={method.id}
                  className="group cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200"
                  onClick={() => console.log('Start:', method.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`h-12 w-12 rounded-lg ${method.bg} flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${method.color}`} />
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                      {method.shortName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {method.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Main Section: Active Research Pipeline */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Active Research Projects</h2>
            <Badge variant="outline" className="text-xs px-3 py-1">
              {projects.length} Active
            </Badge>
          </div>

          <div className="space-y-4">
            {projects.map((project) => {
              const MethodIcon = project.method.icon;
              const statusInfo = statusConfig[project.statusType];
              const StatusIcon = statusInfo.icon;

              return (
                <Card
                  key={project.id}
                  className="group hover:shadow-md transition-all duration-200 border-2"
                >
                  <CardContent className="p-6">
                    <div className="space-y-5">
                      {/* Header Row: Project Name + Method */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{project.name}</h3>
                            <Badge
                              variant="outline"
                              className={`${project.method.bg} ${project.method.color} border-transparent text-xs px-2.5 py-0.5`}
                            >
                              <MethodIcon className="h-3 w-3 mr-1" />
                              {project.method.name}
                            </Badge>
                          </div>
                          
                          {/* Meta Info */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Started {project.startDate}</span>
                            </div>
                            {project.participants !== undefined && (
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" />
                                <span>
                                  {project.participants}/{project.targetParticipants} participants
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                          onClick={() => console.log('View details:', project.id)}
                        >
                          View Details
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>

                      {/* Scope: Multi-Asset Traceability - THE KEY FEATURE */}
                      <div>
                        <div className="mb-3">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Linked Assets {project.scope.length > 1 && `(${project.scope.length})`}
                          </span>
                        </div>
                        
                        {/* Asset Cluster - Shows Multi-Asset Linking */}
                        <div className="flex flex-wrap gap-2">
                          {project.scope.map((asset) => {
                            const assetConfig = assetTypeConfig[asset.type];
                            const AssetIcon = assetConfig.icon;
                            
                            return (
                              <div
                                key={asset.id}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors"
                              >
                                <div className={`h-6 w-6 rounded ${assetConfig.bg} flex items-center justify-center flex-shrink-0`}>
                                  <AssetIcon className={`h-3.5 w-3.5 ${assetConfig.color}`} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground leading-none">
                                    {assetConfig.label}
                                  </span>
                                  <span className="text-sm font-medium leading-tight mt-0.5">
                                    {asset.name}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Visual Indicator for Multi-Asset Projects */}
                        {project.scope.length > 1 && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Target className="h-3.5 w-3.5 text-primary" />
                            <span>
                              Multi-asset validation • Insights will trace back to all {project.scope.length} linked assets
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Section */}
                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded ${statusInfo.bg} flex items-center justify-center`}>
                              <StatusIcon className={`h-3.5 w-3.5 ${statusInfo.color}`} />
                            </div>
                            <span className="text-sm font-medium">{project.statusLabel}</span>
                          </div>
                          <span className="text-sm font-semibold">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Empty State Hint */}
          <div className="mt-8">
            <Card className="border-dashed border-2">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">
                      Multi-Asset Research
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Link multiple knowledge assets to a single research project for comprehensive validation. 
                      Insights automatically trace back to all connected assets, creating a unified knowledge graph 
                      that powers your strategic decisions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}