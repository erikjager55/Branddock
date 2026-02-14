import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import {
  ShoppingCart,
  Eye,
  Heart,
  Target,
  Users,
  Calendar,
  CheckCircle,
  Lightbulb,
  MessageSquare,
  ClipboardList,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Settings,
  TrendingUp,
  Zap,
  BarChart3,
  Shield,
  Award,
  Activity,
  ArrowUpRight,
  Lock,
  Star,
  Flame,
  Package,
  Bot,
  PenTool,
  Filter,
  Crown,
  Globe
} from 'lucide-react';
import { StrategicResearchPlanner } from './StrategicResearchPlanner';
import { ResearchTargetSelector } from './ResearchTargetSelector';
import { ResearchTarget } from '../types/research-target';
import { 
  researchBundles, 
  getFoundationBundles, 
  getSpecializedBundles, 
  getBundlesByTier,
  getStrategyToolsUnlockedByBundle,
  ResearchBundle 
} from '../data/research-bundles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ResearchBundlesSection } from './ResearchBundlesSection';
import { useResearchBundles } from '../contexts/ResearchBundleContext';
import { UnifiedResearchCard } from './UnifiedResearchCard';

interface ResearchPlansSectionGamifiedProps {
  onPlanCreated: (config: {
    approachId: string;
    selectedAssets: string[];
    configuration: any;
    entryMode: 'asset' | 'bundle' | 'questionnaire';
    rationale?: Record<string, string>;
  }) => void;
  hasActivePlan?: boolean;
  activePlan?: {
    id: string;
    name: string;
    startDate: string;
    unlockedAssets: string[];
    approvedCount: number;
  };
  currentBrandScore?: number;
  currentTier?: 'foundation' | 'developing' | 'strong' | 'elite';
}

interface ResearchPlan {
  id: string;
  name: string;
  description: string;
  tagline: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  
  // Performance impact
  scoreBoost: { min: number; max: number };
  
  // Dimension improvements
  dimensions: {
    foundation: number;
    strategy: number;
    confidence: number;
    coverage: number;
  };
  
  // Plan details
  assetsUnlocked: number;
  assets?: string[]; // Asset IDs to unlock
  estimatedTime: string;
  methods: string[];
  
  // Detailed activities
  activities?: {
    icon: any;
    name: string;
    description: string;
    duration: string;
  }[];
  
  // Tier progression
  tierImpact?: string;
  
  recommended?: boolean;
}

