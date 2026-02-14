/**
 * COMPONENT: Upgrade Prompt
 * 
 * Getoond wanneer gebruiker probeert een gated feature te gebruiken.
 * Gepositioneerd als niveau van besliszekerheid.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Lock,
  ArrowRight,
  CheckCircle,
  Shield,
  TrendingUp,
  X
} from 'lucide-react';
import { ProductTier, PRODUCT_TIERS } from '../../types/product-tier';
import { useProductTier } from '../../contexts/ProductTierContext';

interface UpgradePromptProps {
  feature: string;
  featureDescription: string;
  requiredTier: Extract<ProductTier, 'strategic-control' | 'advisory-services'>;
  onUpgrade?: () => void;
  onClose?: () => void;
  inline?: boolean;
}

export function UpgradePrompt({
  feature,
  featureDescription,
  requiredTier,
  onUpgrade,
  onClose,
  inline = false
}: UpgradePromptProps) {
  const { currentTier, getTierInfo } = useProductTier();
  const tierInfo = getTierInfo(requiredTier);
  const currentTierInfo = getTierInfo(currentTier);

  const certaintyComparison = {
    'decision-scan': { level: 1, label: 'Basic', icon: Shield },
    'strategic-control': { level: 2, label: 'Control', icon: TrendingUp },
    'advisory-services': { level: 3, label: 'Confidence', icon: CheckCircle }
  };

  const current = certaintyComparison[currentTier];
  const required = certaintyComparison[requiredTier];

  if (inline) {
    return (
      <div className={`p-6 rounded-lg border-2 ${tierInfo.color.bg} border-current`}>
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${tierInfo.color.badge}`}>
            <Lock className={`h-6 w-6 ${tierInfo.color.text}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">{feature}</h3>
            <p className="text-sm text-muted-foreground mb-4">{featureDescription}</p>
            
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="outline" className={currentTierInfo.color.badge}>
                Je niveau: {current.label}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className={tierInfo.color.badge}>
                Vereist: {required.label}
              </Badge>
            </div>

            <Button
              size="sm"
              className="gap-2"
              onClick={onUpgrade}
            >
              Upgrade naar {tierInfo.name}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="max-w-2xl w-full mx-4 border-2 shadow-2xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${tierInfo.color.badge}`}>
                <Lock className={`h-6 w-6 ${tierInfo.color.text}`} />
              </div>
              <div>
                <CardTitle className="mb-2">Upgrade voor Hogere Besliszekerheid</CardTitle>
                <CardDescription>
                  Deze functie vereist {tierInfo.certaintyLevel} niveau
                </CardDescription>
              </div>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feature Info */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h4 className="font-semibold mb-2">{feature}</h4>
            <p className="text-sm text-muted-foreground">{featureDescription}</p>
          </div>

          {/* Certainty Level Progression */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-4">Niveaus van Besliszekerheid</p>
            <div className="space-y-3">
              {/* Current Level */}
              <div className={`p-4 rounded-lg border-2 ${currentTierInfo.color.bg} border-current`}>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${currentTierInfo.color.badge}`}>
                    {React.createElement(current.icon, { 
                      className: `h-5 w-5 ${currentTierInfo.color.text}` 
                    })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{currentTierInfo.certaintyLevel}</p>
                      <Badge variant="outline" className={currentTierInfo.color.badge}>
                        Je huidige niveau
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentTierInfo.certaintyDescription}
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
              </div>

              {/* Required Level */}
              <div className={`p-4 rounded-lg border-2 ${tierInfo.color.bg} border-current`}>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tierInfo.color.badge}`}>
                    {React.createElement(required.icon, { 
                      className: `h-5 w-5 ${tierInfo.color.text}` 
                    })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{tierInfo.certaintyLevel}</p>
                      <Badge variant="outline" className={tierInfo.color.badge}>
                        Vereist niveau
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tierInfo.certaintyDescription}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What You Get */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Met {tierInfo.name} krijg je:
            </p>
            <div className="grid gap-2">
              {tierInfo.features.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="p-4 rounded-lg bg-muted/50 border text-center">
            <p className="text-sm text-muted-foreground mb-1">Investering</p>
            <div className="flex items-baseline justify-center gap-2">
              <p className="text-3xl font-bold">{tierInfo.price}</p>
              {tierInfo.billingCycle && (
                <p className="text-sm text-muted-foreground">{tierInfo.billingCycle}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {onClose && (
              <Button variant="outline" onClick={onClose} className="flex-1">
                Terug
              </Button>
            )}
            <Button onClick={onUpgrade} className="flex-1 gap-2">
              {tierInfo.cta}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}