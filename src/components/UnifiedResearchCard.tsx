import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Clock,
  Package,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

interface UnifiedResearchCardProps {
  // Core info
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  bgColor?: string;
  borderColor?: string;
  
  // Badges
  badge?: string;
  tier?: 'starter' | 'professional' | 'enterprise';
  recommended?: boolean;
  
  // Value proposition (Strategy Tools OR Brand Score)
  strategyTools?: string[];
  scoreBoost?: { min: number; max: number };
  currentScore?: number;
  newTier?: string;
  tierUpgrade?: boolean;
  
  // Activities - What's Included
  activities: {
    icon: any;
    name: string;
    description: string;
    duration: string;
  }[];
  
  // Details
  assetsUnlocked?: number;
  timeline: string;
  methods: string[];
  
  // Pricing (optional, for bundles)
  basePrice?: number;
  bundlePrice?: number;
  savings?: number;
  
  // Outcome
  outcome: string;
  
  // Actions
  onSelect: () => void;
  isSelected?: boolean;
  buttonText?: string;
}

export function UnifiedResearchCard({
  id,
  name,
  description,
  icon: Icon,
  color,
  bgColor,
  borderColor,
  badge,
  tier,
  recommended,
  strategyTools,
  scoreBoost,
  currentScore,
  newTier,
  tierUpgrade,
  activities,
  assetsUnlocked,
  timeline,
  methods,
  basePrice,
  bundlePrice,
  savings,
  outcome,
  onSelect,
  isSelected,
  buttonText = 'Select'
}: UnifiedResearchCardProps) {
  
  const tierColors = {
    starter: 'bg-blue-50 text-blue-700 border-blue-200',
    professional: 'bg-purple-50 text-purple-700 border-purple-200',
    enterprise: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const getTierConfig = (tierName: string) => {
    const configs = {
      foundation: { label: 'Foundation', color: 'text-orange-600' },
      developing: { label: 'Developing', color: 'text-blue-600' },
      strong: { label: 'Strong', color: 'text-green-600' },
      elite: { label: 'Elite', color: 'text-purple-600' },
    };
    return configs[tierName as keyof typeof configs] || configs.foundation;
  };

  return (
    <Card
      className={`border-2 hover:border-primary transition-all cursor-pointer group ${
        isSelected ? 'border-primary bg-accent/50' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader>
        {/* Icon + Badges */}
        <div className="flex items-start justify-between mb-3">
          <div className={`p-3 rounded-lg ${bgColor || `bg-${color}-50`} border ${borderColor || `border-${color}-200`}`}>
            <Icon className={`w-6 h-6 ${color.startsWith('text-') ? color : `text-${color}-600`}`} />
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {recommended && (
              <Badge variant="default" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1.5" />
                Recommended
              </Badge>
            )}
            {badge && (
              <Badge variant="default" className="text-xs">
                {badge}
              </Badge>
            )}
            {tier && (
              <Badge variant="outline" className={`text-xs ${tierColors[tier]}`}>
                {tier}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Title + Description */}
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Value Proposition Box */}
        {strategyTools && strategyTools.length > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                Unlocks {strategyTools.length} Strategy Tool{strategyTools.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {strategyTools.slice(0, 3).map((tool, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tool}
                </Badge>
              ))}
              {strategyTools.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{strategyTools.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {scoreBoost && (
          <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-transparent border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">BRAND STRENGTH BOOST</span>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-2xl font-bold">
                  +{scoreBoost.min}-{scoreBoost.max}
                </span>
              </div>
            </div>
            {currentScore && currentScore > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{currentScore} points</span>
                <ArrowRight className="w-3 h-3" />
                <span className="font-semibold">
                  {Math.min(100, currentScore + Math.round((scoreBoost.min + scoreBoost.max) / 2))} points
                </span>
                {tierUpgrade && newTier && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    {getTierConfig(newTier).label}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* What's Included - Activities */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">What's Included</p>
          </div>
          {activities && activities.length > 0 ? (
            activities.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-background border border-border flex-shrink-0">
                  {React.createElement(activity.icon, {
                    className: 'w-4 h-4 text-primary'
                  })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold">{activity.name}</h4>
                    <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">
                      <Clock className="w-3 h-3 mr-1" />
                      {activity.duration}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {activity.description}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground italic">No activities defined</p>
          )}
        </div>

        <Separator />

        {/* Details Section */}
        <div className="space-y-2 text-sm">
          {assetsUnlocked !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Assets Unlocked</span>
              <span className="font-medium">{assetsUnlocked} assets</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Timeline</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className="font-medium">{timeline}</span>
            </div>
          </div>
          <div className="flex items-start justify-between">
            <span className="text-muted-foreground">Validation Methods</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
              {methods.map((method) => (
                <Badge key={method} variant="outline" className="text-xs">
                  {method}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing (if applicable) */}
        {basePrice && bundlePrice && savings && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-xs text-muted-foreground line-through">
                    €{basePrice.toLocaleString()}
                  </p>
                  <p className="text-2xl font-bold">€{bundlePrice.toLocaleString()}</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Save €{savings.toLocaleString()}
                </Badge>
              </div>
            </div>
          </>
        )}

        {/* CTA Button */}
        <Button
          className="w-full"
          variant={isSelected ? 'default' : 'outline'}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {buttonText}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        {/* Outcome */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-1">OUTCOME</p>
          <p className="text-sm">{outcome}</p>
        </div>
      </CardContent>
    </Card>
  );
}