const researchPlans: ResearchPlan[] = [
  {
    id: 'foundation-accelerator',
    name: 'Foundation Accelerator',
    description: 'Build core brand elements with comprehensive research across all foundation assets',
    tagline: 'Complete foundation in weeks, not months',
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    scoreBoost: { min: 25, max: 35 },
    dimensions: {
      foundation: 45,
      strategy: 20,
      confidence: 25,
      coverage: 35,
    },
    assetsUnlocked: 5,
    assets: ['vision-mission', 'core-values', 'golden-circle', 'brand-positioning', 'target-audience'],
    estimatedTime: '4-6 weeks',
    methods: ['Workshop', 'AI Assistant', 'Interviews'],
    activities: [
      {
        icon: Users,
        name: 'Stakeholder Workshop',
        description: '2-day intensive workshop with key stakeholders to define vision, mission and values',
        duration: '2 days'
      },
      {
        icon: MessageSquare,
        name: 'Customer Interviews',
        description: '10-15 in-depth interviews with target customers to validate positioning',
        duration: '1 week'
      },
      {
        icon: Bot,
        name: 'AI-Powered Analysis',
        description: 'Transform workshop and interview insights into validated brand assets',
        duration: '3 days'
      }
    ],
    tierImpact: 'Foundation → Strong',
    recommended: true,
  },
  {
    id: 'strategic-essentials',
    name: 'Strategic Essentials',
    description: 'Focus on strategic positioning and direction with targeted research',
    tagline: 'Sharpen your strategic clarity',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    scoreBoost: { min: 18, max: 25 },
    dimensions: {
      foundation: 15,
      strategy: 40,
      confidence: 20,
      coverage: 25,
    },
    assetsUnlocked: 4,
    assets: ['brand-positioning', 'target-audience', 'value-proposition', 'brand-personality'],
    estimatedTime: '3-4 weeks',
    methods: ['Workshop', 'Survey', 'AI Assistant'],
    activities: [
      {
        icon: Target,
        name: 'Strategy Workshop',
        description: '1-day positioning workshop to clarify target audience and value proposition',
        duration: '1 day'
      },
      {
        icon: ClipboardList,
        name: 'Market Survey',
        description: 'Survey 100+ respondents to validate positioning and messaging',
        duration: '1 week'
      },
      {
        icon: Bot,
        name: 'AI Analysis & Refinement',
        description: 'Process survey data and refine strategic assets',
        duration: '2 days'
      }
    ],
    tierImpact: 'Developing → Strong',
  },
  {
    id: 'quick-start',
    name: 'Quick Start Bundle',
    description: 'Rapid brand foundation with essential assets and AI-guided research',
    tagline: 'Get started in days',
    icon: Zap,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    scoreBoost: { min: 12, max: 18 },
    dimensions: {
      foundation: 30,
      strategy: 10,
      confidence: 15,
      coverage: 20,
    },
    assetsUnlocked: 3,
    assets: ['vision-mission', 'core-values', 'golden-circle'],
    estimatedTime: '1-2 weeks',
    methods: ['AI Assistant', 'Workshop'],
    activities: [
      {
        icon: Lightbulb,
        name: 'Express Workshop',
        description: 'Half-day rapid workshop to establish core brand foundation',
        duration: '4 hours'
      },
      {
        icon: Bot,
        name: 'AI-Guided Development',
        description: 'Interactive AI sessions to develop and refine brand assets',
        duration: '3 days'
      }
    ],
    tierImpact: 'Foundation → Developing',
  },
  {
    id: 'validation-boost',
    name: 'Validation Boost',
    description: 'Increase confidence through stakeholder interviews and external validation',
    tagline: 'Market-test your brand',
    icon: Award,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    scoreBoost: { min: 15, max: 22 },
    dimensions: {
      foundation: 10,
      strategy: 15,
      confidence: 45,
      coverage: 20,
    },
    assetsUnlocked: 3,
    assets: ['brand-positioning', 'target-audience', 'value-proposition'],
    estimatedTime: '2-3 weeks',
    methods: ['Interviews', 'Survey'],
    activities: [
      {
        icon: MessageSquare,
        name: 'Stakeholder Interviews',
        description: '15-20 interviews with internal and external stakeholders',
        duration: '1.5 weeks'
      },
      {
        icon: ClipboardList,
        name: 'Validation Survey',
        description: 'Survey 150+ respondents to test brand resonance',
        duration: '1 week'
      },
      {
        icon: Bot,
        name: 'Insight Synthesis',
        description: 'AI-powered analysis to identify gaps and opportunities',
        duration: '2 days'
      }
    ],
    tierImpact: 'Strong → Elite',
  },
];

