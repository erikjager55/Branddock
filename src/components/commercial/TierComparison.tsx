/**
 * COMPONENT: Tier Comparison
 * 
 * Comparison of the three product tiers positioned as
 * levels of decision certainty.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  CheckCircle,
  X,
  Shield,
  TrendingUp,
  Star,
  ArrowRight
} from 'lucide-react';
import { PRODUCT_TIERS, ProductTier } from '../../types/product-tier';

interface TierComparisonProps {
  onSelectTier?: (tier: ProductTier) => void;
  currentTier?: ProductTier;
}

export function TierComparison({ onSelectTier, currentTier }: TierComparisonProps) {
  const tiers: ProductTier[] = ['decision-scan', 'strategic-control', 'advisory-services'];

  const comparisonFeatures = [
    {
      category: 'Decision Certainty',
      features: [
        { name: 'Decision Status Insight', scan: true, control: true, advisory: true },
        { name: 'Real-time Quality Monitoring', scan: false, control: true, advisory: true },
        { name: 'Expert Validation', scan: false, control: false, advisory: true },
      ]
    },
    {
      category: 'Platform Functionality',
      features: [
        { name: 'Decision Engine', scan: false, control: true, advisory: true },
        { name: 'Campaign Generation', scan: 'limited', control: true, advisory: true },
        { name: 'Research Planning', scan: false, control: true, advisory: true },
        { name: 'Brand Asset Management', scan: false, control: true, advisory: true },
        { name: 'Persona Development', scan: false, control: true, advisory: true },
      ]
    },
    {
      category: 'Reporting & Communication',
      features: [
        { name: 'Stakeholder Views', scan: false, control: true, advisory: true },
        { name: 'Professional Reports', scan: false, control: true, advisory: true },
        { name: 'Executive Presentations', scan: false, control: false, advisory: true },
      ]
    },
    {
      category: 'Expert Support',
      features: [
        { name: 'Quarterly Strategic Reviews', scan: false, control: false, advisory: true },
        { name: 'Guided Validations', scan: false, control: false, advisory: true },
        { name: 'Dedicated Strategy Advisor', scan: false, control: false, advisory: true },
        { name: 'Priority Support', scan: false, control: false, advisory: true },
      ]
    }
  ];

  const getTierIcon = (tier: ProductTier) => {
    switch (tier) {
      case 'decision-scan':
        return Shield;
      case 'strategic-control':
        return TrendingUp;
      case 'advisory-services':
        return Star;
    }
  };

  const renderFeatureCell = (value: boolean | 'limited') => {
    if (value === true) {
      return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" />;
    } else if (value === 'limited') {
      return (
        <div className="text-center">
          <Badge variant="outline" className="text-xs">Limited</Badge>
        </div>
      );
    } else {
      return <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Level of Decision Certainty</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          From quick insights to expert-validated strategy.
          Each tier gives you a higher level of confidence in your decisions.
        </p>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {tiers.map((tierId) => {
          const tier = PRODUCT_TIERS[tierId];
          const Icon = getTierIcon(tierId);
          const isCurrentTier = currentTier === tierId;
          const isRecommended = tierId === 'strategic-control';

          return (
            <Card
              key={tierId}
              className={`relative border-2 ${
                isRecommended 
                  ? 'border-purple-500 shadow-lg scale-105' 
                  : isCurrentTier
                  ? tier.color.bg + ' border-current'
                  : ''
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-purple-600 text-white">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-6">
                <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl mx-auto mb-4 ${tier.color.badge}`}>
                  <Icon className={`h-7 w-7 ${tier.color.text}`} />
                </div>
                <CardTitle className="mb-2">{tier.name}</CardTitle>
                <CardDescription className="mb-4">{tier.tagline}</CardDescription>

                {/* Certainty Level */}
                <div className={`p-3 rounded-lg ${tier.color.bg} border`}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Decision Certainty
                  </p>
                  <p className={`font-bold ${tier.color.text}`}>
                    {tier.certaintyLevel}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pricing */}
                <div className="text-center pb-6 border-b">
                  <div className="flex items-baseline justify-center gap-2 mb-1">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    {tier.billingCycle && (
                      <span className="text-sm text-muted-foreground">{tier.billingCycle}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tier.certaintyDescription}
                  </p>
                </div>

                {/* Key Features */}
                <div className="space-y-2 min-h-[200px]">
                  {tier.features.slice(0, 5).map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Button
                  className={`w-full gap-2 ${isRecommended ? '' : 'variant-outline'}`}
                  variant={isRecommended ? 'default' : 'outline'}
                  onClick={() => onSelectTier?.(tierId)}
                  disabled={isCurrentTier}
                >
                  {isCurrentTier ? (
                    'Your Current Tier'
                  ) : (
                    <>
                      {tier.cta}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Full Feature Comparison</CardTitle>
          <CardDescription>
            Detailed overview of all capabilities per tier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  {tiers.map((tierId) => {
                    const tier = PRODUCT_TIERS[tierId];
                    return (
                      <th key={tierId} className="text-center py-4 px-4">
                        <div className="flex flex-col items-center gap-2">
                          <span className="font-semibold">{tier.name}</span>
                          <Badge variant="outline" className={tier.color.badge}>
                            {tier.certaintyLevel}
                          </Badge>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((category, categoryIndex) => (
                  <React.Fragment key={categoryIndex}>
                    <tr className="bg-muted/50">
                      <td colSpan={4} className="py-3 px-4 font-semibold text-sm">
                        {category.category}
                      </td>
                    </tr>
                    {category.features.map((feature, featureIndex) => (
                      <tr key={featureIndex} className="border-b">
                        <td className="py-3 px-4 text-sm">{feature.name}</td>
                        <td className="py-3 px-4">
                          {renderFeatureCell(feature.scan as boolean | "limited")}
                        </td>
                        <td className="py-3 px-4">
                          {renderFeatureCell(feature.control)}
                        </td>
                        <td className="py-3 px-4">
                          {renderFeatureCell(feature.advisory)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Value Proposition */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-2">
        <CardContent className="p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">
            Invest in Decision Certainty, Not in Features
          </h3>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
            Each tier is designed for a specific level of strategic confidence.
            Choose based on how much certainty you need in your decisions,
            not based on a feature list.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => onSelectTier?.('strategic-control')}>
              Start met Strategic Control
            </Button>
            <Button size="lg" variant="outline" onClick={() => onSelectTier?.('decision-scan')}>
              Start with Free Scan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
