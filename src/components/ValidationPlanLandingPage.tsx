import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  CheckCircle,
  ArrowLeft,
  Target,
  Users,
  Clock,
  TrendingUp,
  Shield,
  Sparkles,
  Award,
  BarChart3,
  Lightbulb,
  AlertCircle,
  Check,
  Zap,
  Eye,
  Heart,
  Globe,
  MessageSquare,
  Book,
  Rocket,
  Mic,
  ClipboardList,
  PresentationIcon as Presentation,
  Users2,
  Brain,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';

interface ValidationPlanLandingPageProps {
  onBack: () => void;
  onStartPlan: (selectedAssets: string[], selectedMethods: string[]) => void;
}

// Available brand assets for validation
const availableAssets = [
  { 
    id: '1', 
    name: 'Golden Circle', 
    category: 'Foundation', 
    icon: Target, 
    description: 'Core purpose and value proposition',
    details: 'Why you exist, how you do it, and what you offer',
    estimatedTime: '2-3 weeks',
    recommendedMethods: ['interviews', 'workshop', 'questionnaire'],
  },
  { 
    id: '2', 
    name: 'Vision Statement', 
    category: 'Strategy', 
    icon: Eye, 
    description: 'Future aspirations and direction',
    details: 'Where you want to be in 5-10 years',
    estimatedTime: '1-2 weeks',
    recommendedMethods: ['interviews', 'workshop'],
  },
  { 
    id: '3', 
    name: 'Mission Statement', 
    category: 'Strategy', 
    icon: Zap, 
    description: 'Current purpose and activities',
    details: 'What you do and who you serve today',
    estimatedTime: '1-2 weeks',
    recommendedMethods: ['interviews', 'questionnaire'],
  },
  { 
    id: '4', 
    name: 'Brand Archetype', 
    category: 'Personality', 
    icon: Users, 
    description: 'Personality framework and traits',
    details: 'Your brand personality and character',
    estimatedTime: '2-3 weeks',
    recommendedMethods: ['questionnaire', 'workshop'],
  },
  { 
    id: '5', 
    name: 'Core Values', 
    category: 'Culture', 
    icon: Heart, 
    description: 'Guiding principles and beliefs',
    details: 'What you stand for and believe in',
    estimatedTime: '2-3 weeks',
    recommendedMethods: ['interviews', 'workshop'],
  },
  { 
    id: '6', 
    name: 'Brand Story', 
    category: 'Narrative', 
    icon: Book, 
    description: 'Origin, journey, and purpose',
    details: 'Your brand narrative and history',
    estimatedTime: '1-2 weeks',
    recommendedMethods: ['interviews'],
  },
  { 
    id: '7', 
    name: 'Social Relevancy', 
    category: 'Purpose', 
    icon: Globe, 
    description: 'Social impact and responsibility',
    details: 'How you contribute to society',
    estimatedTime: '2-3 weeks',
    recommendedMethods: ['interviews', 'questionnaire'],
  },
  { 
    id: '8', 
    name: 'Brand Promise', 
    category: 'Strategy', 
    icon: MessageSquare, 
    description: 'Customer commitment',
    details: 'What you promise to deliver',
    estimatedTime: '1-2 weeks',
    recommendedMethods: ['interviews', 'questionnaire'],
  },
];

