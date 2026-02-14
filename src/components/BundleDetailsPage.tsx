import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ArrowLeft,
  Target,
  Eye,
  Heart,
  Mic,
  ClipboardList,
  Clock,
  BarChart3,
  TrendingUp,
  Shield,
  Award,
  CheckCircle,
  Rocket,
  Sparkles,
} from 'lucide-react';
import { ResearchBundle } from '../data/research-bundles';
import { Separator } from './ui/separator';

interface BundleDetailsPageProps {
  bundle: ResearchBundle;
  onBack: () => void;
  onStartPlan: (selectedAssets: string[], selectedMethods: string[]) => void;
}

export function BundleDetailsPage({ bundle, onBack, onStartPlan }: BundleDetailsPageProps) {
  const [selectedAssets] = useState<string[]>(['1', '2', '5']); // Golden Circle, Vision, Core Values
  const [selectedMethods] = useState<string[]>(['interviews', 'questionnaire']);

  // For demo purposes - map bundle price
  const bundlePrice = 4999;
  const originalPrice = 5880;
  const savings = originalPrice - bundlePrice;

  const getAssetIcon = (assetId: string) => {
    const icons: Record<string, any> = {
      '1': Target,
      '2': Eye,
      '5': Heart,
    };
    return icons[assetId] || Target;
  };

  const getAssetName = (assetId: string) => {
    const names: Record<string, string> = {
      '1': 'Golden Circle',
      '2': 'Vision Statement',
      '5': 'Core Values',
    };
    return names[assetId] || '';
  };

  const getAssetDesc = (assetId: string) => {
    const descs: Record<string, string> = {
      '1': 'Your core purpose',
      '2': 'Future direction',
      '5': 'Guiding principles',
    };
    return descs[assetId] || '';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-xl">{bundle.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    Complete research bundle
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="px-3 py-1">
                {selectedAssets.length} Assets
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                {selectedMethods.length} Methods
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Bundle Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Featured Bundle Card */}
            <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 dark:from-blue-950/30 dark:via-gray-950 dark:to-blue-950/20 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/50 dark:bg-blue-900/20 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge className="bg-blue-600 text-white border-0 px-3 py-1">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Recommended
                      </Badge>
                      <Badge variant="outline" className="border-green-600 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30">
                        Save 15%
                      </Badge>
                    </div>
                    <CardTitle className="text-3xl mb-2">{bundle.name}</CardTitle>
                    <CardDescription className="text-base">
                      {bundle.description}
                    </CardDescription>
                  </div>
                  <div className="text-right ml-6">
                    <div className="text-sm text-muted-foreground mb-1">Complete Package</div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">${bundlePrice.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground line-through">${originalPrice.toLocaleString()}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-blue-100 dark:border-blue-900/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-xs font-medium text-muted-foreground">Timeline</p>
                    </div>
                    <p className="text-xl font-bold">4 weeks</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-blue-100 dark:border-blue-900/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-xs font-medium text-muted-foreground">Assets</p>
                    </div>
                    <p className="text-xl font-bold">3 core</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-blue-100 dark:border-blue-900/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-xs font-medium text-muted-foreground">Methods</p>
                    </div>
                    <p className="text-xl font-bold">2 proven</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-blue-100 dark:border-blue-900/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <p className="text-xs font-medium text-muted-foreground">Savings</p>
                    </div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">${savings}</p>
                  </div>
                </div>

                {/* What's Included */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium mb-3 text-muted-foreground">Assets to Validate</p>
                    <div className="space-y-2">
                      {selectedAssets.map((assetId) => {
                        const Icon = getAssetIcon(assetId);
                        return (
                          <div key={assetId} className="flex items-center space-x-3 p-2 bg-white dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-800">
                            <div className="h-8 w-8 rounded bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                              <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{getAssetName(assetId)}</p>
                              <p className="text-xs text-muted-foreground">{getAssetDesc(assetId)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-3 text-muted-foreground">Validation Methods</p>
                    <div className="space-y-2">
                      {[
                        { icon: Mic, name: 'Stakeholder Interviews', desc: '10-12 interviews' },
                        { icon: ClipboardList, name: 'Validation Questionnaire', desc: '50+ responses' },
                      ].map((method, idx) => {
                        const Icon = method.icon;
                        return (
                          <div key={idx} className="flex items-center space-x-3 p-2 bg-white dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-800">
                            <div className="h-8 w-8 rounded bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                              <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{method.name}</p>
                              <p className="text-xs text-muted-foreground">{method.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center space-x-3 pt-2">
                  <Button 
                    size="lg" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    onClick={() => onStartPlan(selectedAssets, selectedMethods)}
                  >
                    <Rocket className="h-4 w-4" />
                    Select This Bundle
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-gray-300 dark:border-gray-700"
                  >
                    Learn More
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>100% satisfaction guarantee</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Expert-led research</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span>Most popular choice</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-2 border-primary sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Your Validation Plan</CardTitle>
                <CardDescription>Bundle summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected Assets */}
                <div>
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Selected Assets ({selectedAssets.length})</p>
                  <div className="space-y-2">
                    {selectedAssets.map(assetId => {
                      const Icon = getAssetIcon(assetId);
                      return (
                        <div key={assetId} className="flex items-center space-x-2 p-2 bg-muted rounded">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="text-sm">{getAssetName(assetId)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Selected Methods */}
                <div>
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Research Methods ({selectedMethods.length})</p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 p-2 bg-muted rounded">
                      <Mic className="h-4 w-4 text-primary" />
                      <span className="text-sm">Interviews</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-muted rounded">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <span className="text-sm">Questionnaire</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Pricing Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Timeline</span>
                    <span className="font-medium">4 weeks</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Regular Price</span>
                    <span className="line-through">${originalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400">Bundle Savings</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">-${savings}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-xl text-primary">${bundlePrice.toLocaleString()}</span>
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