export function ResearchPlansSectionGamified({
  onPlanCreated,
  hasActivePlan,
  activePlan,
  currentBrandScore,
  currentTier,
}: ResearchPlansSectionGamifiedProps) {
  const [selectedPlan, setSelectedPlan] = useState<ResearchPlan | null>(null);
  const [showPurchaseFlow, setShowPurchaseFlow] = useState(false);
  const [selectedPlanForFlow, setSelectedPlanForFlow] = useState<ResearchPlan | null>(null);
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<ResearchTarget | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  
  // Get bundle context
  const { purchaseBundle } = useResearchBundles();

  // Calculate potential new score for each plan
  const getPotentialScore = (plan: ResearchPlan) => {
    const avgBoost = (plan.scoreBoost.min + plan.scoreBoost.max) / 2;
    return Math.min(100, currentBrandScore + avgBoost);
  };

  // Get new tier based on score
  const getTierFromScore = (score: number) => {
    if (score >= 76) return 'elite';
    if (score >= 51) return 'strong';
    if (score >= 26) return 'developing';
    return 'foundation';
  };

  // Tier config
  const getTierConfig = (tier: string) => {
    const configs = {
      foundation: { label: 'Foundation', color: 'text-orange-600', icon: Shield },
      developing: { label: 'Developing', color: 'text-blue-600', icon: Activity },
      strong: { label: 'Strong', color: 'text-green-600', icon: TrendingUp },
      elite: { label: 'Elite', color: 'text-purple-600', icon: Award },
    };
    return configs[tier as keyof typeof configs] || configs.foundation;
  };

  // Get dimension color
  const getDimensionColor = (score: number) => {
    if (score >= 40) return 'bg-green-500';
    if (score >= 25) return 'bg-blue-500';
    if (score >= 15) return 'bg-orange-500';
    return 'bg-gray-400';
  };

  // Recommended plan based on current tier
  const recommendedPlan = useMemo(() => {
    if (currentTier === 'foundation') return researchPlans[0]; // Foundation Accelerator
    if (currentTier === 'developing') return researchPlans[1]; // Strategic Essentials
    if (currentTier === 'strong') return researchPlans[3]; // Validation Boost
    return researchPlans[0];
  }, [currentTier]);

  if (showPurchaseFlow) {
    return (
      <StrategicResearchPlanner
        onPlanCreated={(plan) => {
          onPlanCreated(plan);
          setShowPurchaseFlow(false);
          setSelectedPlan(null);
          setSelectedPlanForFlow(null);
        }}
        onCancel={() => {
          setShowPurchaseFlow(false);
          setSelectedPlan(null);
          setSelectedPlanForFlow(null);
        }}
        preSelectedPlan={selectedPlanForFlow}
      />
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold mb-1">Research Plans</h1>
                <p className="text-muted-foreground">
                  Choose a research plan to boost your brand performance
                </p>
              </div>
            </div>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => setShowComparison(!showComparison)}>
              <BarChart3 className="h-5 w-5" />
              Compare Plans
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-6 space-y-8">
        {/* Recommended Plan Highlight */}
        {!hasActivePlan && (
          <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${recommendedPlan.bgColor} border ${recommendedPlan.borderColor}`}>
                    {React.createElement(recommendedPlan.icon, {
                      className: `w-6 h-6 ${recommendedPlan.color}`
                    })}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="default" className="text-xs">Recommended</Badge>
                      <h3 className="font-semibold text-lg">{recommendedPlan.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {recommendedPlan.tagline}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                          +{recommendedPlan.scoreBoost.min}-{recommendedPlan.scoreBoost.max} points
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{recommendedPlan.estimatedTime}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span>{recommendedPlan.assetsUnlocked} assets</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button size="lg" onClick={() => {
                  setSelectedPlan(recommendedPlan);
                  setSelectedPlanForFlow(recommendedPlan);
                  setShowPurchaseFlow(true);
                }}>
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Research Bundles Section - NEW */}
        <ResearchBundlesSection 
          onSelectBundle={(bundle) => {
            // Purchase the bundle and unlock the strategy tools
            purchaseBundle(bundle.id);
            
            // Show success message or navigate
            alert(`Bundle "${bundle.name}" purchased! Strategy tools have been unlocked.`);
          }}
        />

        {/* Plans Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">All Research Plans</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {showComparison ? 'Hide' : 'Compare'} Plans
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {researchPlans.map((plan) => {
              const potentialScore = getPotentialScore(plan);
              const newTier = getTierFromScore(potentialScore);
              const tierUpgrade = newTier !== currentTier;

              return (
                <UnifiedResearchCard
                  key={plan.id}
                  id={plan.id}
                  name={plan.name}
                  description={plan.tagline}
                  icon={plan.icon}
                  color={plan.color}
                  bgColor={plan.bgColor}
                  borderColor={plan.borderColor}
                  recommended={plan.recommended}
                  scoreBoost={plan.scoreBoost}
                  currentScore={currentBrandScore || 0}
                  newTier={newTier}
                  tierUpgrade={tierUpgrade}
                  activities={plan.activities || []}
                  assetsUnlocked={plan.assetsUnlocked}
                  timeline={plan.estimatedTime}
                  methods={plan.methods}
                  outcome={plan.description}
                  onSelect={() => {
                    setSelectedPlan(plan);
                    setSelectedPlanForFlow(plan);
                    setShowPurchaseFlow(true);
                  }}
                  isSelected={selectedPlan === plan}
                  buttonText={selectedPlan === plan ? 'Start This Plan' : 'Choose Plan'}
                />
              );
            })}
          </div>
        </div>

        {/* What's Included Section */}
        <Card>
          <CardHeader>
            <CardTitle>What's Included in Every Plan</CardTitle>
            <CardDescription>
              All research plans include these core features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">AI-Guided Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Transform insights into validated brand assets
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                  <PenTool className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Multiple Methods</h4>
                  <p className="text-sm text-muted-foreground">
                    Workshops, interviews, surveys, and more
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-50 border border-green-200">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Performance Tracking</h4>
                  <p className="text-sm text-muted-foreground">
                    Real-time brand strength metrics
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}