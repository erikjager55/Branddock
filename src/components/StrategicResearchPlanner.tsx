import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { 
  Target, 
  Lightbulb, 
  Users, 
  ArrowRight, 
  CheckCircle,
  Sparkles,
  ArrowLeft,
  MessageSquare,
  ClipboardList,
  Eye,
  Heart,
  Globe,
  TrendingUp,
  Package,
  Info,
  AlertCircle,
  Clock,
  Zap,
  Settings2,
  Award,
  Layers,
  BarChart3,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Palette,
  BookOpen
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { ResearchTargetCategory, ResearchTarget } from '../types/research-target';
import { useBrandAssets } from '../contexts/BrandAssetsContext';
import { usePersonas } from '../contexts/PersonasContext';
import type { ResearchPlanConfiguration } from '../contexts/ResearchPlanContext';
import { researchBundles, getBundlesForTarget } from '../lib/catalogs/research-bundles';

interface ResearchItem {
  id: string;
  name: string;
  description: string | null;
  icon: LucideIcon;
  type: string;
  avatar?: string | null;
  compatibleTools?: string[];
}

interface StrategicResearchPlannerProps {
  onPlanCreated: (plan: {
    approachId: string;
    selectedAssets: string[];
    configuration: ResearchPlanConfiguration;
    entryMode: 'tool' | 'bundle';
    rationale?: Record<string, string>;
  }) => void;
  onCancel: () => void;
  preSelectedPlan?: {
    id: string;
    name: string;
    assetsUnlocked: number;
    assets?: string[];
    methods: string[];
  } | null;
}

// Assets with tool compatibility
const availableAssets = [
  { 
    id: 'vision-mission', 
    name: 'Vision & Mission', 
    icon: Eye, 
    type: 'Strategy',
    description: 'Define your purpose and future direction',
    compatibleTools: ['workshop', 'interviews', 'ai-agent', 'questionnaire']
  },
  { 
    id: 'core-values', 
    name: 'Core Values', 
    icon: Heart, 
    type: 'Culture',
    description: 'Articulate your guiding principles',
    compatibleTools: ['workshop', 'interviews', 'ai-agent']
  },
  { 
    id: 'golden-circle', 
    name: 'Golden Circle', 
    icon: Target, 
    type: 'Foundation',
    description: 'Discover your Why, How, and What',
    compatibleTools: ['workshop', 'ai-agent']
  },
  { 
    id: 'brand-positioning', 
    name: 'Brand Positioning', 
    icon: Target, 
    type: 'Strategy',
    description: 'Define your unique market position',
    compatibleTools: ['workshop', 'interviews', 'questionnaire', 'ai-agent']
  },
  { 
    id: 'brand-archetype', 
    name: 'Brand Archetype', 
    icon: Users, 
    type: 'Personality',
    description: 'Identify your brand personality',
    compatibleTools: ['workshop', 'questionnaire', 'ai-agent']
  },
  { 
    id: 'social-relevancy', 
    name: 'Social Relevancy', 
    icon: Globe, 
    type: 'Purpose',
    description: 'Connect with social impact',
    compatibleTools: ['questionnaire', 'interviews', 'ai-agent']
  },
  { 
    id: 'trends', 
    name: 'Market Trends', 
    icon: TrendingUp, 
    type: 'Context',
    description: 'Understand market dynamics',
    compatibleTools: ['questionnaire', 'ai-agent']
  }
];

// Research tools with comprehensive metadata
const researchTools = {
  workshop: {
    id: 'workshop',
    name: 'Collaborative Workshop',
    shortName: 'Workshop',
    tagline: 'Build strategy together with your team',
    icon: Lightbulb,
    confidence: 'medium-high',
    confidenceLabel: 'Medium-High',
    purpose: 'What should our strategy be?',
    purposeType: 'Generative',
    bestFor: 'Building consensus, generating shared vision',
    effort: '1 session, 6-12 participants, 3 hours',
    effortShort: '3 hours',
    timeline: '2-3 weeks',
    outputType: 'Co-created draft with team buy-in',
    cost: 1200,
    isPrimary: true,
    pros: ['High engagement', 'Team buy-in', 'Fast results'],
    cons: ['Requires scheduling', 'Limited depth per topic'],
    compatibleSecondary: ['questionnaire']
  },
  questionnaire: {
    id: 'questionnaire',
    name: 'Strategic Survey',
    shortName: 'Survey',
    tagline: 'Validate ideas at scale',
    icon: ClipboardList,
    confidence: 'medium',
    confidenceLabel: 'Medium',
    purpose: 'Is this strategy right?',
    purposeType: 'Validative',
    bestFor: 'Validating assumptions, gathering broad input',
    effort: '2-3 weeks, 20+ respondents, minimal synchronous time',
    effortShort: '2-3 weeks',
    timeline: '1-2 weeks',
    outputType: 'Data-backed validation with patterns',
    cost: 500,
    isPrimary: true,
    pros: ['Broad reach', 'Quantifiable', 'Cost effective'],
    cons: ['Surface level', 'Limited context'],
    compatibleSecondary: ['interviews']
  },
  interviews: {
    id: 'interviews',
    name: '1-on-1 Interviews',
    shortName: 'Interviews',
    tagline: 'Uncover deep insights through conversation',
    icon: MessageSquare,
    confidence: 'high',
    confidenceLabel: 'High',
    purpose: 'Why does this matter?',
    purposeType: 'Exploratory',
    bestFor: 'Understanding nuance, executive alignment',
    effort: '3-4 weeks, 5-8 stakeholders, 6-10 hours total',
    effortShort: '3-4 weeks',
    timeline: '2-3 weeks',
    outputType: 'Rich narrative with strategic insights',
    cost: 800,
    isPrimary: false,
    pros: ['Deep insights', 'Personal perspectives', 'Detailed nuance'],
    cons: ['Time intensive', 'Fewer participants'],
    compatibleSecondary: ['workshop']
  },
  'ai-agent': {
    id: 'ai-agent',
    name: 'AI Exploration',
    shortName: 'AI Agent',
    tagline: 'Generate options rapidly using AI',
    icon: Sparkles,
    confidence: 'low',
    confidenceLabel: 'Low',
    purpose: 'What are options to consider?',
    purposeType: 'Directional',
    bestFor: 'Rapid exploration, hypothesis generation',
    effort: '1-3 days, 0 participants, 30 min setup',
    effortShort: '1-3 days',
    timeline: '1-3 days',
    outputType: 'AI-synthesized options requiring refinement',
    cost: 0,
    isPrimary: false,
    pros: ['Immediate results', 'Free', 'Multiple iterations'],
    cons: ['Lacks human insight', 'Needs validation'],
    compatibleSecondary: ['workshop']
  }
};

// Pre-configured bundles - Now imported from /data/research-bundles.ts

// Tool combination rules
const compatibleCombinations = {
  workshop: ['questionnaire'],
  questionnaire: ['interviews'],
  interviews: ['workshop'],
  'ai-agent': ['workshop']
};

export function StrategicResearchPlanner({ onPlanCreated, onCancel, preSelectedPlan }: StrategicResearchPlannerProps) {
  const { brandAssets } = useBrandAssets();
  const { personas } = usePersonas();
  const { t } = useTranslation('strategy-pages');
  // Render-edge helpers: constant registries (researchTools/availableAssets) stay the
  // English source of truth; translations resolve by stable id with an en fallback.
  const toolT = (id: string, field: string, fallback: string): string =>
    t(`tools.${id}.${field}`, { defaultValue: fallback });
  const assetT = (id: string, field: 'name' | 'type', fallback: string): string =>
    t(`assets.${id}.${field}`, { defaultValue: fallback });
  // Navigation state - Skip target selection, go directly to entry
  const [step, setStep] = useState<'target-selection' | 'entry' | 'tool-selection' | 'asset-selection' | 'review' | 'bundle-selection' | 'plan-confirmation'>(
    preSelectedPlan ? 'plan-confirmation' : 'entry'
  );
  
  // NEW: Target selection state - Default to brand target
  const [selectedTarget, setSelectedTarget] = useState<ResearchTarget | null>({
    category: 'brand',
    targetId: 'brand',
    targetName: 'Your Brand',
  });
  
  // Tool selection state
  const [primaryTool, setPrimaryTool] = useState<string | null>(null);
  const [showAdvancedTools, setShowAdvancedTools] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  
  // Asset selection state (now can be brand assets, personas, etc.)
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  
  // Bundle selection state
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  
  // Plan confirmation state - for adding extra assets
  const [extraAssets, setExtraAssets] = useState<string[]>([]);
  
  // Configuration state
  const [toolConfig, setToolConfig] = useState<any>({});
  const [rationale, setRationale] = useState<Record<string, string>>({});
  const [numberOfQuestionnaires, setNumberOfQuestionnaires] = useState(50);
  const [numberOfInterviews, setNumberOfInterviews] = useState(3);

  // Helper functions
  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );
  };

  // Get items to research based on selected target
  const getResearchItems = () => {
    if (!selectedTarget) return [];

    if (selectedTarget.category === 'brand') {
      if (selectedTarget.targetId) {
        // Specific brand asset
        const asset = brandAssets.find(a => a.id === selectedTarget.targetId);
        return asset ? [{
          id: asset.id,
          name: asset.name,
          description: asset.description?.substring(0, 100) || '',
          icon: Palette,
          type: 'Brand Asset'
        }] : [];
      } else {
        // All brand assets
        return brandAssets.map(asset => ({
          id: asset.id,
          name: asset.name,
          description: asset.description?.substring(0, 100) || '',
          icon: Palette,
          type: 'Brand Asset',
          compatibleTools: ['workshop', 'interviews', 'ai-agent', 'questionnaire']
        }));
      }
    } else if (selectedTarget.category === 'persona') {
      if (selectedTarget.targetId) {
        // Specific persona
        const persona = personas.find(p => p.id === selectedTarget.targetId);
        return persona ? [{ 
          id: persona.id, 
          name: persona.name, 
          description: persona.tagline,
          icon: Users,
          type: 'Persona',
          avatar: persona.avatarUrl
        }] : [];
      } else {
        // All personas
        return personas.map(persona => ({
          id: persona.id,
          name: persona.name,
          description: persona.tagline,
          icon: Users,
          type: 'Persona',
          avatar: persona.avatarUrl,
          compatibleTools: ['interviews', 'questionnaire', 'workshop']
        }));
      }
    }

    // For other categories, return empty for now
    return [];
  };

  const getCompatibleAssets = () => {
    if (!primaryTool) return availableAssets;
    return availableAssets.filter(asset => asset.compatibleTools.includes(primaryTool));
  };

  const getTotalPrice = () => {
    if (selectedBundle) {
      const bundle = researchBundles.find(b => b.id === selectedBundle);
      return bundle?.bundlePrice || 0;
    }
    
    let total = 0;
    if (primaryTool) {
      total += researchTools[primaryTool as keyof typeof researchTools].cost * selectedAssets.length;
    }
    return total;
  };

  const handleToolSelect = (toolId: string) => {
    setPrimaryTool(toolId);
    const tool = researchTools[toolId as keyof typeof researchTools];
    setRationale({
      tool: t('rationale.tool', { method: toolT(toolId, 'name', tool.name) }),
      purpose: toolT(toolId, 'purpose', tool.purpose),
      output: toolT(toolId, 'outputType', tool.outputType)
    });
  };

  const handleBundleSelect = (bundleId: string) => {
    const bundle = researchBundles.find(b => b.id === bundleId);
    if (bundle) {
      setSelectedBundle(bundleId);
      setPrimaryTool(bundle.primaryTool);
      const primaryToolData = researchTools[bundle.primaryTool as keyof typeof researchTools];
      // Support both 'assets' and 'items' property names
      setSelectedAssets(bundle.items ?? []);
      setRationale({
        bundle: t('rationale.bundle', { bundle: bundle.name }),
        tools: toolT(bundle.primaryTool, 'shortName', primaryToolData.shortName),
        outcome: bundle.outcome
      });
      setStep('review');
    }
  };

  const handleConfirmPlan = () => {
    if (!primaryTool) return;
    
    onPlanCreated({
      approachId: primaryTool,
      selectedAssets,
      configuration: { 
        primaryTool, 
        toolConfig,
        bundle: selectedBundle,
        numberOfQuestionnaires,
        numberOfInterviews
      },
      entryMode: selectedBundle ? 'bundle' : 'tool',
      rationale
    });
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-600">{t('confidence.high')}</Badge>;
      case 'medium-high':
        return <Badge className="bg-green-500">{t('confidence.mediumHigh')}</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-600">{t('confidence.medium')}</Badge>;
      case 'low':
        return <Badge className="bg-orange-600">{t('confidence.low')}</Badge>;
      default:
        return null;
    }
  };

  // === PLAN CONFIRMATION SCREEN ===
  if (step === 'plan-confirmation' && preSelectedPlan) {
    // Use assets from the plan, or fallback to a default set
    const planAssets = preSelectedPlan.assets || ['vision-mission', 'core-values', 'golden-circle'];
    
    // Asset score impacts (how many points each asset adds)
    const assetScoreImpact: Record<string, number> = {
      'vision-mission': 8,
      'core-values': 7,
      'golden-circle': 8,
      'brand-positioning': 8,
      'target-audience': 7,
      'value-proposition': 7,
      'brand-personality': 6,
      'trends': 5,
      'social-relevancy': 5,
      'competitor-analysis': 6,
      'tone-voice': 5,
    };
    
    // Available assets to add (not already in plan)
    const availableToAdd = availableAssets.filter(asset => !planAssets.includes(asset.id));
    
    // Calculate total score boost
    const baseScoreBoost = planAssets.reduce((sum, assetId) => sum + (assetScoreImpact[assetId] || 5), 0);
    const extraScoreBoost = extraAssets.reduce((sum, assetId) => sum + (assetScoreImpact[assetId] || 5), 0);
    const totalScoreBoost = baseScoreBoost + extraScoreBoost;
    
    // Toggle extra asset
    const toggleExtraAsset = (assetId: string) => {
      setExtraAssets(prev => 
        prev.includes(assetId) 
          ? prev.filter(id => id !== assetId)
          : [...prev, assetId]
      );
    };
    
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={onCancel}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('confirmation.backToPlans')}
          </Button>

          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-4">
              <Badge variant="default" className="text-sm py-1.5 px-3">
                <Sparkles className="h-4 w-4 mr-1.5" />
                {preSelectedPlan.name}
              </Badge>
              <h1 className="text-4xl font-bold">{t('confirmation.title')}</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('confirmation.subtitle', { count: preSelectedPlan.assetsUnlocked })}
              </p>

              {/* Total Score Impact */}
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/20">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <div className="text-2xl font-bold text-green-600">{t('confirmation.points', { count: totalScoreBoost })}</div>
                  <div className="text-xs text-muted-foreground">{t('confirmation.totalBoost')}</div>
                </div>
              </div>
            </div>

            {/* Plan Details Card */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('confirmation.whatsIncluded')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Assets */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    {t('confirmation.brandAssets', { count: preSelectedPlan.assetsUnlocked })}
                    <Badge variant="secondary" className="ml-2">{t('confirmation.pts', { count: baseScoreBoost })}</Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {planAssets.map(assetId => {
                      const asset = availableAssets.find(a => a.id === assetId);
                      if (!asset) return null;
                      const AssetIcon = asset.icon;
                      const scoreImpact = assetScoreImpact[assetId] || 5;
                      return (
                        <div key={assetId} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                          <div className="h-10 w-10 rounded-lg bg-background border flex items-center justify-center shrink-0">
                            <AssetIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{assetT(asset.id, 'name', asset.name)}</p>
                            <p className="text-xs text-muted-foreground">{assetT(asset.id, 'type', asset.type)}</p>
                          </div>
                          <Badge variant="outline" className="text-green-600 border-green-600 shrink-0">
                            +{scoreImpact}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Research Methods */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    {t('confirmation.researchMethods')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {preSelectedPlan.methods.map((method) => (
                      <Badge key={method} variant="secondary" className="text-sm py-1.5 px-3">
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Expected Outcomes */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    {t('confirmation.expectedOutcomes')}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{t('confirmation.outcomes.validatedAssets', { count: preSelectedPlan.assetsUnlocked })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{t('confirmation.outcomes.completeData')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{t('confirmation.outcomes.recommendations')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{t('confirmation.outcomes.trackProgress')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Boost Your Plan Section */}
            {availableToAdd.length > 0 && (
              <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
                        <Zap className="h-5 w-5 text-purple-600" />
                        {t('confirmation.boost.title')}
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        {t('confirmation.boost.subtitle')}
                      </CardDescription>
                    </div>
                    {extraAssets.length > 0 && (
                      <Badge className="bg-purple-600 text-white">
                        {t('confirmation.boost.extraPts', { count: extraScoreBoost })}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableToAdd.map(asset => {
                      const AssetIcon = asset.icon;
                      const scoreImpact = assetScoreImpact[asset.id] || 5;
                      const isSelected = extraAssets.includes(asset.id);
                      
                      return (
                        <button
                          key={asset.id}
                          onClick={() => toggleExtraAsset(asset.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                            isSelected 
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 shadow-md' 
                              : 'border-border bg-background hover:border-purple-300 hover:shadow-sm'
                          }`}
                        >
                          <div className={`h-10 w-10 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'bg-purple-100 border-purple-300' : 'bg-muted'
                          }`}>
                            <AssetIcon className={`h-5 w-5 ${isSelected ? 'text-purple-600' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{assetT(asset.id, 'name', asset.name)}</p>
                            <p className="text-xs text-muted-foreground">{assetT(asset.id, 'type', asset.type)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge 
                              variant={isSelected ? "default" : "outline"} 
                              className={isSelected ? "bg-purple-600" : "text-purple-600 border-purple-400"}
                            >
                              +{scoreImpact}
                            </Badge>
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-purple-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {extraAssets.length > 0 && (
                    <Alert className="mt-4 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <AlertDescription className="text-sm text-purple-900 dark:text-purple-100">
                        {t('confirmation.boost.greatChoicePrefix')} <strong>{t('confirmation.boost.extraAssets', { count: extraAssets.length })}</strong> {t('confirmation.boost.greatChoiceMiddle')} <strong>{t('confirmation.boost.extraPoints', { count: extraScoreBoost })}</strong> {t('confirmation.boost.greatChoiceSuffix')}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* CTA */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button variant="outline" size="lg" onClick={onCancel}>
                {t('actions.cancel')}
              </Button>
              <Button 
                size="lg" 
                className="gap-2"
                onClick={() => {
                  // Activate the plan with base + extra assets
                  const allAssets = [...planAssets, ...extraAssets];
                  onPlanCreated({
                    approachId: preSelectedPlan.id,
                    selectedAssets: allAssets,
                    configuration: {
                      planName: preSelectedPlan.name,
                      methods: preSelectedPlan.methods,
                      totalAssets: allAssets.length,
                      scoreBoost: totalScoreBoost,
                    },
                    entryMode: 'bundle',
                    rationale: {},
                  });
                }}
              >
                <Zap className="h-5 w-5" />
                {t('confirmation.activate')}
                {extraAssets.length > 0 && (
                  <span className="ml-1">{t('confirmation.assetsCount', { count: preSelectedPlan.assetsUnlocked + extraAssets.length })}</span>
                )}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === ENTRY SCREEN ===
  if (step === 'entry') {
    const targetName = selectedTarget?.targetName || selectedTarget?.category || 'research';
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              {t('entry.badge')}
            </Badge>
            <h1 className="text-4xl font-bold mb-4">{t('entry.title')}</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('entry.subtitlePrefix')} <span className="font-semibold text-foreground">{targetName}</span>
            </p>

            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('actions.cancel')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Tool-first approach */}
            <Card 
              className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group relative overflow-hidden border-2"
              onClick={() => setStep('tool-selection')}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform" />
              <Badge className="absolute top-4 right-4 bg-blue-500">{t('entry.recommended')}</Badge>
              <CardHeader>
                <div className="h-14 w-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <Settings2 className="h-7 w-7 text-blue-600" />
                </div>
                <CardTitle className="text-xl">{t('entry.tool.title')}</CardTitle>
                <CardDescription className="text-base">
                  {t('entry.tool.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{t('entry.tool.feature1')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{t('entry.tool.feature2')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{t('entry.tool.feature3')}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <p className="text-xs text-muted-foreground italic">
                  {t('entry.tool.bestWhen')}
                </p>
              </CardFooter>
            </Card>

            {/* Bundle approach */}
            <Card 
              className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group relative overflow-hidden"
              onClick={() => setStep('bundle-selection')}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform" />
              <CardHeader>
                <div className="h-14 w-14 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-colors">
                  <Package className="h-7 w-7 text-orange-600" />
                </div>
                <CardTitle className="text-xl">{t('entry.bundle.title')}</CardTitle>
                <CardDescription className="text-base">
                  {t('entry.bundle.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{t('entry.bundle.feature1')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{t('entry.bundle.feature2')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{t('entry.bundle.feature3')}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <p className="text-xs text-muted-foreground italic">
                  {t('entry.bundle.bestWhen')}
                </p>
              </CardFooter>
            </Card>
          </div>

          <div className="text-center">
            <Button variant="ghost" onClick={onCancel} className="text-muted-foreground">
              {t('actions.cancel')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // === TOOL SELECTION SCREEN ===
  if (step === 'tool-selection') {
    const primaryTools = Object.values(researchTools).filter((tool) => tool.isPrimary);
    const advancedTools = Object.values(researchTools).filter((tool) => !tool.isPrimary);

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => setStep('entry')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('actions.back')}
          </Button>

          <div className="mb-8">
            <Badge variant="outline" className="mb-3">
              <Settings2 className="h-3 w-3 mr-1" />
              {t('toolSelection.step')}
            </Badge>
            <h1 className="text-3xl font-bold mb-3">{t('toolSelection.title')}</h1>
            <p className="text-lg text-muted-foreground mb-4">
              {t('toolSelection.subtitle')}
            </p>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              {showComparison ? t('toolSelection.hideComparison') : t('toolSelection.showComparison')}
              {showComparison ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {/* Comparison Table */}
          {showComparison && (
            <Card className="mb-8 border-2">
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-semibold">{t('toolSelection.table.method')}</th>
                        <th className="text-left py-3 px-2 font-semibold">{t('toolSelection.table.purpose')}</th>
                        <th className="text-left py-3 px-2 font-semibold">{t('toolSelection.table.confidence')}</th>
                        <th className="text-left py-3 px-2 font-semibold">{t('toolSelection.table.effort')}</th>
                        <th className="text-left py-3 px-2 font-semibold">{t('toolSelection.table.output')}</th>
                        <th className="text-right py-3 px-2 font-semibold">{t('toolSelection.table.price')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(researchTools).map((tool) => (
                        <tr key={tool.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-2 font-medium">{toolT(tool.id, 'shortName', tool.shortName)}</td>
                          <td className="py-3 px-2 text-muted-foreground">{toolT(tool.id, 'purposeType', tool.purposeType)}</td>
                          <td className="py-3 px-2">{getConfidenceBadge(tool.confidence)}</td>
                          <td className="py-3 px-2 text-muted-foreground">{toolT(tool.id, 'effortShort', tool.effortShort)}</td>
                          <td className="py-3 px-2 text-muted-foreground text-xs">{toolT(tool.id, 'outputType', tool.outputType)}</td>
                          <td className="py-3 px-2 text-right font-bold">
                            {tool.cost === 0 ? <Badge className="bg-green-500">{t('free')}</Badge> : `€${tool.cost}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Primary Tools */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">{t('toolSelection.primaryHeading')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {primaryTools.map((tool) => {
                const ToolIcon = tool.icon;
                const isSelected = primaryTool === tool.id;

                return (
                  <Card
                    key={tool.id}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-2 border-primary bg-primary/5 shadow-lg' 
                        : 'hover:border-primary/50 hover:shadow-md'
                    }`}
                    onClick={() => handleToolSelect(tool.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <ToolIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getConfidenceBadge(tool.confidence)}
                          {isSelected && <CheckCircle className="h-6 w-6 text-primary" />}
                        </div>
                      </div>
                      <CardTitle className="text-xl mb-2">{toolT(tool.id, 'name', tool.name)}</CardTitle>
                      <CardDescription className="text-base mb-3">
                        {toolT(tool.id, 'tagline', tool.tagline)}
                      </CardDescription>
                      <div className="bg-muted/50 p-3 rounded-lg mb-3">
                        <p className="text-sm font-medium mb-1">{t('toolSelection.answers')}</p>
                        <p className="text-sm text-muted-foreground italic">"{toolT(tool.id, 'purpose', tool.purpose)}"</p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{t('toolSelection.effortRequired')}</p>
                          <p className="text-xs text-muted-foreground">{toolT(tool.id, 'effort', tool.effort)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{t('toolSelection.bestForLabel')}</p>
                          <p className="text-xs text-muted-foreground">{toolT(tool.id, 'bestFor', tool.bestFor)}</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('toolSelection.pricePerAsset')}</span>
                        <span className="text-xl font-bold">
                          {tool.cost === 0 ? <Badge className="bg-green-500">{t('free')}</Badge> : `€${tool.cost}`}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Advanced Tools */}
          <div className="mb-8">
            <button
              onClick={() => setShowAdvancedTools(!showAdvancedTools)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4"
            >
              {showAdvancedTools ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {t('toolSelection.advancedOptions')}
            </button>

            {showAdvancedTools && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {advancedTools.map((tool) => {
                  const ToolIcon = tool.icon;
                  const isSelected = primaryTool === tool.id;

                  return (
                    <Card
                      key={tool.id}
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-2 border-primary bg-primary/5 shadow-lg' 
                          : 'hover:border-primary/50 hover:shadow-md'
                      }`}
                      onClick={() => handleToolSelect(tool.id)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between mb-3">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <ToolIcon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getConfidenceBadge(tool.confidence)}
                            {isSelected && <CheckCircle className="h-6 w-6 text-primary" />}
                          </div>
                        </div>
                        <CardTitle className="text-xl mb-2">{toolT(tool.id, 'name', tool.name)}</CardTitle>
                        <CardDescription className="text-base mb-3">
                          {toolT(tool.id, 'tagline', tool.tagline)}
                        </CardDescription>
                        <div className="bg-muted/50 p-3 rounded-lg mb-3">
                          <p className="text-sm font-medium mb-1">{t('toolSelection.answers')}</p>
                          <p className="text-sm text-muted-foreground italic">"{toolT(tool.id, 'purpose', tool.purpose)}"</p>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{t('toolSelection.effortRequired')}</p>
                            <p className="text-xs text-muted-foreground">{toolT(tool.id, 'effort', tool.effort)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Target className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{t('toolSelection.bestForLabel')}</p>
                            <p className="text-xs text-muted-foreground">{toolT(tool.id, 'bestFor', tool.bestFor)}</p>
                          </div>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t('toolSelection.pricePerAsset')}</span>
                          <span className="text-xl font-bold">
                            {tool.cost === 0 ? <Badge className="bg-green-500">{t('free')}</Badge> : `€${tool.cost}`}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Agent Warning */}
          {primaryTool === 'ai-agent' && (
            <Alert className="mb-8 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <AlertDescription className="text-orange-900 dark:text-orange-100">
                <p className="font-medium mb-1">{t('toolSelection.aiWarning.title')}</p>
                <p className="text-sm text-orange-700 dark:text-orange-200">
                  {t('toolSelection.aiWarning.body')}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Continue Button */}
          <Card className="sticky bottom-6 border-2 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('toolSelection.selectedTool')}</p>
                  <p className="text-2xl font-bold">
                    {primaryTool
                      ? toolT(primaryTool, 'shortName', researchTools[primaryTool as keyof typeof researchTools].shortName)
                      : t('toolSelection.noneSelected')
                    }
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => setStep('asset-selection')}
                  disabled={!primaryTool}
                  className="gap-2"
                >
                  {t('toolSelection.continueToAssets')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // === ASSET SELECTION SCREEN ===
  if (step === 'asset-selection') {
    const researchItems = getResearchItems();
    const tool = primaryTool ? researchTools[primaryTool as keyof typeof researchTools] : null;
    const ToolIcon = tool?.icon;
    const toolShortName = tool ? toolT(tool.id, 'shortName', tool.shortName) : '';
    const targetName = selectedTarget?.targetName || selectedTarget?.category || 'items';

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => setStep('tool-selection')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('assetSelection.back')}
          </Button>

          {/* Tool Context Bar */}
          <Card className="mb-8 border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                {ToolIcon && (
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ToolIcon className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">{t('assetSelection.yourTool')}</p>
                  <p className="text-xl font-bold">{tool ? toolT(tool.id, 'name', tool.name) : null}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('tool-selection')}
                >
                  {t('assetSelection.changeTool')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mb-8">
            <Badge variant="outline" className="mb-3">
              <Layers className="h-3 w-3 mr-1" />
              {t('assetSelection.step')}
            </Badge>
            <h1 className="text-3xl font-bold mb-3">
              {t('assetSelection.title', { tool: toolShortName })}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('assetSelection.subtitle', { target: targetName })}
            </p>

            {selectedTarget && (
              <Alert className="mt-4">
                <Target className="h-4 w-4" />
                <AlertDescription>
                  {t('assetSelection.researching')} <strong className="capitalize">{selectedTarget.category}</strong>
                  {selectedTarget.targetName && ` - ${selectedTarget.targetName}`}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {researchItems.map((item: ResearchItem) => {
              const Icon = item.icon;
              const isSelected = selectedAssets.includes(item.id);
              
              return (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => toggleAsset(item.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`flex items-center justify-center h-6 w-6 rounded border-2 shrink-0 transition-all ${
                        isSelected 
                          ? 'bg-primary border-primary' 
                          : 'border-muted-foreground/30'
                      }`}>
                        {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {item.avatar ? (
                            <img 
                              src={item.avatar} 
                              alt={item.name}
                              className="h-10 w-10 rounded-full object-cover ring-2 ring-purple-100"
                            />
                          ) : (
                            <Icon className="h-5 w-5 text-primary shrink-0" />
                          )}
                          <h3 className="font-semibold">{item.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {item.type}
                          </Badge>
                          {isSelected && tool && (
                            <span className="text-sm font-medium text-primary">
                              {tool.cost === 0 ? t('free') : `€${tool.cost}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="sticky bottom-6 border-2 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('assetSelection.selectedAssets')}</p>
                  <p className="text-2xl font-bold">
                    {t('assetSelection.assetCount', { count: selectedAssets.length })}
                  </p>
                  {tool && selectedAssets.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('assetSelection.total')} {tool.cost === 0 ? t('free') : `€${tool.cost * selectedAssets.length}`}
                    </p>
                  )}
                </div>
                <Button
                  size="lg"
                  onClick={() => setStep('review')}
                  disabled={selectedAssets.length === 0}
                  className="gap-2"
                >
                  {t('assetSelection.reviewPlan')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // === BUNDLE SELECTION SCREEN ===
  if (step === 'bundle-selection') {
    // Filter bundles based on selected target
    const filteredBundles = selectedTarget 
      ? (getBundlesForTarget(selectedTarget.category) || researchBundles || [])
      : (researchBundles || []);

    const targetName = selectedTarget?.targetName || selectedTarget?.category || 'research';
    
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => {
              if (preSelectedPlan) {
                onCancel();
              } else {
                setStep('entry');
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('actions.back')}
          </Button>

          <div className="mb-8">
            {preSelectedPlan ? (
              <>
                <Badge variant="default" className="mb-3">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {preSelectedPlan.name}
                </Badge>
                <h1 className="text-3xl font-bold mb-3">{t('bundleSelection.title')}</h1>
                <p className="text-lg text-muted-foreground">
                  {t('bundleSelection.subtitlePlan', { plan: preSelectedPlan.name })}
                </p>
              </>
            ) : (
              <>
                <Badge variant="outline" className="mb-3">
                  <Package className="h-3 w-3 mr-1" />
                  {t('bundleSelection.badge', { target: targetName })}
                </Badge>
                <h1 className="text-3xl font-bold mb-3">{t('bundleSelection.title')}</h1>
                <p className="text-lg text-muted-foreground">
                  {t('bundleSelection.subtitle', { target: targetName })}
                </p>

                {selectedTarget && (
                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {t('bundleSelection.optimizedPrefix')} <strong className="capitalize">{selectedTarget.category}</strong> {t('bundleSelection.optimizedSuffix')}
                      {selectedTarget.targetName && ` - ${selectedTarget.targetName}`}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {filteredBundles.map((bundle) => {
              const BundleIcon = bundle.icon;
              const primaryToolData = researchTools[bundle.primaryTool as keyof typeof researchTools];
              const PrimaryIcon = primaryToolData.icon;
              
              return (
                <Card 
                  key={bundle.id}
                  className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group relative overflow-hidden"
                  onClick={() => handleBundleSelect(bundle.id)}
                >
                  {bundle.badge && (
                    <Badge className={`absolute top-4 right-4 ${
                      bundle.color === 'blue' ? 'bg-blue-500' :
                      bundle.color === 'green' ? 'bg-green-500' :
                      bundle.color === 'purple' ? 'bg-purple-500' :
                      bundle.color === 'pink' ? 'bg-pink-500' :
                      bundle.color === 'amber' ? 'bg-amber-500' :
                      'bg-orange-500'
                    }`}>
                      {bundle.badge}
                    </Badge>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                        bundle.color === 'blue' ? 'bg-blue-500/10' :
                        bundle.color === 'green' ? 'bg-green-500/10' :
                        bundle.color === 'purple' ? 'bg-purple-500/10' :
                        bundle.color === 'pink' ? 'bg-pink-500/10' :
                        bundle.color === 'amber' ? 'bg-amber-500/10' :
                        'bg-orange-500/10'
                      }`}>
                        <BundleIcon className={`h-6 w-6 ${
                          bundle.color === 'blue' ? 'text-blue-600' :
                          bundle.color === 'green' ? 'text-green-600' :
                          bundle.color === 'purple' ? 'text-purple-600' :
                          bundle.color === 'pink' ? 'text-pink-600' :
                          bundle.color === 'amber' ? 'text-amber-600' :
                          'text-orange-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{bundle.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {bundle.description}
                        </CardDescription>
                      </div>
                    </div>

                    {/* Research Tools */}
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-2">{t('bundleSelection.researchApproach')}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md">
                          <PrimaryIcon className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{toolT(bundle.primaryTool, 'shortName', primaryToolData.shortName)}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{t('bundleSelection.includedItems')}</p>
                      <div className="flex flex-wrap gap-2">
                        {(bundle.items ?? []).map((itemId: string) => {
                          // Try to find in brand assets first
                          const item = brandAssets.find(a => a.id === itemId);
                          let ItemIcon = Palette;
                          let itemName = item?.name;
                          
                          // If not found, try personas
                          if (!item) {
                            const persona = personas.find(p => p.id === itemId);
                            if (persona) {
                              ItemIcon = Users;
                              itemName = persona.name;
                            }
                          } else {
                            const assetDef = availableAssets.find(a => a.id === itemId);
                            if (assetDef) ItemIcon = assetDef.icon;
                          }
                          
                          if (!itemName) return null;
                          
                          return (
                            <Badge key={itemId} variant="outline" className="gap-1.5">
                              <ItemIcon className="h-3 w-3" />
                              {itemName}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs font-medium mb-1">{t('bundleSelection.outcome')}</p>
                      <p className="text-sm text-muted-foreground">
                        {bundle.outcome}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t('bundleSelection.timeline')}</p>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {bundle.timeline.split(' ')[0]}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t('bundleSelection.items')}</p>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5" />
                          {t('bundleSelection.included', { count: (bundle.items ?? []).length })}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-sm text-muted-foreground line-through mr-2">
                            €{bundle.basePrice}
                          </span>
                          <span className="text-2xl font-bold">€{bundle.bundlePrice}</span>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {t('bundleSelection.save', { amount: bundle.savings })}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter>
                    <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" variant="outline">
                      {t('bundleSelection.selectBundle')}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-6 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">{t('bundleSelection.customConfig.title')}</p>
                <p className="text-blue-700 dark:text-blue-200">
                  <button onClick={() => setStep('tool-selection')} className="underline font-medium">
                    {t('bundleSelection.customConfig.link')}
                  </button> {t('bundleSelection.customConfig.suffix')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // === REVIEW SCREEN ===
  if (step === 'review') {
    const totalPrice = getTotalPrice();
    const bundle = selectedBundle ? researchBundles.find(b => b.id === selectedBundle) : null;
    const primaryToolData = primaryTool ? researchTools[primaryTool as keyof typeof researchTools] : null;
    const PrimaryIcon = primaryToolData?.icon;

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => {
              if (selectedBundle) {
                setStep('bundle-selection');
              } else {
                setStep('asset-selection');
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('review.back')}
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">
                    {bundle ? (
                      <><Package className="h-3 w-3 mr-1" />{t('review.bundleLabel')} {bundle.name}</>
                    ) : (
                      <><Settings2 className="h-3 w-3 mr-1" />{t('review.customConfig')}</>
                    )}
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold mb-2">{t('review.title')}</h1>
                <p className="text-lg text-muted-foreground">
                  {t('review.subtitle')}
                </p>
              </div>

              {/* Research Approach */}
              <div>
                <h2 className="text-xl font-semibold mb-4">{t('review.researchApproach')}</h2>
                <Card className="border-2">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Primary Tool */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-3">{t('review.primaryTool')}</p>
                        <div className="flex items-start gap-4">
                          {PrimaryIcon && (
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <PrimaryIcon className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-lg font-bold mb-1">{primaryToolData ? toolT(primaryToolData.id, 'name', primaryToolData.name) : null}</p>
                            <p className="text-sm text-muted-foreground mb-3">
                              {primaryToolData ? toolT(primaryToolData.id, 'outputType', primaryToolData.outputType) : null}
                            </p>
                            <div className="flex items-center gap-3">
                              {getConfidenceBadge(primaryToolData?.confidence || 'medium')}
                              <Badge variant="outline">{primaryToolData ? toolT(primaryToolData.id, 'effortShort', primaryToolData.effortShort) : null}</Badge>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPrimaryTool(null);
                              setStep('tool-selection');
                            }}
                          >
                            {t('actions.change')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Configuration Section */}
              {(primaryTool === 'questionnaire' || primaryTool === 'interviews') && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">{t('review.configuration')}</h2>
                  <Card className="border-2">
                    <CardContent className="p-6 space-y-6">
                      {/* Questionnaires Configuration */}
                      {primaryTool === 'questionnaire' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="questionnaire-count" className="text-base font-medium">
                              {t('review.numQuestionnaires')}
                            </Label>
                            <span className="text-2xl font-bold text-primary">{numberOfQuestionnaires}</span>
                          </div>
                          <Slider
                            id="questionnaire-count"
                            min={50}
                            max={500}
                            step={50}
                            value={[numberOfQuestionnaires]}
                            onValueChange={(value) => setNumberOfQuestionnaires(value[0])}
                            className="py-4"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{t('review.questionnairesCount', { count: 50 })}</span>
                            <span>{t('review.questionnairesCount', { count: 500 })}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t('review.questionnairesHelp')}
                          </p>
                        </div>
                      )}

                      {/* Interviews Configuration */}
                      {primaryTool === 'interviews' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="interview-count" className="text-base font-medium">
                              {t('review.numInterviews')}
                            </Label>
                            <span className="text-2xl font-bold text-primary">{numberOfInterviews}</span>
                          </div>
                          <Slider
                            id="interview-count"
                            min={1}
                            max={15}
                            step={1}
                            value={[numberOfInterviews]}
                            onValueChange={(value) => setNumberOfInterviews(value[0])}
                            className="py-4"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{t('review.interviewsCount', { count: 1 })}</span>
                            <span>{t('review.interviewsCount', { count: 15 })}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t('review.interviewsHelp')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Selected Assets */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{t('review.selectedAssets', { count: selectedAssets.length })}</h2>
                  {!selectedBundle && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStep('asset-selection')}
                    >
                      <Settings2 className="h-3 w-3 mr-1.5" />
                      {t('review.adjust')}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {selectedAssets.map(assetId => {
                    const asset = availableAssets.find(a => a.id === assetId);
                    if (!asset) return null;
                    const AssetIcon = asset.icon;

                    return (
                      <Card key={assetId}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <AssetIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm mb-1">{assetT(asset.id, 'name', asset.name)}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {assetT(asset.id, 'type', asset.type)}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Price Summary */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">{t('review.investmentSummary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {primaryToolData && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{toolT(primaryToolData.id, 'shortName', primaryToolData.shortName)}</span>
                        <span className="font-medium">
                          {primaryToolData.cost === 0 ? t('free') : `€${primaryToolData.cost * selectedAssets.length}`}
                        </span>
                      </div>
                      {bundle && bundle.savings > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('review.bundleSavings')}</span>
                          <span className="font-medium text-green-600">-€{bundle.savings}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">{t('review.total')}</span>
                    <div className="text-right">
                      <p className="text-2xl font-bold">€{totalPrice}</p>
                      {bundle && bundle.savings > 0 && (
                        <p className="text-xs text-muted-foreground line-through">
                          €{bundle.basePrice}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleConfirmPlan}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('review.confirmPlan')}
                  </Button>
                </CardContent>
              </Card>

              {/* Rationale */}
              {Object.keys(rationale).length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <CardTitle className="text-lg">{t('review.whyThisWorks')}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(rationale).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{value}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Next Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('review.whatNext')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      1
                    </div>
                    <p>{t('review.steps.1')}</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      2
                    </div>
                    <p>{t('review.steps.2')}</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      3
                    </div>
                    <p>{t('review.steps.3')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