// Validation methods available
const validationMethods = [
  {
    id: 'interviews',
    name: 'Stakeholder Interviews',
    shortName: 'Interviews',
    icon: Mic,
    description: 'In-depth 1-on-1 conversations with key stakeholders',
    details: 'Deep qualitative insights from internal and external stakeholders',
    duration: '60-90 min per interview',
    participants: '5-15 people',
    pricePerAsset: 499,
    type: 'Qualitative',
    benefits: [
      'Deep, nuanced understanding',
      'Uncover hidden insights',
      'Build stakeholder buy-in',
    ],
    whatsIncluded: [
      'Interview guide development',
      'Professional facilitation',
      'Recording & transcription',
      'Thematic analysis',
      'Executive summary report',
    ],
  },
  {
    id: 'questionnaire',
    name: 'Validation Questionnaire',
    shortName: 'Questionnaire',
    icon: ClipboardList,
    description: 'Structured surveys for quantitative validation',
    details: 'Gather measurable data from larger stakeholder groups',
    duration: '15-20 min per response',
    participants: '20-100+ people',
    pricePerAsset: 299,
    type: 'Quantitative',
    benefits: [
      'Quantifiable metrics',
      'Broader stakeholder reach',
      'Statistical validation',
    ],
    whatsIncluded: [
      'Custom questionnaire design',
      'Online survey platform',
      'Distribution & reminders',
      'Statistical analysis',
      'Data visualization dashboard',
    ],
  },
  {
    id: 'workshop',
    name: 'Alignment Workshop',
    shortName: 'Workshop',
    icon: Presentation,
    description: 'Collaborative validation sessions',
    details: 'Interactive group sessions to validate and align',
    duration: '2-3 hours',
    participants: '8-15 people',
    pricePerAsset: 799,
    type: 'Collaborative',
    benefits: [
      'Team alignment',
      'Collaborative validation',
      'Immediate feedback',
    ],
    whatsIncluded: [
      'Workshop design & materials',
      'Expert facilitation',
      'Interactive exercises',
      'Live documentation',
      'Action plan & next steps',
    ],
  },
  {
    id: 'focus-group',
    name: 'Focus Groups',
    shortName: 'Focus Groups',
    icon: Users2,
    description: 'Moderated group discussions',
    details: 'Gather diverse perspectives in a group setting',
    duration: '90-120 min',
    participants: '6-10 people per group',
    pricePerAsset: 699,
    type: 'Qualitative',
    benefits: [
      'Multiple perspectives',
      'Group dynamics insights',
      'Cost-effective reach',
    ],
    whatsIncluded: [
      'Participant recruitment',
      'Discussion guide',
      'Professional moderation',
      'Video recording',
      'Insights report',
    ],
  },
  {
    id: 'expert-review',
    name: 'Expert Review',
    shortName: 'Expert Review',
    icon: Brain,
    description: 'Professional brand strategist assessment',
    details: 'Expert analysis and recommendations',
    duration: '3-5 days',
    participants: '1-2 experts',
    pricePerAsset: 899,
    type: 'Professional',
    benefits: [
      'Professional validation',
      'Industry best practices',
      'Strategic recommendations',
    ],
    whatsIncluded: [
      'Comprehensive brand audit',
      'Competitive analysis',
      'Expert consultation call',
      'Strategic recommendations',
      'Implementation roadmap',
    ],
  },
];

export function ValidationPlanLandingPage({ onBack, onStartPlan }: ValidationPlanLandingPageProps) {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['interviews', 'questionnaire']); // Default recommended
  const [methodQuantities, setMethodQuantities] = useState<Record<string, number>>({
    'interviews': 10,
    'questionnaire': 50,
    'workshop': 1,
    'focus-group': 2,
    'expert-review': 1,
  });

  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const toggleMethod = (methodId: string) => {
    setSelectedMethods(prev =>
      prev.includes(methodId)
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    );
  };

  const updateMethodQuantity = (methodId: string, delta: number) => {
    setMethodQuantities(prev => {
      const currentValue = prev[methodId] || 1;
      let newValue;
      
      // Questionnaire increments by 50
      if (methodId === 'questionnaire') {
        const minValue = 50;
        newValue = Math.max(minValue, currentValue + (delta * 50));
      } else {
        newValue = Math.max(1, currentValue + delta);
      }
      
      return {
        ...prev,
        [methodId]: newValue
      };
    });
  };

  const setMethodQuantity = (methodId: string, value: number) => {
    setMethodQuantities(prev => ({
      ...prev,
      [methodId]: Math.max(1, value)
    }));
  };

  // Calculate pricing
  const totalPrice = useMemo(() => {
    let total = 0;
    selectedMethods.forEach(methodId => {
      const method = validationMethods.find(m => m.id === methodId);
      if (method) {
        const quantity = methodQuantities[methodId] || 1;
        total += method.pricePerAsset * selectedAssets.length * quantity;
      }
    });
    return total;
  }, [selectedAssets, selectedMethods, methodQuantities]);

  // Calculate estimated duration
  const estimatedDuration = useMemo(() => {
    const maxWeeks = Math.max(...selectedAssets.map(assetId => {
      const asset = availableAssets.find(a => a.id === assetId);
      if (!asset) return 0;
      const weeks = asset.estimatedTime.includes('2-3') ? 3 : 2;
      return weeks;
    }), 0);
    
    if (maxWeeks === 0) return '0 weeks';
    if (selectedMethods.length > 2) return `${maxWeeks + 1}-${maxWeeks + 2} weeks`;
    return `${maxWeeks}-${maxWeeks + 1} weeks`;
  }, [selectedAssets, selectedMethods]);

  const getAssetIcon = (assetId: string) => {
    const asset = availableAssets.find(a => a.id === assetId);
    return asset?.icon || Target;
  };

  const getAssetName = (assetId: string) => {
    const asset = availableAssets.find(a => a.id === assetId);
    return asset?.name || '';
  };

  const getMethodName = (methodId: string) => {
    const method = validationMethods.find(m => m.id === methodId);
    return method?.shortName || '';
  };

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold mb-1">Custom Validation</h1>
                <p className="text-muted-foreground">
                  Build your own research plan to validate strategic decisions
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="px-3 py-1">
                {selectedAssets.length} Asset{selectedAssets.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                {selectedMethods.length} Method{selectedMethods.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Card - Custom Validation */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardHeader>
                <div className="flex items-start space-x-4">
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">Validate Your Brand with Confidence</CardTitle>
                    <CardDescription className="text-base">
                      Select which brand assets to validate and choose your research methods. 
                      Get professional insights to ensure your brand decisions are backed by data.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <Award className="h-6 w-6 text-primary mb-2" />
                    <p className="text-sm font-medium">Expert-Led</p>
                    <p className="text-xs text-muted-foreground">Professional facilitation</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <BarChart3 className="h-6 w-6 text-primary mb-2" />
                    <p className="text-sm font-medium">Data-Driven</p>
                    <p className="text-xs text-muted-foreground">Quantified insights</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <Rocket className="h-6 w-6 text-primary mb-2" />
                    <p className="text-sm font-medium">Actionable</p>
                    <p className="text-xs text-muted-foreground">Clear next steps</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Asset Selection Card */}
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      <Target className="h-4 w-4 mr-2 text-primary" />
                      Select Brand Assets to Validate
                    </CardTitle>
                    <CardDescription>
                      Choose which brand assets need professional validation
                    </CardDescription>
                  </div>
                  {selectedAssets.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedAssets([])}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableAssets.map((asset) => {
                    const isSelected = selectedAssets.includes(asset.id);
                    const Icon = asset.icon;
                    const hasRecommendedMethods = asset.recommendedMethods.some(m => selectedMethods.includes(m));

                    return (
                      <motion.div
                        key={asset.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-blue-50 dark:bg-blue-950/20 ring-2 ring-primary'
                            : 'border-border hover:border-primary hover:bg-muted'
                        }`}
                        onClick={() => toggleAsset(asset.id)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-primary text-white' : 'bg-muted'
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium">{asset.name}</p>
                                  {isSelected && (
                                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {asset.category}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {asset.description}
                            </p>
                            <p className="text-xs text-muted-foreground italic">
                              {asset.details}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{asset.estimatedTime}</span>
                              </div>
                              {hasRecommendedMethods && (
                                <Badge variant="secondary" className="text-xs">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Recommended
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Validation Methods Card */}
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2 text-primary" />
                      Choose Validation Methods
                    </CardTitle>
                    <CardDescription>
                      Select research methods and set quantities for each
                    </CardDescription>
                  </div>
                  {selectedMethods.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedMethods([])}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {validationMethods.map((method) => {
                    const isSelected = selectedMethods.includes(method.id);
                    const Icon = method.icon;
                    const quantity = methodQuantities[method.id] || 1;

                    return (
                      <div
                        key={method.id}
                        className={`border rounded-lg p-4 transition-all ${
                          isSelected
                            ? 'border-primary bg-blue-50 dark:bg-blue-950/20 ring-2 ring-primary'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          {/* Icon */}
                          <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-primary text-white' : 'bg-muted'
                          }`}>
                            <Icon className="h-6 w-6" />
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            {/* Header with checkbox */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  {/* Checkbox */}
                                  <button
                                    onClick={() => toggleMethod(method.id)}
                                    className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                                      isSelected
                                        ? 'bg-primary border-primary'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                                    }`}
                                  >
                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                  </button>
                                  <p className="font-medium">{method.name}</p>
                                  <Badge variant="outline" className="text-xs">
                                    {method.type}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground ml-7">
                                  {method.description}
                                </p>
                              </div>
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-2 gap-2 mb-3 ml-7">
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{method.duration}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <Users className="h-3.5 w-3.5" />
                                <span>{method.participants}</span>
                              </div>
                            </div>

                            {/* What's Included */}
                            <div className="ml-7 mb-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">What's Included</p>
                              <div className="space-y-1">
                                {method.whatsIncluded.map((item, idx) => (
                                  <div key={idx} className="flex items-start space-x-1.5 text-xs text-muted-foreground">
                                    <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Benefits */}
                            <div className="flex flex-wrap gap-1.5 ml-7 mb-3">
                              {method.benefits.map((benefit, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  {benefit}
                                </Badge>
                              ))}
                            </div>

                            {/* Quantity Selector (only visible when selected) */}
                            {isSelected && (
                              <div className="ml-7 pt-3 border-t">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium mb-1">Quantity</p>
                                    <p className="text-xs text-muted-foreground">
                                      {method.id === 'interviews' && 'Number of interviews to conduct'}
                                      {method.id === 'questionnaire' && 'Target number of responses (increments of 50)'}
                                      {method.id === 'workshop' && 'Number of workshop sessions'}
                                      {method.id === 'focus-group' && 'Number of focus group sessions'}
                                      {method.id === 'expert-review' && 'Number of expert reviewers'}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateMethodQuantity(method.id, -1);
                                      }}
                                      disabled={method.id === 'questionnaire' ? quantity <= 50 : quantity <= 1}
                                    >
                                      -
                                    </Button>
                                    <span className="text-lg font-medium w-12 text-center">{quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateMethodQuantity(method.id, 1);
                                      }}
                                    >
                                      +
                                    </Button>
                                  </div>
                                </div>

                                {/* Total calculation for this method */}
                                {selectedAssets.length > 0 && (
                                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">
                                        {quantity} × {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} × ${method.pricePerAsset}
                                      </span>
                                      <span className="font-medium">
                                        ${(quantity * selectedAssets.length * method.pricePerAsset).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Process Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Validation Process</CardTitle>
                <CardDescription>How your validation plan unfolds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      step: 1,
                      title: 'Kickoff & Planning',
                      description: 'Define scope, timeline, and stakeholder groups',
                      duration: '1 week',
                    },
                    {
                      step: 2,
                      title: 'Research Phase',
                      description: 'Execute selected validation methods',
                      duration: estimatedDuration,
                    },
                    {
                      step: 3,
                      title: 'Analysis & Synthesis',
                      description: 'Process data and identify insights',
                      duration: '1-2 weeks',
                    },
                    {
                      step: 4,
                      title: 'Results & Recommendations',
                      description: 'Present findings and action plan',
                      duration: '1 week',
                    },
                  ].map((phase, idx) => (
                    <div key={idx} className="flex items-start space-x-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">{phase.step}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{phase.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {phase.duration}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {phase.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary Sidebar */}
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="sticky top-6 border-2">
              <CardHeader className="bg-muted/50">
                <CardTitle className="text-lg">Your Validation Plan</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Selected Assets */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Assets to Validate ({selectedAssets.length})
                  </p>
                  {selectedAssets.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedAssets.map((assetId) => {
                        const Icon = getAssetIcon(assetId);
                        return (
                          <div
                            key={assetId}
                            className="flex items-center justify-between p-2 rounded bg-muted/50 group"
                          >
                            <div className="flex items-center space-x-2">
                              <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="text-sm">{getAssetName(assetId)}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => toggleAsset(assetId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No assets selected yet
                    </p>
                  )}
                </div>

                <Separator />

                {/* Selected Methods */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Validation Methods ({selectedMethods.length})
                  </p>
                  {selectedMethods.length > 0 ? (
                    <div className="space-y-2">
                      {selectedMethods.map((methodId) => {
                        const method = validationMethods.find(m => m.id === methodId);
                        if (!method) return null;
                        const Icon = method.icon;
                        return (
                          <div
                            key={methodId}
                            className="flex items-center justify-between p-2 rounded bg-muted/50 group"
                          >
                            <div className="flex items-center space-x-2">
                              <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="text-sm">{method.shortName}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => toggleMethod(methodId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No methods selected yet
                    </p>
                  )}
                </div>

                <Separator />

                {/* Pricing */}
                <div>
                  <div className="space-y-2 mb-3">
                    {selectedMethods.map(methodId => {
                      const method = validationMethods.find(m => m.id === methodId);
                      if (!method) return null;
                      const quantity = methodQuantities[methodId] || 1;
                      const subtotal = method.pricePerAsset * selectedAssets.length * quantity;
                      return (
                        <div key={methodId} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {method.shortName} ({quantity}) × {selectedAssets.length}
                          </span>
                          <span className="font-medium">${subtotal.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="my-3" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Investment</span>
                    <span className="text-2xl font-bold">${totalPrice.toLocaleString()}</span>
                  </div>

                  {selectedAssets.length > 0 && selectedMethods.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Estimated duration: {estimatedDuration}
                    </p>
                  )}
                </div>

                <Separator />

                {/* CTA Button */}
                <Button
                  size="lg"
                  className="w-full"
                  disabled={selectedAssets.length === 0 || selectedMethods.length === 0}
                  onClick={() => onStartPlan(selectedAssets, selectedMethods)}
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Start Validation Plan
                </Button>

                {(selectedAssets.length === 0 || selectedMethods.length === 0) && (
                  <p className="text-xs text-center text-muted-foreground">
                    {selectedAssets.length === 0 && 'Select at least one asset'}
                    {selectedAssets.length > 0 && selectedMethods.length === 0 && 'Select at least one method'}
                  </p>
                )}

                {/* Guarantee */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-2">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                        100% Satisfaction Guarantee
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        If you're not satisfied with the insights, we'll work with you until you are.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Why Validate Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Lightbulb className="h-4 w-4 mr-2 text-primary" />
                  Why Validate?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    87% of brand failures stem from poor alignment and validation
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    Validated brands see 3x higher stakeholder buy-in
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    Research-backed decisions lead to 65% faster implementation
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}